package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	workerredis "github.com/Amitaarav/camera-survilance/worker/internal/redis"
	"github.com/Amitaarav/camera-survilance/worker/internal/mediamtx"
	"github.com/Amitaarav/camera-survilance/worker/internal/worker"

	"github.com/redis/go-redis/v9"
)

const (
	streamName = "camera.commands"
	groupName  = "worker-group"
)

func main() {
	ctx := context.Background()

	redisURL := os.Getenv("REDIS_URL")
	if redisURL == "" {
		redisURL = "redis://localhost:6379"
	}

	mediaMTXURL := os.Getenv("MEDIAMTX_API_URL")
	if mediaMTXURL == "" {
		mediaMTXURL = "http://localhost:9997"
	}

	opt, err := redis.ParseURL(redisURL)
	if err != nil {
		log.Fatalf("failed to parse REDIS_URL: %v", err)
	}

	// Set timeouts to prevent i/o timeouts during blocking commands
	opt.ReadTimeout = 30 * time.Second
	opt.WriteTimeout = 30 * time.Second

	rdb := redis.NewClient(opt)

	if err := rdb.Ping(ctx).Err(); err != nil {
		log.Fatalf("failed to connect to redis: %v", err)
	}

	log.Println("Connected to Redis.")

	err = rdb.XGroupCreateMkStream(
		ctx,
		streamName,
		groupName,
		"0",
	).Err()

	if err != nil && err.Error() != "BUSYGROUP Consumer Group name already exists" {
		log.Fatalf("failed creating consumer group: %v", err)
	}

	consumer := workerredis.New(rdb)

	mediaClient := mediamtx.New(mediaMTXURL)

	processor := worker.New(mediaClient)

	cancelCtx, cancel := context.WithCancel(ctx)
	defer cancel()

	signals := make(chan os.Signal, 1)

	signal.Notify(
		signals,
		syscall.SIGINT,
		syscall.SIGTERM,
	)

	go func() {
		<-signals
		log.Println("Shutdown signal received...")
		cancel()
	}()

	consumerName := fmt.Sprintf(
		"worker-%d",
		time.Now().UnixNano(),
	)

	log.Println("Worker started.")
	log.Printf("Listening on Redis stream '%s'...", streamName)

	for {

		select {

		case <-cancelCtx.Done():
			log.Println("Worker stopped gracefully.")
			return

		default:

			streams, err := consumer.Read(
				cancelCtx,
				groupName,
				consumerName,
				streamName,
			)

			if err != nil {

				if err == redis.Nil {
					continue
				}

				if err == context.Canceled {
					return
				}

				log.Printf("redis read error: %v", err)

				time.Sleep(time.Second)

				continue
			}

			for _, stream := range streams {

				for _, message := range stream.Messages {

					action, _ := message.Values["action"].(string)
					cameraID, _ := message.Values["cameraId"].(string)
					rtspURL, _ := message.Values["rtspUrl"].(string)

					log.Printf(
						"Received command action=%s camera=%s",
						action,
						cameraID,
					)

					err := processor.Process(
						action,
						cameraID,
						rtspURL,
					)

					if err != nil {

						log.Printf(
							"failed processing message %s: %v",
							message.ID,
							err,
						)

						// Don't ACK.
						// It can be retried later.
						continue
					}

					if err := consumer.Ack(
						cancelCtx,
						streamName,
						groupName,
						message.ID,
					); err != nil {

						log.Printf(
							"failed acknowledging message %s: %v",
							message.ID,
							err,
						)
					}
				}
			}
		}
	}
}
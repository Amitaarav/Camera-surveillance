package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/Amitaarav/camera-survilance/worker/internal/camera"
	"github.com/Amitaarav/camera-survilance/worker/internal/mediamtx"
	"github.com/Amitaarav/camera-survilance/worker/internal/mq"
	workerredis "github.com/Amitaarav/camera-survilance/worker/internal/redis"
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

	log.Println("Connected to Redis successfully.")

	// Create stream & group
	err = rdb.XGroupCreateMkStream(
		ctx,
		streamName,
		groupName,
		"0",
	).Err()

	if err != nil && err.Error() != "BUSYGROUP Consumer Group name already exists" {
		log.Fatalf("failed creating consumer group: %v", err)
	}

	// Clients & Subsystems setup
	redisConsumer := workerredis.New(rdb)
	mediaClient := mediamtx.New(mediaMTXURL)
	producer := mq.NewProducer(rdb)
	manager := camera.NewManager(mediaClient, producer)

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
		log.Println("Shutdown signal received, shutting down manager...")
		manager.StopAll()
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
			log.Println("Worker loop stopped.")
			return

		default:
			// Read commands from queue. Count=1, block for 2 seconds.
			streams, err := redisConsumer.Read(
				cancelCtx,
				groupName,
				consumerName,
				streamName,
			)

			if err != nil {
				if err == redis.Nil {
					continue
				}
				if err.Error() == "context canceled" || err == context.Canceled {
					return
				}
				log.Printf("Redis read error: %v", err)
				time.Sleep(1 * time.Second)
				continue
			}

			for _, stream := range streams {
				for _, message := range stream.Messages {
					action, _ := message.Values["action"].(string)
					cameraID, _ := message.Values["cameraId"].(string)
					ownerID, _ := message.Values["ownerId"].(string)
					rtspURL, _ := message.Values["rtspUrl"].(string)

					log.Printf("Received command: ID=%s Action=%s Camera=%s Owner=%s", message.ID, action, cameraID, ownerID)

					if action == "start" {
						manager.Start(cancelCtx, cameraID, ownerID, rtspURL)
					} else if action == "stop" {
						manager.Stop(cameraID)
					} else {
						log.Printf("Unknown action: %s", action)
					}

					// ACK the command message
					if err := redisConsumer.Ack(
						cancelCtx,
						streamName,
						groupName,
						message.ID,
					); err != nil {
						log.Printf("Failed to acknowledge message %s: %v", message.ID, err)
					}
				}
			}
		}
	}
}

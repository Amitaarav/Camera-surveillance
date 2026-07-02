package camera

import (
	"context"
	"fmt"
	"log"
	"math/rand"
	"time"

	"github.com/Amitaarav/camera-survilance/worker/internal/mediamtx"
	"github.com/Amitaarav/camera-survilance/worker/internal/mq"
)

type SimulatedRunner struct {
	cameraID string
	ownerID  string
	rtspURL  string
	media    *mediamtx.Client
	producer *mq.Producer
	cancel   context.CancelFunc
}

func NewSimulatedRunner(cameraID, ownerID, rtspURL string, media *mediamtx.Client, producer *mq.Producer) *SimulatedRunner {
	return &SimulatedRunner{
		cameraID: cameraID,
		ownerID:  ownerID,
		rtspURL:  rtspURL,
		media:    media,
		producer: producer,
	}
}

func (r *SimulatedRunner) Start(ctx context.Context) {
	runCtx, cancel := context.WithCancel(ctx)
	r.cancel = cancel

	go func() {
		defer func() {
			if err := recover(); err != nil {
				log.Printf("[SimulatedRunner-%s] Panic recovered: %v", r.cameraID, err)
				// Publish error status back
				r.producer.PublishStatus(context.Background(), r.cameraID, "error", fmt.Sprintf("Panic: %v", err), 0.0)
			}
		}()
		r.run(runCtx)
	}()
}

func (r *SimulatedRunner) Stop() {
	if r.cancel != nil {
		r.cancel()
	}
}

func (r *SimulatedRunner) run(ctx context.Context) {
	log.Printf("[SimulatedRunner-%s] Starting ingestion for URL: %s", r.cameraID, r.rtspURL)

	// 1. Publish connecting status
	err := r.producer.PublishStatus(ctx, r.cameraID, "connecting", "", 0.0)
	if err != nil {
		log.Printf("[SimulatedRunner-%s] Failed to publish connecting status: %v", r.cameraID, err)
	}

	// 2. Add path to MediaMTX
	err = r.media.AddPath(r.cameraID, r.rtspURL)
	if err != nil {
		log.Printf("[SimulatedRunner-%s] MediaMTX AddPath failed: %v", r.cameraID, err)
		r.producer.PublishStatus(context.Background(), r.cameraID, "error", fmt.Sprintf("MediaMTX error: %v", err), 0.0)
		return
	}

	// 3. Publish live status
	log.Printf("[SimulatedRunner-%s] MediaMTX path added. Ingestion is live.", r.cameraID)
	err = r.producer.PublishStatus(ctx, r.cameraID, "live", "", 25.0)
	if err != nil {
		log.Printf("[SimulatedRunner-%s] Failed to publish live status: %v", r.cameraID, err)
	}

	// 4. Setup periodic stats and detection tickers
	statsTicker := time.NewTicker(5 * time.Second)
	defer statsTicker.Stop()

	// Periodic simulated detection (every 10 to 20 seconds)
	detectionTicker := time.NewTicker(time.Duration(10+rand.Intn(10)) * time.Second)
	defer detectionTicker.Stop()

	for {
		select {
		case <-ctx.Done():
			log.Printf("[SimulatedRunner-%s] Context cancelled. Stopping runner.", r.cameraID)
			
			// Cleanup MediaMTX path
			err := r.media.RemovePath(r.cameraID)
			if err != nil {
				log.Printf("[SimulatedRunner-%s] MediaMTX RemovePath failed: %v", r.cameraID, err)
			}

			// Publish stopped status
			r.producer.PublishStatus(context.Background(), r.cameraID, "stopped", "", 0.0)
			return

		case <-statsTicker.C:
			// Publish periodic stats (simulated FPS and lag)
			fps := 24.0 + rand.Float64()*2.0
			detectionsLastMin := rand.Intn(5)
			queueLag := rand.Intn(30) + 10

			err = r.producer.PublishStats(ctx, r.cameraID, fps, detectionsLastMin, queueLag)
			if err != nil {
				log.Printf("[SimulatedRunner-%s] Failed to publish stats: %v", r.cameraID, err)
			}

		case <-detectionTicker.C:
			// Reset ticker for dynamic randomized interval
			detectionTicker.Reset(time.Duration(12+rand.Intn(12)) * time.Second)

			// 60% chance to simulate a person detection event
			if rand.Float64() < 0.6 {
				confidence := 0.75 + rand.Float64()*0.2
				// Random bounding box
				x := float64(100 + rand.Intn(300))
				y := float64(100 + rand.Intn(200))
				w := float64(50 + rand.Intn(100))
				h := float64(120 + rand.Intn(150))

				payload := mq.DetectionPayload{
					FrameTSMs: time.Now().UnixNano() / int64(time.Millisecond),
					Model: mq.ModelInfo{
						Name:    "yolov8n-simulated",
						Version: "1.0",
					},
					Detections: []mq.Detection{
						{
							Label:      "person",
							Confidence: confidence,
							BBox:       []float64{x, y, w, h},
						},
					},
				}

				// Dedupe key collapses events in same 5s bucket
				bucket := time.Now().Unix() / 5
				dedupeKey := fmt.Sprintf("%s:person:%d", r.cameraID, bucket)

				log.Printf("[SimulatedRunner-%s] Simulating person detection (confidence=%.2f)", r.cameraID, confidence)
				err = r.producer.PublishDetection(ctx, r.cameraID, r.ownerID, payload, dedupeKey)
				if err != nil {
					log.Printf("[SimulatedRunner-%s] Failed to publish detection: %v", r.cameraID, err)
				}
			}
		}
	}
}

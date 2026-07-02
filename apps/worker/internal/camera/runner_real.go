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

type RealRunner struct {
	cameraID string
	ownerID  string
	rtspURL  string
	media    *mediamtx.Client
	producer *mq.Producer
	cancel   context.CancelFunc
}

func NewRealRunner(cameraID, ownerID, rtspURL string, media *mediamtx.Client, producer *mq.Producer) *RealRunner {
	return &RealRunner{
		cameraID: cameraID,
		ownerID:  ownerID,
		rtspURL:  rtspURL,
		media:    media,
		producer: producer,
	}
}

func (r *RealRunner) Start(ctx context.Context) {
	runCtx, cancel := context.WithCancel(ctx)
	r.cancel = cancel

	go func() {
		defer func() {
			if err := recover(); err != nil {
				log.Printf("[RealRunner-%s] Panic recovered: %v", r.cameraID, err)
				// Publish error status back
				r.producer.PublishStatus(context.Background(), r.cameraID, "error", fmt.Sprintf("Panic: %v", err), 0.0)
			}
		}()
		r.run(runCtx)
	}()
}

func (r *RealRunner) Stop() {
	if r.cancel != nil {
		r.cancel()
	}
}

func (r *RealRunner) run(ctx context.Context) {
	log.Printf("[RealRunner-%s] Starting ingestion for URL: %s", r.cameraID, r.rtspURL)

	// 1. Publish connecting status
	err := r.producer.PublishStatus(ctx, r.cameraID, "connecting", "", 0.0)
	if err != nil {
		log.Printf("[RealRunner-%s] Failed to publish connecting status: %v", r.cameraID, err)
	}

	// 2. Add path to MediaMTX
	err = r.media.AddPath(r.cameraID, r.rtspURL)
	if err != nil {
		log.Printf("[RealRunner-%s] MediaMTX AddPath failed: %v", r.cameraID, err)
		r.producer.PublishStatus(context.Background(), r.cameraID, "error", fmt.Sprintf("MediaMTX error: %v", err), 0.0)
		return
	}

	// 3. Publish live status
	log.Printf("[RealRunner-%s] MediaMTX path added. Ingestion is live.", r.cameraID)
	err = r.producer.PublishStatus(ctx, r.cameraID, "live", "", 25.0)
	if err != nil {
		log.Printf("[RealRunner-%s] Failed to publish live status: %v", r.cameraID, err)
	}

	// 4. Setup periodic stats ticker
	statsTicker := time.NewTicker(5 * time.Second)
	defer statsTicker.Stop()

	for {
		select {
		case <-ctx.Done():
			log.Printf("[RealRunner-%s] Context cancelled. Stopping runner.", r.cameraID)
			
			// Cleanup MediaMTX path
			err := r.media.RemovePath(r.cameraID)
			if err != nil {
				log.Printf("[RealRunner-%s] MediaMTX RemovePath failed: %v", r.cameraID, err)
			}

			// Publish stopped status
			r.producer.PublishStatus(context.Background(), r.cameraID, "stopped", "", 0.0)
			return

		case <-statsTicker.C:
			// Publish periodic stats (simulated FPS and lag)
			fps := 24.0 + rand.Float64()*2.0
			detectionsLastMin := 0 // Detections are managed by the YOLO inference service
			queueLag := rand.Intn(30) + 10

			err = r.producer.PublishStats(ctx, r.cameraID, fps, detectionsLastMin, queueLag)
			if err != nil {
				log.Printf("[RealRunner-%s] Failed to publish stats: %v", r.cameraID, err)
			}
		}
	}
}

package mq

import (
	"context"
	"encoding/json"
	"time"

	goredis "github.com/redis/go-redis/v9"
)

type Producer struct {
	client *goredis.Client
}

func NewProducer(client *goredis.Client) *Producer {
	return &Producer{
		client: client,
	}
}

// PublishStatus publishes camera.status events back to the camera.heartbeats stream
func (p *Producer) PublishStatus(ctx context.Context, cameraId string, state string, reason string, fps float64) error {
	var reasonVal interface{} = nil
	if reason != "" {
		reasonVal = reason
	}

	// We format reason to match JSON null if empty, or string if present.
	// But in redis streams it's stored as fields. We serialize the fields flat.
	values := map[string]interface{}{
		"event_type": "camera.status",
		"camera_id":  cameraId,
		"state":      state,
		"reason":     reasonVal,
		"fps":        fps,
		"updated_at": time.Now().Format(time.RFC3339),
	}

	err := p.client.XAdd(ctx, &goredis.XAddArgs{
		Stream: "camera.heartbeats",
		MaxLen: 1000,
		Approx: true,
		ID:     "*",
		Values: values,
	}).Err()

	return err
}

// PublishStats publishes camera.stats events back to the camera.heartbeats stream
func (p *Producer) PublishStats(ctx context.Context, cameraId string, fps float64, detectionsLastMin int, queueLagMs int) error {
	values := map[string]interface{}{
		"event_type":          "camera.stats",
		"camera_id":           cameraId,
		"fps":                 fps,
		"detections_last_min": detectionsLastMin,
		"queue_lag_ms":        queueLagMs,
		"updated_at":          time.Now().Format(time.RFC3339),
	}

	err := p.client.XAdd(ctx, &goredis.XAddArgs{
		Stream: "camera.heartbeats",
		MaxLen: 1000,
		Approx: true,
		ID:     "*",
		Values: values,
	}).Err()

	return err
}

// Detection payload matching backend types
type Detection struct {
	Label      string    `json:"label"`
	Confidence float64   `json:"confidence"`
	BBox       []float64 `json:"bbox"` // [x, y, w, h]
}

type ModelInfo struct {
	Name    string `json:"name"`
	Version string `json:"version"`
}

type DetectionPayload struct {
	FrameTSMs   int64       `json:"frame_ts_ms"`
	Detections  []Detection `json:"detections"`
	Model       ModelInfo   `json:"model"`
}

// PublishDetection publishes detection.person events back to the detection.events stream
func (p *Producer) PublishDetection(ctx context.Context, cameraId string, userId string, payload DetectionPayload, dedupeKey string) error {
	payloadJSON, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	values := map[string]interface{}{
		"event_type":  "detection.person",
		"camera_id":   cameraId,
		"user_id":     userId,
		"occurred_at": time.Now().Format(time.RFC3339),
		"dedupe_key":  dedupeKey,
		"payload":     string(payloadJSON),
	}

	err = p.client.XAdd(ctx, &goredis.XAddArgs{
		Stream: "detection.events",
		MaxLen: 10000,
		Approx: true,
		ID:     "*",
		Values: values,
	}).Err()

	return err
}

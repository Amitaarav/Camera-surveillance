package camera

import (
	"context"
	"os"

	"github.com/Amitaarav/camera-survilance/worker/internal/mediamtx"
	"github.com/Amitaarav/camera-survilance/worker/internal/mq"
)

// Runner defines the interface that both real and simulated camera runners must implement.
type Runner interface {
	Start(ctx context.Context)
	Stop()
}

// NewRunner is a factory function that returns either a RealRunner or a SimulatedRunner
// based on the SIMULATE_DETECTION environment variable.
func NewRunner(cameraID, ownerID, rtspURL string, media *mediamtx.Client, producer *mq.Producer) Runner {
	if os.Getenv("SIMULATE_DETECTION") == "true" {
		return NewSimulatedRunner(cameraID, ownerID, rtspURL, media, producer)
	}
	return NewRealRunner(cameraID, ownerID, rtspURL, media, producer)
}

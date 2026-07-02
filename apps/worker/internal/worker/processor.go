package worker

import (
	"log"

	"github.com/Amitaarav/camera-survilance/worker/internal/mediamtx"
)

type Processor struct {
	media *mediamtx.Client
}

func New(media *mediamtx.Client) *Processor {
	return &Processor{
		media: media,
	}
}

func (p *Processor) Process(action, cameraID, rtspURL string) error {

	log.Printf(
		"Processing action=%s camera=%s",
		action,
		cameraID,
	)

	switch action {

	case "start":
		return p.media.AddPath(cameraID, rtspURL)

	case "stop":
		return p.media.RemovePath(cameraID)

	default:
		log.Printf("Unknown action %s", action)
	}

	return nil
}
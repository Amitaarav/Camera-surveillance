package camera

import (
	"context"
	"log"
	"sync"

	"github.com/Amitaarav/camera-survilance/worker/internal/mediamtx"
	"github.com/Amitaarav/camera-survilance/worker/internal/mq"
)

type Manager struct {
	mu       sync.Mutex
	runners  map[string]Runner
	media    *mediamtx.Client
	producer *mq.Producer
}

func NewManager(media *mediamtx.Client, producer *mq.Producer) *Manager {
	return &Manager{
		runners:  make(map[string]Runner),
		media:    media,
		producer: producer,
	}
}

// Start spawns a runner goroutine for a camera if not already running.
func (m *Manager) Start(ctx context.Context, cameraID, ownerID, rtspURL string) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if runner, exists := m.runners[cameraID]; exists {
		log.Printf("[Manager] Camera %s is already running. Stopping it first for restart.", cameraID)
		runner.Stop()
	}

	runner := NewRunner(cameraID, ownerID, rtspURL, m.media, m.producer)
	m.runners[cameraID] = runner
	runner.Start(ctx)
	log.Printf("[Manager] Started runner for camera %s", cameraID)
}

// Stop terminates the runner for a camera and removes it from the map.
func (m *Manager) Stop(cameraID string) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if runner, exists := m.runners[cameraID]; exists {
		runner.Stop()
		delete(m.runners, cameraID)
		log.Printf("[Manager] Stopped runner for camera %s", cameraID)
	} else {
		log.Printf("[Manager] Camera %s is not running", cameraID)
	}
}

// StopAll stops all active runners (used for clean shutdown).
func (m *Manager) StopAll() {
	m.mu.Lock()
	defer m.mu.Unlock()

	log.Printf("[Manager] Stopping all %d active runners...", len(m.runners))
	for cameraID, runner := range m.runners {
		runner.Stop()
		delete(m.runners, cameraID)
	}
	log.Println("[Manager] All runners stopped")
}

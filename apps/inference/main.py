"""
main.py — YOLO Inference Service Entry Point.

This service listens on the Redis `camera.commands` stream for start/stop
commands and manages per-camera YOLO detection threads.

Architecture:
  - Shares the same Redis Stream consumer group pattern as the Go worker
  - Uses its OWN consumer group (`inference-group`) so it receives
    ALL camera commands independently of the Go worker
  - For each "start" command, spawns a CameraDetector thread
  - For each "stop" command, terminates the corresponding thread

Environment Variables:
  REDIS_URL        — Redis connection URL (default: redis://localhost:6379)
  MODEL            — YOLO model file (default: yolov8n.pt)
  SAMPLE_INTERVAL  — Run inference every Nth frame (default: 5)
  CONFIDENCE       — Minimum detection confidence (default: 0.4)
  MEDIAMTX_HOST    — MediaMTX hostname for RTSP (default: mediamtx)
  MEDIAMTX_RTSP_PORT — MediaMTX RTSP port (default: 8554)
"""

import logging
import os
import signal
import sys
import time

from redis import Redis
from ultralytics import YOLO

from detector import CameraDetector

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("inference")

REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379")
MODEL_NAME = os.environ.get("MODEL", "yolov8n.pt")
SAMPLE_INTERVAL = int(os.environ.get("SAMPLE_INTERVAL", "5"))
CONFIDENCE = float(os.environ.get("CONFIDENCE", "0.4"))
MEDIAMTX_HOST = os.environ.get("MEDIAMTX_HOST", "mediamtx")
MEDIAMTX_RTSP_PORT = os.environ.get("MEDIAMTX_RTSP_PORT", "8554")

STREAM_NAME = "camera.commands"
CONSUMER_GROUP = "inference-group"
CONSUMER_NAME = f"inference-{os.getpid()}"

running = True
detectors: dict[str, CameraDetector] = {}

def build_rtsp_url(camera_id: str) -> str:
    """Build the MediaMTX RTSP URL for a camera."""
    return f"rtsp://{MEDIAMTX_HOST}:{MEDIAMTX_RTSP_PORT}/{camera_id}"

def handle_shutdown(signum, frame):
    """Handle graceful shutdown."""
    global running
    logger.info("Shutdown signal received (signal=%d). Stopping...", signum)
    running = False

def setup_consumer_group(redis_client: Redis):
    """Create the consumer group if it doesn't exist."""
    try:
        redis_client.xgroup_create(
            STREAM_NAME,
            CONSUMER_GROUP,
            id="0",
            mkstream=True,
        )
        logger.info("Created consumer group '%s' on stream '%s'.", CONSUMER_GROUP, STREAM_NAME)
    except Exception as e:
        if "BUSYGROUP" in str(e):
            logger.debug("Consumer group '%s' already exists.", CONSUMER_GROUP)
        else:
            raise


def stop_all_detectors():
    """Stop all running detector threads."""
    logger.info("Stopping all %d active detectors...", len(detectors))
    for camera_id, detector in list(detectors.items()):
        detector.stop()
        del detectors[camera_id]
    logger.info("All detectors stopped.")


def process_command(redis_client: Redis, model: YOLO, action: str, camera_id: str, owner_id: str):
    """Process a single camera command."""
    if action == "start":
        # Stop existing detector for this camera if running
        if camera_id in detectors:
            logger.info("[%s] Already running. Restarting detector.", camera_id)
            detectors[camera_id].stop()
            del detectors[camera_id]

        rtsp_url = build_rtsp_url(camera_id)

        detector = CameraDetector(
            camera_id=camera_id,
            owner_id=owner_id,
            rtsp_url=rtsp_url,
            redis_client=redis_client,
            model=model,
            sample_interval=SAMPLE_INTERVAL,
            confidence_threshold=CONFIDENCE,
        )
        detector.start()
        detectors[camera_id] = detector

    elif action == "stop":
        if camera_id in detectors:
            detectors[camera_id].stop()
            del detectors[camera_id]
            logger.info("[%s] Detector stopped.", camera_id)
        else:
            logger.info("[%s] No active detector to stop.", camera_id)

    else:
        logger.warning("Unknown action: %s", action)


def main():
    global running

    # Register signal handlers
    signal.signal(signal.SIGINT, handle_shutdown)
    signal.signal(signal.SIGTERM, handle_shutdown)

    # Connect to Redis
    logger.info("Connecting to Redis: %s", REDIS_URL)
    redis_client = Redis.from_url(REDIS_URL, decode_responses=True)
    redis_client.ping()
    logger.info("Redis connected successfully.")

    # Setup consumer group
    setup_consumer_group(redis_client)

    # Load YOLO model
    logger.info("Loading YOLO model: %s", MODEL_NAME)
    model = YOLO(MODEL_NAME)
    logger.info("YOLO model loaded successfully.")

    logger.info("=" * 60)
    logger.info("  YOLO Inference Service Started")
    logger.info("  Model: %s | Sample: every %d frames | Conf: %.2f", MODEL_NAME, SAMPLE_INTERVAL, CONFIDENCE)
    logger.info("  Listening on stream: %s (group: %s)", STREAM_NAME, CONSUMER_GROUP)
    logger.info("=" * 60)

    # Main consumer loop
    while running:
        try:
            # Read from the stream with a 2-second block
            result = redis_client.xreadgroup(
                groupname=CONSUMER_GROUP,
                consumername=CONSUMER_NAME,
                streams={STREAM_NAME: ">"},
                count=1,
                block=2000,
            )

            if not result:
                continue

            for stream_name, messages in result:
                for message_id, fields in messages:
                    action = fields.get("action", "")
                    camera_id = fields.get("cameraId", "")
                    owner_id = fields.get("ownerId", "")

                    logger.info(
                        "Received command: ID=%s action=%s camera=%s owner=%s",
                        message_id, action, camera_id, owner_id,
                    )

                    try:
                        process_command(redis_client, model, action, camera_id, owner_id)
                    except Exception:
                        logger.exception("Error processing command %s", message_id)

                    # ACK the message
                    redis_client.xack(STREAM_NAME, CONSUMER_GROUP, message_id)

        except KeyboardInterrupt:
            break
        except Exception:
            if not running:
                break
            logger.exception("Consumer loop error. Retrying in 5s...")
            time.sleep(5)

    # Graceful shutdown
    stop_all_detectors()
    redis_client.close()
    logger.info("Inference service shut down cleanly.")


if __name__ == "__main__":
    main()

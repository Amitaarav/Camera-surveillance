"""
detector.py — Per-camera YOLO inference runner.

Each CameraDetector runs in its own thread:
  1. Opens the RTSP stream via OpenCV.
  2. Runs YOLOv8n inference on every Nth frame (default: every 5th).
  3. Filters results to "person" class only (COCO class 0).
  4. Publishes detection.person events to the Redis `detection.events` stream.
  5. Implements 5-second deduplication bucketing.
"""

import json
import logging
import time
import threading
from typing import Optional

import cv2
from ultralytics import YOLO
from redis import Redis

logger = logging.getLogger("inference.detector")

# COCO class index for "person"
PERSON_CLASS_ID = 0

# How often to run inference (every Nth frame)
DEFAULT_SAMPLE_INTERVAL = 5

# Deduplication bucket size in seconds
DEDUPE_BUCKET_SECONDS = 5

# Maximum stream entries for detection.events
STREAM_MAXLEN = 10_000


class CameraDetector:
    """Runs YOLO person detection on a single camera's RTSP stream."""

    def __init__(
        self,
        camera_id: str,
        owner_id: str,
        rtsp_url: str,
        redis_client: Redis,
        model: YOLO,
        sample_interval: int = DEFAULT_SAMPLE_INTERVAL,
        confidence_threshold: float = 0.4,
    ):
        self.camera_id = camera_id
        self.owner_id = owner_id
        self.rtsp_url = rtsp_url
        self.redis = redis_client
        self.model = model
        self.sample_interval = sample_interval
        self.confidence_threshold = confidence_threshold

        self._stop_event = threading.Event()
        self._thread: Optional[threading.Thread] = None

    def start(self):
        """Start the detection thread."""
        if self._thread and self._thread.is_alive():
            logger.warning("[%s] Detector already running, stopping first.", self.camera_id)
            self.stop()

        self._stop_event.clear()
        self._thread = threading.Thread(
            target=self._run,
            name=f"detector-{self.camera_id}",
            daemon=True,
        )
        self._thread.start()
        logger.info("[%s] Detector thread started.", self.camera_id)

    def stop(self):
        """Signal the detection thread to stop and wait for it."""
        self._stop_event.set()
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=10)
            logger.info("[%s] Detector thread stopped.", self.camera_id)

    def is_alive(self) -> bool:
        return self._thread is not None and self._thread.is_alive()

    def _run(self):
        """Main detection loop."""
        logger.info("[%s] Connecting to RTSP: %s", self.camera_id, self.rtsp_url)

        cap = None
        frame_count = 0
        retry_count = 0
        max_retries = 10

        while not self._stop_event.is_set():
            # Open / reopen stream
            if cap is None or not cap.isOpened():
                if retry_count >= max_retries:
                    logger.error(
                        "[%s] Max retries (%d) reached. Stopping detector.",
                        self.camera_id,
                        max_retries,
                    )
                    break

                if cap is not None:
                    cap.release()

                logger.info("[%s] Opening RTSP stream (attempt %d)...", self.camera_id, retry_count + 1)
                cap = cv2.VideoCapture(self.rtsp_url)

                if not cap.isOpened():
                    retry_count += 1
                    wait_time = min(2 ** retry_count, 30)
                    logger.warning(
                        "[%s] Failed to open stream. Retrying in %ds...",
                        self.camera_id,
                        wait_time,
                    )
                    self._stop_event.wait(wait_time)
                    continue

                retry_count = 0
                logger.info("[%s] RTSP stream opened successfully.", self.camera_id)

            # Read frame
            ret, frame = cap.read()
            if not ret:
                logger.warning("[%s] Failed to read frame. Reconnecting...", self.camera_id)
                cap.release()
                cap = None
                self._stop_event.wait(2)
                continue

            frame_count += 1

            # Only run inference on every Nth frame
            if frame_count % self.sample_interval != 0:
                continue

            try:
                self._process_frame(frame)
            except Exception:
                logger.exception("[%s] Error processing frame %d", self.camera_id, frame_count)

        # Cleanup
        if cap is not None:
            cap.release()
        logger.info("[%s] Detection loop exited.", self.camera_id)

    def _process_frame(self, frame):
        """Run YOLO inference on a single frame and publish detections."""
        results = self.model.predict(
            frame,
            conf=self.confidence_threshold,
            classes=[PERSON_CLASS_ID],
            verbose=False,
        )

        if not results or len(results) == 0:
            return

        result = results[0]
        boxes = result.boxes

        if boxes is None or len(boxes) == 0:
            return

        detections = []
        for box in boxes:
            cls_id = int(box.cls[0])
            if cls_id != PERSON_CLASS_ID:
                continue

            confidence = float(box.conf[0])
            # xyxy format: [x1, y1, x2, y2] → convert to [x, y, w, h]
            x1, y1, x2, y2 = box.xyxy[0].tolist()
            bbox = [round(x1, 1), round(y1, 1), round(x2 - x1, 1), round(y2 - y1, 1)]

            detections.append({
                "label": "person",
                "confidence": round(confidence, 4),
                "bbox": bbox,
            })

        if not detections:
            return

        # Build payload matching the backend's expected format
        now_ms = int(time.time() * 1000)
        payload = {
            "frame_ts_ms": now_ms,
            "model": {
                "name": "yolov8n",
                "version": "8.2",
            },
            "detections": detections,
        }

        # Deduplication key: collapse events in same 5-second bucket
        bucket = int(time.time()) // DEDUPE_BUCKET_SECONDS
        dedupe_key = f"{self.camera_id}:person:{bucket}"

        occurred_at = time.strftime("%Y-%m-%dT%H:%M:%S+00:00", time.gmtime())

        event_fields = {
            "event_type": "detection.person",
            "camera_id": self.camera_id,
            "user_id": self.owner_id,
            "occurred_at": occurred_at,
            "dedupe_key": dedupe_key,
            "payload": json.dumps(payload),
        }

        try:
            self.redis.xadd(
                "detection.events",
                event_fields,
                maxlen=STREAM_MAXLEN,
            )
            logger.info(
                "[%s] Published detection: %d person(s), top confidence=%.2f",
                self.camera_id,
                len(detections),
                detections[0]["confidence"],
            )
        except Exception:
            logger.exception("[%s] Failed to publish detection event", self.camera_id)

import { useRef, useCallback, useState, useEffect } from "react";

/** Default mediamtx WHEP base URL — configurable via env var. */
const MEDIAMTX_URL =
  import.meta.env.VITE_MEDIAMTX_URL || "http://localhost:8889";

export type WebRTCConnectionState =
  | "idle"
  | "connecting"
  | "connected"
  | "disconnected"
  | "failed";

interface UseWebRTCReturn {
  connectionState: WebRTCConnectionState;
  start: () => Promise<void>;
  stop: () => void;
}

export function useWebRTC(
  cameraId: string | null,
  videoRef: React.RefObject<HTMLVideoElement | null>,
): UseWebRTCReturn {
  const [connectionState, setConnectionState] =
    useState<WebRTCConnectionState>("idle");

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const sessionUrlRef = useRef<string | null>(null);

  /**
   * Tear down the peer connection and WHEP session.
   */
  const stop = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.ontrack = null;
      pcRef.current.onicecandidate = null;
      pcRef.current.onconnectionstatechange = null;
      pcRef.current.close();
      pcRef.current = null;
    }

    if (sessionUrlRef.current) {
      fetch(sessionUrlRef.current, { method: "DELETE" }).catch(() => {});
      sessionUrlRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setConnectionState("idle");
  }, [videoRef]);

  /**
   * Start a WHEP session against mediamtx for the given camera.
   */
  const start = useCallback(async () => {
    if (!cameraId) return;

    stop();

    setConnectionState("connecting");

    try {
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });
      pcRef.current = pc;

      //to receive video+audio — add transceivers
      pc.addTransceiver("video", { direction: "recvonly" });
      pc.addTransceiver("audio", { direction: "recvonly" });

      // Attach remote stream to <video> element
      pc.ontrack = (event) => {
        if (videoRef.current && event.streams[0]) {
          videoRef.current.srcObject = event.streams[0];
        }
      };

      // Monitor connection state
      pc.onconnectionstatechange = () => {
        switch (pc.connectionState) {
          case "connected":
            setConnectionState("connected");
            break;
          case "disconnected":
            setConnectionState("disconnected");
            break;
          case "failed":
            setConnectionState("failed");
            break;
          case "closed":
            setConnectionState("idle");
            break;
        }
      };

      // Create offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Wait for ICE gathering to complete (or timeout after 3s)
      await waitForIceGathering(pc, 3000);

      // POST the offer to the WHEP endpoint
      const whepUrl = `${MEDIAMTX_URL}/${encodeURIComponent(cameraId)}/whep`;
      const response = await fetch(whepUrl, {
        method: "POST",
        headers: { "Content-Type": "application/sdp" },
        body: pc.localDescription!.sdp,
      });

      if (!response.ok) {
        throw new Error(`WHEP POST failed: ${response.status} ${response.statusText}`);
      }

      // Store session URL for teardown (Location header)
      const location = response.headers.get("Location");
      if (location) {
        // Location may be relative or absolute
        sessionUrlRef.current = new URL(location, whepUrl).href;
      }

      // Set remote description from the WHEP answer
      const answerSdp = await response.text();
      await pc.setRemoteDescription(
        new RTCSessionDescription({ type: "answer", sdp: answerSdp }),
      );
    } catch (err) {
      console.error("[WebRTC] WHEP connection failed:", err);
      setConnectionState("failed");
      stop();
    }
  }, [cameraId, stop, videoRef]);

  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return { connectionState, start, stop };
}

/**
 * Wait for ICE gathering to complete, or timeout.
 */
function waitForIceGathering(
  pc: RTCPeerConnection,
  timeoutMs: number,
): Promise<void> {
  return new Promise<void>((resolve) => {
    if (pc.iceGatheringState === "complete") {
      resolve();
      return;
    }

    const timeout = setTimeout(resolve, timeoutMs);

    pc.onicegatheringstatechange = () => {
      if (pc.iceGatheringState === "complete") {
        clearTimeout(timeout);
        resolve();
      }
    };
  });
}

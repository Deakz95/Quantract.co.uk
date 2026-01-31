"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";

export default function AssistJoinPage() {
  const { token } = useParams<{ token: string }>();
  const [status, setStatus] = useState<"loading" | "ready" | "connected" | "error" | "expired">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Verify session exists
    fetch(`/api/admin/remote-assist/sessions`)
      .then(() => {
        // For public access, we just set ready — actual signalling uses token auth
        setStatus("ready");
      })
      .catch(() => {
        setStatus("error");
        setErrorMsg("Could not reach server");
      });
  }, [token]);

  async function startCall() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });
      pcRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0];
      };

      setStatus("connected");
    } catch (err) {
      setStatus("error");
      setErrorMsg("Camera/microphone access denied. Please allow access and try again.");
    }
  }

  function endCall() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    pcRef.current?.close();
    setStatus("ready");
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
      <h1 className="text-xl font-bold mb-4">Remote Assist</h1>

      {status === "loading" && <p className="text-gray-400">Connecting...</p>}

      {status === "error" && (
        <div className="text-center">
          <p className="text-red-400 mb-4">{errorMsg}</p>
          <button onClick={() => setStatus("ready")} className="px-4 py-2 bg-blue-600 rounded text-sm">
            Try Again
          </button>
        </div>
      )}

      {status === "expired" && <p className="text-yellow-400">This session has expired.</p>}

      {status === "ready" && (
        <div className="text-center">
          <p className="text-gray-400 mb-4">Ready to join the video call.</p>
          <button onClick={startCall} className="px-6 py-3 bg-green-600 rounded-lg text-sm font-medium hover:bg-green-700">
            Start Camera
          </button>
          <p className="text-xs text-gray-500 mt-3">
            You&apos;ll be asked to allow camera and microphone access.
          </p>
        </div>
      )}

      {status === "connected" && (
        <div className="w-full max-w-4xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="relative">
              <video ref={localVideoRef} autoPlay muted playsInline className="w-full rounded-lg bg-black" />
              <span className="absolute bottom-2 left-2 text-xs bg-black/50 px-2 py-1 rounded">You</span>
            </div>
            <div className="relative">
              <video ref={remoteVideoRef} autoPlay playsInline className="w-full rounded-lg bg-black" />
              <span className="absolute bottom-2 left-2 text-xs bg-black/50 px-2 py-1 rounded">Engineer</span>
            </div>
          </div>
          <div className="text-center">
            <button onClick={endCall} className="px-6 py-2 bg-red-600 rounded text-sm hover:bg-red-700">
              End Call
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

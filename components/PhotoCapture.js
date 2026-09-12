"use client";

import { useEffect, useRef, useState } from "react";

const MAX_DIMENSION = 800;
const JPEG_QUALITY = 0.7;

// Phones expose a front ("user") and a rear ("environment") camera; most
// laptops only have the one, in which case the flip button stays hidden.
const OTHER_FACING = { user: "environment", environment: "user" };
const DEFAULT_FACING = "environment";

// Camera field shared by the visitor and guest forms: owns the live preview,
// the front/back switch and the JPEG downscale. The blob is handed to the
// parent, which keeps it (and its preview URL) alongside the rest of the form.
export default function PhotoCapture({
  previewUrl,
  onCapture,
  onRetake,
  onError,
  label,
  required = false,
  error,
  alt = "Captured photo",
}) {
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [facingMode, setFacingMode] = useState(DEFAULT_FACING);
  const [canSwitch, setCanSwitch] = useState(false);
  const [stream, setStream] = useState(null);

  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // The front camera preview is mirrored so it reads like a mirror rather than
  // like someone else's view of you.
  const mirrored = facingMode === "user";

  // Release the camera hardware whenever the field unmounts, no matter how we got there.
  useEffect(() => releaseStream, []);

  // Attach the stream once the <video> element has actually mounted. Doing
  // this in the same tick as setCameraOpen(true) (e.g. via requestAnimationFrame)
  // is a race: React may not have committed the new <video> to the DOM yet,
  // so videoRef.current would still be null and the stream would silently
  // never attach — which is what produced the black screen / dead Capture
  // button. A useEffect keyed on cameraOpen always runs after that commit.
  // It is keyed on the stream as well so flipping cameras re-attaches the new
  // one, since cameraOpen stays true across a flip.
  useEffect(() => {
    const video = videoRef.current;
    if (cameraOpen && stream && video) {
      video.srcObject = stream;
      video.play().catch(() => {});
    }
  }, [cameraOpen, stream]);

  function releaseStream() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  function stopCamera() {
    releaseStream();
    setStream(null);
    setCameraOpen(false);
    setVideoReady(false);
  }

  // enumerateDevices only reports the real camera list once permission has been
  // granted, so this runs after a successful getUserMedia rather than up front.
  async function detectCameras(active) {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      setCanSwitch(devices.filter((d) => d.kind === "videoinput").length > 1);
    } catch {
      // No enumeration available (older Safari): assume a flip is possible when
      // the track reports a facing mode at all, which is the phone case.
      setCanSwitch(Boolean(active.getVideoTracks()[0]?.getSettings().facingMode));
    }
  }

  async function openCamera(mode) {
    if (!navigator.mediaDevices?.getUserMedia) {
      onError?.("Camera capture isn't supported in this browser.");
      return false;
    }

    setCameraStarting(true);
    setVideoReady(false);
    // Hand the current device back before asking for the other one: most phones
    // keep only a single camera open at a time, so the flip fails while this
    // stream is still live.
    releaseStream();
    setStream(null);

    try {
      const next = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode },
        audio: false,
      });
      streamRef.current = next;
      setStream(next);
      // The browser may hand back a different lens than the one asked for (or
      // the only one it has), so label and mirror from the track, not the request.
      setFacingMode(next.getVideoTracks()[0]?.getSettings().facingMode || mode);
      setCameraOpen(true);
      detectCameras(next);
      return true;
    } catch {
      onError?.("Camera access was denied or is unavailable.");
      setCameraOpen(false);
      return false;
    } finally {
      setCameraStarting(false);
    }
  }

  async function switchCamera() {
    if (await openCamera(OTHER_FACING[facingMode] || "user")) return;
    // Couldn't get the other lens — put the one that was working back.
    await openCamera(facingMode);
  }

  function capturePhoto() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) {
      onError?.("Camera isn't ready yet — please wait a moment.");
      return;
    }

    let { videoWidth: width, videoHeight: height } = video;
    if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
      if (width > height) {
        height = Math.round((height * MAX_DIMENSION) / width);
        width = MAX_DIMENSION;
      } else {
        width = Math.round((width * MAX_DIMENSION) / height);
        height = MAX_DIMENSION;
      }
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (mirrored) {
      // Flip the capture to match the mirrored preview, so the saved photo is
      // the one the person just looked at.
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, width, height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        onCapture(blob);
        stopCamera();
      },
      "image/jpeg",
      JPEG_QUALITY
    );
  }

  function retakePhoto() {
    onRetake();
    openCamera(facingMode);
  }

  return (
    <div>
      <label className="mb-1 block text-sm font-semibold text-slate-700">
        {label} {required && <span className="text-orange-600">*</span>}
      </label>

      {previewUrl ? (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt={alt}
            className="h-14 w-14 rounded-lg object-cover ring-1 ring-slate-200"
          />
          <button
            type="button"
            onClick={retakePhoto}
            className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            Retake
          </button>
        </div>
      ) : cameraOpen ? (
        <div className="space-y-2">
          <div className="relative overflow-hidden rounded-lg bg-black">
            <video
              ref={videoRef}
              playsInline
              muted
              onLoadedMetadata={() => setVideoReady(true)}
              className={`aspect-video w-full object-cover ${mirrored ? "-scale-x-100" : ""}`}
            />
            {!videoReady && (
              <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white/80">
                Starting camera...
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={capturePhoto}
              disabled={!videoReady || cameraStarting}
              className="flex-1 rounded-lg bg-orange-600 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              📸 Capture
            </button>
            {canSwitch && (
              <button
                type="button"
                onClick={switchCamera}
                disabled={cameraStarting}
                title="Switch camera"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                🔄 {mirrored ? "Back" : "Front"}
              </button>
            )}
            <button
              type="button"
              onClick={stopCamera}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => openCamera(facingMode)}
          disabled={cameraStarting}
          className={`flex w-full items-center justify-center gap-2 rounded-lg border border-dashed py-3 text-sm font-medium hover:border-orange-400 hover:text-orange-600 disabled:opacity-60 ${
            error ? "border-red-400 text-red-500" : "border-slate-300 text-slate-500"
          }`}
        >
          📷 {cameraStarting ? "Opening Camera..." : "Take Photo"}
        </button>
      )}

      {error && <p className="mt-1 text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}

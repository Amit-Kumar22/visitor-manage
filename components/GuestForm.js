"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/apiClient";
import Logo from "./Logo";
import Toast from "./Toast";

const EMPTY_FORM = {
  name: "",
  mobile: "",
  email: "",
  company: "",
  designation: "",
  city: "",
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_DIMENSION = 800;
const JPEG_QUALITY = 0.7;

function Field({ label, error, required, children }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-semibold text-slate-700">
        {label} {required && <span className="text-orange-600">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}

function inputClass(error) {
  return `w-full rounded-lg border px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-100 ${
    error ? "border-red-400" : "border-slate-300 focus:border-orange-500"
  }`;
}

export default function GuestForm() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(null);
  const [toast, setToast] = useState(null);
  // Starts null so the server-rendered markup doesn't embed a timestamp that
  // will never match the client's — the real clock only appears once this
  // effect runs after mount, avoiding a hydration mismatch.
  const [now, setNow] = useState(null);

  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [photoBlob, setPhotoBlob] = useState(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState(null);

  const videoRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: `now` starts null so SSR never embeds a clock value, then this fills it in on mount
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => setSuccess(null), 2000);
    return () => clearTimeout(timer);
  }, [success]);

  // Release the camera hardware whenever the form unmounts, no matter how we got there.
  useEffect(() => stopCamera, []);

  // Attach the stream once the <video> element has actually mounted. Doing
  // this in the same tick as setCameraOpen(true) (e.g. via requestAnimationFrame)
  // is a race: React may not have committed the new <video> to the DOM yet,
  // so videoRef.current would still be null and the stream would silently
  // never attach — which is what produced the black screen / dead Capture
  // button. A useEffect keyed on cameraOpen always runs after that commit.
  useEffect(() => {
    if (cameraOpen && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [cameraOpen]);

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraOpen(false);
    setVideoReady(false);
  }

  async function startCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setToast({ type: "error", message: "Camera capture isn't supported in this browser." });
      return;
    }

    setCameraStarting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;
      setVideoReady(false);
      setCameraOpen(true);
    } catch {
      setToast({ type: "error", message: "Camera access was denied or is unavailable." });
    } finally {
      setCameraStarting(false);
    }
  }

  function capturePhoto() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) {
      setToast({ type: "error", message: "Camera isn't ready yet — please wait a moment." });
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
    canvas.getContext("2d").drawImage(video, 0, 0, width, height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        setPhotoBlob(blob);
        setPhotoPreviewUrl(URL.createObjectURL(blob));
        setErrors((e) => ({ ...e, photo: undefined }));
        stopCamera();
      },
      "image/jpeg",
      JPEG_QUALITY
    );
  }

  function clearPhoto() {
    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    setPhotoBlob(null);
    setPhotoPreviewUrl(null);
  }

  function retakePhoto() {
    clearPhoto();
    startCamera();
  }

  function updateField(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  }

  function validate() {
    const next = {};
    if (!form.name.trim()) next.name = "Full name is required.";
    if (!form.mobile.trim()) next.mobile = "Mobile number is required.";
    else if (!/^\d{10}$/.test(form.mobile.trim())) next.mobile = "Enter a valid 10-digit mobile number.";
    if (form.email.trim() && !EMAIL_REGEX.test(form.email.trim())) next.email = "Enter a valid email address.";
    if (!photoBlob) next.photo = "Please capture a profile photo.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function resetForm() {
    setForm(EMPTY_FORM);
    clearPhoto();
    stopCamera();
    setErrors({});
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const body = new FormData();
      body.append("name", form.name.trim());
      body.append("mobile", form.mobile.trim());
      body.append("email", form.email.trim());
      body.append("company", form.company.trim());
      body.append("designation", form.designation.trim());
      body.append("city", form.city.trim());
      body.append("photo", photoBlob, "guest-photo.jpg");

      // No Content-Type header here — the browser sets the multipart
      // boundary itself when the body is a FormData instance.
      const res = await apiFetch("/api/guests", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong. Please try again.");

      const submittedName = form.name.trim();
      resetForm();
      setSuccess({ name: submittedName, registrationId: data.guest.registrationId });
    } catch (err) {
      setToast({ type: "error", message: err.message });
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm rounded-xl bg-white p-8 text-center shadow-lg ring-1 ring-slate-200">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-3xl">
            ✅
          </div>
          <h1 className="text-xl font-bold text-slate-900">Thank you, {success.name}.</h1>
          <p className="mt-2 text-sm text-slate-500">You&apos;re registered for the event.</p>
          <div className="mt-4 rounded-lg bg-slate-50 px-3 py-2.5">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Registration ID</p>
            <p className="mt-0.5 font-mono text-sm font-semibold text-slate-800">{success.registrationId}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-6">
      <Toast toast={toast} onClose={() => setToast(null)} />
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg ring-1 ring-slate-200">
        <div className="mb-5 flex flex-col items-center text-center">
          <Logo size="md" className="mb-2" />
          <h1 className="text-lg font-bold text-slate-900">Guest Registration</h1>
          <p className="mt-0.5 text-xs text-slate-500">Please fill in your details to register for the event</p>
          <Link href="/" className="mt-2 text-xs font-medium text-orange-600 hover:underline">
            Regular visitor? Check in here →
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <Field label="Full Name" error={errors.name} required>
            <input
              type="text"
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              className={inputClass(errors.name)}
              placeholder="e.g. Priya Sharma"
              autoComplete="name"
            />
          </Field>

          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">
              Profile Photo <span className="text-orange-600">*</span>
            </label>

            {photoPreviewUrl ? (
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photoPreviewUrl}
                  alt="Captured guest"
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
                  <video ref={videoRef} playsInline muted onLoadedMetadata={() => setVideoReady(true)} className="aspect-video w-full" />
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
                    disabled={!videoReady}
                    className="flex-1 rounded-lg bg-orange-600 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    📸 Capture
                  </button>
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
                onClick={startCamera}
                disabled={cameraStarting}
                className={`flex w-full items-center justify-center gap-2 rounded-lg border border-dashed py-3 text-sm font-medium hover:border-orange-400 hover:text-orange-600 disabled:opacity-60 ${
                  errors.photo ? "border-red-400 text-red-500" : "border-slate-300 text-slate-500"
                }`}
              >
                📷 {cameraStarting ? "Opening Camera..." : "Take Photo"}
              </button>
            )}
            {errors.photo && <p className="mt-1 text-xs font-medium text-red-600">{errors.photo}</p>}
          </div>

          <Field label="Mobile Number" error={errors.mobile} required>
            <input
              type="tel"
              inputMode="numeric"
              maxLength={10}
              value={form.mobile}
              onChange={(e) => updateField("mobile", e.target.value.replace(/\D/g, "").slice(0, 10))}
              className={inputClass(errors.mobile)}
              placeholder="10-digit mobile number"
              autoComplete="tel"
            />
          </Field>

          <Field label="Email Address" error={errors.email}>
            <input
              type="email"
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
              className={inputClass(errors.email)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Company / Organization">
              <input
                type="text"
                value={form.company}
                onChange={(e) => updateField("company", e.target.value)}
                className={inputClass()}
                placeholder="Company name"
              />
            </Field>

            <Field label="Designation">
              <input
                type="text"
                value={form.designation}
                onChange={(e) => updateField("designation", e.target.value)}
                className={inputClass()}
                placeholder="Job title"
              />
            </Field>
          </div>

          <Field label="City">
            <input
              type="text"
              value={form.city}
              onChange={(e) => updateField("city", e.target.value)}
              className={inputClass()}
              placeholder="Your city"
            />
          </Field>

          <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
            <span>
              Registering at: <strong className="text-slate-700">{now ? now.toLocaleTimeString() : "--:--:--"}</strong>
            </span>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-orange-600 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Submitting..." : "Submit"}
          </button>
        </form>
      </div>
    </div>
  );
}

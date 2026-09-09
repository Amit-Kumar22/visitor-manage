"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import { downloadFile } from "@/lib/downloadFile";
import ConfirmDialog from "./ConfirmDialog";
import IconButton from "./IconButton";
import { PencilIcon, TrashIcon, DownloadIcon } from "./icons";

function formatDateTime(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, { dateStyle: "full", timeStyle: "medium" });
}

const fieldInputClass =
  "w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm text-slate-900 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100";

function toEditForm(guest) {
  return {
    name: guest.name,
    mobile: guest.mobile,
    email: guest.email,
    company: guest.company,
    designation: guest.designation,
    city: guest.city,
  };
}

export default function GuestDetailModal({ guestId, isAdmin, startInEdit, onClose, onUpdated, onDeleted }) {
  const [guest, setGuest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await apiFetch(`/api/guests/${guestId}`, { signal: controller.signal });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load guest.");
        setGuest(data.guest);
        if (startInEdit && isAdmin) {
          setEditForm(toEditForm(data.guest));
          setIsEditing(true);
        }
      } catch (err) {
        if (err.name !== "AbortError") setError(err.message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-fetch when the target guest changes, not on every startInEdit/isAdmin re-render
  }, [guestId]);

  async function handleMarkCheckIn() {
    setUpdating(true);
    try {
      const res = await apiFetch(`/api/guests/${guestId}`, { method: "PATCH" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not update check-in time.");
      setGuest(data.guest);
      onUpdated?.(data.guest);
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdating(false);
    }
  }

  function startEditing() {
    setEditForm(toEditForm(guest));
    setIsEditing(true);
  }

  async function handleSaveEdit() {
    setUpdating(true);
    setError("");
    try {
      const res = await apiFetch(`/api/guests/${guestId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save changes.");
      setGuest(data.guest);
      onUpdated?.(data.guest);
      setIsEditing(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdating(false);
    }
  }

  async function handleDownloadPhoto() {
    try {
      const ext = guest.photo.split(".").pop().split("?")[0];
      await downloadFile(guest.photo, `${guest.name.replace(/\s+/g, "-")}-${guestId}.${ext}`);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await apiFetch(`/api/guests/${guestId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not delete guest.");
      onDeleted?.(guestId);
    } catch (err) {
      setError(err.message);
      setShowDeleteConfirm(false);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/60 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">{isEditing ? "Edit Guest" : "Guest Details"}</h2>
          <div className="flex items-center gap-1">
            {isAdmin && guest && !isEditing && (
              <>
                <IconButton icon={<PencilIcon />} label="Edit guest" onClick={startEditing} />
                <IconButton
                  icon={<TrashIcon />}
                  label="Delete guest"
                  variant="danger"
                  onClick={() => setShowDeleteConfirm(true)}
                />
                <div className="mx-1 h-5 w-px bg-slate-200" />
              </>
            )}
            <IconButton icon={<span className="text-xl leading-none">×</span>} label="Close" onClick={onClose} />
          </div>
        </div>

        {loading ? (
          <p className="py-10 text-center text-slate-400">Loading...</p>
        ) : !guest ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>
        ) : isEditing ? (
          <div className="space-y-3">
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{error}</p>}

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Full Name</label>
              <input
                type="text"
                value={editForm.name}
                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                className={fieldInputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Mobile Number</label>
              <input
                type="tel"
                maxLength={10}
                value={editForm.mobile}
                onChange={(e) => setEditForm((f) => ({ ...f, mobile: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
                className={fieldInputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Email Address</label>
              <input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                className={fieldInputClass}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Company</label>
                <input
                  type="text"
                  value={editForm.company}
                  onChange={(e) => setEditForm((f) => ({ ...f, company: e.target.value }))}
                  className={fieldInputClass}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Designation</label>
                <input
                  type="text"
                  value={editForm.designation}
                  onChange={(e) => setEditForm((f) => ({ ...f, designation: e.target.value }))}
                  className={fieldInputClass}
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">City</label>
              <input
                type="text"
                value={editForm.city}
                onChange={(e) => setEditForm((f) => ({ ...f, city: e.target.value }))}
                className={fieldInputClass}
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setError("");
                }}
                disabled={updating}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={updating}
                className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-60"
              >
                {updating ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{error}</p>}

            <div className="flex items-center gap-4">
              {guest.photo ? (
                <div className="relative h-24 w-24 shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={guest.photo}
                    alt={guest.name}
                    className="h-24 w-24 rounded-xl object-cover ring-2 ring-slate-200"
                  />
                  <button
                    type="button"
                    onClick={handleDownloadPhoto}
                    title="Download photo"
                    aria-label="Download photo"
                    className="absolute -bottom-1.5 -right-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-white text-slate-600 shadow ring-1 ring-slate-200 hover:bg-slate-50 hover:text-slate-900"
                  >
                    <DownloadIcon width={14} height={14} />
                  </button>
                </div>
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-xl bg-orange-100 text-3xl font-semibold text-orange-700">
                  {guest.name?.[0]?.toUpperCase() || "?"}
                </div>
              )}
              <div>
                <p className="text-xl font-bold text-slate-900">{guest.name}</p>
                <p className="text-slate-500">{guest.mobile}</p>
                {guest.checkInTime ? (
                  <span className="mt-1 inline-block rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
                    Checked In
                  </span>
                ) : (
                  <span className="mt-1 inline-block rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                    Registered
                  </span>
                )}
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div className="col-span-2">
                <dt className="text-xs font-medium uppercase text-slate-400">Registration ID</dt>
                <dd className="font-mono text-slate-800">{guest.registrationId}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-slate-400">Email</dt>
                <dd className="text-slate-800">{guest.email || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-slate-400">City</dt>
                <dd className="text-slate-800">{guest.city || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-slate-400">Company</dt>
                <dd className="text-slate-800">{guest.company || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-slate-400">Designation</dt>
                <dd className="text-slate-800">{guest.designation || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-slate-400">Registration Time</dt>
                <dd className="text-slate-800">{formatDateTime(guest.registrationTime)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-slate-400">Check-in Time</dt>
                <dd className="text-slate-800">{formatDateTime(guest.checkInTime)}</dd>
              </div>
            </dl>

            {!guest.checkInTime && (
              <button
                type="button"
                onClick={handleMarkCheckIn}
                disabled={updating}
                className="w-full rounded-lg bg-orange-600 py-2.5 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-60"
              >
                {updating ? "Updating..." : "Mark Check-in"}
              </button>
            )}
          </div>
        )}
      </div>

      {showDeleteConfirm && (
        <ConfirmDialog
          title="Delete guest"
          message={`Permanently delete ${guest?.name}'s registration? This cannot be undone.`}
          busy={deleting}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  );
}

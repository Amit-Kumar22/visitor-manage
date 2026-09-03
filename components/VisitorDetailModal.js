"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import { VISITOR_PURPOSES } from "@/lib/constants";
import ConfirmDialog from "./ConfirmDialog";
import IconButton from "./IconButton";
import { PencilIcon, TrashIcon } from "./icons";

function formatDateTime(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, { dateStyle: "full", timeStyle: "medium" });
}

const fieldInputClass =
  "w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm text-slate-900 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100";

function toEditForm(visitor) {
  return {
    name: visitor.name,
    phone: visitor.phone,
    address: visitor.address,
    purpose: visitor.purpose,
    meetingWith: visitor.meetingWith,
  };
}

export default function VisitorDetailModal({ visitorId, isAdmin, startInEdit, onClose, onUpdated, onDeleted }) {
  const [visitor, setVisitor] = useState(null);
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
        const res = await apiFetch(`/api/visitors/${visitorId}`, { signal: controller.signal });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load visitor.");
        setVisitor(data.visitor);
        if (startInEdit && isAdmin) {
          setEditForm(toEditForm(data.visitor));
          setIsEditing(true);
        }
      } catch (err) {
        if (err.name !== "AbortError") setError(err.message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-fetch when the target visitor changes, not on every startInEdit/isAdmin re-render
  }, [visitorId]);

  async function handleMarkExit() {
    setUpdating(true);
    try {
      const res = await apiFetch(`/api/visitors/${visitorId}`, { method: "PATCH" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not update exit time.");
      setVisitor(data.visitor);
      onUpdated?.(data.visitor);
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdating(false);
    }
  }

  function startEditing() {
    setEditForm(toEditForm(visitor));
    setIsEditing(true);
  }

  async function handleSaveEdit() {
    setUpdating(true);
    setError("");
    try {
      const res = await apiFetch(`/api/visitors/${visitorId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save changes.");
      setVisitor(data.visitor);
      onUpdated?.(data.visitor);
      setIsEditing(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdating(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await apiFetch(`/api/visitors/${visitorId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not delete visitor.");
      onDeleted?.(visitorId);
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
          <h2 className="text-lg font-bold text-slate-900">{isEditing ? "Edit Visitor" : "Visitor Details"}</h2>
          <div className="flex items-center gap-1">
            {isAdmin && visitor && !isEditing && (
              <>
                <IconButton icon={<PencilIcon />} label="Edit visitor" onClick={startEditing} />
                <IconButton
                  icon={<TrashIcon />}
                  label="Delete visitor"
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
        ) : !visitor ? (
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
              <label className="mb-1 block text-xs font-medium text-slate-500">Phone Number</label>
              <input
                type="tel"
                maxLength={10}
                value={editForm.phone}
                onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
                className={fieldInputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Address</label>
              <textarea
                rows={2}
                value={editForm.address}
                onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))}
                className={fieldInputClass}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Purpose</label>
                <select
                  value={editForm.purpose}
                  onChange={(e) => setEditForm((f) => ({ ...f, purpose: e.target.value }))}
                  className={fieldInputClass}
                >
                  {VISITOR_PURPOSES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Meeting With</label>
                <input
                  type="text"
                  value={editForm.meetingWith}
                  onChange={(e) => setEditForm((f) => ({ ...f, meetingWith: e.target.value }))}
                  className={fieldInputClass}
                />
              </div>
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
              {visitor.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={visitor.photo}
                  alt={visitor.name}
                  className="h-24 w-24 rounded-xl object-cover ring-2 ring-slate-200"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-xl bg-orange-100 text-3xl font-semibold text-orange-700">
                  {visitor.name?.[0]?.toUpperCase() || "?"}
                </div>
              )}
              <div>
                <p className="text-xl font-bold text-slate-900">{visitor.name}</p>
                <p className="text-slate-500">{visitor.phone}</p>
                {visitor.exitTime ? (
                  <span className="mt-1 inline-block rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                    Checked Out
                  </span>
                ) : (
                  <span className="mt-1 inline-block rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
                    Checked In
                  </span>
                )}
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div className="col-span-2">
                <dt className="text-xs font-medium uppercase text-slate-400">Address</dt>
                <dd className="text-slate-800">{visitor.address}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-slate-400">Purpose</dt>
                <dd className="text-slate-800">{visitor.purpose}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-slate-400">Meeting With</dt>
                <dd className="text-slate-800">{visitor.meetingWith}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-slate-400">Entry Time</dt>
                <dd className="text-slate-800">{formatDateTime(visitor.entryTime)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-slate-400">Exit Time</dt>
                <dd className="text-slate-800">{formatDateTime(visitor.exitTime)}</dd>
              </div>
            </dl>

            {!visitor.exitTime && (
              <button
                type="button"
                onClick={handleMarkExit}
                disabled={updating}
                className="w-full rounded-lg bg-orange-600 py-2.5 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-60"
              >
                {updating ? "Updating..." : "Mark Exit Time"}
              </button>
            )}
          </div>
        )}
      </div>

      {showDeleteConfirm && (
        <ConfirmDialog
          title="Delete visitor"
          message={`Permanently delete ${visitor?.name}'s record? This cannot be undone.`}
          busy={deleting}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  );
}

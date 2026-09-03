"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import { ROLES } from "@/lib/roles";
import Toast from "./Toast";
import ConfirmDialog from "./ConfirmDialog";
import IconButton from "./IconButton";
import { PencilIcon, TrashIcon, PlusIcon } from "./icons";

const EMPTY_FORM = { email: "", name: "", password: "", role: ROLES.GUARD };

function formatDate(value) {
  return new Date(value).toLocaleDateString(undefined, { dateStyle: "medium" });
}

function UserFormModal({ initial, onClose, onSaved, setToast }) {
  const isEdit = Boolean(initial);
  const [form, setForm] = useState(
    initial
      ? { email: initial.email, name: initial.name || "", password: "", role: initial.role }
      : EMPTY_FORM
  );
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!isEdit && (!form.email.trim() || !form.password)) {
      setError("Email and password are required.");
      return;
    }

    setSubmitting(true);
    try {
      const res = isEdit
        ? await apiFetch(`/api/users/${initial._id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: form.name.trim(),
              role: form.role,
              ...(form.password ? { password: form.password } : {}),
            }),
          })
        : await apiFetch("/api/users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
          });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");

      setToast({ type: "success", message: isEdit ? "User updated." : "User created." });
      onSaved(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-4 text-base font-bold text-slate-900">{isEdit ? "Edit User" : "Create User"}</h2>

        <form onSubmit={handleSubmit} className="space-y-3" noValidate>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Email</label>
            <input
              type="email"
              value={form.email}
              disabled={isEdit}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100 disabled:bg-slate-50 disabled:text-slate-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
              placeholder="Optional"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">
              Password {isEdit && <span className="font-normal text-slate-400">(leave blank to keep current)</span>}
            </label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Role</label>
            <select
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
            >
              <option value={ROLES.GUARD}>Guard — view visitors, mark exit only</option>
              <option value={ROLES.ADMIN}>Admin — full access + user management</option>
            </select>
          </div>

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-60"
            >
              {submitting ? "Saving..." : isEdit ? "Save Changes" : "Create User"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function UserManagement({ currentUserId }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [modalUser, setModalUser] = useState(undefined); // undefined = closed, null = create, object = edit
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/users");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load users.");
      setUsers(data.users);
    } catch (err) {
      setToast({ type: "error", message: err.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount pattern; setLoading(true) runs synchronously so the spinner shows immediately
    fetchUsers();
  }, [fetchUsers]);

  function handleSaved(user) {
    setModalUser(undefined);
    if (modalUser) {
      setUsers((prev) => prev.map((u) => (u._id === user._id ? user : u)));
    } else {
      setUsers((prev) => [user, ...prev]);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await apiFetch(`/api/users/${deleteTarget._id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not delete user.");

      setUsers((prev) => prev.filter((u) => u._id !== deleteTarget._id));
      setToast({ type: "success", message: `${deleteTarget.email} was removed.` });
      setDeleteTarget(null);
    } catch (err) {
      setToast({ type: "error", message: err.message });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <Toast toast={toast} onClose={() => setToast(null)} />

      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-900">Users</h1>
        <button
          type="button"
          onClick={() => setModalUser(null)}
          className="flex items-center gap-1.5 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700"
        >
          <PlusIcon width={16} height={16} />
          Create User
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              {["Name", "Email", "Role", "Created", ""].map((h) => (
                <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-3 py-10 text-center text-slate-400">
                  Loading users...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-10 text-center text-slate-400">
                  No users found.
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user._id}>
                  <td className="px-3 py-2 font-medium text-slate-900">{user.name || "—"}</td>
                  <td className="px-3 py-2 text-slate-600">{user.email}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
                        user.role === ROLES.ADMIN
                          ? "bg-orange-100 text-orange-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-slate-500">{formatDate(user.createdAt)}</td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-1">
                      <IconButton icon={<PencilIcon width={15} height={15} />} label="Edit user" size="sm" onClick={() => setModalUser(user)} />
                      <IconButton
                        icon={<TrashIcon width={15} height={15} />}
                        label={user._id === currentUserId ? "You cannot delete your own account" : "Delete user"}
                        variant="danger"
                        size="sm"
                        disabled={user._id === currentUserId}
                        onClick={() => setDeleteTarget(user)}
                      />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modalUser !== undefined && (
        <UserFormModal
          initial={modalUser}
          onClose={() => setModalUser(undefined)}
          onSaved={handleSaved}
          setToast={setToast}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete user"
          message={`Remove ${deleteTarget.email}? They will no longer be able to log in.`}
          busy={deleting}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

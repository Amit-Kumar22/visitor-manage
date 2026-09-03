"use client";

import { useCallback, useEffect, useState } from "react";
import { VISITOR_PURPOSES } from "@/lib/constants";
import { apiFetch } from "@/lib/apiClient";
import { ROLES } from "@/lib/roles";
import VisitorDetailModal from "./VisitorDetailModal";
import ConfirmDialog from "./ConfirmDialog";
import Toast from "./Toast";
import IconButton from "./IconButton";
import { PencilIcon, TrashIcon } from "./icons";

const PAGE_SIZE_OPTIONS = [10, 20];

function todayISODate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDateTime(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function Avatar({ visitor }) {
  if (visitor.photo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={visitor.photo} alt={visitor.name} className="h-9 w-9 rounded-full object-cover" />
    );
  }
  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-100 text-sm font-semibold text-orange-700">
      {visitor.name?.[0]?.toUpperCase() || "?"}
    </div>
  );
}

const TABLE_HEADERS = [
  "Photo",
  "Name",
  "Phone",
  "Purpose",
  "Meeting With",
  "Entry Time",
  "Exit Time",
  "Status",
  "",
];

export default function VisitorTable({ role }) {
  const isAdmin = role === ROLES.ADMIN;
  const [visitors, setVisitors] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [openInEdit, setOpenInEdit] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [searchInput, setSearchInput] = useState("");
  const [filters, setFilters] = useState({ search: "", purpose: "", dateFrom: "", dateTo: "" });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Debounce free-text typing before it turns into an actual API filter.
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((f) => ({ ...f, search: searchInput.trim() }));
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchVisitors = useCallback(
    async (signal) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (filters.search) params.set("search", filters.search);
        if (filters.purpose) params.set("purpose", filters.purpose);
        if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
        if (filters.dateTo) params.set("dateTo", filters.dateTo);
        params.set("page", String(page));
        params.set("limit", String(limit));

        const res = await apiFetch(`/api/visitors?${params.toString()}`, { signal });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load visitors.");

        setVisitors(data.visitors);
        setPagination(data.pagination);
      } catch (err) {
        if (err.name !== "AbortError") {
          setToast({ type: "error", message: err.message });
        }
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [filters, page, limit]
  );

  useEffect(() => {
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount/filter-change pattern; setLoading(true) runs synchronously so the spinner shows immediately
    fetchVisitors(controller.signal);
    return () => controller.abort();
  }, [fetchVisitors]);

  function updateFilter(key, value) {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  }

  function setToday() {
    const today = todayISODate();
    setFilters((f) => ({ ...f, dateFrom: today, dateTo: today }));
    setPage(1);
  }

  function clearDateFilter() {
    setFilters((f) => ({ ...f, dateFrom: "", dateTo: "" }));
    setPage(1);
  }

  async function handleMarkExit(visitor) {
    setUpdatingId(visitor._id);
    try {
      const res = await apiFetch(`/api/visitors/${visitor._id}`, { method: "PATCH" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not update exit time.");

      setVisitors((prev) => prev.map((v) => (v._id === visitor._id ? data.visitor : v)));
      setToast({ type: "success", message: `Exit time recorded for ${visitor.name}.` });
    } catch (err) {
      setToast({ type: "error", message: err.message });
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await apiFetch(`/api/visitors/${deleteTarget._id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not delete visitor.");

      setVisitors((prev) => prev.filter((v) => v._id !== deleteTarget._id));
      setPagination((p) => ({ ...p, total: Math.max(0, p.total - 1) }));
      setToast({ type: "success", message: `${deleteTarget.name} was deleted.` });
      setDeleteTarget(null);
    } catch (err) {
      setToast({ type: "error", message: err.message });
    } finally {
      setDeleting(false);
    }
  }

  const { total, totalPages } = pagination;

  return (
    <div className="mx-auto max-w-7xl">
      <Toast toast={toast} onClose={() => setToast(null)} />

      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
        <div className="min-w-[200px] flex-1">
          <label className="mb-1 block text-xs font-medium text-slate-500">Search</label>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name or phone"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Purpose</label>
          <select
            value={filters.purpose}
            onChange={(e) => updateFilter("purpose", e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
          >
            <option value="">All purposes</option>
            {VISITOR_PURPOSES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">From</label>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => updateFilter("dateFrom", e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">To</label>
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => updateFilter("dateTo", e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
          />
        </div>

        <button
          type="button"
          onClick={setToday}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          Today
        </button>
        <button
          type="button"
          onClick={clearDateFilter}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          Clear dates
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              {TABLE_HEADERS.map((h) => (
                <th
                  key={h}
                  className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={TABLE_HEADERS.length} className="px-3 py-10 text-center text-slate-400">
                  Loading visitors...
                </td>
              </tr>
            ) : visitors.length === 0 ? (
              <tr>
                <td colSpan={TABLE_HEADERS.length} className="px-3 py-10 text-center text-slate-400">
                  No visitors found.
                </td>
              </tr>
            ) : (
              visitors.map((visitor) => (
                <tr
                  key={visitor._id}
                  onClick={() => {
                    setOpenInEdit(false);
                    setSelectedId(visitor._id);
                  }}
                  className="cursor-pointer hover:bg-slate-50"
                >
                  <td className="px-3 py-2">
                    <Avatar visitor={visitor} />
                  </td>
                  <td className="px-3 py-2 font-medium text-slate-900">{visitor.name}</td>
                  <td className="px-3 py-2 text-slate-600">{visitor.phone}</td>
                  <td className="px-3 py-2 text-slate-600">{visitor.purpose}</td>
                  <td className="px-3 py-2 text-slate-600">{visitor.meetingWith}</td>
                  <td className="px-3 py-2 text-slate-600">{formatDateTime(visitor.entryTime)}</td>
                  <td className="px-3 py-2 text-slate-600">{formatDateTime(visitor.exitTime)}</td>
                  <td className="px-3 py-2">
                    {visitor.exitTime ? (
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                        Checked Out
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
                        Checked In
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      {!visitor.exitTime && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkExit(visitor);
                          }}
                          disabled={updatingId === visitor._id}
                          className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700 hover:bg-orange-100 disabled:opacity-60"
                        >
                          {updatingId === visitor._id ? "Updating..." : "Mark Exit"}
                        </button>
                      )}
                      {isAdmin && (
                        <>
                          <IconButton
                            icon={<PencilIcon width={15} height={15} />}
                            label="Edit visitor"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenInEdit(true);
                              setSelectedId(visitor._id);
                            }}
                          />
                          <IconButton
                            icon={<TrashIcon width={15} height={15} />}
                            label="Delete visitor"
                            variant="danger"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTarget(visitor);
                            }}
                          />
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
        <div className="flex items-center gap-2">
          <span>Rows per page</span>
          <select
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value));
              setPage(1);
            }}
            className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
          >
            {PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <span className="ml-2 text-slate-400">{total} total</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-lg border border-slate-300 px-3 py-1.5 font-medium hover:bg-slate-50 disabled:opacity-40"
          >
            Prev
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="rounded-lg border border-slate-300 px-3 py-1.5 font-medium hover:bg-slate-50 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>

      {selectedId && (
        <VisitorDetailModal
          visitorId={selectedId}
          isAdmin={isAdmin}
          startInEdit={openInEdit}
          onClose={() => {
            setSelectedId(null);
            setOpenInEdit(false);
          }}
          onUpdated={(updated) => {
            setVisitors((prev) => prev.map((v) => (v._id === updated._id ? updated : v)));
          }}
          onDeleted={(deletedId) => {
            setVisitors((prev) => prev.filter((v) => v._id !== deletedId));
            setPagination((p) => ({ ...p, total: Math.max(0, p.total - 1) }));
            setSelectedId(null);
          }}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete visitor"
          message={`Permanently delete ${deleteTarget.name}'s record? This cannot be undone.`}
          busy={deleting}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

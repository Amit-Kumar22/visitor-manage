"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import { ROLES } from "@/lib/roles";
import GuestDetailModal from "./GuestDetailModal";
import ConfirmDialog from "./ConfirmDialog";
import Toast from "./Toast";
import IconButton from "./IconButton";
import { PencilIcon, TrashIcon, FileIcon, ChevronDownIcon } from "./icons";

const PAGE_SIZE_OPTIONS = [10, 20];

function todayISODate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDateTime(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function Avatar({ guest }) {
  if (guest.photo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={guest.photo} alt={guest.name} className="h-9 w-9 rounded-full object-cover" />
    );
  }
  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-100 text-sm font-semibold text-orange-700">
      {guest.name?.[0]?.toUpperCase() || "?"}
    </div>
  );
}

function ExportMenu({ exporting, onExportExcel, onExportPdf }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  function choose(format) {
    setOpen(false);
    if (format === "excel") onExportExcel();
    else onExportPdf();
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={exporting !== null}
        className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {exporting ? `Exporting ${exporting === "excel" ? "Excel" : "PDF"}...` : "Export"}
        <ChevronDownIcon width={15} height={15} />
      </button>

      {open && (
        <div className="absolute right-0 z-10 mt-1 w-40 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          <button
            type="button"
            onClick={() => choose("excel")}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
          >
            <FileIcon width={16} height={16} className="text-emerald-600" />
            Excel (.xlsx)
          </button>
          <button
            type="button"
            onClick={() => choose("pdf")}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
          >
            <FileIcon width={16} height={16} className="text-red-600" />
            PDF
          </button>
        </div>
      )}
    </div>
  );
}

const TABLE_HEADERS = [
  "Photo",
  "Name",
  "Mobile",
  "Company",
  "Reg. ID",
  "Registered",
  "Check-in",
  "Status",
  "",
];

export default function GuestTable({ role }) {
  const isAdmin = role === ROLES.ADMIN;
  const [guests, setGuests] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [openInEdit, setOpenInEdit] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(null); // "excel" | "pdf" | null

  const [searchInput, setSearchInput] = useState("");
  const [filters, setFilters] = useState({ search: "", dateFrom: "", dateTo: "" });
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

  const fetchGuests = useCallback(
    async (signal) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (filters.search) params.set("search", filters.search);
        if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
        if (filters.dateTo) params.set("dateTo", filters.dateTo);
        params.set("page", String(page));
        params.set("limit", String(limit));

        const res = await apiFetch(`/api/guests?${params.toString()}`, { signal });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load guests.");

        setGuests(data.guests);
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
    fetchGuests(controller.signal);
    return () => controller.abort();
  }, [fetchGuests]);

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

  async function handleMarkCheckIn(guest) {
    setUpdatingId(guest._id);
    try {
      const res = await apiFetch(`/api/guests/${guest._id}`, { method: "PATCH" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not update check-in time.");

      setGuests((prev) => prev.map((g) => (g._id === guest._id ? data.guest : g)));
      setToast({ type: "success", message: `Check-in recorded for ${guest.name}.` });
    } catch (err) {
      setToast({ type: "error", message: err.message });
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await apiFetch(`/api/guests/${deleteTarget._id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not delete guest.");

      setGuests((prev) => prev.filter((g) => g._id !== deleteTarget._id));
      setPagination((p) => ({ ...p, total: Math.max(0, p.total - 1) }));
      setToast({ type: "success", message: `${deleteTarget.name} was deleted.` });
      setDeleteTarget(null);
    } catch (err) {
      setToast({ type: "error", message: err.message });
    } finally {
      setDeleting(false);
    }
  }

  // Pulls every guest matching the current filters (not just the current
  // page) for the export buttons, via the API's limit=all escape hatch.
  async function fetchAllForExport() {
    const params = new URLSearchParams();
    if (filters.search) params.set("search", filters.search);
    if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
    if (filters.dateTo) params.set("dateTo", filters.dateTo);
    params.set("limit", "all");

    const res = await apiFetch(`/api/guests?${params.toString()}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to load guests for export.");
    return data.guests;
  }

  function toExportRows(list) {
    return list.map((g) => ({
      Name: g.name,
      Mobile: g.mobile,
      Email: g.email,
      Company: g.company,
      Designation: g.designation,
      City: g.city,
      "Registration ID": g.registrationId,
      "Registration Time": formatDateTime(g.registrationTime),
      "Check-in Time": formatDateTime(g.checkInTime),
      Status: g.checkInTime ? "Checked In" : "Registered",
    }));
  }

  async function handleExportExcel() {
    setExporting("excel");
    try {
      const list = await fetchAllForExport();
      if (list.length === 0) {
        setToast({ type: "error", message: "No guests match the current filters." });
        return;
      }

      const XLSX = await import("xlsx");
      const sheet = XLSX.utils.json_to_sheet(toExportRows(list));
      sheet["!cols"] = [20, 14, 24, 20, 16, 14, 18, 20, 20, 14].map((wch) => ({ wch }));

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, sheet, "Guests");
      XLSX.writeFile(workbook, `event-guests-${todayISODate()}.xlsx`);
    } catch (err) {
      setToast({ type: "error", message: err.message });
    } finally {
      setExporting(null);
    }
  }

  async function handleExportPdf() {
    setExporting("pdf");
    try {
      const list = await fetchAllForExport();
      if (list.length === 0) {
        setToast({ type: "error", message: "No guests match the current filters." });
        return;
      }

      const [{ jsPDF }, { default: autoTable }] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ]);

      const doc = new jsPDF({ orientation: "landscape" });
      doc.setFontSize(14);
      doc.text("Event Guest Report", 14, 15);
      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text(
        `Generated ${new Date().toLocaleString()} • ${list.length} guest${list.length === 1 ? "" : "s"}`,
        14,
        21
      );

      autoTable(doc, {
        startY: 26,
        head: [["Name", "Mobile", "Email", "Company", "Designation", "City", "Reg. ID", "Registered", "Check-in", "Status"]],
        body: list.map((g) => [
          g.name,
          g.mobile,
          g.email,
          g.company,
          g.designation,
          g.city,
          g.registrationId,
          formatDateTime(g.registrationTime),
          formatDateTime(g.checkInTime),
          g.checkInTime ? "Checked In" : "Registered",
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [234, 88, 12] },
      });

      doc.save(`event-guests-${todayISODate()}.pdf`);
    } catch (err) {
      setToast({ type: "error", message: err.message });
    } finally {
      setExporting(null);
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
            placeholder="Search by name, mobile, email, company, or reg. ID"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
          />
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

        <div className="ml-auto">
          <ExportMenu exporting={exporting} onExportExcel={handleExportExcel} onExportPdf={handleExportPdf} />
        </div>
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
                  Loading guests...
                </td>
              </tr>
            ) : guests.length === 0 ? (
              <tr>
                <td colSpan={TABLE_HEADERS.length} className="px-3 py-10 text-center text-slate-400">
                  No guests found.
                </td>
              </tr>
            ) : (
              guests.map((guest) => (
                <tr
                  key={guest._id}
                  onClick={() => {
                    setOpenInEdit(false);
                    setSelectedId(guest._id);
                  }}
                  className="cursor-pointer hover:bg-slate-50"
                >
                  <td className="px-3 py-2">
                    <Avatar guest={guest} />
                  </td>
                  <td className="px-3 py-2 font-medium text-slate-900">{guest.name}</td>
                  <td className="px-3 py-2 text-slate-600">{guest.mobile}</td>
                  <td className="px-3 py-2 text-slate-600">{guest.company || "—"}</td>
                  <td className="px-3 py-2 font-mono text-xs text-slate-600">{guest.registrationId}</td>
                  <td className="px-3 py-2 text-slate-600">{formatDateTime(guest.registrationTime)}</td>
                  <td className="px-3 py-2 text-slate-600">{formatDateTime(guest.checkInTime)}</td>
                  <td className="px-3 py-2">
                    {guest.checkInTime ? (
                      <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
                        Checked In
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                        Registered
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      {!guest.checkInTime && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkCheckIn(guest);
                          }}
                          disabled={updatingId === guest._id}
                          className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700 hover:bg-orange-100 disabled:opacity-60"
                        >
                          {updatingId === guest._id ? "Updating..." : "Mark Check-in"}
                        </button>
                      )}
                      {isAdmin && (
                        <>
                          <IconButton
                            icon={<PencilIcon width={15} height={15} />}
                            label="Edit guest"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenInEdit(true);
                              setSelectedId(guest._id);
                            }}
                          />
                          <IconButton
                            icon={<TrashIcon width={15} height={15} />}
                            label="Delete guest"
                            variant="danger"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTarget(guest);
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
        <GuestDetailModal
          guestId={selectedId}
          isAdmin={isAdmin}
          startInEdit={openInEdit}
          onClose={() => {
            setSelectedId(null);
            setOpenInEdit(false);
          }}
          onUpdated={(updated) => {
            setGuests((prev) => prev.map((g) => (g._id === updated._id ? updated : g)));
          }}
          onDeleted={(deletedId) => {
            setGuests((prev) => prev.filter((g) => g._id !== deletedId));
            setPagination((p) => ({ ...p, total: Math.max(0, p.total - 1) }));
            setSelectedId(null);
          }}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete guest"
          message={`Permanently delete ${deleteTarget.name}'s registration? This cannot be undone.`}
          busy={deleting}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

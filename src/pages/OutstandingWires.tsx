import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Filter, Download, Trash2, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useOutstandingWires,
  useCreateOutstandingWires,
  useUpdateOutstandingWire,
  useDeleteOutstandingWire,
  type OutstandingWire,
  type OutstandingWireInsert,
} from "@/hooks/useOutstandingWires";
import { useAuth } from "@/hooks/useAuth";
import { StatusBadge } from "@/components/StatusBadge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

const STATUS_OPTIONS = ["All", "Needs TRX ID", "Waiting on Settlement"];

const GRID_COLS = [
  { key: "status", label: "Status", width: "w-[140px]", type: "status" },
  { key: "wf_account", label: "Account", width: "w-[130px]", type: "account" },
  { key: "wiring_date", label: "Date", width: "w-[120px]", type: "date" },
  { key: "amount", label: "Amount", width: "w-[110px]", type: "number" },
  { key: "receipt_number", label: "Receipt #", width: "w-[110px]", type: "text" },
  { key: "invoice_number", label: "Invoice #", width: "w-[110px]", type: "text" },
  { key: "description", label: "Description", width: "w-[180px]", type: "text" },
  { key: "accounting_notes", label: "Acct. Notes", width: "w-[180px]", type: "text" },
  { key: "trx_notes", label: "TRX Notes", width: "w-[180px]", type: "text" },
] as const;

type ColKey = typeof GRID_COLS[number]["key"];
const ACCOUNTING_COLS: ColKey[] = ["status", "wf_account", "wiring_date", "amount", "receipt_number", "invoice_number", "description", "accounting_notes"];

function normalizeAccount(raw: string): string {
  const t = raw.trim().toLowerCase();
  if (t.includes("3694")) return "WF-3694";
  return "WF-8022";
}

function normalizeStatus(raw: string): string {
  if (raw.trim().toLowerCase().includes("settlement")) return "Waiting on Settlement";
  return "Needs TRX ID";
}

function exportCSV(rows: OutstandingWire[], tab: string) {
  const headers = GRID_COLS.map((c) => c.label);
  const fields = GRID_COLS.map((c) => c.key);
  const csv = [
    headers.join(","),
    ...rows.map((r) => fields.map((f) => `"${String((r as any)[f] ?? "").replace(/"/g, '""')}"`).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `outstanding_wires_${tab}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ---- Save status tracker ----
type SaveStatus = "idle" | "saving" | "saved";

function SaveIndicator({ status }: { status: SaveStatus }) {
  if (status === "idle") return null;
  return (
    <div className="flex items-center gap-1.5 text-xs animate-in fade-in duration-200">
      {status === "saving" ? (
        <>
          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
          <span className="text-muted-foreground">Saving…</span>
        </>
      ) : (
        <>
          <Check className="h-3 w-3 text-emerald-500" />
          <span className="text-emerald-600 dark:text-emerald-400">All changes saved</span>
        </>
      )}
    </div>
  );
}

// ---- Main Component ----

export default function OutstandingWires() {
  const { data: records, isLoading, error } = useOutstandingWires();
  const { isAccounting, user } = useAuth();
  const [tab, setTab] = useState("realty");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const markSaving = useCallback(() => {
    setSaveStatus("saving");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
  }, []);

  const markSaved = useCallback(() => {
    setSaveStatus("saved");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => setSaveStatus("idle"), 3000);
  }, []);

  const filtered = useMemo(() => {
    let result = (records ?? []).filter((r) => r.category === tab);
    if (statusFilter !== "All") result = result.filter((r) => r.status === statusFilter);
    const q = search.toLowerCase();
    if (q) {
      result = result.filter(
        (r) =>
          (r.description ?? "").toLowerCase().includes(q) ||
          (r.invoice_number ?? "").toLowerCase().includes(q) ||
          (r.receipt_number ?? "").toLowerCase().includes(q) ||
          (r.trx_notes ?? "").toLowerCase().includes(q) ||
          (r.wf_account ?? "").toLowerCase().includes(q)
      );
    }
    return result;
  }, [records, tab, statusFilter, search]);

  // Realty sub-filter
  const [realtyAccount, setRealtyAccount] = useState("all");
  const realtyFiltered = useMemo(() => {
    if (realtyAccount === "all") return filtered;
    return filtered.filter((r) => r.wf_account === realtyAccount);
  }, [filtered, realtyAccount]);

  return (
    <div className="mx-auto flex h-full max-w-[98vw] flex-col gap-4 p-3 sm:p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Outstanding Wires</h1>
          <p className="text-sm text-muted-foreground">
            Live editable grid — paste from Excel or edit inline. Independent from Expected Wires.
          </p>
        </div>
        <SaveIndicator status={saveStatus} />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search description, invoice, receipt..." className="h-8 pl-9 text-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex items-center gap-1">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 w-[180px] text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" size="sm" className="h-8" onClick={() => exportCSV(filtered, tab)} disabled={filtered.length === 0}>
          <Download className="h-4 w-4 mr-1" />Export
        </Button>
      </div>

      {/* Sub-tabs */}
      <Tabs value={tab} onValueChange={(v) => { setTab(v); setRealtyAccount("all"); }}>
        <TabsList className="w-fit">
          <TabsTrigger value="realty">Realty</TabsTrigger>
          <TabsTrigger value="payload">Payload</TabsTrigger>
          <TabsTrigger value="commercial">Commercial</TabsTrigger>
          <TabsTrigger value="international">International</TabsTrigger>
        </TabsList>

        <TabsContent value="realty" className="mt-4 space-y-3">
          {/* Realty account filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Filter account:</span>
            {["all", "WF-8022", "WF-3694"].map((v) => (
              <Button
                key={v}
                variant={realtyAccount === v ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setRealtyAccount(v)}
              >
                {v === "all" ? "All" : v === "WF-8022" ? "XXXX-8022" : "XXXX-3694"}
              </Button>
            ))}
          </div>
          {isLoading ? <LoadingSkeleton /> : error ? <ErrorMsg error={error} /> : (
            <LiveGrid
              records={realtyFiltered}
              category="realty"
              isAccounting={isAccounting}
              userId={user?.id ?? null}
              onSaving={markSaving}
              onSaved={markSaved}
            />
          )}
        </TabsContent>

        {["payload", "commercial", "international"].map((t) => (
          <TabsContent key={t} value={t} className="mt-4">
            {isLoading ? <LoadingSkeleton /> : error ? <ErrorMsg error={error} /> : (
              <LiveGrid
                records={filtered}
                category={t}
                isAccounting={isAccounting}
                userId={user?.id ?? null}
                onSaving={markSaving}
                onSaved={markSaved}
              />
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

// ---- Live Editable Grid ----

const EMPTY_ROWS_COUNT = 50;

interface EmptyRow {
  _empty: true;
  _key: string;
  status: string;
  wf_account: string;
  wiring_date: string;
  amount: string;
  receipt_number: string;
  invoice_number: string;
  description: string;
  accounting_notes: string;
  trx_notes: string;
}

let emptyKeyCounter = 0;
function makeEmptyRow(): EmptyRow {
  return {
    _empty: true,
    _key: `empty-${++emptyKeyCounter}`,
    status: "Needs TRX ID",
    wf_account: "WF-8022",
    wiring_date: "",
    amount: "",
    receipt_number: "",
    invoice_number: "",
    description: "",
    accounting_notes: "",
    trx_notes: "",
  };
}

function makeEmptyRows(count: number): EmptyRow[] {
  return Array.from({ length: count }, () => makeEmptyRow());
}

type DisplayRow = (OutstandingWire & { _empty?: false }) | EmptyRow;

function isEmptyRow(r: DisplayRow): r is EmptyRow {
  return (r as any)._empty === true;
}

function rowHasData(r: EmptyRow): boolean {
  return !!(r.amount || r.description || r.receipt_number || r.invoice_number || r.wiring_date || r.accounting_notes || r.trx_notes);
}

function LiveGrid({
  records,
  category,
  isAccounting,
  userId,
  onSaving,
  onSaved,
}: {
  records: OutstandingWire[];
  category: string;
  isAccounting: boolean;
  userId: string | null;
  onSaving: () => void;
  onSaved: () => void;
}) {
  const create = useCreateOutstandingWires();
  const update = useUpdateOutstandingWire();
  const remove = useDeleteOutstandingWire();

  const [emptyRows, setEmptyRows] = useState<EmptyRow[]>(() => makeEmptyRows(EMPTY_ROWS_COUNT));
  const gridRef = useRef<HTMLDivElement>(null);

  // Combined display: saved records first, then empty rows
  const displayRows: DisplayRow[] = useMemo(() => [...records, ...emptyRows], [records, emptyRows]);

  const canEditCol = useCallback((col: ColKey) => {
    if (col === "trx_notes") return true;
    return isAccounting && ACCOUNTING_COLS.includes(col);
  }, [isAccounting]);

  // Save existing record field
  const saveField = useCallback((id: string, field: string, value: any) => {
    onSaving();
    update.mutate(
      { id, [field]: value },
      {
        onSuccess: () => onSaved(),
        onError: (err: any) => { onSaved(); toast.error("Failed to update", { description: err.message }); },
      }
    );
  }, [update, onSaving, onSaved]);

  // Commit an empty row to the database
  const commitEmptyRow = useCallback((row: EmptyRow) => {
    if (!rowHasData(row)) return;
    onSaving();
    const insert: OutstandingWireInsert = {
      status: row.status,
      wf_account: row.wf_account,
      wiring_date: row.wiring_date || null,
      amount: row.amount ? parseFloat(row.amount) : null,
      receipt_number: row.receipt_number || null,
      invoice_number: row.invoice_number || null,
      description: row.description || null,
      accounting_notes: row.accounting_notes || null,
      trx_notes: row.trx_notes || null,
      category,
      created_by: userId,
    };
    create.mutate([insert], {
      onSuccess: () => {
        // Remove committed row and append a fresh empty
        setEmptyRows((prev) => [...prev.filter((r) => r._key !== row._key), makeEmptyRow()]);
        onSaved();
      },
      onError: (err: any) => { onSaved(); toast.error("Failed to save", { description: err.message }); },
    });
  }, [create, category, userId, onSaving, onSaved]);

  // Update empty row cell
  const updateEmptyCell = useCallback((key: string, field: ColKey, value: string) => {
    setEmptyRows((prev) => prev.map((r) => r._key === key ? { ...r, [field]: value } : r));
  }, []);

  // Handle paste on the grid
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData("text");
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length <= 1 && !text.includes("\t")) return; // single value, let default behavior

    e.preventDefault();

    // Find active cell position
    const active = document.activeElement as HTMLElement | null;
    let startRow = 0;
    let startCol = 0;
    if (active?.dataset.gridrow) startRow = parseInt(active.dataset.gridrow, 10) || 0;
    if (active?.dataset.gridcol) startCol = parseInt(active.dataset.gridcol, 10) || 0;

    const fieldKeys = GRID_COLS.map((c) => c.key);

    // Batch: collect new empty rows to create and existing rows to update
    const existingUpdates: { id: string; field: string; value: any }[] = [];
    const newEmptyUpdates: { key: string; field: ColKey; value: string }[] = [];
    let extraEmptyNeeded = 0;

    const currentEmpty = [...emptyRows];

    for (let i = 0; i < lines.length; i++) {
      const rowIdx = startRow + i;
      const cols = lines[i].split("\t");

      if (rowIdx < records.length) {
        // Pasting into an existing saved row
        const rec = records[rowIdx];
        cols.forEach((val, ci) => {
          const colIdx = startCol + ci;
          if (colIdx >= fieldKeys.length) return;
          const field = fieldKeys[colIdx];
          if (!canEditCol(field)) return;
          let normalized: any = val.trim();
          if (field === "wf_account") normalized = normalizeAccount(normalized);
          else if (field === "status") normalized = normalizeStatus(normalized);
          else if (field === "amount") normalized = parseFloat(normalized) || null;
          else normalized = normalized || null;
          existingUpdates.push({ id: rec.id, field, value: normalized });
        });
      } else {
        // Pasting into an empty row
        const emptyIdx = rowIdx - records.length;
        if (emptyIdx >= currentEmpty.length) {
          // Need more empty rows
          const needed = emptyIdx - currentEmpty.length + 1;
          for (let n = 0; n < needed; n++) currentEmpty.push(makeEmptyRow());
          extraEmptyNeeded += needed;
        }
        const emptyRow = currentEmpty[emptyIdx];
        cols.forEach((val, ci) => {
          const colIdx = startCol + ci;
          if (colIdx >= fieldKeys.length) return;
          const field = fieldKeys[colIdx];
          if (!canEditCol(field)) return;
          let normalized = val.trim();
          if (field === "wf_account") normalized = normalizeAccount(normalized);
          else if (field === "status") normalized = normalizeStatus(normalized);
          newEmptyUpdates.push({ key: emptyRow._key, field, value: normalized });
        });
      }
    }

    // Apply updates
    existingUpdates.forEach((u) => {
      onSaving();
      update.mutate({ id: u.id, [u.field]: u.value }, {
        onSuccess: () => onSaved(),
        onError: () => onSaved(),
      });
    });

    // Update empty rows state
    setEmptyRows(() => {
      const updated = [...currentEmpty];
      newEmptyUpdates.forEach((u) => {
        const idx = updated.findIndex((r) => r._key === u.key);
        if (idx >= 0) updated[idx] = { ...updated[idx], [u.field]: u.value };
      });
      return updated;
    });

    toast.success(`Pasted ${lines.length} row${lines.length > 1 ? "s" : ""}`);
  }, [records, emptyRows, canEditCol, update, onSaving, onSaved]);

  // Commit all filled empty rows
  const commitAllFilled = useCallback(() => {
    const filled = emptyRows.filter(rowHasData);
    if (filled.length === 0) return;
    onSaving();
    const inserts: OutstandingWireInsert[] = filled.map((r) => ({
      status: r.status,
      wf_account: r.wf_account,
      wiring_date: r.wiring_date || null,
      amount: r.amount ? parseFloat(r.amount) : null,
      receipt_number: r.receipt_number || null,
      invoice_number: r.invoice_number || null,
      description: r.description || null,
      accounting_notes: r.accounting_notes || null,
      trx_notes: r.trx_notes || null,
      category,
      created_by: userId,
    }));
    create.mutate(inserts, {
      onSuccess: () => {
        setEmptyRows((prev) => {
          const remaining = prev.filter((r) => !rowHasData(r));
          // Ensure we keep at least EMPTY_ROWS_COUNT
          const needed = Math.max(0, EMPTY_ROWS_COUNT - remaining.length);
          return [...remaining, ...makeEmptyRows(needed)];
        });
        onSaved();
        toast.success(`${inserts.length} wire${inserts.length > 1 ? "s" : ""} saved`);
      },
      onError: (err: any) => { onSaved(); toast.error("Failed", { description: err.message }); },
    });
  }, [emptyRows, create, category, userId, onSaving, onSaved]);

  const filledCount = emptyRows.filter(rowHasData).length;

  return (
    <Card className="bg-card shadow-sm overflow-hidden">
      <CardContent className="p-0">
        {/* Grid toolbar */}
        {isAccounting && filledCount > 0 && (
          <div className="flex items-center justify-between border-b bg-muted/30 px-3 py-1.5">
            <span className="text-xs text-muted-foreground tabular-nums">
              {filledCount} unsaved row{filledCount !== 1 ? "s" : ""} with data
            </span>
            <Button size="sm" className="h-7 text-xs" onClick={commitAllFilled} disabled={create.isPending}>
              {create.isPending ? "Saving…" : `Save ${filledCount} row${filledCount !== 1 ? "s" : ""}`}
            </Button>
          </div>
        )}

        <div ref={gridRef} className="overflow-auto max-h-[70vh]" onPaste={handlePaste}>
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-muted/60 border-b">
                <th className="px-1 py-2 text-center text-[10px] font-medium text-muted-foreground w-8">#</th>
                {GRID_COLS.map((col) => {
                  const locked = ACCOUNTING_COLS.includes(col.key) && !isAccounting;
                  return (
                    <th key={col.key} className={`px-1.5 py-2 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider ${col.width}`}>
                      {col.label}{locked ? " 🔒" : ""}
                    </th>
                  );
                })}
                {isAccounting && <th className="w-8" />}
              </tr>
            </thead>
            <tbody>
              {displayRows.map((row, ri) => {
                const empty = isEmptyRow(row);
                const rowKey = empty ? row._key : row.id;

                return (
                  <tr
                    key={rowKey}
                    className={`border-b border-border/40 group transition-colors ${empty ? "bg-transparent hover:bg-muted/10" : "hover:bg-muted/20"}`}
                  >
                    <td className="px-1 py-0.5 text-center text-[10px] text-muted-foreground tabular-nums select-none">
                      {ri + 1}
                    </td>

                    {GRID_COLS.map((col, ci) => {
                      const editable = canEditCol(col.key);
                      const value = (row as any)[col.key] ?? "";

                      if (!editable) {
                        // Read-only cell
                        return (
                          <td key={col.key} className="px-1.5 py-0.5">
                            {col.key === "status" ? (
                              empty ? <span className="text-xs text-muted-foreground/40">—</span> : <StatusBadge status={value} />
                            ) : col.key === "amount" && value ? (
                              <span className="font-mono text-xs">${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            ) : (
                              <span className="text-xs text-muted-foreground">{value || "—"}</span>
                            )}
                          </td>
                        );
                      }

                      // Editable cell
                      if (col.type === "status") {
                        return (
                          <td key={col.key} className="px-0.5 py-0.5">
                            <select
                              className="w-full h-7 text-xs bg-transparent border-0 outline-none focus:ring-1 focus:ring-ring rounded px-1 cursor-pointer"
                              value={value || "Needs TRX ID"}
                              data-gridrow={ri}
                              data-gridcol={ci}
                              onChange={(e) => {
                                if (empty) updateEmptyCell(row._key, col.key, e.target.value);
                                else saveField(row.id, col.key, e.target.value);
                              }}
                            >
                              <option value="Needs TRX ID">Needs TRX ID</option>
                              <option value="Waiting on Settlement">Waiting on Settlement</option>
                            </select>
                          </td>
                        );
                      }

                      if (col.type === "account") {
                        return (
                          <td key={col.key} className="px-0.5 py-0.5">
                            <select
                              className="w-full h-7 text-xs font-mono bg-transparent border-0 outline-none focus:ring-1 focus:ring-ring rounded px-1 cursor-pointer"
                              value={value || "WF-8022"}
                              data-gridrow={ri}
                              data-gridcol={ci}
                              onChange={(e) => {
                                if (empty) updateEmptyCell(row._key, col.key, e.target.value);
                                else saveField(row.id, col.key, e.target.value);
                              }}
                            >
                              <option value="WF-8022">XXXX-8022</option>
                              <option value="WF-3694">XXXX-3694</option>
                            </select>
                          </td>
                        );
                      }

                      // Text / number / date input
                      return (
                        <td key={col.key} className="px-0.5 py-0.5">
                          {empty ? (
                            <input
                              className="w-full h-7 text-xs bg-transparent border-0 outline-none focus:ring-1 focus:ring-ring rounded px-1 placeholder:text-muted-foreground/30"
                              type={col.type === "number" ? "number" : col.type === "date" ? "date" : "text"}
                              step={col.type === "number" ? "0.01" : undefined}
                              value={value}
                              data-gridrow={ri}
                              data-gridcol={ci}
                              placeholder={col.type === "number" ? "0.00" : ""}
                              onChange={(e) => updateEmptyCell(row._key, col.key, e.target.value)}
                              onBlur={() => {
                                // Auto-commit on blur if row has data
                                const currentRow = emptyRows.find((r) => r._key === row._key);
                                // Don't auto-commit, let user click Save
                              }}
                            />
                          ) : (
                            <InlineEditCell
                              value={String(value ?? "")}
                              type={col.type}
                              gridRow={ri}
                              gridCol={ci}
                              onSave={(v) => {
                                let parsed: any = v || null;
                                if (col.type === "number") parsed = parseFloat(v) || null;
                                saveField(row.id, col.key, parsed);
                              }}
                            />
                          )}
                        </td>
                      );
                    })}

                    {/* Delete button for saved rows */}
                    {isAccounting && (
                      <td className="px-0.5 py-0.5 w-8">
                        {!empty && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <button className="opacity-0 group-hover:opacity-100 h-6 w-6 flex items-center justify-center text-destructive/50 hover:text-destructive rounded transition-opacity">
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete this wire?</AlertDialogTitle>
                                <AlertDialogDescription>This will permanently remove this entry.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  onClick={() => remove.mutate(row.id, {
                                    onSuccess: () => toast.success("Deleted"),
                                    onError: (err: any) => toast.error("Failed", { description: err.message }),
                                  })}
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Tip bar */}
        <div className="flex items-center justify-between border-t bg-muted/20 px-3 py-1.5">
          <span className="text-[11px] text-muted-foreground">
            Tip: Select a cell and paste from Excel — rows & columns auto-map
          </span>
          <span className="text-[11px] text-muted-foreground tabular-nums">
            {records.length} saved · {emptyRows.length} blank rows
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// ---- Inline Edit Cell (for saved records) ----

function InlineEditCell({
  value,
  type,
  gridRow,
  gridCol,
  onSave,
}: {
  value: string;
  type: string;
  gridRow: number;
  gridCol: number;
  onSave: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [local, setLocal] = useState(value);

  useEffect(() => { setLocal(value); }, [value]);

  if (!editing) {
    const display = type === "number" && value
      ? `$${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
      : value || "—";
    return (
      <button
        className="w-full min-w-[40px] h-7 rounded px-1 text-left text-xs transition-colors hover:bg-muted/60 truncate"
        onClick={() => { setLocal(value); setEditing(true); }}
        data-gridrow={gridRow}
        data-gridcol={gridCol}
      >
        {display === "—" ? <span className="text-muted-foreground/40">—</span> : display}
      </button>
    );
  }

  return (
    <input
      className="w-full h-7 text-xs bg-background border border-input outline-none focus:ring-1 focus:ring-ring rounded px-1"
      type={type === "number" ? "number" : type === "date" ? "date" : "text"}
      step={type === "number" ? "0.01" : undefined}
      value={local}
      data-gridrow={gridRow}
      data-gridcol={gridCol}
      autoFocus
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => { setEditing(false); if (local !== value) onSave(local); }}
      onKeyDown={(e) => {
        if (e.key === "Enter") { setEditing(false); if (local !== value) onSave(local); }
        if (e.key === "Escape") { setEditing(false); setLocal(value); }
      }}
    />
  );
}

// ---- Utility Components ----

function LoadingSkeleton() {
  return (
    <div className="space-y-2 p-4">
      {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
    </div>
  );
}

function ErrorMsg({ error }: { error: unknown }) {
  return <p className="p-4 text-center text-sm text-destructive">Error: {(error as Error).message}</p>;
}

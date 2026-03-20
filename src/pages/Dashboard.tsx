import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Search, Filter, Download, ArrowUp, ArrowDown, ArrowUpDown, X, Columns3, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useWireRecords, type WireRecord } from "@/hooks/useWireRecords";
import { InlineEditRow } from "@/components/InlineEditRow";
import { WireDetailDialog } from "@/components/WireDetailDialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const DEFAULT_COL_WIDTHS: Record<string, number> = {
  tid: 100, department: 130, sent_by: 120, customer: 130, address: 180, balance: 110,
  agent: 110, status: 100, wiring_inst: 130, wiring_date: 120, adjustments: 100,
  txn_notes: 160, receipt: 80, amt_wired: 110, ar_date: 120, recon_notes: 160,
};

export const COLUMNS: { key: string; label: string; field: string }[] = [
  { key: "tid", label: "TID", field: "tid" },
  { key: "department", label: "Department", field: "department" },
  { key: "sent_by", label: "Sent By", field: "created_by_name" },
  { key: "customer", label: "Customer", field: "customer_name" },
  { key: "address", label: "Property Address", field: "property_address" },
  { key: "balance", label: "Balance Due", field: "balance_due" },
  { key: "agent", label: "Agent", field: "agent_name" },
  { key: "status", label: "Status", field: "status" },
  { key: "wiring_inst", label: "Wiring Inst.", field: "wiring_institution" },
  { key: "wiring_date", label: "Wiring Date", field: "wiring_date" },
  { key: "adjustments", label: "Adjustments", field: "adjustments" },
  { key: "txn_notes", label: "Deal Notes", field: "transaction_notes" },
  { key: "receipt", label: "Receipt", field: "wire_receipt" },
  { key: "amt_wired", label: "Amt Wired", field: "amount_wired" },
  { key: "ar_date", label: "AR Date", field: "ar_date_received" },
  { key: "recon_notes", label: "Recon Notes", field: "reconciliation_notes" },
];

const STATUS_OPTIONS = ["All", "Pending", "Sent", "Received", "Reconciled", "Other - See Notes"];

function getFieldValue(record: any, field: string): string {
  const v = record[field];
  if (v == null) return "";
  return String(v);
}

function exportCSV(rows: any[]) {
  const headers = ["TID","Department","WF Account","Customer","Property Address","Balance Due","Agent","Status","Wiring Institution","Wiring Date","Adjustments","Wire Receipt","Amount Wired","AR Date Received","Reconciliation Notes"];
  const keys = ["tid","department","wf_account","customer_name","property_address","balance_due","agent_name","status","wiring_institution","wiring_date","adjustments","wire_receipt","amount_wired","ar_date_received","reconciliation_notes"] as const;
  const csv = [headers.join(","), ...rows.map(r => keys.map(k => {
    const v = r[k] ?? "";
    return `"${String(v).replace(/"/g, '""')}"`;
  }).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `wire_records_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

type SortDir = "asc" | "desc" | null;

export default function Dashboard() {
  const { data: records, isLoading, error } = useWireRecords();
  const { isAdmin } = useAuth();
  const location = useLocation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [colWidths, setColWidths] = useState<Record<string, number>>({ ...DEFAULT_COL_WIDTHS });
  const [selectedRecord, setSelectedRecord] = useState<WireRecord | null>(null);
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [columnFilters, setColumnFilters] = useState<Record<string, Set<string>>>({});
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(new Set());
  const [hideReconciled, setHideReconciled] = useState(false);

  // Highlight wire after creation
  useEffect(() => {
    const state = location.state as { highlightWireId?: string } | null;
    if (state?.highlightWireId) {
      setHighlightId(state.highlightWireId);
      window.history.replaceState({}, document.title);
      const timer = setTimeout(() => setHighlightId(null), 9000);
      return () => clearTimeout(timer);
    }
  }, [location.state]);

  const visibleColumns = useMemo(() => COLUMNS.filter(c => !hiddenCols.has(c.key)), [hiddenCols]);

  const toggleColVisibility = useCallback((key: string) => {
    setHiddenCols(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const handleResize = useCallback((key: string, width: number) => {
    setColWidths((prev) => ({ ...prev, [key]: Math.max(50, width) }));
  }, []);

  const handleSort = useCallback((colKey: string) => {
    if (sortCol === colKey) {
      if (sortDir === "asc") setSortDir("desc");
      else if (sortDir === "desc") { setSortCol(null); setSortDir(null); }
    } else {
      setSortCol(colKey);
      setSortDir("asc");
    }
  }, [sortCol, sortDir]);

  const toggleColumnFilter = useCallback((colKey: string, value: string) => {
    setColumnFilters(prev => {
      const next = { ...prev };
      const set = new Set(next[colKey] ?? []);
      if (set.has(value)) set.delete(value);
      else set.add(value);
      if (set.size === 0) delete next[colKey];
      else next[colKey] = set;
      return next;
    });
  }, []);

  const clearColumnFilter = useCallback((colKey: string) => {
    setColumnFilters(prev => {
      const next = { ...prev };
      delete next[colKey];
      return next;
    });
  }, []);

  const uniqueValues = useMemo(() => {
    if (!records) return {};
    const map: Record<string, string[]> = {};
    COLUMNS.forEach(col => {
      const vals = new Set<string>();
      records.forEach(r => {
        const v = getFieldValue(r, col.field);
        if (v) vals.add(v);
      });
      map[col.key] = [...vals].sort();
    });
    return map;
  }, [records]);

  const filtered = useMemo(() => {
    let result = (records ?? []).filter((r) => {
      const matchesStatus = statusFilter === "All" || r.status === statusFilter;
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        r.tid.toLowerCase().includes(q) ||
        (r.customer_name ?? "").toLowerCase().includes(q) ||
        (r.property_address ?? "").toLowerCase().includes(q) ||
        (r.agent_name ?? "").toLowerCase().includes(q) ||
        ((r as any).created_by_name ?? "").toLowerCase().includes(q);
      // Hide Reconciled toggle
      const matchesReconciled = !hideReconciled || r.wire_receipt !== true;
      return matchesStatus && matchesSearch && matchesReconciled;
    });

    for (const [colKey, values] of Object.entries(columnFilters)) {
      const col = COLUMNS.find(c => c.key === colKey);
      if (!col) continue;
      result = result.filter(r => values.has(getFieldValue(r, col.field)));
    }

    if (sortCol && sortDir) {
      const col = COLUMNS.find(c => c.key === sortCol);
      if (col) {
        result = [...result].sort((a, b) => {
          const av = getFieldValue(a, col.field).toLowerCase();
          const bv = getFieldValue(b, col.field).toLowerCase();
          const numA = Number(av), numB = Number(bv);
          const isNum = !isNaN(numA) && !isNaN(numB) && av !== "" && bv !== "";
          if (isNum) return sortDir === "asc" ? numA - numB : numB - numA;
          return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
        });
      }
    }

    return result;
  }, [records, statusFilter, search, columnFilters, sortCol, sortDir, hideReconciled]);

  const isSorted = sortCol !== null;

  const sortWithHighlightFirst = (arr: typeof filtered) => {
    if (!highlightId) return arr;
    const idx = arr.findIndex(r => r.id === highlightId);
    if (idx <= 0) return arr;
    return [arr[idx], ...arr.slice(0, idx), ...arr.slice(idx + 1)];
  };

  const filtered3694 = isSorted ? [] : sortWithHighlightFirst(filtered.filter((r) => r.wf_account === "3694"));
  const filtered8022 = isSorted ? [] : sortWithHighlightFirst(filtered.filter((r) => r.wf_account === "8022"));
  const filteredOther = isSorted ? [] : sortWithHighlightFirst(filtered.filter((r) => r.wf_account !== "3694" && r.wf_account !== "8022"));

  const counts = {
    total: records?.length ?? 0,
    pending: records?.filter((r) => r.status === "Pending").length ?? 0,
    sent: records?.filter((r) => r.status === "Sent").length ?? 0,
    received: records?.filter((r) => r.status === "Received").length ?? 0,
    reconciled: records?.filter((r) => r.status === "Reconciled").length ?? 0,
    other: records?.filter((r) => r.status === "Other - See Notes").length ?? 0,
  };

  const activeFilterCount = Object.keys(columnFilters).length;
  const visibleColCount = visibleColumns.length;

  return (
    <>
    <div className="mx-auto flex h-full max-w-[98vw] flex-col gap-4 p-3 sm:p-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Expected Wires</h1>
        <p className="text-sm text-muted-foreground">
          Track all expected wire records. Analysts edit deal data; Accounting finalizes reconciliation.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-6 gap-2">
        <SummaryCard label="Total" value={counts.total} active={statusFilter === "All"} onClick={() => setStatusFilter("All")} />
        <SummaryCard label="Pending" value={counts.pending} color="amber" active={statusFilter === "Pending"} onClick={() => setStatusFilter("Pending")} />
        <SummaryCard label="Sent" value={counts.sent} color="blue" active={statusFilter === "Sent"} onClick={() => setStatusFilter("Sent")} />
        <SummaryCard label="Received" value={counts.received} color="emerald" active={statusFilter === "Received"} onClick={() => setStatusFilter("Received")} />
        <SummaryCard label="Reconciled" value={counts.reconciled} color="forest" active={statusFilter === "Reconciled"} onClick={() => setStatusFilter("Reconciled")} />
        <SummaryCard label="Other" value={counts.other} color="rose" active={statusFilter === "Other - See Notes"} onClick={() => setStatusFilter("Other - See Notes")} />
      </div>

      {/* Filters row */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
           <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
           <Input
             placeholder="Search TID, customer, address, agent, analyst..."
             className="h-8 pl-9 text-sm focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
             value={search}
             onChange={(e) => setSearch(e.target.value)}
           />
        </div>
        <div className="flex items-center gap-1">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 w-[130px] text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Hide Reconciled toggle */}
        <div className="flex items-center gap-1.5 rounded-md border border-input bg-background px-2.5 py-1">
          <Switch
            id="hide-reconciled"
            checked={hideReconciled}
            onCheckedChange={setHideReconciled}
            className="scale-75"
          />
          <Label htmlFor="hide-reconciled" className="cursor-pointer text-xs font-medium whitespace-nowrap">
            Hide Reconciled
          </Label>
        </div>

        {/* Manage Columns */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1">
              <Columns3 className="h-4 w-4" />
              <span className="text-xs">Columns</span>
              {hiddenCols.size > 0 && (
                <span className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                  {hiddenCols.size}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2" align="end">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Manage Columns</span>
              {hiddenCols.size > 0 && (
                <button className="text-xs text-primary hover:underline" onClick={() => setHiddenCols(new Set())}>Show All</button>
              )}
            </div>
            <div className="max-h-64 space-y-1 overflow-auto">
              {COLUMNS.map((col) => (
                <label key={col.key} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted">
                  <Checkbox
                    checked={!hiddenCols.has(col.key)}
                    onCheckedChange={() => toggleColVisibility(col.key)}
                  />
                  <span className="flex items-center gap-1.5">
                    {hiddenCols.has(col.key) ? <EyeOff className="h-3 w-3 text-muted-foreground" /> : <Eye className="h-3 w-3 text-primary" />}
                    {col.label}
                  </span>
                </label>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setColumnFilters({})}>
            <X className="mr-1 h-3 w-3" />
            Clear {activeFilterCount} filter{activeFilterCount > 1 ? "s" : ""}
          </Button>
        )}
        <Button variant="outline" size="sm" className="h-8" onClick={() => exportCSV(filtered)} disabled={filtered.length === 0}>
          <Download className="h-4 w-4" />
          Export
        </Button>
      </div>

      {/* Data table */}
      <Card className="min-h-0 flex-1 overflow-hidden bg-card shadow-sm">
        <CardContent className="h-full p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : error ? (
            <p className="p-4 text-center text-sm text-destructive">Error loading records: {(error as Error).message}</p>
          ) : filtered.length === 0 ? (
            <p className="p-4 text-center text-sm text-muted-foreground">
              {records?.length === 0 ? "No wire records yet. Create one from the Send Wire Instructions page." : "No records match your filters."}
            </p>
          ) : (
            <div className="h-full overflow-auto">
              <ResizableTable colWidths={colWidths} visibleColumns={visibleColumns}>
                <TableHeader className="sticky top-0 z-10 bg-background shadow-sm">
                  <TableRow className="bg-muted/40">
                    {visibleColumns.map((col) => {
                      const isAccounting = ["receipt", "amt_wired", "ar_date", "recon_notes"].includes(col.key);
                      const isRight = ["balance", "adjustments", "amt_wired"].includes(col.key);
                      const isActive = sortCol === col.key;
                      const hasFilter = !!columnFilters[col.key];
                      return (
                        <ResizableTableHead
                          key={col.key}
                          colKey={col.key}
                          width={colWidths[col.key]}
                          onResize={handleResize}
                          className={[
                            isAccounting && col.key === "receipt" ? "border-l-2 border-primary/20 bg-primary/5" : "",
                            isAccounting && col.key !== "receipt" ? "bg-primary/5" : "",
                            isRight ? "text-right" : "",
                          ].filter(Boolean).join(" ")}
                        >
                          <div className="flex items-center gap-1">
                            <button
                              className="flex items-center gap-1 hover:text-foreground transition-colors"
                              onClick={() => handleSort(col.key)}
                            >
                              <span className="truncate">{col.label}</span>
                              {isActive && sortDir === "asc" && <ArrowUp className="h-3 w-3 text-primary shrink-0" />}
                              {isActive && sortDir === "desc" && <ArrowDown className="h-3 w-3 text-primary shrink-0" />}
                              {!isActive && <ArrowUpDown className="h-3 w-3 opacity-0 group-hover/head:opacity-40 shrink-0" />}
                            </button>
                            <ColumnFilterPopover
                              colKey={col.key}
                              values={uniqueValues[col.key] ?? []}
                              selected={columnFilters[col.key]}
                              onToggle={toggleColumnFilter}
                              onClear={clearColumnFilter}
                              hasFilter={hasFilter}
                            />
                          </div>
                        </ResizableTableHead>
                      );
                    })}
                    {isAdmin && <TableCell className="w-10" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isSorted ? (
                    filtered.map((record) => (
                      <InlineEditRow key={record.id} record={record} onSelectRecord={setSelectedRecord} isHighlighted={record.id === highlightId} hiddenCols={hiddenCols} />
                    ))
                  ) : (
                    <>
                      {filtered3694.length > 0 && (
                        <>
                          <TableRow>
                            <TableCell colSpan={visibleColCount} className="bg-blue-50 dark:bg-blue-950/30 py-2 font-semibold text-blue-800 dark:text-blue-300 border-b-2 border-blue-200 dark:border-blue-800">
                              WF Account 3694 ({filtered3694.length} records)
                            </TableCell>
                          </TableRow>
                          {filtered3694.map((record) => (
                            <InlineEditRow key={record.id} record={record} onSelectRecord={setSelectedRecord} isHighlighted={record.id === highlightId} hiddenCols={hiddenCols} />
                          ))}
                        </>
                      )}
                      {filtered8022.length > 0 && (
                        <>
                          <TableRow>
                            <TableCell colSpan={visibleColCount} className="bg-emerald-50 dark:bg-emerald-950/30 py-2 font-semibold text-emerald-800 dark:text-emerald-300 border-b-2 border-emerald-200 dark:border-emerald-800">
                              WF Account 8022 ({filtered8022.length} records)
                            </TableCell>
                          </TableRow>
                          {filtered8022.map((record) => (
                            <InlineEditRow key={record.id} record={record} onSelectRecord={setSelectedRecord} isHighlighted={record.id === highlightId} hiddenCols={hiddenCols} />
                          ))}
                        </>
                      )}
                      {filteredOther.length > 0 && (
                        <>
                          <TableRow>
                            <TableCell colSpan={visibleColCount} className="bg-muted/60 py-2 font-semibold text-muted-foreground border-b-2 border-muted">
                              Other Accounts ({filteredOther.length} records)
                            </TableCell>
                          </TableRow>
                          {filteredOther.map((record) => (
                            <InlineEditRow key={record.id} record={record} onSelectRecord={setSelectedRecord} isHighlighted={record.id === highlightId} hiddenCols={hiddenCols} />
                          ))}
                        </>
                      )}
                    </>
                  )}
                </TableBody>
              </ResizableTable>
            </div>
          )}
        </CardContent>
      </Card>
    </div>

    <WireDetailDialog
      record={selectedRecord}
      open={!!selectedRecord}
      onOpenChange={(open) => { if (!open) setSelectedRecord(null); }}
    />
    </>
  );
}

/* ---------- Sub-components ---------- */

function SummaryCard({ label, value, color, active, onClick }: { label: string; value: number; color?: string; active?: boolean; onClick?: () => void }) {
  const colorMap: Record<string, string> = {
    amber: "text-amber-600",
    blue: "text-blue-600",
    emerald: "text-emerald-600",
    forest: "text-emerald-900",
    rose: "text-rose-600",
  };
  return (
    <Card
      className={`cursor-pointer bg-card shadow-sm transition-all hover:shadow-md ${active ? "ring-2 ring-primary shadow-md" : ""}`}
      onClick={onClick}
    >
      <CardContent className="px-3 py-2">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className={`text-2xl font-bold ${color ? colorMap[color] : "text-foreground"}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function ColumnFilterPopover({
  colKey,
  values,
  selected,
  onToggle,
  onClear,
  hasFilter,
}: {
  colKey: string;
  values: string[];
  selected?: Set<string>;
  onToggle: (colKey: string, value: string) => void;
  onClear: (colKey: string) => void;
  hasFilter: boolean;
}) {
  if (values.length === 0 || values.length > 50) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className={`shrink-0 rounded p-0.5 transition-colors hover:bg-muted ${hasFilter ? "text-primary" : "opacity-0 group-hover/head:opacity-40"}`}>
          <Filter className="h-3 w-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="start">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">Filter values</span>
          {hasFilter && (
            <button className="text-xs text-primary hover:underline" onClick={() => onClear(colKey)}>Clear</button>
          )}
        </div>
        <div className="max-h-48 space-y-1 overflow-auto">
          {values.map((v) => (
            <label key={v} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted">
              <Checkbox
                checked={selected?.has(v) ?? false}
                onCheckedChange={() => onToggle(colKey, v)}
              />
              <span className="truncate">{v}</span>
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ResizableTable({
  colWidths,
  visibleColumns,
  children,
}: {
  colWidths: Record<string, number>;
  visibleColumns: { key: string; label: string; field: string }[];
  children: React.ReactNode;
}) {
  const totalWidth = visibleColumns.reduce((sum, col) => sum + (colWidths[col.key] ?? 100), 0);
  return (
    <table className="w-full caption-bottom text-sm" style={{ tableLayout: "fixed", minWidth: totalWidth }}>
      <colgroup>
        {visibleColumns.map((col) => (
          <col key={col.key} style={{ width: colWidths[col.key] }} />
        ))}
      </colgroup>
      {children}
    </table>
  );
}

function ResizableTableHead({
  colKey,
  width,
  onResize,
  className = "",
  children,
}: {
  colKey: string;
  width: number;
  onResize: (key: string, width: number) => void;
  className?: string;
  children: React.ReactNode;
}) {
  const startX = useRef(0);
  const startW = useRef(0);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      startX.current = e.clientX;
      startW.current = width;
      const onMouseMove = (ev: MouseEvent) => {
        onResize(colKey, startW.current + (ev.clientX - startX.current));
      };
      const onMouseUp = () => {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
      };
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    },
    [colKey, width, onResize]
  );

  return (
    <th
      className={`group/head relative h-12 px-4 text-left align-middle font-medium text-muted-foreground select-none ${className}`}
      style={{ width }}
    >
      {children}
      <div
        onMouseDown={onMouseDown}
        className="absolute right-0 top-0 h-full w-2 cursor-col-resize hover:bg-primary/20 active:bg-primary/30 transition-colors"
      />
    </th>
  );
}

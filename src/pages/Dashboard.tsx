import { useState, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Filter, Download, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { DepartmentBadge } from "@/components/DepartmentBadge";
import { useWireRecords } from "@/hooks/useWireRecords";
import { InlineEditRow } from "@/components/InlineEditRow";

const DEFAULT_COL_WIDTHS: Record<string, number> = {
  tid: 100, department: 130, customer: 130, address: 180, balance: 110,
  agent: 110, status: 100, wiring_inst: 130, wiring_date: 120, adjustments: 100,
  receipt: 80, amt_wired: 110, ar_date: 120, recon_notes: 160,
};

const COLUMNS = [
  { key: "tid", label: "TID" },
  { key: "department", label: "Department" },
  { key: "customer", label: "Customer" },
  { key: "address", label: "Property Address" },
  { key: "balance", label: "Balance Due" },
  { key: "agent", label: "Agent" },
  { key: "status", label: "Status" },
  { key: "wiring_inst", label: "Wiring Inst." },
  { key: "wiring_date", label: "Wiring Date" },
  { key: "adjustments", label: "Adjustments" },
  { key: "receipt", label: "Receipt" },
  { key: "amt_wired", label: "Amt Wired" },
  { key: "ar_date", label: "AR Date" },
  { key: "recon_notes", label: "Recon Notes" },
];

const STATUS_OPTIONS = ["All", "Pending", "Wired", "Received", "Reconciled", "Other - See Notes"];

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

export default function Dashboard() {
  const { data: records, isLoading, error } = useWireRecords();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [colWidths, setColWidths] = useState<Record<string, number>>({ ...DEFAULT_COL_WIDTHS });

  const handleResize = useCallback((key: string, width: number) => {
    setColWidths((prev) => ({ ...prev, [key]: Math.max(50, width) }));
  }, []);

  const filtered = (records ?? []).filter((r) => {
    const matchesStatus = statusFilter === "All" || r.status === statusFilter;
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      r.tid.toLowerCase().includes(q) ||
      (r.customer_name ?? "").toLowerCase().includes(q) ||
      (r.property_address ?? "").toLowerCase().includes(q) ||
      (r.agent_name ?? "").toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  const counts = {
    total: records?.length ?? 0,
    pending: records?.filter((r) => r.status === "Pending").length ?? 0,
    wired: records?.filter((r) => r.status === "Wired").length ?? 0,
    received: records?.filter((r) => r.status === "Received").length ?? 0,
    reconciled: records?.filter((r) => r.status === "Reconciled").length ?? 0,
    other: records?.filter((r) => r.status === "Other - See Notes").length ?? 0,
  };

  return (
    <div className="mx-auto flex h-full max-w-[98vw] flex-col gap-4 p-3 sm:p-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Wire Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Track all wire records. Analysts edit deal data; Accounting finalizes reconciliation.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-5 gap-2">
        <SummaryCard label="Total" value={counts.total} active={statusFilter === "All"} onClick={() => setStatusFilter("All")} />
        <SummaryCard label="Pending" value={counts.pending} color="amber" active={statusFilter === "Pending"} onClick={() => setStatusFilter("Pending")} />
        <SummaryCard label="Wired" value={counts.wired} color="blue" active={statusFilter === "Wired"} onClick={() => setStatusFilter("Wired")} />
        <SummaryCard label="Received" value={counts.received} color="emerald" active={statusFilter === "Received"} onClick={() => setStatusFilter("Received")} />
        <SummaryCard label="Reconciled" value={counts.reconciled} color="purple" active={statusFilter === "Reconciled"} onClick={() => setStatusFilter("Reconciled")} />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search TID, customer, address, agent..."
            className="h-8 pl-9 text-sm"
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
        <Button variant="outline" size="sm" className="h-8" onClick={() => exportCSV(filtered)} disabled={filtered.length === 0}>
          <Download className="h-4 w-4" />
          Export
        </Button>
      </div>

      {/* Data table */}
      <Card className="min-h-0 flex-1 overflow-hidden">
        <CardContent className="h-full p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : error ? (
            <p className="p-4 text-center text-sm text-destructive">Error loading records: {(error as Error).message}</p>
          ) : filtered.length === 0 ? (
            <p className="p-4 text-center text-sm text-muted-foreground">
              {records?.length === 0 ? "No wire records yet. Create one from the New Wire page." : "No records match your filters."}
            </p>
          ) : (
            <div className="h-full overflow-auto">
              <ResizableTable colWidths={colWidths} onResize={handleResize}>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    {COLUMNS.map((col) => {
                      const isAccounting = ["receipt", "amt_wired", "ar_date", "recon_notes"].includes(col.key);
                      const isRight = ["balance", "adjustments", "amt_wired"].includes(col.key);
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
                          {col.label}
                        </ResizableTableHead>
                      );
                    })}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((record) => (
                    <InlineEditRow key={record.id} record={record} />
                  ))}
                </TableBody>
              </ResizableTable>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({ label, value, color, active, onClick }: { label: string; value: number; color?: string; active?: boolean; onClick?: () => void }) {
  const colorMap: Record<string, string> = {
    amber: "text-amber-600",
    blue: "text-blue-600",
    emerald: "text-emerald-600",
    purple: "text-purple-600",
  };
  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md ${active ? "ring-2 ring-primary shadow-md" : ""}`}
      onClick={onClick}
    >
      <CardContent className="px-3 py-2">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className={`text-2xl font-bold ${color ? colorMap[color] : "text-foreground"}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function ResizableTable({
  colWidths,
  children,
}: {
  colWidths: Record<string, number>;
  onResize: (key: string, width: number) => void;
  children: React.ReactNode;
}) {
  return (
    <table className="w-full caption-bottom text-sm" style={{ tableLayout: "fixed", minWidth: Object.values(colWidths).reduce((a, b) => a + b, 0) }}>
      <colgroup>
        {COLUMNS.map((col) => (
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
      className={`relative h-12 px-4 text-left align-middle font-medium text-muted-foreground select-none ${className}`}
      style={{ width }}
    >
      <span className="truncate block">{children}</span>
      <div
        onMouseDown={onMouseDown}
        className="absolute right-0 top-0 h-full w-2 cursor-col-resize hover:bg-primary/20 active:bg-primary/30 transition-colors"
      />
    </th>
  );
}

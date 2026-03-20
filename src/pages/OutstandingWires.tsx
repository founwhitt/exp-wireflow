import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Filter, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWireRecords, useUpdateWireRecord, type WireRecord } from "@/hooks/useWireRecords";
import { useAuth } from "@/hooks/useAuth";
import { StatusBadge } from "@/components/StatusBadge";
import { toast } from "sonner";

const STATUS_OPTIONS = ["All", "Pending", "Sent", "Received", "Reconciled", "Other - See Notes"];

// Outstanding columns — first 8 are accounting-locked, "TRX Notes" is editable by all
const OUTSTANDING_COLUMNS = [
  { key: "tid", label: "TID", field: "tid" },
  { key: "status", label: "Status", field: "status", accountingOnly: true },
  { key: "wf_account", label: "Account", field: "wf_account", accountingOnly: true },
  { key: "wiring_date", label: "Date", field: "wiring_date", accountingOnly: true },
  { key: "amount_wired", label: "Amount", field: "amount_wired", accountingOnly: true },
  { key: "wire_receipt", label: "Receipt", field: "wire_receipt", accountingOnly: true },
  { key: "invoice_number", label: "Invoice #", field: "invoice_number", accountingOnly: true },
  { key: "customer_name", label: "Description", field: "customer_name", accountingOnly: true },
  { key: "reconciliation_notes", label: "Accounting Notes", field: "reconciliation_notes", accountingOnly: true },
  { key: "transaction_notes", label: "TRX Notes", field: "transaction_notes", accountingOnly: false },
  { key: "property_address", label: "Property Address", field: "property_address" },
  { key: "agent_name", label: "Agent", field: "agent_name" },
];

function exportCSV(rows: WireRecord[], tab: string) {
  const headers = OUTSTANDING_COLUMNS.map((c) => c.label);
  const csv = [
    headers.join(","),
    ...rows.map((r) =>
      OUTSTANDING_COLUMNS.map((c) => {
        const v = (r as any)[c.field] ?? "";
        return `"${String(v).replace(/"/g, '""')}"`;
      }).join(",")
    ),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `outstanding_wires_${tab}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function OutstandingWires() {
  const { data: records, isLoading, error } = useWireRecords();
  const [tab, setTab] = useState("realty");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  // Filter to non-reconciled / outstanding
  const outstanding = useMemo(() => {
    let result = (records ?? []).filter((r) => r.status !== "Reconciled");

    if (statusFilter !== "All") result = result.filter((r) => r.status === statusFilter);

    const q = search.toLowerCase();
    if (q) {
      result = result.filter(
        (r) =>
          r.tid.toLowerCase().includes(q) ||
          (r.customer_name ?? "").toLowerCase().includes(q) ||
          (r.property_address ?? "").toLowerCase().includes(q) ||
          (r.agent_name ?? "").toLowerCase().includes(q)
      );
    }

    return result;
  }, [records, statusFilter, search]);

  // Tab filtering
  const tabRecords = useMemo(() => {
    switch (tab) {
      case "realty":
        return outstanding.filter((r) => r.department === "Transactions" || r.department === "ASC");
      case "payload":
        return outstanding.filter((r) => r.department === "Payload");
      case "commercial":
        return outstanding.filter((r) => r.department === "Commercial");
      case "international":
        return outstanding.filter((r) => r.department === "International");
      default:
        return outstanding;
    }
  }, [outstanding, tab]);

  const realty8022 = useMemo(() => tabRecords.filter((r) => r.wf_account === "8022"), [tabRecords]);
  const realty3694 = useMemo(() => tabRecords.filter((r) => r.wf_account === "3694"), [tabRecords]);

  return (
    <div className="mx-auto flex h-full max-w-[98vw] flex-col gap-4 p-3 sm:p-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Outstanding Wires</h1>
        <p className="text-sm text-muted-foreground">
          Track outstanding wire records by category. Accounting edits all columns; Transactions/ASC can edit TRX Notes only.
        </p>
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
        <Button variant="outline" size="sm" className="h-8" onClick={() => exportCSV(tabRecords, tab)} disabled={tabRecords.length === 0}>
          <Download className="h-4 w-4 mr-1" />
          Export
        </Button>
      </div>

      {/* Sub-tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-fit">
          <TabsTrigger value="realty">Realty</TabsTrigger>
          <TabsTrigger value="payload">Payload</TabsTrigger>
          <TabsTrigger value="commercial">Commercial</TabsTrigger>
          <TabsTrigger value="international">International</TabsTrigger>
        </TabsList>

        <TabsContent value="realty" className="mt-4">
          {isLoading ? <LoadingSkeleton /> : error ? <ErrorMsg error={error} /> : (
            <div className="space-y-6">
              <AccountSection label="Account 8022" records={realty8022} color="emerald" />
              <AccountSection label="Account 3694" records={realty3694} color="blue" />
              {tabRecords.length === 0 && <EmptyMsg />}
            </div>
          )}
        </TabsContent>

        {["payload", "commercial", "international"].map((t) => (
          <TabsContent key={t} value={t} className="mt-4">
            {isLoading ? <LoadingSkeleton /> : error ? <ErrorMsg error={error} /> : (
              tabRecords.length === 0 ? <EmptyMsg /> : (
                <Card className="bg-card shadow-sm overflow-hidden">
                  <CardContent className="p-0">
                    <div className="overflow-auto">
                      <OutstandingTable records={tabRecords} />
                    </div>
                  </CardContent>
                </Card>
              )
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

/* ---- Sub-components ---- */

function AccountSection({ label, records, color }: { label: string; records: WireRecord[]; color: string }) {
  if (records.length === 0) return null;
  const colorClasses = color === "emerald"
    ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
    : "bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800";

  return (
    <Card className="bg-card shadow-sm overflow-hidden">
      <div className={`px-4 py-2 font-semibold text-sm border-b-2 ${colorClasses}`}>
        {label} ({records.length} records)
      </div>
      <CardContent className="p-0">
        <div className="overflow-auto">
          <OutstandingTable records={records} />
        </div>
      </CardContent>
    </Card>
  );
}

function OutstandingTable({ records }: { records: WireRecord[] }) {
  const { roles } = useAuth();
  const isAccounting = roles.includes("accounting") || roles.includes("admin");
  const update = useUpdateWireRecord();

  const save = (id: string, field: string, value: any) => {
    update.mutate(
      { id, [field]: value },
      { onError: (err: any) => toast.error(`Failed to update ${field}`, { description: err.message }) }
    );
  };

  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-muted/40">
          {OUTSTANDING_COLUMNS.map((col) => (
            <TableHead key={col.key} className="whitespace-nowrap text-xs">
              {col.label}
              {col.accountingOnly && (
                <span className="ml-1 text-[10px] text-muted-foreground/60">🔒</span>
              )}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {records.map((r) => (
          <OutstandingRow key={r.id} record={r} isAccounting={isAccounting} onSave={save} />
        ))}
      </TableBody>
    </Table>
  );
}

function OutstandingRow({ record, isAccounting, onSave }: { record: WireRecord; isAccounting: boolean; onSave: (id: string, field: string, value: any) => void }) {
  return (
    <TableRow className="group">
      {/* TID */}
      <TableCell className="font-mono text-sm font-bold text-primary whitespace-normal break-words">{record.tid}</TableCell>

      {/* Status — accounting only */}
      <TableCell className="whitespace-normal break-words">
        {isAccounting ? (
          <Select value={record.status} onValueChange={(v) => onSave(record.id, "status", v)}>
            <SelectTrigger className="h-8 w-full border-none bg-transparent px-1 text-sm shadow-none hover:bg-muted">
              <StatusBadge status={record.status} />
            </SelectTrigger>
            <SelectContent>
              {["Pending", "Sent", "Received", "Reconciled", "Other - See Notes"].map((s) => (
                <SelectItem key={s} value={s}><StatusBadge status={s} /></SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <StatusBadge status={record.status} />
        )}
      </TableCell>

      {/* Account — read-only display */}
      <TableCell className="font-mono text-sm whitespace-normal break-words">{record.wf_account}</TableCell>

      {/* Date — accounting only */}
      <TableCell className="whitespace-normal break-words">
        {isAccounting ? (
          <EditableCell value={record.wiring_date ?? ""} type="date" onSave={(v) => onSave(record.id, "wiring_date", v || null)} />
        ) : (
          <span className="text-sm">{record.wiring_date ?? "—"}</span>
        )}
      </TableCell>

      {/* Amount — accounting only */}
      <TableCell className="text-right whitespace-normal break-words">
        {isAccounting ? (
          <EditableCell
            value={record.amount_wired?.toString() ?? ""}
            type="number"
            className="text-right"
            onSave={(v) => onSave(record.id, "amount_wired", parseFloat(v) || null)}
            formatDisplay={(v) => v ? `$${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "—"}
          />
        ) : (
          <span className="font-mono text-sm">{record.amount_wired != null ? `$${Number(record.amount_wired).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "—"}</span>
        )}
      </TableCell>

      {/* Receipt — accounting only */}
      <TableCell className="whitespace-normal break-words">
        {isAccounting ? (
          <span className="cursor-pointer text-sm" onClick={() => onSave(record.id, "wire_receipt", !record.wire_receipt)}>
            {record.wire_receipt ? "✓" : "—"}
          </span>
        ) : (
          <span className="text-sm">{record.wire_receipt ? "✓" : "—"}</span>
        )}
      </TableCell>

      {/* Invoice # — accounting only */}
      <TableCell className="whitespace-normal break-words">
        {isAccounting ? (
          <EditableCell value={record.invoice_number ?? ""} onSave={(v) => onSave(record.id, "invoice_number", v || null)} />
        ) : (
          <span className="text-sm">{record.invoice_number ?? "—"}</span>
        )}
      </TableCell>

      {/* Description (customer_name) — accounting only */}
      <TableCell className="whitespace-normal break-words">
        {isAccounting ? (
          <EditableCell value={record.customer_name ?? ""} onSave={(v) => onSave(record.id, "customer_name", v || null)} />
        ) : (
          <span className="text-sm">{record.customer_name ?? "—"}</span>
        )}
      </TableCell>

      {/* Accounting Notes — accounting only */}
      <TableCell className="whitespace-normal break-words">
        {isAccounting ? (
          <EditableCell value={record.reconciliation_notes ?? ""} onSave={(v) => onSave(record.id, "reconciliation_notes", v)} multiline />
        ) : (
          <span className="text-sm">{record.reconciliation_notes ?? "—"}</span>
        )}
      </TableCell>

      {/* TRX Notes — editable by ALL authenticated users */}
      <TableCell className="whitespace-normal break-words">
        <EditableCell value={record.transaction_notes ?? ""} onSave={(v) => onSave(record.id, "transaction_notes", v)} multiline />
      </TableCell>

      {/* Property Address — read-only */}
      <TableCell className="whitespace-normal break-words text-sm">{record.property_address ?? "—"}</TableCell>

      {/* Agent — read-only */}
      <TableCell className="whitespace-normal break-words text-sm">{record.agent_name ?? "—"}</TableCell>
    </TableRow>
  );
}

function EditableCell({
  value,
  onSave,
  type = "text",
  className = "",
  formatDisplay,
  multiline = false,
}: {
  value: string;
  onSave: (v: string) => void;
  type?: string;
  className?: string;
  formatDisplay?: (v: string) => string;
  multiline?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [local, setLocal] = useState(value);

  if (!editing) {
    return (
      <button
        className={`w-full min-w-[60px] rounded px-1.5 py-1 text-left text-sm transition-colors hover:bg-muted whitespace-normal break-words ${className}`}
        onClick={() => { setLocal(value); setEditing(true); }}
      >
        {(formatDisplay ? formatDisplay(value) : value) || <span className="text-muted-foreground/50">—</span>}
      </button>
    );
  }

  if (multiline) {
    return (
      <textarea
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={() => { setEditing(false); if (local !== value) onSave(local); }}
        onKeyDown={(e) => { if (e.key === "Escape") { setEditing(false); setLocal(value); } }}
        autoFocus
        rows={3}
        className={`w-full min-w-[60px] rounded border border-input bg-background px-2 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${className}`}
      />
    );
  }

  return (
    <Input
      type={type}
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => { setEditing(false); if (local !== value) onSave(local); }}
      onKeyDown={(e) => {
        if (e.key === "Enter") { setEditing(false); if (local !== value) onSave(local); }
        if (e.key === "Escape") { setEditing(false); setLocal(value); }
      }}
      autoFocus
      className={`h-8 min-w-[60px] text-sm ${className}`}
    />
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-2 p-4">
      {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
    </div>
  );
}

function ErrorMsg({ error }: { error: unknown }) {
  return <p className="p-4 text-center text-sm text-destructive">Error loading records: {(error as Error).message}</p>;
}

function EmptyMsg() {
  return <p className="p-8 text-center text-sm text-muted-foreground">No outstanding wire records match your filters.</p>;
}

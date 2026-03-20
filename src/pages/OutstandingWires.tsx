import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Search, Filter, Download, Plus, Trash2, Copy } from "lucide-react";
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
const ACCOUNT_OPTIONS = ["WF-8022 (XXXX-8022)", "WF-3694 (XXXX-3694)"];
const ACCOUNT_MAP: Record<string, string> = {
  "WF-8022 (XXXX-8022)": "WF-8022",
  "WF-3694 (XXXX-3694)": "WF-3694",
};

const EMPTY_ROW = {
  status: "Needs TRX ID" as string,
  wf_account: "WF-8022",
  wiring_date: "",
  amount: "",
  receipt_number: "",
  invoice_number: "",
  description: "",
  accounting_notes: "",
};

type BulkRow = typeof EMPTY_ROW;

function exportCSV(rows: OutstandingWire[], tab: string) {
  const headers = ["Status", "Account", "Date", "Amount", "Receipt #", "Invoice #", "Description", "Accounting Notes", "TRX Notes"];
  const fields = ["status", "wf_account", "wiring_date", "amount", "receipt_number", "invoice_number", "description", "accounting_notes", "trx_notes"] as const;
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

export default function OutstandingWires() {
  const { data: records, isLoading, error } = useOutstandingWires();
  const { isAccounting, user } = useAuth();
  const [tab, setTab] = useState("realty");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [addDialogOpen, setAddDialogOpen] = useState(false);

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

  // For Realty tab: split by account
  const realty8022 = useMemo(() => filtered.filter((r) => r.wf_account === "WF-8022"), [filtered]);
  const realty3694 = useMemo(() => filtered.filter((r) => r.wf_account === "WF-3694"), [filtered]);

  return (
    <div className="mx-auto flex h-full max-w-[98vw] flex-col gap-4 p-3 sm:p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Outstanding Wires</h1>
          <p className="text-sm text-muted-foreground">
            Unidentified wires awaiting TRX ID or settlement. Independent from Expected Wires.
          </p>
        </div>
        {isAccounting && (
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Unidentified Wire
          </Button>
        )}
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
              <AccountSection label="Account WF-8022 (XXXX-8022)" records={realty8022} color="emerald" />
              <AccountSection label="Account WF-3694 (XXXX-3694)" records={realty3694} color="blue" />
              {filtered.length === 0 && <EmptyMsg />}
            </div>
          )}
        </TabsContent>

        {["payload", "commercial", "international"].map((t) => (
          <TabsContent key={t} value={t} className="mt-4">
            {isLoading ? <LoadingSkeleton /> : error ? <ErrorMsg error={error} /> : (
              filtered.length === 0 ? <EmptyMsg /> : (
                <Card className="bg-card shadow-sm overflow-hidden">
                  <CardContent className="p-0">
                    <div className="overflow-auto">
                      <OutstandingTable records={filtered} />
                    </div>
                  </CardContent>
                </Card>
              )
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Bulk Add Dialog */}
      <BulkAddDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        category={tab}
        userId={user?.id ?? null}
      />
    </div>
  );
}

/* ---- Bulk Add Dialog ---- */

function BulkAddDialog({ open, onOpenChange, category, userId }: { open: boolean; onOpenChange: (v: boolean) => void; category: string; userId: string | null }) {
  const create = useCreateOutstandingWires();
  const [rows, setRows] = useState<BulkRow[]>([{ ...EMPTY_ROW }]);

  const addRow = () => setRows((prev) => [...prev, { ...EMPTY_ROW }]);
  const removeRow = (idx: number) => setRows((prev) => prev.filter((_, i) => i !== idx));
  const updateRow = (idx: number, field: string, value: string) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
  };

  const handleSave = async () => {
    const validRows = rows.filter((r) => r.amount || r.description || r.receipt_number);
    if (validRows.length === 0) {
      toast.error("Please fill in at least one row");
      return;
    }

    const inserts: OutstandingWireInsert[] = validRows.map((r) => ({
      status: r.status,
      wf_account: r.wf_account,
      wiring_date: r.wiring_date || null,
      amount: r.amount ? parseFloat(r.amount) : null,
      receipt_number: r.receipt_number || null,
      invoice_number: r.invoice_number || null,
      description: r.description || null,
      accounting_notes: r.accounting_notes || null,
      trx_notes: null,
      category,
      created_by: userId,
    }));

    try {
      await create.mutateAsync(inserts);
      toast.success(`${inserts.length} wire${inserts.length > 1 ? "s" : ""} added`);
      setRows([{ ...EMPTY_ROW }]);
      onOpenChange(false);
    } catch (err: any) {
      toast.error("Failed to save", { description: err.message });
    }
  };

  const handlePaste = (e: React.ClipboardEvent, idx: number, field: string) => {
    const text = e.clipboardData.getData("text");
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length <= 1) return; // Let normal paste handle single-line

    e.preventDefault();
    const fields = ["wiring_date", "amount", "receipt_number", "invoice_number", "description", "accounting_notes"];
    const fieldIdx = fields.indexOf(field);
    if (fieldIdx === -1) return;

    // Expand rows to fit pasted data
    const newRows = [...rows];
    for (let i = 0; i < lines.length; i++) {
      const rowIdx = idx + i;
      if (rowIdx >= newRows.length) newRows.push({ ...EMPTY_ROW });
      const cols = lines[i].split("\t");
      cols.forEach((val, ci) => {
        const targetField = fields[fieldIdx + ci];
        if (targetField) (newRows[rowIdx] as any)[targetField] = val;
      });
    }
    setRows(newRows);
    toast.success(`Pasted ${lines.length} rows`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Add Unidentified Wires</DialogTitle>
          <DialogDescription>
            Enter one or more unidentified wires. You can paste multiple rows from a spreadsheet (tab-separated).
            Bank details are masked for demo security.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {rows.map((row, idx) => (
            <div key={idx} className="rounded-lg border border-border bg-muted/20 p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Entry #{idx + 1}</span>
                {rows.length > 1 && (
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeRow(idx)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-4">
                <div className="space-y-1">
                  <Label className="text-xs">Status</Label>
                  <Select value={row.status} onValueChange={(v) => updateRow(idx, "status", v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Needs TRX ID">Needs TRX ID</SelectItem>
                      <SelectItem value="Waiting on Settlement">Waiting on Settlement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Account</Label>
                  <Select value={ACCOUNT_OPTIONS.find((a) => ACCOUNT_MAP[a] === row.wf_account) ?? ACCOUNT_OPTIONS[0]} onValueChange={(v) => updateRow(idx, "wf_account", ACCOUNT_MAP[v] ?? "WF-8022")}>
                    <SelectTrigger className="h-8 text-sm font-mono"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ACCOUNT_OPTIONS.map((a) => (<SelectItem key={a} value={a}>{a}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Date</Label>
                  <Input type="date" value={row.wiring_date} onChange={(e) => updateRow(idx, "wiring_date", e.target.value)} className="h-8 text-sm" onPaste={(e) => handlePaste(e, idx, "wiring_date")} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Amount</Label>
                  <Input type="number" step="0.01" value={row.amount} onChange={(e) => updateRow(idx, "amount", e.target.value)} placeholder="0.00" className="h-8 text-sm font-mono" onPaste={(e) => handlePaste(e, idx, "amount")} />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-4">
                <div className="space-y-1">
                  <Label className="text-xs">Receipt #</Label>
                  <Input value={row.receipt_number} onChange={(e) => updateRow(idx, "receipt_number", e.target.value)} placeholder="REC-001" className="h-8 text-sm" onPaste={(e) => handlePaste(e, idx, "receipt_number")} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Invoice #</Label>
                  <Input value={row.invoice_number} onChange={(e) => updateRow(idx, "invoice_number", e.target.value)} placeholder="INV-001" className="h-8 text-sm" onPaste={(e) => handlePaste(e, idx, "invoice_number")} />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs">Description</Label>
                  <Input value={row.description} onChange={(e) => updateRow(idx, "description", e.target.value)} placeholder="Wire from..." className="h-8 text-sm" onPaste={(e) => handlePaste(e, idx, "description")} />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Accounting Notes</Label>
                <Input value={row.accounting_notes} onChange={(e) => updateRow(idx, "accounting_notes", e.target.value)} placeholder="Internal notes..." className="h-8 text-sm" onPaste={(e) => handlePaste(e, idx, "accounting_notes")} />
              </div>
            </div>
          ))}

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={addRow} className="gap-1">
              <Plus className="h-3 w-3" /> Add Row
            </Button>
            <Button variant="outline" size="sm" onClick={() => setRows((prev) => [...prev, ...Array(5).fill(null).map(() => ({ ...EMPTY_ROW }))])} className="gap-1">
              <Copy className="h-3 w-3" /> Add 5 Rows
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={create.isPending}>
            {create.isPending ? "Saving..." : `Save ${rows.filter((r) => r.amount || r.description || r.receipt_number).length} Wire(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---- Table Components ---- */

function AccountSection({ label, records, color }: { label: string; records: OutstandingWire[]; color: string }) {
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

function OutstandingTable({ records }: { records: OutstandingWire[] }) {
  const { isAccounting } = useAuth();
  const update = useUpdateOutstandingWire();
  const remove = useDeleteOutstandingWire();

  const save = (id: string, field: string, value: any) => {
    update.mutate(
      { id, [field]: value },
      { onError: (err: any) => toast.error(`Failed to update`, { description: err.message }) }
    );
  };

  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-muted/40">
          <TableHead className="whitespace-nowrap text-xs">Status 🔒</TableHead>
          <TableHead className="whitespace-nowrap text-xs">Account 🔒</TableHead>
          <TableHead className="whitespace-nowrap text-xs">Date 🔒</TableHead>
          <TableHead className="whitespace-nowrap text-xs text-right">Amount 🔒</TableHead>
          <TableHead className="whitespace-nowrap text-xs">Receipt # 🔒</TableHead>
          <TableHead className="whitespace-nowrap text-xs">Invoice # 🔒</TableHead>
          <TableHead className="whitespace-nowrap text-xs">Description 🔒</TableHead>
          <TableHead className="whitespace-nowrap text-xs">Accounting Notes 🔒</TableHead>
          <TableHead className="whitespace-nowrap text-xs">TRX Notes</TableHead>
          {isAccounting && <TableHead className="w-10" />}
        </TableRow>
      </TableHeader>
      <TableBody>
        {records.map((r) => (
          <TableRow key={r.id} className="group">
            {/* Status — accounting only */}
            <TableCell className="whitespace-normal break-words">
              {isAccounting ? (
                <Select value={r.status} onValueChange={(v) => save(r.id, "status", v)}>
                  <SelectTrigger className="h-8 w-full border-none bg-transparent px-1 text-sm shadow-none hover:bg-muted">
                    <StatusBadge status={r.status} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Needs TRX ID"><StatusBadge status="Needs TRX ID" /></SelectItem>
                    <SelectItem value="Waiting on Settlement"><StatusBadge status="Waiting on Settlement" /></SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <StatusBadge status={r.status} />
              )}
            </TableCell>

            {/* Account — accounting only */}
            <TableCell className="font-mono text-sm whitespace-normal break-words">
              {isAccounting ? (
                <Select value={r.wf_account} onValueChange={(v) => save(r.id, "wf_account", v)}>
                  <SelectTrigger className="h-8 border-none bg-transparent px-1 text-sm shadow-none hover:bg-muted font-mono">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WF-8022">WF-8022</SelectItem>
                    <SelectItem value="WF-3694">WF-3694</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <span>{r.wf_account}</span>
              )}
            </TableCell>

            {/* Date — accounting only */}
            <TableCell className="whitespace-normal break-words">
              {isAccounting ? (
                <EditableCell value={r.wiring_date ?? ""} type="date" onSave={(v) => save(r.id, "wiring_date", v || null)} />
              ) : (
                <span className="text-sm">{r.wiring_date ?? "—"}</span>
              )}
            </TableCell>

            {/* Amount — accounting only */}
            <TableCell className="text-right whitespace-normal break-words">
              {isAccounting ? (
                <EditableCell
                  value={r.amount?.toString() ?? ""}
                  type="number"
                  className="text-right"
                  onSave={(v) => save(r.id, "amount", parseFloat(v) || null)}
                  formatDisplay={(v) => v ? `$${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "—"}
                />
              ) : (
                <span className="font-mono text-sm">{r.amount != null ? `$${Number(r.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "—"}</span>
              )}
            </TableCell>

            {/* Receipt # — accounting only */}
            <TableCell className="whitespace-normal break-words">
              {isAccounting ? (
                <EditableCell value={r.receipt_number ?? ""} onSave={(v) => save(r.id, "receipt_number", v || null)} />
              ) : (
                <span className="text-sm">{r.receipt_number ?? "—"}</span>
              )}
            </TableCell>

            {/* Invoice # — accounting only */}
            <TableCell className="whitespace-normal break-words">
              {isAccounting ? (
                <EditableCell value={r.invoice_number ?? ""} onSave={(v) => save(r.id, "invoice_number", v || null)} />
              ) : (
                <span className="text-sm">{r.invoice_number ?? "—"}</span>
              )}
            </TableCell>

            {/* Description — accounting only */}
            <TableCell className="whitespace-normal break-words">
              {isAccounting ? (
                <EditableCell value={r.description ?? ""} onSave={(v) => save(r.id, "description", v || null)} />
              ) : (
                <span className="text-sm">{r.description ?? "—"}</span>
              )}
            </TableCell>

            {/* Accounting Notes — accounting only */}
            <TableCell className="whitespace-normal break-words">
              {isAccounting ? (
                <EditableCell value={r.accounting_notes ?? ""} onSave={(v) => save(r.id, "accounting_notes", v)} multiline />
              ) : (
                <span className="text-sm">{r.accounting_notes ?? "—"}</span>
              )}
            </TableCell>

            {/* TRX Notes — editable by ALL authenticated users */}
            <TableCell className="whitespace-normal break-words">
              <EditableCell value={r.trx_notes ?? ""} onSave={(v) => save(r.id, "trx_notes", v)} multiline />
            </TableCell>

            {/* Delete — accounting only */}
            {isAccounting && (
              <TableCell className="w-10">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this wire?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently remove this outstanding wire entry. This cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={() => remove.mutate(r.id, {
                          onSuccess: () => toast.success("Wire deleted"),
                          onError: (err: any) => toast.error("Failed", { description: err.message }),
                        })}
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/* ---- Inline Editable Cell ---- */

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

/* ---- Utility Components ---- */

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

function EmptyMsg() {
  return <p className="p-8 text-center text-sm text-muted-foreground">No outstanding wires in this category. Use "Add Unidentified Wire" to create entries.</p>;
}

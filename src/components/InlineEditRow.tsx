import { useState, useEffect } from "react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { StatusBadge } from "@/components/StatusBadge";
import { DepartmentBadge } from "@/components/DepartmentBadge";
import { useUpdateWireRecord, type WireRecord } from "@/hooks/useWireRecords";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface InlineEditRowProps {
  record: WireRecord & { created_by_name?: string | null };
  onSelectRecord?: (r: WireRecord) => void;
  isHighlighted?: boolean;
  hiddenCols?: Set<string>;
}

export function InlineEditRow({ record, onSelectRecord, isHighlighted, hiddenCols }: InlineEditRowProps) {
  const update = useUpdateWireRecord();
  const { isAdmin } = useAuth();
  const canEditAccounting = isAdmin;
  const [highlight, setHighlight] = useState(isHighlighted);
  const hidden = hiddenCols ?? new Set();

  useEffect(() => {
    if (isHighlighted) {
      setHighlight(true);
      const timer = setTimeout(() => setHighlight(false), 8000);
      return () => clearTimeout(timer);
    }
  }, [isHighlighted]);

  const save = (field: string, value: any) => {
    update.mutate(
      { id: record.id, [field]: value },
      { onError: (err: any) => toast.error(`Failed to update ${field}`, { description: err.message }) }
    );
  };

  const show = (key: string) => !hidden.has(key);

  return (
    <TableRow className={`group transition-colors duration-1000 hover:bg-row-hover ${highlight ? "animate-highlight-pulse bg-secondary/10" : ""}`}>
      {show("tid") && (
        <TableCell className="font-mono text-sm font-bold text-primary">
          <button className="hover:underline" onClick={() => onSelectRecord?.(record)}>{record.tid}</button>
        </TableCell>
      )}
      {show("department") && (
        <TableCell><DepartmentBadge department={record.department} wfAccount={record.wf_account} /></TableCell>
      )}
      {show("sent_by") && (
        <TableCell className="text-sm truncate max-w-[120px]">{(record as any).created_by_name ?? "—"}</TableCell>
      )}
      {show("customer") && (
        <TableCell className="max-w-[120px] truncate text-sm">{record.customer_name}</TableCell>
      )}
      {show("address") && (
        <TableCell className="max-w-[180px] truncate text-sm">{record.property_address}</TableCell>
      )}
      {show("balance") && (
        <TableCell className="text-right font-mono text-sm">
          {record.balance_due != null ? `$${Number(record.balance_due).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"}
        </TableCell>
      )}
      {show("agent") && <TableCell className="text-sm">{record.agent_name}</TableCell>}
      {show("status") && (
        <TableCell>
          <Select value={record.status} onValueChange={(v) => save("status", v)}>
            <SelectTrigger className="h-8 w-full border-none bg-transparent px-1 text-sm shadow-none hover:bg-muted">
              <StatusBadge status={record.status} />
            </SelectTrigger>
            <SelectContent>
              {["Pending", "Sent", "Received", "Reconciled", "Other - See Notes"].map((s) => (
                <SelectItem key={s} value={s}><StatusBadge status={s} /></SelectItem>
              ))}
            </SelectContent>
          </Select>
        </TableCell>
      )}
      {show("wiring_inst") && (
        <TableCell>
          <EditableText value={record.wiring_institution ?? ""} placeholder="Institution" onSave={(v) => save("wiring_institution", v)} />
        </TableCell>
      )}
      {show("wiring_date") && (
        <TableCell>
          <EditableText value={record.wiring_date ?? ""} placeholder="YYYY-MM-DD" onSave={(v) => save("wiring_date", v || null)} type="date" />
        </TableCell>
      )}
      {show("adjustments") && (
        <TableCell className="text-right">
          <EditableText value={record.adjustments?.toString() ?? "0"} placeholder="0.00" onSave={(v) => save("adjustments", parseFloat(v) || 0)} type="number" className="text-right" />
        </TableCell>
      )}
      {show("txn_notes") && (
        <TableCell>
          <EditableText value={record.transaction_notes ?? ""} placeholder="Notes..." onSave={(v) => save("transaction_notes", v)} />
        </TableCell>
      )}
      {show("receipt") && (
        <TableCell className="border-l-2 border-primary/20 bg-primary/5">
          {canEditAccounting ? (
            <Switch checked={record.wire_receipt ?? false} onCheckedChange={(v) => { save("wire_receipt", v); if (v) save("status", "Received"); }} />
          ) : (
            <span className="text-sm text-muted-foreground">{record.wire_receipt ? "✓" : "—"}</span>
          )}
        </TableCell>
      )}
      {show("amt_wired") && (
        <TableCell className="bg-primary/5 text-right font-mono text-sm">
          {canEditAccounting ? (
            <EditableText value={record.amount_wired?.toString() ?? ""} placeholder="0.00" onSave={(v) => save("amount_wired", parseFloat(v) || null)} type="number" className="text-right"
              formatDisplay={(v) => v ? `$${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ""} />
          ) : (
            <span>{record.amount_wired != null ? `$${Number(record.amount_wired).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"}</span>
          )}
        </TableCell>
      )}
      {show("ar_date") && (
        <TableCell className="bg-primary/5">
          {canEditAccounting ? (
            <EditableText value={record.ar_date_received ?? ""} placeholder="YYYY-MM-DD" onSave={(v) => { save("ar_date_received", v || null); if (v) save("status", "Reconciled"); }} type="date" />
          ) : (
            <span className="text-sm">{record.ar_date_received ?? "—"}</span>
          )}
        </TableCell>
      )}
      {show("recon_notes") && (
        <TableCell className="bg-primary/5">
          {canEditAccounting ? (
            <EditableText value={record.reconciliation_notes ?? ""} placeholder="Notes..." onSave={(v) => save("reconciliation_notes", v)} />
          ) : (
            <span className="text-sm">{record.reconciliation_notes ?? "—"}</span>
          )}
        </TableCell>
      )}
    </TableRow>
  );
}

function EditableText({
  value,
  placeholder,
  onSave,
  type = "text",
  className = "",
  formatDisplay,
}: {
  value: string;
  placeholder: string;
  onSave: (v: string) => void;
  type?: string;
  className?: string;
  formatDisplay?: (v: string) => string;
}) {
  const [editing, setEditing] = useState(false);
  const [local, setLocal] = useState(value);

  if (!editing) {
    return (
      <button
        className={`w-full min-w-[80px] rounded px-1.5 py-1 text-left text-sm transition-colors hover:bg-muted ${className}`}
        onClick={() => { setLocal(value); setEditing(true); }}
      >
        {(formatDisplay ? formatDisplay(value) : value) || <span className="text-muted-foreground/50">{placeholder}</span>}
      </button>
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
      className={`h-8 min-w-[80px] text-sm ${className}`}
      placeholder={placeholder}
    />
  );
}

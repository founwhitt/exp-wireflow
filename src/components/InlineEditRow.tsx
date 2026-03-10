import { useState } from "react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { StatusBadge } from "@/components/StatusBadge";
import { DepartmentBadge } from "@/components/DepartmentBadge";
import { useUpdateWireRecord, type WireRecord } from "@/hooks/useWireRecords";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export function InlineEditRow({ record }: { record: WireRecord }) {
  const update = useUpdateWireRecord();
  const { isAdmin } = useAuth();
  // Non-admin users (analysts) cannot edit accounting fields
  const canEditAccounting = isAdmin;

  const save = (field: string, value: any) => {
    update.mutate(
      { id: record.id, [field]: value },
      {
        onError: (err: any) => toast.error(`Failed to update ${field}`, { description: err.message }),
      }
    );
  };

  return (
    <TableRow className="group">
      <TableCell className="font-mono text-sm font-semibold text-primary">{record.tid}</TableCell>
      <TableCell>
        <DepartmentBadge department={record.department} wfAccount={record.wf_account} />
      </TableCell>
      <TableCell className="max-w-[120px] truncate text-sm">{record.customer_name}</TableCell>
      <TableCell className="max-w-[180px] truncate text-sm">{record.property_address}</TableCell>
      <TableCell className="text-right font-mono text-sm">
        {record.balance_due != null ? `$${Number(record.balance_due).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"}
      </TableCell>
      <TableCell className="text-sm">{record.agent_name}</TableCell>
      <TableCell>
        <Select
          value={record.status}
          onValueChange={(v) => save("status", v)}
        >
          <SelectTrigger className="h-8 w-full border-none bg-transparent px-1 text-sm shadow-none hover:bg-muted">
            <StatusBadge status={record.status} />
          </SelectTrigger>
          <SelectContent>
            {["Pending", "Wired", "Received", "Reconciled", "Other - See Notes"].map((s) => (
              <SelectItem key={s} value={s}>
                <StatusBadge status={s} />
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>

      {/* Analyst editable fields */}
      <TableCell>
        <EditableText
          value={record.wiring_institution ?? ""}
          placeholder="Institution"
          onSave={(v) => save("wiring_institution", v)}
        />
      </TableCell>
      <TableCell>
        <EditableText
          value={record.wiring_date ?? ""}
          placeholder="YYYY-MM-DD"
          onSave={(v) => save("wiring_date", v || null)}
          type="date"
        />
      </TableCell>
      <TableCell className="text-right">
        <EditableText
          value={record.adjustments?.toString() ?? "0"}
          placeholder="0.00"
          onSave={(v) => save("adjustments", parseFloat(v) || 0)}
          type="number"
          className="text-right"
        />
      </TableCell>

      {/* Deal/Transaction Notes — analyst field */}
      <TableCell>
        <EditableText
          value={record.transaction_notes ?? ""}
          placeholder="Notes..."
          onSave={(v) => save("transaction_notes", v)}
        />
      </TableCell>

      {/* Accounting fields — visually separated */}
      <TableCell className="border-l-2 border-primary/20 bg-primary/5">
        <Switch
          checked={record.wire_receipt ?? false}
          onCheckedChange={(v) => {
            save("wire_receipt", v);
            if (v) save("status", "Received");
          }}
        />
      </TableCell>
      <TableCell className="bg-primary/5 text-right font-mono text-sm">
        <EditableText
          value={record.amount_wired?.toString() ?? ""}
          placeholder="0.00"
          onSave={(v) => save("amount_wired", parseFloat(v) || null)}
          type="number"
          className="text-right"
          formatDisplay={(v) => v ? `$${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ""}
        />
      </TableCell>
      <TableCell className="bg-primary/5">
        <EditableText
          value={record.ar_date_received ?? ""}
          placeholder="YYYY-MM-DD"
          onSave={(v) => {
            save("ar_date_received", v || null);
            if (v) save("status", "Reconciled");
          }}
          type="date"
        />
      </TableCell>
      <TableCell className="bg-primary/5">
        <EditableText
          value={record.reconciliation_notes ?? ""}
          placeholder="Notes..."
          onSave={(v) => save("reconciliation_notes", v)}
        />
      </TableCell>
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
        onClick={() => {
          setLocal(value);
          setEditing(true);
        }}
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
      onBlur={() => {
        setEditing(false);
        if (local !== value) onSave(local);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          setEditing(false);
          if (local !== value) onSave(local);
        }
        if (e.key === "Escape") {
          setEditing(false);
          setLocal(value);
        }
      }}
      autoFocus
      className={`h-8 min-w-[80px] text-sm ${className}`}
      placeholder={placeholder}
    />
  );
}

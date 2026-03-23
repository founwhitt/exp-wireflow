import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Filter, Download, Check, Loader2, ChevronDown, ChevronUp, Eye, ArrowUp, ArrowDown, ArrowUpDown, X, WrapText, AlignLeft, Settings2, Upload } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
import { useOwAccounts, useOwStatuses, useOwConfig, useCreateOwConfig, useUpdateOwConfig, useDeleteOwConfig } from "@/hooks/useOwConfig";
import { ManageOptionsDialog } from "@/components/ManageOptionsDialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { TreasuryImportDialog } from "@/components/TreasuryImportDialog";

const STATUS_OPTIONS = ["All", "Needs TRX ID", "Waiting on Settlement"];

const HIGHLIGHT_COLORS: { label: string; value: string; bg: string; darkBg: string }[] = [
  { label: "Yellow", value: "yellow", bg: "bg-yellow-100", darkBg: "dark:bg-yellow-900/30" },
  { label: "Light Red", value: "red", bg: "bg-red-100", darkBg: "dark:bg-red-900/30" },
  { label: "Light Green", value: "green", bg: "bg-emerald-100", darkBg: "dark:bg-emerald-900/30" },
];

function getHighlightClass(color: string | null | undefined): string {
  if (!color) return "";
  const found = HIGHLIGHT_COLORS.find((c) => c.value === color);
  return found ? `${found.bg} ${found.darkBg}` : "";
}

// Column definitions
interface ColDef {
  key: string;
  label: string;
  width: number;
  minWidth: number;
  type: "status" | "account" | "text";
}

const DEFAULT_COLS: ColDef[] = [
  { key: "status", label: "Status", width: 140, minWidth: 80, type: "status" },
  { key: "wf_account", label: "Account", width: 130, minWidth: 80, type: "account" },
  { key: "wiring_date", label: "Date", width: 130, minWidth: 80, type: "text" },
  { key: "amount", label: "Amount", width: 120, minWidth: 80, type: "text" },
  { key: "receipt_number", label: "Receipt #", width: 120, minWidth: 80, type: "text" },
  { key: "invoice_number", label: "Invoice #", width: 120, minWidth: 80, type: "text" },
  { key: "description", label: "Description", width: 190, minWidth: 100, type: "text" },
  { key: "accounting_notes", label: "Acct. Notes", width: 190, minWidth: 100, type: "text" },
  { key: "trx_notes", label: "TRX Notes", width: 190, minWidth: 100, type: "text" },
];

const PAYLOAD_COLS: ColDef[] = [
  { key: "status", label: "Status", width: 140, minWidth: 80, type: "status" },
  { key: "wiring_date", label: "Date Rec", width: 130, minWidth: 80, type: "text" },
  { key: "amount", label: "Amount", width: 120, minWidth: 80, type: "text" },
  { key: "receipt_number", label: "Receipt Number", width: 130, minWidth: 80, type: "text" },
  { key: "invoice_number", label: "TID/ Invoice", width: 140, minWidth: 80, type: "text" },
  { key: "description", label: "Customer Name", width: 160, minWidth: 100, type: "text" },
  { key: "agent_name", label: "Agent Name", width: 140, minWidth: 100, type: "text" },
  { key: "property_address", label: "Property Address", width: 180, minWidth: 100, type: "text" },
  { key: "office_location", label: "Office Location", width: 150, minWidth: 100, type: "text" },
  { key: "accounting_notes", label: "Accounting Notes", width: 180, minWidth: 100, type: "text" },
  { key: "trx_notes", label: "Please add TID Here If known", width: 220, minWidth: 100, type: "text" },
];

type ColKey = string;
const ACCOUNTING_COLS: ColKey[] = ["status", "wf_account", "wiring_date", "amount", "receipt_number", "invoice_number", "description", "accounting_notes"];

function normalizeAccount(raw: string): string {
  const t = raw.trim().toLowerCase();
  if (t.includes("3694")) return "WF-3694";
  return "WF-8022";
}

function normalizeStatus(raw: string): string {
  const t = raw.trim().toLowerCase();
  if (t.includes("settlement")) return "Waiting on Settlement";
  if (t.includes("trx") || t.includes("tid")) return "Needs TRX ID";
  return raw.trim();
}

function exportCSV(rows: OutstandingWire[], cols: ColDef[], tab: string) {
  const headers = cols.map((c) => c.label);
  const fields = cols.map((c) => c.key);
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
    <div className="flex items-center gap-1.5 animate-in fade-in duration-200">
      {status === "saving" ? (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          <span className="text-muted-foreground">Saving…</span>
        </>
      ) : (
        <>
          <Check className="h-3.5 w-3.5 text-emerald-500" />
          <span className="text-emerald-600 dark:text-emerald-400">All changes saved</span>
        </>
      )}
    </div>
  );
}

// ---- Undo Stack ----
interface UndoEntry {
  type: "edit";
  id: string;
  field: string;
  oldValue: any;
}

// ---- Main Component ----

export default function OutstandingWires() {
  const { data: records, isLoading, error } = useOutstandingWires();
  const { isAccounting, isAdmin, user } = useAuth();
  const [tab, setTab] = useState("realty");
  const [allCollapsed, setAllCollapsed] = useState(false);
  const [collapseSignal, setCollapseSignal] = useState<{ value: boolean; ts: number } | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const undoStackRef = useRef<UndoEntry[]>([]);
  const update = useUpdateOutstandingWire();

  const markSaving = useCallback(() => {
    setSaveStatus("saving");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
  }, []);

  const markSaved = useCallback(() => {
    setSaveStatus("saved");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => setSaveStatus("idle"), 3000);
  }, []);

  const pushUndo = useCallback((entry: UndoEntry) => {
    undoStackRef.current.push(entry);
    if (undoStackRef.current.length > 100) undoStackRef.current.shift();
  }, []);

  const handleUndo = useCallback(() => {
    const entry = undoStackRef.current.pop();
    if (!entry) return;
    markSaving();
    update.mutate(
      { id: entry.id, [entry.field]: entry.oldValue },
      {
        onSuccess: () => { markSaved(); toast.success("Undo successful"); },
        onError: () => { markSaved(); toast.error("Undo failed"); },
      }
    );
  }, [update, markSaving, markSaved]);

  // Global Ctrl+Z handler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        e.preventDefault();
        handleUndo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleUndo]);

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

  const realty8022 = useMemo(() => filtered.filter((r) => r.wf_account === "WF-8022"), [filtered]);
  const realty3694 = useMemo(() => filtered.filter((r) => r.wf_account === "WF-3694"), [filtered]);

  // Dynamic grouping for commercial/international by wf_account
  const owAccounts = useOwAccounts();
  const groupedByAccount = useMemo(() => {
    const map = new Map<string, OutstandingWire[]>();
    filtered.forEach((r) => {
      const acct = r.wf_account || "WF-8022";
      if (!map.has(acct)) map.set(acct, []);
      map.get(acct)!.push(r);
    });
    return map;
  }, [filtered]);

  const [manageOptionsOpen, setManageOptionsOpen] = useState(false);

  const activeCols = tab === "payload" ? PAYLOAD_COLS : DEFAULT_COLS;

  return (
    <div className="relative flex h-full w-full flex-col gap-4 p-3 sm:p-4 overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Outstanding Wires</h1>
          <p className="text-sm text-muted-foreground">
            Live editable grid — paste from Excel or edit inline. Ctrl+Z to undo.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <SaveIndicator status={saveStatus} />
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setCollapseSignal({ value: false, ts: Date.now() })}>
            <ChevronDown className="h-3.5 w-3.5 mr-1" />Expand All
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setCollapseSignal({ value: true, ts: Date.now() })}>
            <ChevronUp className="h-3.5 w-3.5 mr-1" />Collapse All
          </Button>
          {(isAccounting || isAdmin) && (
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setManageOptionsOpen(true)}>
              <Settings2 className="h-3.5 w-3.5 mr-1" />Manage Options
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search description, invoice, receipt..." className="h-8 pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex items-center gap-1">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" size="sm" className="h-8" onClick={() => exportCSV(filtered, activeCols, tab)} disabled={filtered.length === 0}>
          <Download className="h-4 w-4 mr-1" />Export
        </Button>
      </div>

      {/* Sub-tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full">
          <TabsTrigger value="realty" className="flex-1">Realty</TabsTrigger>
          <TabsTrigger value="payload" className="flex-1">Payload</TabsTrigger>
          <TabsTrigger value="commercial" className="flex-1">Commercial</TabsTrigger>
          <TabsTrigger value="international" className="flex-1">International</TabsTrigger>
        </TabsList>

        <TabsContent value="realty" className="mt-4 space-y-6">
          {isLoading ? <LoadingSkeleton /> : error ? <ErrorMsg error={error} /> : (
            <>
              <CollapsibleAccountSection
                title="8022"
                dotColor="bg-accent"
                records={realty8022}
                cols={DEFAULT_COLS}
                category="realty"
                defaultAccount="WF-8022"
                isAccounting={isAccounting}
                isAdmin={isAdmin}
                userId={user?.id ?? null}
                onSaving={markSaving}
                onSaved={markSaved}
                pushUndo={pushUndo}
                initialLimit={10}
                forceCollapseSignal={collapseSignal}
                owAccounts={owAccounts}
              />
              <CollapsibleAccountSection
                title="3694"
                dotColor="bg-[hsl(var(--success))]"
                records={realty3694}
                cols={DEFAULT_COLS}
                category="realty"
                defaultAccount="WF-3694"
                isAccounting={isAccounting}
                isAdmin={isAdmin}
                userId={user?.id ?? null}
                onSaving={markSaving}
                onSaved={markSaved}
                pushUndo={pushUndo}
                initialLimit={10}
                forceCollapseSignal={collapseSignal}
                owAccounts={owAccounts}
              />
            </>
          )}
        </TabsContent>

        {/* Payload: single section, no account column */}
        <TabsContent value="payload" className="mt-4">
          {isLoading ? <LoadingSkeleton /> : error ? <ErrorMsg error={error} /> : (
            <CollapsibleAccountSection
              title="Payload"
              dotColor="bg-accent"
              records={filtered}
              cols={PAYLOAD_COLS}
              category="payload"
              defaultAccount="WF-8022"
              isAccounting={isAccounting}
              isAdmin={isAdmin}
              userId={user?.id ?? null}
              onSaving={markSaving}
              onSaved={markSaved}
              pushUndo={pushUndo}
              initialLimit={10}
              forceCollapseSignal={collapseSignal}
              owAccounts={owAccounts}
            />
          )}
        </TabsContent>

        {/* Commercial & International: dynamic grouping by account */}
        {["commercial", "international"].map((t) => (
          <TabsContent key={t} value={t} className="mt-4 space-y-6">
            {isLoading ? <LoadingSkeleton /> : error ? <ErrorMsg error={error} /> : (
              <>
                {[...groupedByAccount.entries()].map(([acct, recs]) => (
                  <CollapsibleAccountSection
                    key={acct}
                    title={`${t.charAt(0).toUpperCase() + t.slice(1)} — ${acct.replace(/^.*?(\d{4})$/, "$1").slice(-4)}`}
                    dotColor="bg-accent"
                    records={recs}
                    cols={DEFAULT_COLS}
                    category={t}
                    defaultAccount={acct}
                    isAccounting={isAccounting}
                    isAdmin={isAdmin}
                    userId={user?.id ?? null}
                    onSaving={markSaving}
                    onSaved={markSaved}
                    pushUndo={pushUndo}
                    initialLimit={10}
                    forceCollapseSignal={collapseSignal}
                    owAccounts={owAccounts}
                  />
                ))}
                {groupedByAccount.size === 0 && (
                  <CollapsibleAccountSection
                    title={`${t.charAt(0).toUpperCase() + t.slice(1)}`}
                    dotColor="bg-accent"
                    records={[]}
                    cols={DEFAULT_COLS}
                    category={t}
                    defaultAccount={owAccounts[0]?.value || "WF-8022"}
                    isAccounting={isAccounting}
                    isAdmin={isAdmin}
                    userId={user?.id ?? null}
                    onSaving={markSaving}
                    onSaved={markSaved}
                    pushUndo={pushUndo}
                    initialLimit={10}
                    forceCollapseSignal={collapseSignal}
                    owAccounts={owAccounts}
                  />
                )}
              </>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Manage Options Dialog */}
      <ManageOptionsDialog open={manageOptionsOpen} onOpenChange={setManageOptionsOpen} />
    </div>
  );
}

// ---- Collapsible Account Section ----

function CollapsibleAccountSection({
  title, dotColor, records, cols, category, defaultAccount, isAccounting, isAdmin, userId, onSaving, onSaved, pushUndo, initialLimit, forceCollapseSignal, owAccounts,
}: {
  title: string; dotColor: string; records: OutstandingWire[]; cols: ColDef[];
  category: string; defaultAccount: string; isAccounting: boolean; isAdmin: boolean;
  userId: string | null; onSaving: () => void; onSaved: () => void;
  pushUndo: (e: UndoEntry) => void; initialLimit: number;
  forceCollapseSignal?: { value: boolean; ts: number } | null;
  owAccounts: { value: string; label: string }[];
}) {
  const lsKey = `ow-expanded-${title}`;
  const [expanded, setExpanded] = useState(() => {
    try {
      const saved = localStorage.getItem(lsKey);
      if (saved !== null) return saved === "true";
    } catch {}
    return false;
  });

  // Persist to localStorage
  const toggleExpanded = useCallback((val: boolean) => {
    setExpanded(val);
    try { localStorage.setItem(lsKey, String(val)); } catch {}
  }, [lsKey]);

  // Respond to global collapse/expand signal
  useEffect(() => {
    if (!forceCollapseSignal) return;
    const val = !forceCollapseSignal.value;
    setExpanded(val);
    try { localStorage.setItem(lsKey, String(val)); } catch {}
  }, [forceCollapseSignal, lsKey]);

  const maxRows = expanded ? undefined : initialLimit;

  return (
    <div>
      <div className="flex items-center gap-2 mb-2 px-1">
        <div className={`h-3 w-3 rounded-full ${dotColor}`} />
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        <span className="text-sm text-muted-foreground ml-1 tabular-nums">({records.length} records)</span>
      </div>
      <LiveGrid
        records={records}
        cols={cols}
        category={category}
        defaultAccount={defaultAccount}
        isAccounting={isAccounting}
        isAdmin={isAdmin}
        userId={userId}
        onSaving={onSaving}
        onSaved={onSaved}
        pushUndo={pushUndo}
        maxRows={maxRows}
        owAccounts={owAccounts}
      />
      {!expanded && (
        <Button
          variant="ghost"
          size="sm"
          className="mt-1 w-full text-muted-foreground hover:text-foreground"
          onClick={() => toggleExpanded(true)}
        >
          <ChevronDown className="h-4 w-4 mr-1" />Expand{records.length > initialLimit ? ` (${records.length} records)` : ""}
        </Button>
      )}
      {expanded && (
        <Button
          variant="ghost"
          size="sm"
          className="mt-1 w-full text-muted-foreground hover:text-foreground"
          onClick={() => toggleExpanded(false)}
        >
          <ChevronUp className="h-4 w-4 mr-1" />Collapse to {initialLimit} rows
        </Button>
      )}
    </div>
  );
}

// ---- Live Editable Grid ----

const DEFAULT_EMPTY_ROWS = 50;

interface EmptyRow {
  _empty: true;
  _key: string;
  [key: string]: any;
}

let emptyKeyCounter = 0;
function makeEmptyRow(defaultAccount: string): EmptyRow {
  return {
    _empty: true,
    _key: `empty-${++emptyKeyCounter}`,
    status: "",
    wf_account: defaultAccount,
    wiring_date: "",
    amount: "",
    receipt_number: "",
    invoice_number: "",
    description: "",
    accounting_notes: "",
    trx_notes: "",
  };
}

function makeEmptyRows(count: number, defaultAccount: string): EmptyRow[] {
  return Array.from({ length: count }, () => makeEmptyRow(defaultAccount));
}

type DisplayRow = (OutstandingWire & { _empty?: false }) | EmptyRow;

function isEmptyRow(r: DisplayRow): r is EmptyRow {
  return (r as any)._empty === true;
}

function rowHasData(r: EmptyRow): boolean {
  return !!(r.amount || r.description || r.receipt_number || r.invoice_number || r.wiring_date || r.accounting_notes || r.trx_notes);
}

// ---- Selection helpers ----
interface CellRef { row: number; col: number }
interface SelectionRange { r1: number; c1: number; r2: number; c2: number }

function normalizeRange(a: CellRef, b: CellRef): SelectionRange {
  return {
    r1: Math.min(a.row, b.row), c1: Math.min(a.col, b.col),
    r2: Math.max(a.row, b.row), c2: Math.max(a.col, b.col),
  };
}

function inRange(r: number, c: number, sel: SelectionRange | null): boolean {
  if (!sel) return false;
  return r >= sel.r1 && r <= sel.r2 && c >= sel.c1 && c <= sel.c2;
}

// ---- Custom Context Menu ----
interface CtxMenuState {
  x: number; y: number;
  rowIdx: number; colIdx: number;
  rowData: DisplayRow;
}

function LiveGrid({
  records, cols, category, defaultAccount, isAccounting, isAdmin, userId, onSaving, onSaved, pushUndo, maxRows, owAccounts,
}: {
  records: OutstandingWire[]; cols: ColDef[];
  category: string; defaultAccount: string;
  isAccounting: boolean; isAdmin: boolean;
  userId: string | null;
  onSaving: () => void; onSaved: () => void;
  pushUndo: (e: UndoEntry) => void;
  maxRows?: number;
  owAccounts: { value: string; label: string }[];
}) {
  const create = useCreateOutstandingWires();
  const update = useUpdateOutstandingWire();
  const remove = useDeleteOutstandingWire();

  const storageKey = `ow_colWidths_${category}`;
  const wrapStorageKey = `ow_colWrap_${category}`;
  const [emptyRows, setEmptyRows] = useState<EmptyRow[]>(() => makeEmptyRows(DEFAULT_EMPTY_ROWS, defaultAccount));
  const [colWidths, setColWidths] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        return Object.fromEntries(cols.map((c) => [c.key, parsed[c.key] ?? c.width]));
      }
    } catch {}
    return Object.fromEntries(cols.map((c) => [c.key, c.width]));
  });
  const [colWrapText, setColWrapText] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(wrapStorageKey);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {};
  });
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(new Set());
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc" | null>(null);
  const [columnFilters, setColumnFilters] = useState<Record<string, Set<string>>>({});
  const gridRef = useRef<HTMLDivElement>(null);
  const resizingRef = useRef<{ key: string; startX: number; startW: number } | null>(null);

  // Selection state
  const [anchor, setAnchor] = useState<CellRef | null>(null);
  const [current, setCurrent] = useState<CellRef | null>(null);
  const [selecting, setSelecting] = useState(false);
  const selection = useMemo<SelectionRange | null>(() => {
    if (!anchor || !current) return null;
    return normalizeRange(anchor, current);
  }, [anchor, current]);

  // Context menu state
  const [ctxMenu, setCtxMenu] = useState<CtxMenuState | null>(null);
  const ctxMenuRef = useRef<HTMLDivElement>(null);

  // Close ctx menu on outside click
  useEffect(() => {
    if (!ctxMenu) return;
    const handler = (e: MouseEvent) => {
      if (ctxMenuRef.current && !ctxMenuRef.current.contains(e.target as Node)) {
        setCtxMenu(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [ctxMenu]);

  const toggleColWrap = useCallback((colKey: string) => {
    setColWrapText((prev) => {
      const next = { ...prev, [colKey]: !prev[colKey] };
      try { localStorage.setItem(wrapStorageKey, JSON.stringify(next)); } catch {}
      return next;
    });
  }, [wrapStorageKey]);

  const visibleCols = useMemo(() => cols.filter((c) => !hiddenCols.has(c.key)), [cols, hiddenCols]);

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
    const map: Record<string, string[]> = {};
    cols.forEach(col => {
      const vals = new Set<string>();
      records.forEach(r => {
        const v = String((r as any)[col.key] ?? "");
        if (v) vals.add(v);
      });
      map[col.key] = [...vals].sort();
    });
    return map;
  }, [records, cols]);

  const filteredRecords = useMemo(() => {
    let result = [...records];
    for (const [colKey, values] of Object.entries(columnFilters)) {
      result = result.filter(r => values.has(String((r as any)[colKey] ?? "")));
    }
    if (sortCol && sortDir) {
      result.sort((a, b) => {
        const av = String((a as any)[sortCol] ?? "").toLowerCase();
        const bv = String((b as any)[sortCol] ?? "").toLowerCase();
        const numA = Number(av), numB = Number(bv);
        const isNum = !isNaN(numA) && !isNaN(numB) && av !== "" && bv !== "";
        if (isNum) return sortDir === "asc" ? numA - numB : numB - numA;
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      });
    }
    return result;
  }, [records, columnFilters, sortCol, sortDir]);

  const displayRows: DisplayRow[] = useMemo(() => {
    const all: DisplayRow[] = [...filteredRecords, ...emptyRows];
    if (maxRows !== undefined) return all.slice(0, maxRows);
    return all;
  }, [filteredRecords, emptyRows, maxRows]);

  const activeFilterCount = Object.keys(columnFilters).length;

  const canEditCol = useCallback((col: string) => {
    if (col === "trx_notes") return true;
    return isAccounting && ACCOUNTING_COLS.includes(col);
  }, [isAccounting]);

  const saveField = useCallback((id: string, field: string, value: any, oldValue?: any) => {
    if (oldValue !== undefined) pushUndo({ type: "edit", id, field, oldValue });
    onSaving();
    update.mutate(
      { id, [field]: value },
      {
        onSuccess: () => onSaved(),
        onError: (err: any) => { onSaved(); toast.error("Failed to update", { description: err.message }); },
      }
    );
  }, [update, onSaving, onSaved, pushUndo]);

  const setHighlightColor = useCallback((id: string, color: string | null) => {
    onSaving();
    update.mutate(
      { id, highlight_color: color },
      {
        onSuccess: () => { onSaved(); toast.success(color ? "Highlight applied" : "Highlight removed"); },
        onError: (err: any) => { onSaved(); toast.error("Failed", { description: err.message }); },
      }
    );
  }, [update, onSaving, onSaved]);

  const commitEmptyRow = useCallback((row: EmptyRow) => {
    if (!rowHasData(row)) return;
    onSaving();
    const insert: OutstandingWireInsert = {
      status: row.status || "",
      wf_account: row.wf_account,
      wiring_date: row.wiring_date || null,
      amount: row.amount ? parseFloat(row.amount.replace(/[^0-9.\-]/g, "")) : null,
      receipt_number: row.receipt_number || null,
      invoice_number: row.invoice_number || null,
      description: row.description || null,
      accounting_notes: row.accounting_notes || null,
      trx_notes: row.trx_notes || null,
      agent_name: row.agent_name || null,
      property_address: row.property_address || null,
      office_location: row.office_location || null,
      category,
      created_by: userId,
    };
    create.mutate([insert], {
      onSuccess: () => {
        setEmptyRows((prev) => [...prev.filter((r) => r._key !== row._key), makeEmptyRow(defaultAccount)]);
        onSaved();
      },
      onError: (err: any) => { onSaved(); toast.error("Failed to save", { description: err.message }); },
    });
  }, [create, category, defaultAccount, userId, onSaving, onSaved]);

  const updateEmptyCell = useCallback((key: string, field: string, value: string) => {
    setEmptyRows((prev) => prev.map((r) => r._key === key ? { ...r, [field]: value } : r));
  }, []);

  // ---- Clipboard: Copy selected cells ----
  const copySelection = useCallback(() => {
    if (!selection) return;
    const lines: string[] = [];
    for (let r = selection.r1; r <= selection.r2; r++) {
      const row = displayRows[r];
      if (!row) continue;
      const cells: string[] = [];
      for (let c = selection.c1; c <= selection.c2; c++) {
        const col = visibleCols[c];
        if (!col) continue;
        cells.push(String((row as any)[col.key] ?? ""));
      }
      lines.push(cells.join("\t"));
    }
    navigator.clipboard.writeText(lines.join("\n")).then(
      () => toast.success("Copied to clipboard"),
      () => toast.error("Copy failed")
    );
  }, [selection, displayRows, visibleCols]);

  // ---- Clipboard: Paste ----
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData("text");
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length <= 1 && !text.includes("\t")) return;

    e.preventDefault();

    // Use selection anchor or focused element as start
    let startRow = selection?.r1 ?? 0;
    let startCol = selection?.c1 ?? 0;
    const active = document.activeElement as HTMLElement | null;
    if (active?.dataset.gridrow) startRow = parseInt(active.dataset.gridrow, 10) || 0;
    if (active?.dataset.gridcol) startCol = parseInt(active.dataset.gridcol, 10) || 0;

    const fieldKeys = visibleCols.map((c) => c.key);
    const existingUpdates: { id: string; field: string; value: any; oldValue: any }[] = [];
    const currentEmpty = [...emptyRows];

    // Auto-expand: ensure enough rows
    const neededTotal = startRow + lines.length;
    const totalAvailable = filteredRecords.length + currentEmpty.length;
    if (neededTotal > totalAvailable) {
      const extra = neededTotal - totalAvailable;
      for (let n = 0; n < extra; n++) currentEmpty.push(makeEmptyRow(defaultAccount));
    }

    for (let i = 0; i < lines.length; i++) {
      const rowIdx = startRow + i;
      const colValues = lines[i].split("\t");

      if (rowIdx < filteredRecords.length) {
        const rec = filteredRecords[rowIdx];
        colValues.forEach((val, ci) => {
          const colIdx = startCol + ci;
          if (colIdx >= fieldKeys.length) return;
          const field = fieldKeys[colIdx];
          if (!canEditCol(field)) return;
          let normalized: any = val.trim();
          const oldValue = (rec as any)[field];
          if (field === "wf_account") normalized = normalizeAccount(normalized);
          else if (field === "status") normalized = normalizeStatus(normalized);
          else if (field === "amount") normalized = parseFloat(normalized.replace(/[^0-9.\-]/g, "")) || null;
          else normalized = normalized || null;
          existingUpdates.push({ id: rec.id, field, value: normalized, oldValue });
        });
      } else {
        const emptyIdx = rowIdx - filteredRecords.length;
        if (emptyIdx >= currentEmpty.length) {
          const needed = emptyIdx - currentEmpty.length + 1;
          for (let n = 0; n < needed; n++) currentEmpty.push(makeEmptyRow(defaultAccount));
        }
        const emptyRow = currentEmpty[emptyIdx];
        colValues.forEach((val, ci) => {
          const colIdx = startCol + ci;
          if (colIdx >= fieldKeys.length) return;
          const field = fieldKeys[colIdx];
          if (!canEditCol(field)) return;
          let normalized = val.trim();
          if (field === "wf_account") normalized = normalizeAccount(normalized);
          else if (field === "status") normalized = normalizeStatus(normalized);
          emptyRow[field] = normalized;
        });
      }
    }

    existingUpdates.forEach((u) => {
      pushUndo({ type: "edit", id: u.id, field: u.field, oldValue: u.oldValue });
      onSaving();
      update.mutate({ id: u.id, [u.field]: u.value }, {
        onSuccess: () => onSaved(),
        onError: () => onSaved(),
      });
    });

    const filledFromPaste = currentEmpty.filter(rowHasData);
    if (filledFromPaste.length > 0) {
      onSaving();
      const inserts: OutstandingWireInsert[] = filledFromPaste.map((r) => ({
        status: r.status || "",
        wf_account: r.wf_account,
        wiring_date: r.wiring_date || null,
        amount: r.amount ? parseFloat(r.amount.replace(/[^0-9.\-]/g, "")) : null,
        receipt_number: r.receipt_number || null,
        invoice_number: r.invoice_number || null,
        description: r.description || null,
        accounting_notes: r.accounting_notes || null,
        trx_notes: r.trx_notes || null,
        agent_name: r.agent_name || null,
        property_address: r.property_address || null,
        office_location: r.office_location || null,
        category,
        created_by: userId,
      }));
      const filledKeys = new Set(filledFromPaste.map((r) => r._key));
      create.mutate(inserts, {
        onSuccess: () => {
          setEmptyRows((prev) => {
            const remaining = prev.filter((r) => !filledKeys.has(r._key));
            const needed = Math.max(0, DEFAULT_EMPTY_ROWS - remaining.length);
            return [...remaining, ...makeEmptyRows(needed, defaultAccount)];
          });
          onSaved();
          toast.success(`${inserts.length} wire${inserts.length > 1 ? "s" : ""} auto-saved`);
        },
        onError: (err: any) => { onSaved(); toast.error("Failed", { description: err.message }); },
      });
    } else {
      setEmptyRows([...currentEmpty]);
    }

    toast.success(`Pasted ${lines.length} row${lines.length > 1 ? "s" : ""}`);
  }, [filteredRecords, emptyRows, defaultAccount, canEditCol, update, create, category, userId, onSaving, onSaved, pushUndo, visibleCols, selection]);

  // ---- Keyboard: Ctrl+C & Ctrl+A ----
  const selectAll = useCallback(() => {
    if (!isAdmin) return;
    const totalRows = displayRows.length;
    const totalCols = visibleCols.length;
    if (totalRows === 0 || totalCols === 0) return;
    setAnchor({ row: 0, col: 0 });
    setCurrent({ row: totalRows - 1, col: totalCols - 1 });
    toast.success("All cells selected");
  }, [isAdmin, displayRows.length, visibleCols.length]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!gridRef.current?.contains(document.activeElement) && !gridRef.current?.contains(e.target as Node)) return;
      if ((e.ctrlKey || e.metaKey) && e.key === "c") {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        e.preventDefault();
        copySelection();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "a" && isAdmin) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        e.preventDefault();
        selectAll();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [copySelection, selectAll, isAdmin]);

  // ---- Context menu: clear cell ----
  const clearCell = useCallback((rowIdx: number, colIdx: number) => {
    const row = displayRows[rowIdx];
    const col = visibleCols[colIdx];
    if (!row || !col) return;
    if (!canEditCol(col.key)) return;
    if (isEmptyRow(row)) {
      updateEmptyCell(row._key, col.key, "");
    } else {
      const oldValue = (row as any)[col.key];
      const newVal = col.key === "amount" ? null : null;
      saveField(row.id, col.key, newVal, oldValue);
    }
  }, [displayRows, visibleCols, canEditCol, updateEmptyCell, saveField]);

  // ---- Context menu: delete row ----
  const deleteRow = useCallback((rowIdx: number) => {
    const row = displayRows[rowIdx];
    if (!row) return;
    if (isEmptyRow(row)) {
      setEmptyRows((prev) => prev.filter((r) => r._key !== row._key));
    } else {
      remove.mutate(row.id, {
        onSuccess: () => toast.success("Deleted"),
        onError: (err: any) => toast.error("Failed", { description: err.message }),
      });
    }
  }, [displayRows, remove]);

  // ---- Context menu: paste from clipboard ----
  const pasteFromClipboard = useCallback(async (startRow: number, startCol: number) => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) return;
      // Create a synthetic paste
      const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
      if (lines.length === 0) return;

      const fieldKeys = visibleCols.map(c => c.key);
      const existingUpdates: { id: string; field: string; value: any; oldValue: any }[] = [];
      const currentEmpty = [...emptyRows];

      const neededTotal = startRow + lines.length;
      const totalAvailable = filteredRecords.length + currentEmpty.length;
      if (neededTotal > totalAvailable) {
        const extra = neededTotal - totalAvailable;
        for (let n = 0; n < extra; n++) currentEmpty.push(makeEmptyRow(defaultAccount));
      }

      for (let i = 0; i < lines.length; i++) {
        const rowIdx = startRow + i;
        const colValues = lines[i].split("\t");
        if (rowIdx < filteredRecords.length) {
          const rec = filteredRecords[rowIdx];
          colValues.forEach((val, ci) => {
            const colIdx = startCol + ci;
            if (colIdx >= fieldKeys.length) return;
            const field = fieldKeys[colIdx];
            if (!canEditCol(field)) return;
            let normalized: any = val.trim();
            const oldValue = (rec as any)[field];
            if (field === "wf_account") normalized = normalizeAccount(normalized);
            else if (field === "status") normalized = normalizeStatus(normalized);
            else if (field === "amount") normalized = parseFloat(normalized.replace(/[^0-9.\-]/g, "")) || null;
            else normalized = normalized || null;
            existingUpdates.push({ id: rec.id, field, value: normalized, oldValue });
          });
        } else {
          const emptyIdx = rowIdx - filteredRecords.length;
          if (emptyIdx >= currentEmpty.length) {
            for (let n = 0; n <= emptyIdx - currentEmpty.length; n++) currentEmpty.push(makeEmptyRow(defaultAccount));
          }
          const emptyRow = currentEmpty[emptyIdx];
          colValues.forEach((val, ci) => {
            const colIdx = startCol + ci;
            if (colIdx >= fieldKeys.length) return;
            const field = fieldKeys[colIdx];
            if (!canEditCol(field)) return;
            let normalized = val.trim();
            if (field === "wf_account") normalized = normalizeAccount(normalized);
            else if (field === "status") normalized = normalizeStatus(normalized);
            emptyRow[field] = normalized;
          });
        }
      }

      existingUpdates.forEach(u => {
        pushUndo({ type: "edit", id: u.id, field: u.field, oldValue: u.oldValue });
        onSaving();
        update.mutate({ id: u.id, [u.field]: u.value }, {
          onSuccess: () => onSaved(), onError: () => onSaved(),
        });
      });

      const filledFromPaste = currentEmpty.filter(rowHasData);
      if (filledFromPaste.length > 0) {
        onSaving();
        const inserts: OutstandingWireInsert[] = filledFromPaste.map(r => ({
          status: r.status || "", wf_account: r.wf_account,
          wiring_date: r.wiring_date || null,
          amount: r.amount ? parseFloat(r.amount.replace(/[^0-9.\-]/g, "")) : null,
          receipt_number: r.receipt_number || null, invoice_number: r.invoice_number || null,
          description: r.description || null, accounting_notes: r.accounting_notes || null,
          trx_notes: r.trx_notes || null, agent_name: r.agent_name || null,
          property_address: r.property_address || null, office_location: r.office_location || null,
          category, created_by: userId,
        }));
        const filledKeys = new Set(filledFromPaste.map(r => r._key));
        create.mutate(inserts, {
          onSuccess: () => {
            setEmptyRows(prev => {
              const remaining = prev.filter(r => !filledKeys.has(r._key));
              return [...remaining, ...makeEmptyRows(Math.max(0, DEFAULT_EMPTY_ROWS - remaining.length), defaultAccount)];
            });
            onSaved();
          },
          onError: (err: any) => { onSaved(); toast.error("Failed", { description: err.message }); },
        });
      } else {
        setEmptyRows([...currentEmpty]);
      }
      toast.success(`Pasted ${lines.length} row${lines.length > 1 ? "s" : ""}`);
    } catch {
      toast.error("Unable to read clipboard");
    }
  }, [filteredRecords, emptyRows, defaultAccount, canEditCol, update, create, category, userId, onSaving, onSaved, pushUndo, visibleCols]);

  // Column resize handlers
  const onResizeStart = useCallback((key: string, e: React.MouseEvent) => {
    e.preventDefault();
    resizingRef.current = { key, startX: e.clientX, startW: colWidths[key] || 120 };
    const onMove = (ev: MouseEvent) => {
      if (!resizingRef.current) return;
      const diff = ev.clientX - resizingRef.current.startX;
      const col = cols.find((c) => c.key === resizingRef.current!.key);
      const min = col?.minWidth ?? 60;
      setColWidths((prev) => ({ ...prev, [resizingRef.current!.key]: Math.max(min, resizingRef.current!.startW + diff) }));
    };
    const onUp = () => {
      resizingRef.current = null;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      setColWidths((current) => {
        try { localStorage.setItem(storageKey, JSON.stringify(current)); } catch {}
        return current;
      });
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [colWidths, cols, storageKey]);

  // ---- Mouse selection handlers ----
  const onCellMouseDown = useCallback((ri: number, ci: number, e: React.MouseEvent) => {
    if (e.button === 2) return; // right-click handled by context menu
    setAnchor({ row: ri, col: ci });
    setCurrent({ row: ri, col: ci });
    setSelecting(true);
  }, []);

  const onCellMouseEnter = useCallback((ri: number, ci: number) => {
    if (!selecting) return;
    setCurrent({ row: ri, col: ci });
  }, [selecting]);

  useEffect(() => {
    if (!selecting) return;
    const handler = () => setSelecting(false);
    window.addEventListener("mouseup", handler);
    return () => window.removeEventListener("mouseup", handler);
  }, [selecting]);

  // ---- Right-click handler ----
  const onCellContextMenu = useCallback((e: React.MouseEvent, ri: number, ci: number, row: DisplayRow) => {
    e.preventDefault();
    e.stopPropagation();
    // If right-clicking outside current selection, move selection to this cell
    if (!inRange(ri, ci, selection)) {
      setAnchor({ row: ri, col: ci });
      setCurrent({ row: ri, col: ci });
    }
    setCtxMenu({ x: e.clientX, y: e.clientY, rowIdx: ri, colIdx: ci, rowData: row });
  }, [selection]);

  const renderRow = (row: DisplayRow, ri: number) => {
    const empty = isEmptyRow(row);
    const rowKey = empty ? row._key : row.id;
    const highlightColor = empty ? null : (row as OutstandingWire).highlight_color;
    const highlightClass = getHighlightClass(highlightColor);

    return (
      <tr
        key={rowKey}
        className={`border-b border-border/40 group transition-colors ${highlightClass} ${empty ? "bg-transparent hover:bg-muted/10" : "hover:bg-muted/20"}`}
      >
        <td className="px-1 py-0.5 text-center text-muted-foreground tabular-nums select-none">
          {ri + 1}
        </td>

        {visibleCols.map((col, ci) => {
          const editable = canEditCol(col.key);
          const value = (row as any)[col.key] ?? "";
          const selected = inRange(ri, ci, selection);

          const isWrapped = !!colWrapText[col.key];
          const cellClip = isWrapped ? "break-words" : "truncate";
          const cellStyle = isWrapped
            ? { overflowWrap: "break-word" as const, width: colWidths[col.key] ?? col.width }
            : { width: colWidths[col.key] ?? col.width, overflow: "hidden" as const, textOverflow: "ellipsis" as const, whiteSpace: "nowrap" as const };

          const selClass = selected ? "ring-2 ring-primary/40 bg-primary/5" : "";

          if (!editable) {
            return (
              <td
                key={col.key}
                className={`px-1.5 py-0.5 ${cellClip} ${selClass}`}
                style={cellStyle}
                onMouseDown={(e) => onCellMouseDown(ri, ci, e)}
                onMouseEnter={() => onCellMouseEnter(ri, ci)}
                onContextMenu={(e) => onCellContextMenu(e, ri, ci, row)}
              >
                {col.key === "status" ? (
                  empty || !value ? <span className="text-muted-foreground/40">—</span> : <StatusBadge status={value} />
                ) : col.key === "amount" && value ? (
                  <span className="font-sans tabular-nums">${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                ) : (
                  <span className={`text-muted-foreground ${cellClip}`}>{value || "—"}</span>
                )}
              </td>
            );
          }

          if (col.type === "status") {
            return (
              <td
                key={col.key}
                className={`px-0.5 py-0.5 ${selClass}`}
                style={{ width: colWidths[col.key] ?? col.width }}
                onMouseDown={(e) => onCellMouseDown(ri, ci, e)}
                onMouseEnter={() => onCellMouseEnter(ri, ci)}
                onContextMenu={(e) => onCellContextMenu(e, ri, ci, row)}
              >
                <select
                  className="w-full h-7 bg-transparent border-0 outline-none focus:ring-1 focus:ring-ring rounded px-1 cursor-pointer text-foreground [&>option]:bg-popover [&>option]:text-popover-foreground"
                  value={value}
                  data-gridrow={ri}
                  data-gridcol={ci}
                  onChange={(e) => {
                    if (empty) updateEmptyCell(row._key, col.key, e.target.value);
                    else saveField(row.id, col.key, e.target.value, value);
                  }}
                >
                  <option value=""></option>
                  <option value="Needs TRX ID">Needs TRX ID</option>
                  <option value="Waiting on Settlement">Waiting on Settlement</option>
                </select>
              </td>
            );
          }

          if (col.type === "account") {
            return (
              <td
                key={col.key}
                className={`px-0.5 py-0.5 ${selClass}`}
                style={{ width: colWidths[col.key] ?? col.width }}
                onMouseDown={(e) => onCellMouseDown(ri, ci, e)}
                onMouseEnter={() => onCellMouseEnter(ri, ci)}
                onContextMenu={(e) => onCellContextMenu(e, ri, ci, row)}
              >
                <select
                  className="w-full h-7 bg-transparent border-0 outline-none focus:ring-1 focus:ring-ring rounded px-1 cursor-pointer text-foreground [&>option]:bg-popover [&>option]:text-popover-foreground"
                  value={value || (category === "commercial" || category === "international" ? "" : defaultAccount)}
                  data-gridrow={ri}
                  data-gridcol={ci}
                  onChange={(e) => {
                    if (empty) updateEmptyCell(row._key, col.key, e.target.value);
                    else saveField(row.id, col.key, e.target.value, value);
                  }}
                >
                  <option value="">—</option>
                  {owAccounts.length > 0 ? owAccounts.map((a) => (
                    <option key={a.value} value={a.value}>{a.value.replace(/^.*?(\d{4})$/, "$1").slice(-4)}</option>
                  )) : (
                    <>
                      <option value="WF-8022">8022</option>
                      <option value="WF-3694">3694</option>
                    </>
                  )}
                </select>
              </td>
            );
          }

          return (
            <td
              key={col.key}
              className={`px-0.5 py-0.5 ${cellClip} ${selClass}`}
              style={cellStyle}
              onMouseDown={(e) => onCellMouseDown(ri, ci, e)}
              onMouseEnter={() => onCellMouseEnter(ri, ci)}
              onContextMenu={(e) => onCellContextMenu(e, ri, ci, row)}
            >
              {empty ? (
                <input
                  className="w-full h-7 bg-transparent border-0 outline-none focus:ring-1 focus:ring-ring rounded px-1 placeholder:text-muted-foreground/30"
                  type="text"
                  value={value}
                  data-gridrow={ri}
                  data-gridcol={ci}
                  placeholder={col.key === "amount" ? "0.00" : col.key === "wiring_date" ? "MM/DD/YYYY" : ""}
                  onChange={(e) => updateEmptyCell(row._key, col.key, e.target.value)}
                  onBlur={() => commitEmptyRow(row)}
                />
              ) : (
                <InlineEditCell
                  value={String(value ?? "")}
                  isAmount={col.key === "amount"}
                  gridRow={ri}
                  gridCol={ci}
                  onSave={(v) => {
                    let parsed: any = v || null;
                    if (col.key === "amount") parsed = parseFloat((v || "").replace(/[^0-9.\-]/g, "")) || null;
                    saveField(row.id, col.key, parsed, value);
                  }}
                />
              )}
            </td>
          );
        })}

        {isAccounting && <td className="px-0.5 py-0.5 w-8" />}
      </tr>
    );
  };

  return (
    <Card className="bg-card shadow-sm overflow-hidden">
      <CardContent className="p-0">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/40 bg-muted/20">
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 text-xs">
                  <Eye className="h-3.5 w-3.5 mr-1" />Columns
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {cols.map((col) => (
                  <DropdownMenuCheckboxItem
                    key={col.key}
                    checked={!hiddenCols.has(col.key)}
                    onCheckedChange={(checked) => {
                      setHiddenCols((prev) => {
                        const next = new Set(prev);
                        if (checked) next.delete(col.key);
                        else next.add(col.key);
                        return next;
                      });
                    }}
                  >
                    {col.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setColumnFilters({})}>
                <X className="mr-1 h-3 w-3" />
                Clear {activeFilterCount} filter{activeFilterCount > 1 ? "s" : ""}
              </Button>
            )}
            {isAdmin && (
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={selectAll}>
                Select All
                <span className="ml-1 text-muted-foreground">Ctrl+A</span>
              </Button>
            )}
          </div>
        </div>

        <div
          ref={gridRef}
          className="overflow-auto max-h-[70vh] relative"
          onPaste={handlePaste}
          onContextMenu={(e) => {
            // Prevent browser context menu on grid background
            if (!(e.target as HTMLElement).closest("td")) {
              e.preventDefault();
            }
          }}
        >
          <table className="w-full border-collapse text-sm select-none" style={{ tableLayout: "fixed" }}>
            <thead className="sticky top-0 z-10">
              <tr className="bg-muted/60 border-b">
                <th className="px-1 py-2 text-center font-medium text-muted-foreground w-8">#</th>
                {visibleCols.map((col) => {
                  const locked = ACCOUNTING_COLS.includes(col.key) && !isAccounting;
                  const isActive = sortCol === col.key;
                  const hasFilter = !!columnFilters[col.key];
                  return (
                    <th
                      key={col.key}
                      className="group/head px-1.5 py-2 text-left font-medium text-muted-foreground uppercase tracking-wider relative select-none text-[0.7rem]"
                      style={{ width: colWidths[col.key] ?? col.width }}
                    >
                      <div className="flex items-center gap-1">
                        <button
                          className="flex items-center gap-1 hover:text-foreground transition-colors"
                          onClick={() => handleSort(col.key)}
                        >
                          <span className="truncate">{col.label}{locked ? " 🔒" : ""}</span>
                          {isActive && sortDir === "asc" && <ArrowUp className="h-3 w-3 text-primary shrink-0" />}
                          {isActive && sortDir === "desc" && <ArrowDown className="h-3 w-3 text-primary shrink-0" />}
                          {!isActive && <ArrowUpDown className="h-3 w-3 opacity-0 group-hover/head:opacity-40 shrink-0" />}
                        </button>
                        <OutstandingColumnFilterPopover
                          colKey={col.key}
                          values={uniqueValues[col.key] ?? []}
                          selected={columnFilters[col.key]}
                          onToggle={toggleColumnFilter}
                          onClear={clearColumnFilter}
                          hasFilter={hasFilter}
                        />
                      </div>
                      <div
                        className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-accent/40 transition-colors"
                        onMouseDown={(e) => onResizeStart(col.key, e)}
                      />
                    </th>
                  );
                })}
                {isAccounting && <th className="w-8" />}
              </tr>
            </thead>
            <tbody>
              {displayRows.map((row, ri) => renderRow(row, ri))}
            </tbody>
          </table>

          {/* Custom Context Menu */}
          {ctxMenu && (
            <div
              ref={ctxMenuRef}
              className="fixed z-50 min-w-[200px] rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95"
              style={{ left: ctxMenu.x, top: ctxMenu.y }}
            >
              <button
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                onClick={() => { copySelection(); setCtxMenu(null); }}
              >
                Copy
                <span className="ml-auto text-xs text-muted-foreground">Ctrl+C</span>
              </button>
              <button
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                onClick={() => { pasteFromClipboard(ctxMenu.rowIdx, ctxMenu.colIdx); setCtxMenu(null); }}
              >
                Paste
                <span className="ml-auto text-xs text-muted-foreground">Ctrl+V</span>
              </button>
              <div className="-mx-1 my-1 h-px bg-border" />
              <button
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                onClick={() => { clearCell(ctxMenu.rowIdx, ctxMenu.colIdx); setCtxMenu(null); }}
              >
                Clear Cell
              </button>
              <button
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                onClick={() => { deleteRow(ctxMenu.rowIdx); setCtxMenu(null); }}
              >
                Delete Row
              </button>
              {isAdmin && selection && (selection.r2 - selection.r1 > 0) && (
                <>
                  <div className="-mx-1 my-1 h-px bg-border" />
                  <button
                    className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                    onClick={() => {
                      const toDelete: string[] = [];
                      for (let r = selection!.r1; r <= selection!.r2; r++) {
                        const row = displayRows[r];
                        if (row && !isEmptyRow(row)) toDelete.push(row.id);
                      }
                      if (toDelete.length === 0) { toast.info("No saved rows in selection"); setCtxMenu(null); return; }
                      toDelete.forEach((id) => {
                        remove.mutate(id, {
                          onSuccess: () => {},
                          onError: (err: any) => toast.error("Delete failed", { description: err.message }),
                        });
                      });
                      toast.success(`Deleted ${toDelete.length} row${toDelete.length > 1 ? "s" : ""}`);
                      setAnchor(null);
                      setCurrent(null);
                      setCtxMenu(null);
                    }}
                  >
                    Delete Selected ({(() => {
                      let count = 0;
                      for (let r = selection!.r1; r <= selection!.r2; r++) {
                        const row = displayRows[r];
                        if (row && !isEmptyRow(row)) count++;
                      }
                      return count;
                    })()} rows)
                  </button>
                </>
              )}

              {/* Text Display toggle for column */}
              <div className="-mx-1 my-1 h-px bg-border" />
              <button
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                onClick={() => {
                  const colKey = visibleCols[ctxMenu.colIdx]?.key;
                  if (colKey) toggleColWrap(colKey);
                  setCtxMenu(null);
                }}
              >
                {visibleCols[ctxMenu.colIdx] && colWrapText[visibleCols[ctxMenu.colIdx].key]
                  ? <><AlignLeft className="h-3.5 w-3.5" />Clip Text</>
                  : <><WrapText className="h-3.5 w-3.5" />Wrap Text</>
                }
              </button>

              {/* Accounting: Highlight Row */}
              {isAccounting && !isEmptyRow(ctxMenu.rowData) && (
                <>
                  <div className="-mx-1 my-1 h-px bg-border" />
                  <div className="px-2 py-1 text-xs font-medium text-muted-foreground">Highlight Row</div>
                  {HIGHLIGHT_COLORS.map((c) => {
                    const rowData = ctxMenu.rowData as OutstandingWire;
                    return (
                      <button
                        key={c.value}
                        className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                        onClick={() => { setHighlightColor(rowData.id, c.value); setCtxMenu(null); }}
                      >
                        <div className={`h-3 w-3 rounded-sm border border-border ${c.bg}`} />
                        {c.label}
                        {rowData.highlight_color === c.value && <Check className="h-3 w-3 ml-auto text-primary" />}
                      </button>
                    );
                  })}
                  <button
                    className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-40"
                    disabled={!(ctxMenu.rowData as OutstandingWire).highlight_color}
                    onClick={() => { setHighlightColor((ctxMenu.rowData as OutstandingWire).id, null); setCtxMenu(null); }}
                  >
                    Remove Highlight
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t bg-muted/20 px-3 py-1.5">
          <span className="text-sm text-muted-foreground">
            Right-click for options. Drag to select. Ctrl+C / Ctrl+V for bulk data.
          </span>
          <span className="text-sm text-muted-foreground tabular-nums">
            {records.length} saved · {emptyRows.length} blank rows
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// ---- Inline Edit Cell (for saved records) ----

function InlineEditCell({
  value, isAmount, gridRow, gridCol, onSave,
}: {
  value: string; isAmount: boolean; gridRow: number; gridCol: number;
  onSave: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [local, setLocal] = useState(value);

  useEffect(() => { setLocal(value); }, [value]);

  if (!editing) {
    const display = isAmount && value
      ? `$${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
      : value || "—";
    return (
      <button
        className="w-full min-w-[40px] h-7 rounded px-1 text-left transition-colors hover:bg-muted/60 break-words text-wrap"
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
      className="w-full h-7 bg-background border border-input outline-none focus:ring-1 focus:ring-ring rounded px-1"
      type="text"
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

// ---- Column Filter Popover ----

function OutstandingColumnFilterPopover({
  colKey, values, selected, onToggle, onClear, hasFilter,
}: {
  colKey: string; values: string[]; selected?: Set<string>;
  onToggle: (colKey: string, value: string) => void;
  onClear: (colKey: string) => void; hasFilter: boolean;
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
            <label key={v} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-muted">
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

// ---- Utility Components ----

function LoadingSkeleton() {
  return (
    <div className="space-y-2 p-4">
      {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
    </div>
  );
}

function ErrorMsg({ error }: { error: unknown }) {
  return <p className="p-4 text-center text-destructive">Error: {(error as Error).message}</p>;
}

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Filter, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { DepartmentBadge } from "@/components/DepartmentBadge";
import { useWireRecords } from "@/hooks/useWireRecords";
import { InlineEditRow } from "@/components/InlineEditRow";

const STATUS_OPTIONS = ["All", "Pending", "Wired", "Received", "Reconciled"];

export default function Dashboard() {
  const { data: records, isLoading, error } = useWireRecords();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

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
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Wire Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Track all wire records. Analysts edit deal data; Accounting finalizes reconciliation.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <SummaryCard label="Total" value={counts.total} />
        <SummaryCard label="Pending" value={counts.pending} color="amber" />
        <SummaryCard label="Wired" value={counts.wired} color="blue" />
        <SummaryCard label="Received" value={counts.received} color="emerald" />
        <SummaryCard label="Reconciled" value={counts.reconciled} color="purple" />
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search TID, customer, address, agent..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" size="sm" onClick={() => exportCSV(filtered)} disabled={filtered.length === 0}>
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Data table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-6">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : error ? (
            <p className="p-6 text-center text-sm text-destructive">Error loading records: {(error as Error).message}</p>
          ) : filtered.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              {records?.length === 0 ? "No wire records yet. Create one from the New Wire page." : "No records match your filters."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="w-[100px]">TID</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Property Address</TableHead>
                    <TableHead className="text-right">Balance Due</TableHead>
                    <TableHead>Agent</TableHead>
                    <TableHead>Status</TableHead>
                    {/* Analyst post-send */}
                    <TableHead>Wiring Inst.</TableHead>
                    <TableHead>Wiring Date</TableHead>
                    <TableHead className="text-right">Adjustments</TableHead>
                    {/* Accounting */}
                    <TableHead className="border-l-2 border-primary/20 bg-primary/5">Receipt</TableHead>
                    <TableHead className="bg-primary/5 text-right">Amt Wired</TableHead>
                    <TableHead className="bg-primary/5">AR Date</TableHead>
                    <TableHead className="bg-primary/5">Recon Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((record) => (
                    <InlineEditRow key={record.id} record={record} />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: number; color?: string }) {
  const colorMap: Record<string, string> = {
    amber: "text-amber-600",
    blue: "text-blue-600",
    emerald: "text-emerald-600",
    purple: "text-purple-600",
  };
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className={`text-2xl font-bold ${color ? colorMap[color] : "text-foreground"}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

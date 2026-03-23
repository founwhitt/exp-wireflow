import { useState, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, FileSpreadsheet, CheckCircle2 } from "lucide-react";
import { useCreateOutstandingWires, type OutstandingWireInsert } from "@/hooks/useOutstandingWires";
import { toast } from "sonner";

// Simulated treasury data
const SIMULATED_8022: Omit<OutstandingWireInsert, "category" | "created_by">[] = [
  { status: "Needs TRX ID", wf_account: "WF-8022", wiring_date: "2026-03-21", amount: 47250.00, receipt_number: "WR-884201", invoice_number: "", description: "Meridian Holdings LLC", accounting_notes: "", trx_notes: "" },
  { status: "Needs TRX ID", wf_account: "WF-8022", wiring_date: "2026-03-21", amount: 112500.00, receipt_number: "WR-884202", invoice_number: "", description: "Summit Capital Partners", accounting_notes: "", trx_notes: "" },
  { status: "Waiting on Settlement", wf_account: "WF-8022", wiring_date: "2026-03-20", amount: 89750.00, receipt_number: "WR-884190", invoice_number: "", description: "Vanguard Properties LLC", accounting_notes: "", trx_notes: "" },
  { status: "Needs TRX ID", wf_account: "WF-8022", wiring_date: "2026-03-20", amount: 63400.00, receipt_number: "WR-884185", invoice_number: "", description: "Atlas Commercial Partners", accounting_notes: "", trx_notes: "" },
  { status: "Needs TRX ID", wf_account: "WF-8022", wiring_date: "2026-03-19", amount: 205000.00, receipt_number: "WR-884178", invoice_number: "", description: "Keystone Equity Group", accounting_notes: "", trx_notes: "" },
];

const SIMULATED_3694: Omit<OutstandingWireInsert, "category" | "created_by">[] = [
  { status: "Needs TRX ID", wf_account: "WF-3694", wiring_date: "2026-03-21", amount: 34800.00, receipt_number: "WR-770501", invoice_number: "", description: "Coastal Realty Trust", accounting_notes: "", trx_notes: "" },
  { status: "Waiting on Settlement", wf_account: "WF-3694", wiring_date: "2026-03-20", amount: 156200.00, receipt_number: "WR-770498", invoice_number: "", description: "Horizon Land Holdings", accounting_notes: "", trx_notes: "" },
  { status: "Needs TRX ID", wf_account: "WF-3694", wiring_date: "2026-03-19", amount: 78900.00, receipt_number: "WR-770492", invoice_number: "", description: "Pinnacle Real Estate Trust", accounting_notes: "", trx_notes: "" },
];

const SIMULATED_PAYLOAD: Omit<OutstandingWireInsert, "category" | "created_by">[] = [
  { status: "Needs TRX ID", wf_account: "WF-8022", wiring_date: "2026-03-21", amount: 91350.00, receipt_number: "WR-990101", invoice_number: "", description: "Oakridge Ventures Inc.", agent_name: "David Chen", property_address: "14 Allen Street, New York, NY 10002", office_location: "NYC Metro", accounting_notes: "", trx_notes: "" },
];

interface TreasuryImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | null;
  onImportComplete: () => void;
}

type ImportStage = "idle" | "parsing" | "routing" | "complete";

export function TreasuryImportDialog({ open, onOpenChange, userId, onImportComplete }: TreasuryImportDialogProps) {
  const [stage, setStage] = useState<ImportStage>("idle");
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createWires = useCreateOutstandingWires();

  const resetState = useCallback(() => {
    setStage("idle");
    setProgress(0);
    setDragOver(false);
  }, []);

  const handleClose = useCallback((val: boolean) => {
    if (!val) resetState();
    onOpenChange(val);
  }, [onOpenChange, resetState]);

  const runSimulation = useCallback(async () => {
    setStage("parsing");
    setProgress(0);

    // Phase 1: Parsing animation
    for (let i = 0; i <= 40; i += 4) {
      await new Promise((r) => setTimeout(r, 60));
      setProgress(i);
    }

    setStage("routing");
    // Phase 2: Routing animation
    for (let i = 40; i <= 80; i += 4) {
      await new Promise((r) => setTimeout(r, 50));
      setProgress(i);
    }

    // Phase 3: Insert records
    const allRecords: OutstandingWireInsert[] = [
      ...SIMULATED_8022.map((r) => ({ ...r, category: "realty", created_by: userId })),
      ...SIMULATED_3694.map((r) => ({ ...r, category: "realty", created_by: userId })),
      ...SIMULATED_PAYLOAD.map((r) => ({ ...r, category: "payload", created_by: userId })),
    ];

    try {
      await createWires.mutateAsync(allRecords);
      for (let i = 80; i <= 100; i += 5) {
        await new Promise((r) => setTimeout(r, 40));
        setProgress(i);
      }
      setStage("complete");
      toast.success("Import Complete: 9 records routed to 3 sections", {
        description: "5 → Realty 8022 · 3 → Realty 3694 · 1 → Payload",
        duration: 6000,
      });
      onImportComplete();
      setTimeout(() => handleClose(false), 2000);
    } catch {
      toast.error("Import failed — please try again");
      resetState();
    }
  }, [userId, createWires, handleClose, resetState, onImportComplete]);

  const handleFileTrigger = useCallback(() => {
    // Any file triggers the simulation
    runSimulation();
  }, [runSimulation]);

  const stageLabel = stage === "parsing"
    ? "Parsing Treasury Report…"
    : stage === "routing"
    ? "Auto-routing records to sections…"
    : stage === "complete"
    ? "Import Complete: 9 records routed to 3 sections"
    : "";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-accent" />
            Treasury Import
          </DialogTitle>
        </DialogHeader>

        {stage === "idle" ? (
          <div
            className={`flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed p-10 transition-colors cursor-pointer ${
              dragOver
                ? "border-accent bg-accent/10"
                : "border-muted-foreground/25 hover:border-accent/50 hover:bg-accent/5"
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFileTrigger(); }}
            onClick={handleFileTrigger}
          >
            <div className="rounded-full bg-accent/10 p-4">
              <Upload className="h-8 w-8 text-accent" />
            </div>
            <div className="text-center">
              <p className="font-medium text-foreground">Drop treasury report here</p>
              <p className="text-sm text-muted-foreground mt-1">or click to simulate import</p>
            </div>
            <p className="text-xs text-muted-foreground">.xlsx, .csv, .txt</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 py-6">
            {stage === "complete" ? (
              <div className="rounded-full bg-[hsl(var(--success))]/10 p-4">
                <CheckCircle2 className="h-8 w-8 text-[hsl(var(--success))]" />
              </div>
            ) : (
              <div className="rounded-full bg-accent/10 p-4">
                <FileSpreadsheet className="h-8 w-8 text-accent animate-pulse" />
              </div>
            )}
            <div className="w-full space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-sm text-center font-medium text-foreground">{stageLabel}</p>
            </div>
            {stage === "complete" && (
              <div className="grid grid-cols-3 gap-3 w-full text-center mt-2">
                <div className="rounded-md bg-accent/10 p-2">
                  <p className="text-lg font-bold text-accent">5</p>
                  <p className="text-xs text-muted-foreground">Realty 8022</p>
                </div>
                <div className="rounded-md bg-[hsl(var(--success))]/10 p-2">
                  <p className="text-lg font-bold text-[hsl(var(--success))]">3</p>
                  <p className="text-xs text-muted-foreground">Realty 3694</p>
                </div>
                <div className="rounded-md bg-[hsl(var(--warning))]/10 p-2">
                  <p className="text-lg font-bold text-[hsl(var(--warning))]">1</p>
                  <p className="text-xs text-muted-foreground">Payload</p>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

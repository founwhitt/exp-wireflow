import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { Plus, Pencil, Trash2, Upload, FileText } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import {
  useCustomWireInstructions,
  useCreateCustomWireInstruction,
  useUpdateCustomWireInstruction,
  useDeleteCustomWireInstruction,
  uploadWireInstructionPDF,
  deleteWireInstructionPDF,
  type CustomWireInstruction,
} from "@/hooks/useCustomWireInstructions";
import { WIRE_INSTRUCTIONS } from "@/lib/wire-instructions";

const EMPTY_FORM = {
  name: "",
  bank_name: "",
  bank_address: "",
  account_name: "",
  account_holder_address: "",
  routing_number: "",
  account_number: "",
  confirmation_phone: "",
};

export default function AdminWireInstructions() {
  const { isAdmin } = useAuth();
  const { data: instructions, isLoading } = useCustomWireInstructions();
  const create = useCreateCustomWireInstruction();
  const update = useUpdateCustomWireInstruction();
  const remove = useDeleteCustomWireInstruction();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CustomWireInstruction | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  if (!isAdmin) return <Navigate to="/" replace />;

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setPdfFile(null);
    setDialogOpen(true);
  };

  const openEdit = (inst: CustomWireInstruction) => {
    setEditing(inst);
    setForm({
      name: inst.name,
      bank_name: inst.bank_name,
      bank_address: inst.bank_address,
      account_name: inst.account_name,
      account_holder_address: inst.account_holder_address,
      routing_number: inst.routing_number,
      account_number: inst.account_number,
      confirmation_phone: inst.confirmation_phone ?? "",
    });
    setPdfFile(null);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.bank_name || !form.routing_number || !form.account_number) {
      toast.error("Please fill in all required fields");
      return;
    }
    setSaving(true);
    try {
      let pdf_path: string | null = editing?.pdf_path ?? null;
      if (pdfFile) {
        pdf_path = await uploadWireInstructionPDF(pdfFile);
      }

      const payload = { ...form, pdf_path, confirmation_phone: form.confirmation_phone || null };

      if (editing) {
        await update.mutateAsync({ id: editing.id, ...payload });
        toast.success("Wire instruction updated");
      } else {
        await create.mutateAsync({ ...payload, created_by: null });
        toast.success("Wire instruction created");
      }
      setDialogOpen(false);
    } catch (err: any) {
      toast.error("Failed to save", { description: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await remove.mutateAsync(id);
      toast.success("Deleted");
    } catch (err: any) {
      toast.error("Failed to delete", { description: err.message });
    }
  };

  const handleDeletePdf = async (inst: CustomWireInstruction) => {
    if (!inst.pdf_path) return;
    try {
      await deleteWireInstructionPDF(inst.pdf_path);
      await update.mutateAsync({ id: inst.id, pdf_path: null });
      toast.success("PDF deleted");
    } catch (err: any) {
      toast.error("Failed to delete PDF", { description: err.message });
    }
  };

  // Built-in instructions for display
  const builtIn = Object.entries(WIRE_INSTRUCTIONS).map(([key, v]) => ({
    key,
    ...v,
  }));

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Wire Instructions</h1>
          <p className="text-sm text-muted-foreground">
            Manage default and custom wire instructions. All sensitive data is masked for demo purposes.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Custom
        </Button>
      </div>

      {/* Built-in instructions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Default Instructions (Demo)</CardTitle>
          <CardDescription>Sample banking data — real credentials are masked for security.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account</TableHead>
                <TableHead>Bank</TableHead>
                <TableHead>Routing #</TableHead>
                <TableHead>Account #</TableHead>
                <TableHead>PDF</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {builtIn.map((b) => (
                <TableRow key={b.key}>
                  <TableCell className="font-medium">{b.accountLabel}</TableCell>
                  <TableCell>{b.bankName}</TableCell>
                  <TableCell className="font-mono text-sm">{b.routingNumber}</TableCell>
                  <TableCell className="font-mono text-sm">{b.accountNumber}</TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <FileText className="h-4 w-4" />
                      Sample_Wire_Instructions.pdf
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Custom instructions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Custom Instructions</CardTitle>
          <CardDescription>Admin-uploaded instructions available when selecting "Other" department.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Loading...</p>
          ) : !instructions?.length ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No custom wire instructions yet. Click "Add Custom" to create one.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Bank</TableHead>
                  <TableHead>Routing #</TableHead>
                  <TableHead>Account #</TableHead>
                  <TableHead>PDF</TableHead>
                  <TableHead className="w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {instructions.map((inst) => (
                  <TableRow key={inst.id}>
                    <TableCell className="font-medium">{inst.name}</TableCell>
                    <TableCell>{inst.bank_name}</TableCell>
                    <TableCell className="font-mono text-sm">{inst.routing_number}</TableCell>
                    <TableCell className="font-mono text-sm">{inst.account_number}</TableCell>
                    <TableCell>
                      {inst.pdf_path ? (
                        <div className="flex items-center gap-2">
                          <a href={inst.pdf_path} target="_blank" rel="noreferrer" className="text-primary hover:underline text-sm">
                            <FileText className="inline h-4 w-4 mr-1" />View
                          </a>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive">
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete PDF?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently remove the uploaded PDF for "{inst.name}". The wire instruction record will be kept.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  onClick={() => handleDeletePdf(inst)}
                                >
                                  Delete PDF
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">None</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(inst)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Wire Instruction?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete "{inst.name}" and its associated PDF. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onClick={() => handleDelete(inst.id)}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit" : "Add"} Wire Instruction</DialogTitle>
            <DialogDescription>
              {editing ? "Update the wire instruction details below." : "Fill in the details for a new custom wire instruction."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Chase Business Account" />
            </div>
            <Separator />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Bank Name *</Label>
                <Input value={form.bank_name} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} placeholder="Chase Bank" />
              </div>
              <div className="space-y-2">
                <Label>Bank Address</Label>
                <Input value={form.bank_address} onChange={(e) => setForm({ ...form, bank_address: e.target.value })} placeholder="123 Main St..." />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Account Name *</Label>
                <Input value={form.account_name} onChange={(e) => setForm({ ...form, account_name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Account Holder Address</Label>
                <Input value={form.account_holder_address} onChange={(e) => setForm({ ...form, account_holder_address: e.target.value })} />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Routing Number *</Label>
                <Input value={form.routing_number} onChange={(e) => setForm({ ...form, routing_number: e.target.value })} className="font-mono" />
              </div>
              <div className="space-y-2">
                <Label>Account Number *</Label>
                <Input value={form.account_number} onChange={(e) => setForm({ ...form, account_number: e.target.value })} className="font-mono" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Confirmation Phone</Label>
              <Input value={form.confirmation_phone} onChange={(e) => setForm({ ...form, confirmation_phone: e.target.value })} placeholder="555-123-4567" />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>PDF Attachment</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
                  className="flex-1"
                />
                <Upload className="h-4 w-4 text-muted-foreground" />
              </div>
              {editing?.pdf_path && !pdfFile && (
                <p className="text-xs text-muted-foreground">Current PDF will be kept unless you upload a new one.</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : editing ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

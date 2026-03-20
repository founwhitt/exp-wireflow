import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { toast } from "sonner";
import {
  useOwConfig,
  useCreateOwConfig,
  useUpdateOwConfig,
  useDeleteOwConfig,
  type OwConfigItem,
} from "@/hooks/useOwConfig";

export function ManageOptionsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { data: items, isLoading } = useOwConfig();
  const create = useCreateOwConfig();
  const update = useUpdateOwConfig();
  const remove = useDeleteOwConfig();

  const [tab, setTab] = useState<"account" | "status">("account");
  const [addValue, setAddValue] = useState("");
  const [addLabel, setAddLabel] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");

  const filtered = (items ?? []).filter((i) => i.config_type === tab);

  const handleAdd = async () => {
    if (!addValue.trim() || !addLabel.trim()) {
      toast.error("Both value and label are required");
      return;
    }
    try {
      await create.mutateAsync({
        config_type: tab,
        value: addValue.trim(),
        label: addLabel.trim(),
        sort_order: filtered.length,
      });
      setAddValue("");
      setAddLabel("");
      toast.success("Added");
    } catch (err: any) {
      toast.error("Failed to add", { description: err.message });
    }
  };

  const handleSaveEdit = async (item: OwConfigItem) => {
    try {
      await update.mutateAsync({ id: item.id, label: editLabel.trim() });
      setEditingId(null);
      toast.success("Updated");
    } catch (err: any) {
      toast.error("Failed to update", { description: err.message });
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

  const handleToggleActive = async (item: OwConfigItem) => {
    try {
      await update.mutateAsync({ id: item.id, is_active: !item.is_active });
      toast.success(item.is_active ? "Deactivated" : "Activated");
    } catch (err: any) {
      toast.error("Failed", { description: err.message });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Options</DialogTitle>
          <DialogDescription>Add, edit, or remove account and status options used across Outstanding Wires.</DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "account" | "status")}>
          <TabsList className="w-full">
            <TabsTrigger value="account" className="flex-1">Accounts</TabsTrigger>
            <TabsTrigger value="status" className="flex-1">Statuses</TabsTrigger>
          </TabsList>

          <TabsContent value={tab} className="mt-4 space-y-4">
            {/* Add new */}
            <div className="flex items-end gap-2">
              <div className="space-y-1 flex-1">
                <Label className="text-xs">Value</Label>
                <Input
                  value={addValue}
                  onChange={(e) => setAddValue(e.target.value)}
                  placeholder={tab === "account" ? "WF-9691" : "Pending Review"}
                  className="h-8"
                />
              </div>
              <div className="space-y-1 flex-1">
                <Label className="text-xs">Label</Label>
                <Input
                  value={addLabel}
                  onChange={(e) => setAddLabel(e.target.value)}
                  placeholder={tab === "account" ? "XXXX-9691" : "Pending Review"}
                  className="h-8"
                />
              </div>
              <Button size="sm" className="h-8" onClick={handleAdd} disabled={create.isPending}>
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* List */}
            {isLoading ? (
              <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No {tab} options yet.</p>
            ) : (
              <div className="space-y-1">
                {filtered.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm ${item.is_active ? "bg-muted/30" : "bg-muted/10 opacity-60"}`}
                  >
                    {editingId === item.id ? (
                      <>
                        <Input
                          value={editLabel}
                          onChange={(e) => setEditLabel(e.target.value)}
                          className="h-7 flex-1"
                          autoFocus
                          onKeyDown={(e) => { if (e.key === "Enter") handleSaveEdit(item); if (e.key === "Escape") setEditingId(null); }}
                        />
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleSaveEdit(item)}>
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingId(null)}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <span className="font-mono text-xs text-muted-foreground w-20 shrink-0">{item.value}</span>
                        <span className="flex-1">{item.label}</span>
                        <Button
                          variant="ghost" size="icon" className="h-7 w-7"
                          onClick={() => handleToggleActive(item)}
                          title={item.is_active ? "Deactivate" : "Activate"}
                        >
                          <span className={`h-2 w-2 rounded-full ${item.is_active ? "bg-emerald-500" : "bg-muted-foreground/40"}`} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingId(item.id); setEditLabel(item.label); }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(item.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

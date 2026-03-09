import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mail, Paperclip, Eye, Send } from "lucide-react";

interface EmailPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmSend: () => void;
  isSending: boolean;
  isTestMode: boolean;
  recipientEmail: string;
  emailBody: string;
  pdfFileName: string;
  accountLabel: string;
}

export function EmailPreviewDialog({
  open,
  onOpenChange,
  onConfirmSend,
  isSending,
  isTestMode,
  recipientEmail,
  emailBody,
  pdfFileName,
  accountLabel,
}: EmailPreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isTestMode ? (
              <>
                <Eye className="h-5 w-5 text-amber-500" />
                Test Preview — Email Will NOT Be Sent
              </>
            ) : (
              <>
                <Mail className="h-5 w-5 text-primary" />
                Confirm Email Dispatch
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isTestMode
              ? "This is a mock preview of the email that would be sent. No email will be dispatched."
              : "Review the email content below, then confirm to send."}
          </DialogDescription>
        </DialogHeader>

        {isTestMode && (
          <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
            🧪 TEST MODE — Record will be saved but no email will be sent.
          </div>
        )}

        {/* Email header info */}
        <div className="space-y-1 text-sm">
          <div className="flex gap-2">
            <span className="w-12 font-medium text-muted-foreground">To:</span>
            <span className="text-foreground">{recipientEmail}</span>
          </div>
          <div className="flex gap-2">
            <span className="w-12 font-medium text-muted-foreground">From:</span>
            <span className="text-foreground">wire-instructions@exprealty.com</span>
          </div>
          <div className="flex gap-2">
            <span className="w-12 font-medium text-muted-foreground">Subj:</span>
            <span className="text-foreground">eXp Realty — Wire Transfer Instructions</span>
          </div>
          <div className="flex items-center gap-2">
            <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
            <Badge variant="outline" className="text-xs">
              {pdfFileName}
            </Badge>
            <span className="text-xs text-muted-foreground">({accountLabel})</span>
          </div>
        </div>

        <Separator />

        {/* Email body */}
        <ScrollArea className="h-[350px] rounded-md border bg-muted/20 p-4">
          <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-foreground">
            {emailBody}
          </pre>
        </ScrollArea>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={onConfirmSend}
            disabled={isSending}
            variant={isTestMode ? "secondary" : "default"}
          >
            {isSending ? (
              "Processing..."
            ) : isTestMode ? (
              <>
                <Eye className="mr-2 h-4 w-4" />
                Save Test Record
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Confirm & Send
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

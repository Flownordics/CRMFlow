import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Dialog,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useAddPayment, PaymentPayload } from "@/services/invoices";
import { toMinor } from "@/lib/money";
import { formatMoneyMinor } from "@/lib/money";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, Banknote, Building2, MoreHorizontal } from "lucide-react";
import { AccessibleDialogContent } from "@/components/ui/accessible-dialog";

interface AddPaymentModalProps {
  invoiceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currency?: string;
  balanceMinor?: number;
}

export function AddPaymentModal({
  invoiceId,
  open,
  onOpenChange,
  currency = "DKK",
  balanceMinor = 0
}: AddPaymentModalProps) {
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [method, setMethod] = useState<'bank' | 'card' | 'cash' | 'other'>('bank');
  const [note, setNote] = useState("");

  const addPaymentMutation = useAddPayment();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!amount || parseFloat(amount) <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid amount greater than 0.",
        variant: "destructive",
      });
      return;
    }

    const amountMinor = toMinor(parseFloat(amount));

    const payload: PaymentPayload = {
      amountMinor,
      date,
      method,
      note: note.trim() || undefined,
    };

    try {
      await addPaymentMutation.mutateAsync({ invoiceId, payload });

      toast({
        title: "Payment added",
        description: `Payment of ${formatMoneyMinor(amountMinor, currency)} has been recorded.`,
      });

      // Reset form and close modal
      setAmount("");
      setDate(new Date().toISOString().split("T")[0]);
      setMethod('bank');
      setNote("");
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add payment. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'bank':
        return <Building2 className="h-4 w-4" aria-hidden="true" focusable="false" />;
      case 'card':
        return <CreditCard className="h-4 w-4" aria-hidden="true" focusable="false" />;
      case 'cash':
        return <Banknote className="h-4 w-4" aria-hidden="true" focusable="false" />;
      case 'other':
        return <MoreHorizontal className="h-4 w-4" aria-hidden="true" focusable="false" />;
      default:
        return <Building2 className="h-4 w-4" aria-hidden="true" focusable="false" />;
    }
  };

  const balanceFormatted = formatMoneyMinor(balanceMinor, currency);
  const title = "Add Payment";
  const description = `Record a payment for this invoice. Outstanding balance: ${balanceFormatted}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <AccessibleDialogContent
        className="sm:max-w-[425px]"
      >
        {/* 🔒 These must render on the very first paint, unconditionally */}
        <DialogHeader>
          <DialogTitle>Add Payment</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" aria-describedby="dialog-description">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount ({currency})</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
              aria-describedby="amount-error"
            />
            {!amount && amount !== "" && (
              <p id="amount-error" className="text-xs text-destructive">
                Please enter a valid amount
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Payment Date</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="method">Payment Method</Label>
            <Select value={method} onValueChange={(value: any) => setMethod(value)}>
              <SelectTrigger id="method" aria-label="Select payment method">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bank">
                  <div className="flex items-center gap-2">
                    {getMethodIcon('bank')}
                    Bank Transfer
                  </div>
                </SelectItem>
                <SelectItem value="card">
                  <div className="flex items-center gap-2">
                    {getMethodIcon('card')}
                    Credit Card
                  </div>
                </SelectItem>
                <SelectItem value="cash">
                  <div className="flex items-center gap-2">
                    {getMethodIcon('cash')}
                    Cash
                  </div>
                </SelectItem>
                <SelectItem value="other">
                  <div className="flex items-center gap-2">
                    {getMethodIcon('other')}
                    Other
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Note (Optional)</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Payment reference, transaction ID, etc."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={addPaymentMutation.isPending}
              aria-label="Close dialog and cancel payment"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={addPaymentMutation.isPending || !amount}
              aria-label="Save payment"
            >
              {addPaymentMutation.isPending ? "Adding..." : "Add Payment"}
            </Button>
          </DialogFooter>
        </form>
      </AccessibleDialogContent>
    </Dialog>
  );
}

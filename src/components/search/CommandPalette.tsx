import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogTitle } from "@/components/ui/dialog";
import { AccessibleDialogContent } from "@/components/ui/accessible-dialog";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";

const items = [
  { label: "Go to Dashboard", path: "/" },
  { label: "Companies", path: "/companies" },
  { label: "People", path: "/people" },
  { label: "Deals", path: "/deals" },
  { label: "Quotes", path: "/quotes" },
  { label: "Orders", path: "/orders" },
  { label: "Invoices", path: "/invoices" },
  { label: "Calendar", path: "/calendar" },
  { label: "Accounting", path: "/accounting" },
  { label: "Settings", path: "/settings" },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const nav = useNavigate();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const metaK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k";
      if (metaK) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? items.filter((i) => i.label.toLowerCase().includes(s)) : items;
  }, [q]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <AccessibleDialogContent className="p-0 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Search</DialogTitle>
          <DialogDescription>Search and navigate through the application</DialogDescription>
        </DialogHeader>
        <div className="border-b p-3">
          <Input
            autoFocus
            placeholder="Type to search… (⌘K)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="max-h-80 overflow-auto p-2">
          {filtered.map((it) => (
            <button
              key={it.path}
              className="w-full rounded px-3 py-2 text-left hover:bg-muted"
              onClick={() => {
                setOpen(false);
                nav(it.path);
              }}
            >
              {it.label}
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="p-3 text-sm text-muted-foreground">No matches</div>
          )}
        </div>
      </AccessibleDialogContent>
    </Dialog>
  );
}

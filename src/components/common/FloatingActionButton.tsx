import { useState } from "react";
import { Plus, X, FileText, ShoppingCart, Receipt, Handshake } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { hapticClick } from "@/lib/haptics";

interface FABAction {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  color?: string;
}

/**
 * Floating Action Button with context-aware quick actions
 * Only visible on mobile devices
 */
export function FloatingActionButton() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Context-aware actions based on current page
  const getActions = (): FABAction[] => {
    const path = location.pathname;

    if (path.startsWith("/deals")) {
      return [
        {
          icon: Handshake,
          label: "New Deal",
          onClick: () => {
            hapticClick();
            navigate("/deals");
            setIsOpen(false);
          },
        },
      ];
    }

    if (path.startsWith("/quotes")) {
      return [
        {
          icon: FileText,
          label: "New Quote",
          onClick: () => {
            hapticClick();
            navigate("/quotes");
            setIsOpen(false);
          },
        },
      ];
    }

    if (path.startsWith("/orders")) {
      return [
        {
          icon: ShoppingCart,
          label: "New Order",
          onClick: () => {
            hapticClick();
            navigate("/orders");
            setIsOpen(false);
          },
        },
      ];
    }

    if (path.startsWith("/invoices")) {
      return [
        {
          icon: Receipt,
          label: "New Invoice",
          onClick: () => {
            hapticClick();
            navigate("/invoices");
            setIsOpen(false);
          },
        },
      ];
    }

    // Default actions for dashboard and other pages
    return [
      {
        icon: Handshake,
        label: "New Deal",
        onClick: () => {
          hapticClick();
          navigate("/deals");
          setIsOpen(false);
        },
      },
      {
        icon: FileText,
        label: "New Quote",
        onClick: () => {
          hapticClick();
          navigate("/quotes");
          setIsOpen(false);
        },
      },
      {
        icon: ShoppingCart,
        label: "New Order",
        onClick: () => {
          hapticClick();
          navigate("/orders");
          setIsOpen(false);
        },
      },
    ];
  };

  const actions = getActions();

  const handleToggle = () => {
    hapticClick();
    setIsOpen(!isOpen);
  };

  return (
    <div className="fixed bottom-24 right-4 z-40 md:hidden">
      {/* Action buttons */}
      <div
        className={cn(
          "flex flex-col-reverse gap-3 mb-3 transition-all duration-300",
          isOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
        )}
      >
        {actions.map((action, index) => (
          <div
            key={index}
            className="flex items-center gap-2 animate-in slide-in-from-bottom-2"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <span className="bg-background/95 backdrop-blur px-3 py-1.5 rounded-full text-xs font-medium shadow-md border whitespace-nowrap">
              {action.label}
            </span>
            <Button
              size="icon"
              onClick={action.onClick}
              className="h-12 w-12 rounded-full shadow-lg"
            >
              <action.icon className="h-5 w-5" aria-hidden="true" />
              <span className="sr-only">{action.label}</span>
            </Button>
          </div>
        ))}
      </div>

      {/* Main FAB button */}
      <Button
        size="icon"
        onClick={handleToggle}
        className={cn(
          "h-14 w-14 rounded-full shadow-xl transition-transform",
          isOpen && "rotate-45"
        )}
        aria-label={isOpen ? "Close quick actions" : "Open quick actions"}
      >
        {isOpen ? (
          <X className="h-6 w-6" aria-hidden="true" />
        ) : (
          <Plus className="h-6 w-6" aria-hidden="true" />
        )}
      </Button>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 -z-10"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}
    </div>
  );
}


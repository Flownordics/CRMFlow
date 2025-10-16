import {
  Calendar,
  Calculator,
  BarChart3,
  CheckSquare,
  Settings,
  Phone,
  LogOut,
  User,
  ChevronRight,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/useAuthStore";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

interface MobileMenuSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const secondaryNavItems = [
  { title: "Call Lists", url: "/call-lists", icon: Phone },
  { title: "Tasks", url: "/tasks", icon: CheckSquare },
  { title: "Calendar", url: "/calendar", icon: Calendar },
  { title: "Accounting", url: "/accounting", icon: Calculator },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function MobileMenuSheet({ open, onOpenChange }: MobileMenuSheetProps) {
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    onOpenChange(false);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[85vw] sm:w-[350px] p-0">
        <div className="flex flex-col h-full">
          {/* User Profile Section */}
          <SheetHeader className="p-6 pb-4 bg-gradient-to-br from-primary to-accent">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 border-2 border-white/20">
                <AvatarFallback className="bg-white/10 text-white text-lg">
                  {user?.name ? getInitials(user.name) : <User className="h-8 w-8" />}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left">
                <SheetTitle className="text-white text-lg">
                  {user?.name || "User"}
                </SheetTitle>
                <p className="text-white/80 text-sm mt-1">{user?.email || ""}</p>
              </div>
            </div>
          </SheetHeader>

          {/* Navigation Items */}
          <nav className="flex-1 overflow-y-auto p-4">
            <div className="space-y-1">
              {secondaryNavItems.map((item) => (
                <NavLink
                  key={item.url}
                  to={item.url}
                  onClick={() => onOpenChange(false)}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors touch-manipulation",
                      "text-foreground hover:bg-muted active:scale-[0.98]",
                      isActive && "bg-muted font-medium"
                    )
                  }
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                  <span className="flex-1 text-sm">{item.title}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                </NavLink>
              ))}
            </div>
          </nav>

          {/* Footer Actions */}
          <div className="border-t p-4">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-lg transition-colors touch-manipulation text-destructive hover:bg-destructive/10 active:scale-[0.98]"
            >
              <LogOut className="h-5 w-5" aria-hidden="true" />
              <span className="text-sm font-medium">Log Out</span>
            </button>
          </div>

          {/* Branding */}
          <div className="border-t p-4 flex items-center justify-center bg-muted/30">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded bg-gradient-to-br from-primary to-accent">
                <div className="h-3 w-3 rotate-45 transform rounded-sm bg-white" />
              </div>
              <span className="text-xs text-muted-foreground font-medium">CRMFlow</span>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}


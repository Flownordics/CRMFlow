import { Home, Building2, Handshake, Users, Menu } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

interface MobileBottomNavProps {
  onMenuClick: () => void;
}

const primaryNavItems = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Companies", url: "/companies", icon: Building2 },
  { title: "Deals", url: "/deals", icon: Handshake },
  { title: "People", url: "/people", icon: Users },
];

export function MobileBottomNav({ onMenuClick }: MobileBottomNavProps) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-sidebar-bg border-t border-sidebar-hover safe-area-pb"
      style={{
        paddingBottom: "max(env(safe-area-inset-bottom, 0px), 0.75rem)",
      }}
    >
      <div className="grid grid-cols-5 h-16">
        {primaryNavItems.map((item) => (
          <NavLink
            key={item.url}
            to={item.url}
            end={item.url === "/"}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center justify-center gap-1 transition-colors touch-manipulation",
                "text-white/70 hover:text-white active:scale-95",
                isActive && "text-white bg-sidebar-active"
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon
                  className={cn("h-5 w-5", isActive && "scale-110")}
                  aria-hidden="true"
                />
                <span className="text-[10px] font-medium">{item.title}</span>
              </>
            )}
          </NavLink>
        ))}
        
        <button
          onClick={onMenuClick}
          className="flex flex-col items-center justify-center gap-1 transition-colors touch-manipulation text-white/70 hover:text-white active:scale-95 active:bg-sidebar-hover"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
          <span className="text-[10px] font-medium">More</span>
        </button>
      </div>
    </nav>
  );
}


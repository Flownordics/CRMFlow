import { useState } from "react";
import {
  Building2,
  Users,
  Handshake,
  FileText,
  ShoppingCart,
  Receipt,
  Calendar,
  FolderOpen,
  Calculator,
  Settings,
  ChevronLeft,
  Menu,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const navigationItems = [
  { title: "Companies", url: "/companies", icon: Building2 },
  { title: "People", url: "/people", icon: Users },
  { title: "Deals", url: "/deals", icon: Handshake },
  { title: "Quotes", url: "/quotes", icon: FileText },
  { title: "Orders", url: "/orders", icon: ShoppingCart },
  { title: "Invoices", url: "/invoices", icon: Receipt },
  { title: "Calendar", url: "/calendar", icon: Calendar },
  { title: "Documents", url: "/documents", icon: FolderOpen },
  { title: "Accounting", url: "/accounting", icon: Calculator },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) =>
    currentPath === path || (path !== "/" && currentPath.startsWith(path));

  return (
    <div className={cn(
      "flex h-full flex-col border-r bg-sidebar-bg transition-all duration-300",
      isCollapsed ? "w-[var(--sidebar-width-collapsed)]" : "w-[var(--sidebar-width)]"
    )}>
      {/* Header */}
      <div className="border-b border-sidebar-hover p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent">
            <div className="h-4 w-4 rotate-45 transform rounded-sm bg-white" />
          </div>
          {!isCollapsed && (
            <div>
              <h1 className="text-h3 text-white font-semibold">CRMFlow</h1>
              <p className="text-xs text-white/70">
                Professional Edition
              </p>
            </div>
          )}
        </div>
        {/* Toggle button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute top-6 right-4 p-1 rounded hover:bg-sidebar-hover transition-colors"
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <ChevronLeft className={cn(
            "h-4 w-4 text-white transition-transform",
            isCollapsed && "rotate-180"
          )} />
        </button>
      </div>

      {/* Navigation */}
      <div className="flex-1 px-4 py-6">
        <div className="mb-4">
          {!isCollapsed && (
            <div className="mb-4 text-xs uppercase tracking-wider text-white/60 px-3">
              Navigation
            </div>
          )}
        </div>
        <nav className="space-y-1">
          {navigationItems.map((item) => (
            <NavLink
              key={item.title}
              to={item.url}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-3 transition-all duration-200",
                "text-white/90 hover:bg-sidebar-hover hover:text-white",
                isActive(item.url) &&
                "bg-sidebar-active text-white shadow-md",
                isCollapsed && "justify-center",
              )}
            >
              <item.icon
                className="h-4 w-4 flex-shrink-0"
                aria-hidden="true"
                focusable="false"
              />
              {!isCollapsed && (
                <span className="text-sm font-medium">
                  {item.title}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Footer with Logo */}
      <div className="border-t border-sidebar-hover p-4">
        <div className="flex items-center justify-center">
          <img
            src="/FLOWNORDICS6tiny.png"
            alt="FlowNordics Logo"
            className={cn(
              "transition-all duration-300",
              isCollapsed ? "h-8 w-8" : "h-12 w-auto"
            )}
          />
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
import { AppSidebar } from "./AppSidebar";
import { MobileBottomNav } from "./MobileBottomNav";
import { MobileMenuSheet } from "./MobileMenuSheet";
import { MobileHeader } from "./MobileHeader";
import { FloatingActionButton } from "@/components/common/FloatingActionButton";
import { Outlet } from "react-router-dom";

export function CRMLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-dvh">
      {/* Mobile Header - Only visible on mobile */}
      <MobileHeader />

      {/* Main Layout */}
      <div className="grid min-h-dvh grid-cols-1 md:grid-cols-[auto_1fr]">
        {/* Desktop Sidebar */}
        <aside className="hidden md:block md:sticky md:top-0 md:h-dvh">
          <AppSidebar />
        </aside>

        {/* Main Content */}
        <main className="px-3 py-4 pb-20 sm:px-4 sm:py-6 sm:pb-24 md:pb-6">
          <Outlet />
        </main>
      </div>

      {/* Mobile Navigation - Only visible on mobile */}
      <MobileBottomNav onMenuClick={() => setMobileMenuOpen(true)} />

      {/* Mobile Menu Sheet */}
      <MobileMenuSheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen} />

      {/* Floating Action Button - Only visible on mobile */}
      <FloatingActionButton />
    </div>
  );
}

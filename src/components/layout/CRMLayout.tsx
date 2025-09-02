import { AppSidebar } from "./AppSidebar";
import { Outlet } from "react-router-dom";

export function CRMLayout() {
  return (
    <div className="grid min-h-dvh grid-cols-1 md:grid-cols-[auto_1fr]">
      <aside className="hidden md:block md:sticky md:top-0 md:h-dvh">
        <AppSidebar />
      </aside>
      <main className="px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}

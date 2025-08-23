import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { CRMLayout } from "@/components/layout/CRMLayout";
import Dashboard from "./pages/Dashboard";
import Companies from "./pages/Companies";
import Deals from "./pages/Deals";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="light" storageKey="prism-crm-theme">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <CRMLayout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/companies" element={<Companies />} />
              <Route path="/deals" element={<Deals />} />
              <Route path="/people" element={<div className="p-8 text-center text-muted-foreground">People page coming soon...</div>} />
              <Route path="/quotes" element={<div className="p-8 text-center text-muted-foreground">Quotes page coming soon...</div>} />
              <Route path="/orders" element={<div className="p-8 text-center text-muted-foreground">Orders page coming soon...</div>} />
              <Route path="/invoices" element={<div className="p-8 text-center text-muted-foreground">Invoices page coming soon...</div>} />
              <Route path="/calendar" element={<div className="p-8 text-center text-muted-foreground">Calendar page coming soon...</div>} />
              <Route path="/documents" element={<div className="p-8 text-center text-muted-foreground">Documents page coming soon...</div>} />
              <Route path="/accounting" element={<div className="p-8 text-center text-muted-foreground">Accounting page coming soon...</div>} />
              <Route path="/settings" element={<div className="p-8 text-center text-muted-foreground">Settings page coming soon...</div>} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </CRMLayout>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;

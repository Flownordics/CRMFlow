import { Suspense, lazy, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { ToastBridge } from "@/components/providers/ToastBridge";
import { CRMLayout } from "@/components/layout/CRMLayout";
import { AuthGate } from "@/components/auth/AuthGate";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ErrorBoundary } from "@/components/fallbacks/ErrorBoundary";
import { PWAInstallPrompt } from "@/components/common/PWAInstallPrompt";
import { OfflineIndicator } from "@/components/common/OfflineIndicator";
import { queryClient } from "@/lib/queryClients";
import { pingApi } from "@/lib/api";
import { toastBus } from "@/lib/toastBus";
import { USE_MOCKS } from "@/lib/debug";

const Dashboard = lazy(() => import("@/pages/Dashboard"));
const CompaniesList = lazy(() => import("@/pages/companies/CompaniesList"));
const CompanyPage = lazy(() => import("@/pages/companies/CompanyPage"));
const DealsBoard = lazy(() => import("@/pages/deals/DealsBoard"));
const DealDetail = lazy(() => import("@/pages/deals/DealDetail"));
const ProjectsList = lazy(() => import("@/pages/projects/ProjectsList"));
const ProjectDetail = lazy(() => import("@/pages/projects/ProjectDetail"));
const Quotes = lazy(() => import("@/pages/Quotes"));
const QuoteEditor = lazy(() => import("@/pages/quotes/QuoteEditor"));

const Orders = lazy(() => import("@/pages/Orders"));
const OrderDetail = lazy(() => import("@/pages/orders/OrderDetail"));
const OrderEditor = lazy(() => import("@/pages/orders/OrderEditor"));
const Invoices = lazy(() => import("@/pages/Invoices"));
const InvoiceDetail = lazy(() => import("@/pages/invoices/InvoiceDetail"));
const NotFound = lazy(() => import("@/pages/NotFound"));

const PeopleList = lazy(() => import("@/pages/people/PeopleList"));
const PeoplePage = lazy(() => import("@/pages/people/PeoplePage"));
const PersonPage = lazy(() => import("@/pages/people/PersonPage"));
const Calendar = lazy(() => import("@/pages/calendar/CalendarView"));
const Accounting = lazy(() => import("@/pages/accounting/AccountingPage"));
const Analytics = lazy(() => import("@/pages/Analytics"));
const Settings = lazy(() => import("@/pages/settings/SettingsPage"));
const Login = lazy(() => import("@/pages/auth/LoginPage"));
const Register = lazy(() => import("@/pages/auth/RegisterPage"));
const Forgot = lazy(() => import("@/pages/auth/ForgotPasswordPage"));
const OAuthComplete = lazy(() => import("@/pages/oauth/OAuthComplete"));
const OAuthCallback = lazy(() => import("@/pages/oauth/OAuthCallback"));
const CallLists = lazy(() => import("@/pages/CallLists"));
const CallListDetail = lazy(() => import("@/pages/CallListDetail"));

const App = () => {
  // Health check effect
  useEffect(() => {
    const checkApiHealth = async () => {
      if (!USE_MOCKS) {
        const isHealthy = await pingApi();
        if (!isHealthy) {
          toastBus.emit({
            title: "API Unreachable",
            description: "Backend service is not responding. Some features may not work.",
            variant: "destructive"
          });
        }
      }
    };

    checkApiHealth();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="prism-crm-theme">
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <ToastBridge />
          <OfflineIndicator />
          <PWAInstallPrompt />
          <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
            <AuthGate>
              <ErrorBoundary>
                <Suspense fallback={null}>
                  <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/signup" element={<Register />} />
                    <Route path="/forgot" element={<Forgot />} />
                    <Route path="/oauth/complete" element={<OAuthComplete />} />
                    <Route path="/oauth/callback" element={<OAuthCallback />} />
                    <Route
                      path="/"
                      element={
                        <ProtectedRoute>
                          <CRMLayout />
                        </ProtectedRoute>
                      }
                    >
                      <Route index element={<Dashboard />} />
                      <Route path="companies" element={<CompaniesList />} />
                      <Route path="companies/:id" element={<CompanyPage />} />
                      <Route path="deals">
                        <Route index element={<DealsBoard />} />
                        <Route path=":id" element={<DealDetail />} />
                      </Route>
                      <Route path="projects">
                        <Route index element={<ProjectsList />} />
                        <Route path=":id" element={<ProjectDetail />} />
                      </Route>
                      <Route path="quotes">
                        <Route index element={<Quotes />} />
                        <Route path=":id" element={<QuoteEditor />} />
                      </Route>
                      <Route path="orders">
                        <Route index element={<Orders />} />
                        <Route path=":id" element={<OrderEditor />} />
                        <Route path=":id/detail" element={<OrderDetail />} />
                      </Route>
                      {/* Invoice detail pages still need their own route */}
                      <Route path="invoices/:id" element={<InvoiceDetail />} />
                      {/* Redirect /invoices to /accounting since invoices are now integrated into accounting */}
                      <Route path="invoices" element={<Navigate to="/accounting" replace />} />
                      <Route path="people" element={<PeopleList />} />
                      <Route path="people/:id" element={<PersonPage />} />
                      <Route path="calendar" element={<Calendar />} />
                      <Route path="accounting" element={<Accounting />} />
                      <Route path="analytics" element={<Analytics />} />
                      {/* Redirect /tasks to /calendar since tasks are now integrated into calendar */}
                      <Route path="tasks" element={<Navigate to="/calendar" replace />} />
                      <Route path="call-lists">
                        <Route index element={<CallLists />} />
                        <Route path=":id" element={<CallListDetail />} />
                      </Route>
                      <Route path="settings" element={<Settings />} />
                      <Route path="*" element={<NotFound />} />
                    </Route>
                  </Routes>
                </Suspense>
              </ErrorBoundary>
            </AuthGate>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
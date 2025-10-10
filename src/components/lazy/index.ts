/**
 * Lazy Component Exports
 * Centralized lazy loading for better code splitting
 */

import { lazy } from 'react';

// ===== PAGE COMPONENTS =====

export const DashboardPage = lazy(() => import('@/pages/Dashboard'));
export const DealsPage = lazy(() => import('@/pages/Deals'));
export const CompaniesPage = lazy(() => import('@/pages/Companies'));
export const PeoplePage = lazy(() => import('@/pages/People'));
export const QuotesPage = lazy(() => import('@/pages/Quotes'));
export const OrdersPage = lazy(() => import('@/pages/Orders'));
export const InvoicesPage = lazy(() => import('@/pages/Invoices'));
export const SettingsPage = lazy(() => import('@/pages/Settings'));

// ===== FEATURE COMPONENTS =====

export const DealForm = lazy(() => import('@/components/forms/DealForm'));
export const CompanyForm = lazy(() => import('@/components/forms/CompanyForm'));
export const PersonForm = lazy(() => import('@/components/forms/PersonForm'));
export const QuoteForm = lazy(() => import('@/components/forms/QuoteForm'));
export const OrderForm = lazy(() => import('@/components/forms/OrderForm'));
export const InvoiceForm = lazy(() => import('@/components/forms/InvoiceForm'));

// ===== MODAL COMPONENTS =====

export const DealModal = lazy(() => import('@/components/modals/DealModal'));
export const CompanyModal = lazy(() => import('@/components/modals/CompanyModal'));
export const PersonModal = lazy(() => import('@/components/modals/PersonModal'));
export const QuoteModal = lazy(() => import('@/components/modals/QuoteModal'));
export const OrderModal = lazy(() => import('@/components/modals/OrderModal'));
export const InvoiceModal = lazy(() => import('@/components/modals/InvoiceModal'));

// ===== CHART COMPONENTS =====

export const DealsChart = lazy(() => import('@/components/charts/DealsChart'));
export const RevenueChart = lazy(() => import('@/components/charts/RevenueChart'));
export const PipelineChart = lazy(() => import('@/components/charts/PipelineChart'));
export const ActivityChart = lazy(() => import('@/components/charts/ActivityChart'));

// ===== UTILITY COMPONENTS =====

export const ErrorRecoveryBoundary = lazy(() => import('@/components/error/ErrorRecoveryBoundary'));
export const LoadingSpinner = lazy(() => import('@/components/ui/LoadingSpinner'));
export const DataTable = lazy(() => import('@/components/ui/DataTable'));
export const KanbanBoard = lazy(() => import('@/components/ui/KanbanBoard'));

// ===== EXPORT ALL =====

export default {
    // Pages
    DashboardPage,
    DealsPage,
    CompaniesPage,
    PeoplePage,
    QuotesPage,
    OrdersPage,
    InvoicesPage,
    SettingsPage,

    // Forms
    DealForm,
    CompanyForm,
    PersonForm,
    QuoteForm,
    OrderForm,
    InvoiceForm,

    // Modals
    DealModal,
    CompanyModal,
    PersonModal,
    QuoteModal,
    OrderModal,
    InvoiceModal,

    // Charts
    DealsChart,
    RevenueChart,
    PipelineChart,
    ActivityChart,

    // Utilities
    ErrorRecoveryBoundary,
    LoadingSpinner,
    DataTable,
    KanbanBoard
};

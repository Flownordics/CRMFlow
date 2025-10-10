# CRMFlow Functions Overview

This document provides a comprehensive overview of all functions in the CRMFlow application, organized by category and purpose.

## Table of Contents

1. [Core Services](#core-services)
2. [Authentication & User Management](#authentication--user-management)
3. [Business Logic Services](#business-logic-services)
4. [Integration Services](#integration-services)
5. [Utility Functions](#utility-functions)
6. [UI Components](#ui-components)
7. [State Management](#state-management)
8. [Supabase Edge Functions](#supabase-edge-functions)
9. [Database Functions](#database-functions)

---

## Core Services

### Companies Service (`src/services/companies.ts`)
- `fetchCompanies()` - Retrieves paginated list of companies with filtering options
- `fetchCompany()` - Gets a single company by ID with related data
- `createCompany()` - Creates a new company record
- `updateCompany()` - Updates existing company information
- `deleteCompany()` - Removes a company and its associated data
- `fetchCompanyPeople()` - Gets all people associated with a company
- `fetchCompanyDeals()` - Retrieves deals linked to a company
- `fetchCompanyDocuments()` - Gets documents attached to a company
- `fetchCompanyActivities()` - Retrieves activity history for a company
- `useCompanies()`, `useCompany()`, `useCreateCompany()`, `useUpdateCompany()`, `useDeleteCompany()` - React Query hooks for company operations

### People Service (`src/services/people.ts`)
- `fetchPeople()` - Retrieves paginated list of people with filtering
- `fetchPerson()` - Gets a single person by ID with related data
- `createPerson()` - Creates a new person record
- `updatePerson()` - Updates existing person information
- `deletePerson()` - Removes a person and associated data
- `fetchPersonDeals()` - Gets deals associated with a person
- `fetchPersonDocuments()` - Retrieves documents linked to a person
- `fetchPersonActivities()` - Gets activity history for a person
- `usePeople()`, `usePerson()`, `useCreatePerson()`, `useUpdatePerson()`, `useDeletePerson()` - React Query hooks for people operations

### Deals Service (`src/services/deals.ts`)
- `fetchDeals()` - Retrieves paginated deals with filtering by stage, company, etc.
- `fetchDeal()` - Gets a single deal with all related data
- `createDeal()` - Creates a new deal and triggers stage automation
- `updateDeal()` - Updates deal information and handles stage changes
- `deleteDeal()` - Removes a deal and cleans up calendar events
- `reorderDeal()` - Changes deal position within a stage
- `fetchDealActivities()` - Gets activity history for a deal
- `useDeals()`, `useDeal()`, `useCreateDeal()`, `useUpdateDeal()`, `useDeleteDeal()`, `useReorderDeal()` - React Query hooks for deal operations

### Quotes Service (`src/services/quotes.ts`)
- `fetchQuotes()` - Retrieves paginated quotes with filtering
- `fetchQuote()` - Gets a single quote with line items
- `createQuote()` - Creates a new quote with line items
- `updateQuote()` - Updates quote and line items
- `deleteQuote()` - Removes a quote
- `convertQuoteToOrder()` - Converts a quote to an order
- `fetchQuoteActivities()` - Gets activity history for a quote
- `useQuotes()`, `useQuote()`, `useCreateQuote()`, `useUpdateQuote()`, `useDeleteQuote()`, `useConvertQuoteToOrder()` - React Query hooks for quote operations

### Orders Service (`src/services/orders.ts`)
- `fetchOrders()` - Retrieves paginated orders with filtering
- `fetchOrder()` - Gets a single order with line items
- `createOrder()` - Creates a new order
- `updateOrder()` - Updates order information
- `deleteOrder()` - Removes an order
- `fetchOrderActivities()` - Gets activity history for an order
- `useOrders()`, `useOrder()`, `useCreateOrder()`, `useUpdateOrder()`, `useDeleteOrder()` - React Query hooks for order operations

### Invoices Service (`src/services/invoices.ts`)
- `fetchInvoices()` - Retrieves paginated invoices with filtering
- `fetchInvoice()` - Gets a single invoice with line items and payments
- `createInvoice()` - Creates a new invoice
- `updateInvoice()` - Updates invoice information
- `deleteInvoice()` - Removes an invoice
- `recordPayment()` - Records a payment against an invoice
- `fetchInvoiceActivities()` - Gets activity history for an invoice
- `useInvoices()`, `useInvoice()`, `useCreateInvoice()`, `useUpdateInvoice()`, `useDeleteInvoice()`, `useRecordPayment()` - React Query hooks for invoice operations

---

## Authentication & User Management

### Auth Store (`src/stores/useAuthStore.ts`)
- `hydrateFromSupabase()` - Initializes auth state from Supabase session
- `signInWithPassword()` - Authenticates user with email/password
- `signUpWithPassword()` - Registers new user account
- `signOut()` - Logs out current user
- `sendPasswordReset()` - Sends password reset email
- `getAuthToken()` - Retrieves stored auth token for API calls

### Settings Service (`src/services/settings.ts`)
- `getUserSettings()` - Retrieves user-specific settings and preferences
- `updateUserSettings()` - Updates user settings with validation
- `useUserSettings()`, `useUpdateUserSettings()` - React Query hooks for settings operations

---

## Business Logic Services

### Deal Stage Automation (`src/services/dealStageAutomation.ts`)
- `triggerDealStageAutomation()` - Executes automation rules when deal stage changes
- `getStageAutomationRules()` - Retrieves automation rules for a specific stage
- `executeAutomationAction()` - Performs specific automation actions (create tasks, send emails, etc.)

### Stage Probabilities (`src/services/stageProbabilities.ts`)
- `getStageProbabilities()` - Retrieves default probability percentages for deal stages
- `updateStageProbabilities()` - Updates stage probability settings
- `useStageProbabilities()`, `useUpdateStageProbabilities()` - React Query hooks for stage probability operations

### Analytics Service (`src/services/analytics.ts`)
- `fetchDealAnalytics()` - Retrieves deal performance metrics and trends
- `fetchRevenueAnalytics()` - Gets revenue analysis data
- `fetchConversionRates()` - Calculates conversion rates between stages
- `fetchSalesForecast()` - Generates sales forecasting data
- `useDealAnalytics()`, `useRevenueAnalytics()`, `useConversionRates()`, `useSalesForecast()` - React Query hooks for analytics

### Dashboard Service (`src/services/dashboard.ts`)
- `fetchDashboardData()` - Retrieves aggregated data for dashboard widgets
- `formatCurrency()` - Formats monetary values for display
- `useDashboardData()` - React Query hook for dashboard data

### Tasks Service (`src/services/tasks.ts`)
- `fetchTasks()` - Retrieves user tasks with filtering
- `fetchTask()` - Gets a single task
- `createTask()` - Creates a new task
- `updateTask()` - Updates task information
- `deleteTask()` - Removes a task
- `fetchUpcomingTasks()` - Gets tasks due soon
- `useTasks()`, `useTask()`, `useCreateTask()`, `useUpdateTask()`, `useDeleteTask()`, `useUpcomingTasks()` - React Query hooks for task operations

### Activity Service (`src/services/activity.ts`)
- `logActivity()` - Records activity events in the system
- `fetchActivities()` - Retrieves activity history with filtering
- `fetchEntityActivities()` - Gets activities for a specific entity (deal, company, etc.)
- `useActivities()`, `useEntityActivities()` - React Query hooks for activity operations

---

## Integration Services

### Google Calendar Integration (`src/services/calendar.ts`)
- `fetchEvents()` - Retrieves calendar events from Google Calendar
- `createEvent()` - Creates new calendar events
- `updateEvent()` - Updates existing calendar events
- `deleteEvent()` - Removes calendar events
- `syncDealToCalendar()` - Syncs deal milestones to calendar
- `removeDealFromCalendar()` - Removes deal events from calendar
- `useEvents()`, `useCreateEvent()`, `useUpdateEvent()`, `useDeleteEvent()` - React Query hooks for calendar operations

### Google Calendar Utils (`src/lib/google-calendar.ts`)
- `createGoogleCalendarEvent()` - Creates Google Calendar event objects
- `formatEventForGoogle()` - Formats event data for Google Calendar API
- `parseGoogleEventResponse()` - Parses Google Calendar API responses

### Integrations Service (`src/services/integrations.ts`)
- `getUserIntegrations()` - Retrieves user's connected integrations
- `connectIntegration()` - Connects a new integration
- `disconnectIntegration()` - Removes an integration connection
- `refreshIntegrationTokens()` - Refreshes OAuth tokens for integrations
- `useUserIntegrations()`, `useConnectIntegration()`, `useDisconnectIntegration()` - React Query hooks for integration operations

### Email Service (`src/services/email.ts`)
- `sendEmail()` - Sends emails through Gmail integration
- `fetchEmails()` - Retrieves emails from Gmail
- `useSendEmail()`, `useEmails()` - React Query hooks for email operations

### Document Service (`src/services/documents.ts`)
- `uploadDocument()` - Uploads files to document storage
- `fetchDocuments()` - Retrieves documents with filtering
- `deleteDocument()` - Removes documents
- `downloadDocument()` - Downloads document files
- `useDocuments()`, `useUploadDocument()`, `useDeleteDocument()` - React Query hooks for document operations

---

## Utility Functions

### Money Utils (`src/lib/money.ts`)
- `toMinor()` - Converts currency to minor units (e.g., DKK to øre)
- `fromMinor()` - Converts minor units back to currency
- `computeLineTotals()` - Calculates line item totals with tax and discount

### API Utils (`src/lib/api.ts`)
- `normalizeApiData()` - Normalizes API responses to handle different formats
- `testApiConfig()` - Tests API configuration and connectivity

### Calendar Utils (`src/lib/calendar-utils.ts`)
- `formatEventDate()` - Formats dates for calendar display
- `getEventDuration()` - Calculates event duration
- `parseCalendarEvent()` - Parses calendar event data

### General Utils (`src/lib/utils.ts`)
- `cn()` - Combines class names using clsx and tailwind-merge
- `formatBytes()` - Formats file sizes for display

### Hotkeys (`src/lib/useHotkeys.ts`)
- `useHotkeys()` - Hook for handling keyboard shortcuts

### Toast System (`src/hooks/use-toast.ts`)
- `toast()` - Displays toast notifications
- `useToast()` - Hook for managing toast state
- `reducer()` - Redux-style reducer for toast state management

### Mobile Detection (`src/hooks/use-mobile.tsx`)
- `useIsMobile()` - Detects if user is on mobile device

### Company Lookup (`src/hooks/useCompanyLookup.ts`)
- `useCompanyLookup()` - Provides company search and selection functionality

### Stage Lookup (`src/hooks/useStageLookup.ts`)
- `useStageLookup()` - Provides deal stage selection functionality

### Settings Hook (`src/hooks/useSettings.ts`)
- `useSettings()` - Provides access to user settings

### Deals Board Data (`src/hooks/useDealsBoardData.ts`)
- `useDealsBoardData()` - Provides kanban board data for deals

---

## UI Components

### Layout Components
- `CRMLayout()` - Main application layout with sidebar and content area
- `AppSidebar()` - Navigation sidebar with menu items
- `PageHeader()` - Standard page header component

### Authentication Components
- `AuthGate()` - Protects routes requiring authentication
- `ProtectedRoute()` - Wrapper for authenticated routes
- `LoginPage()` - User login interface

### Form Components
- `FormRow()` - Standard form row layout
- `CreateDealModal()` - Modal for creating new deals
- `FileUploader()` - Component for uploading documents

### Search Components
- `CommandPalette()` - Global search and navigation interface

### Select Components
- `CompanySelect()` - Company selection dropdown
- `PersonSelect()` - Person selection dropdown

---

## State Management

### UI Store (`src/stores/useUIStore.ts`)
- `toggleSidebar()` - Toggles sidebar collapsed state
- `setSidebarCollapsed()` - Sets sidebar collapsed state
- `setTheme()` - Changes application theme (light/dark/system)
- `setActiveTab()` - Sets active tab in current view
- `toggleMobileMenu()` - Toggles mobile menu visibility
- `addNotification()` - Adds system notification
- `removeNotification()` - Removes specific notification
- `clearNotifications()` - Clears all notifications

---

## Supabase Edge Functions

### Google OAuth Functions
- `google-oauth-start` - Initiates Google OAuth flow
- `google-oauth-callback` - Handles OAuth callback
- `google-oauth-exchange` - Exchanges authorization code for tokens
- `google-refresh` - Refreshes expired OAuth tokens

### Google Calendar Functions
- `google-calendar-proxy` - Proxies requests to Google Calendar API
- `google-calendar-webhook` - Handles Google Calendar webhook notifications

### Google Gmail Function
- `google-gmail-send` - Sends emails through Gmail API

### PDF Generation Functions
- `pdf-generator` - Legacy PDF generation service
- `pdf-generator-v2` - Enhanced PDF generation with improved formatting

### Document Functions
- `document-download` - Handles secure document downloads

### Email Functions
- `send-quote` - Sends quote emails with PDF attachments
- `send-invoice` - Sends invoice emails with PDF attachments

### Test Functions
- `test-jwt` - Tests JWT token validation
- `test-public` - Tests public function access
- `test-simple` - Simple test function for debugging

---

## Database Functions

### Deal Management
- `rpc_reorder_deal()` - Reorders deals within stages
- `create_reorder_deal_function()` - Creates the deal reordering function

### Numbering Triggers
- `order_numbering_trigger()` - Auto-generates order numbers
- `invoice_numbering_trigger()` - Auto-generates invoice numbers

### Table Creation
- `create_tasks_table()` - Creates tasks table with proper structure
- `create_activities_table()` - Creates activities table for audit trail

### Data Seeding
- `seed_stages()` - Seeds default deal stages
- `native_calendar_seed()` - Seeds native calendar data

### Security
- `auth_states_table()` - Creates OAuth state tracking table
- `rls_events_user_settings()` - Sets up Row Level Security for user settings

---

## Key Features

### Automation
- Deal stage automation with configurable rules
- Automatic task creation based on deal progression
- Email notifications for deal milestones

### Integrations
- Google Calendar bidirectional sync
- Gmail integration for sending emails
- Google OAuth for secure authentication

### Document Management
- PDF generation for quotes, orders, and invoices
- Secure document upload and download
- Document association with deals, companies, and people

### Analytics & Reporting
- Deal pipeline analytics
- Revenue forecasting
- Conversion rate tracking
- Dashboard with key metrics

### Multi-currency Support
- Currency conversion utilities
- Minor unit handling for precise calculations
- Tax and discount calculations

### Security
- Row Level Security (RLS) implementation
- OAuth token management
- Secure document access controls

This functions overview provides a comprehensive understanding of the CRMFlow application's capabilities and architecture.

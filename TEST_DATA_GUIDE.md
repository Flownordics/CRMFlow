# CRMFlow Test Data Guide

## 📊 Overview

This guide documents the comprehensive test data that has been added to your Supabase database for testing and showcase purposes. The test data covers all major entities in the CRM system and represents realistic business scenarios.

## 📈 Data Summary

| Entity | Total Count | Description |
|--------|-------------|-------------|
| **Companies** | 36 | Mix of prospects, customers, and partners across various industries |
| **Contacts (People)** | 47 | Decision makers and stakeholders at various companies |
| **Deals** | 30 | Distributed across all pipeline stages |
| **Quotes** | 18 | Various statuses: draft, sent, accepted, declined |
| **Orders** | 9 | Confirmed orders from won deals |
| **Invoices** | 31 | Mix of paid, sent, overdue, and draft invoices |
| **Line Items** | 68 | Detailed line items for quotes, orders, and invoices |
| **Payments** | 17 | Full and partial payments linked to invoices |
| **Tasks** | 10 | Pending, in-progress, and completed tasks |
| **Events** | 10 | Calendar events (meetings, calls, demos) |
| **Activity Logs** | 171 | Comprehensive activity history (calls, emails, meetings, notes) |
| **Company Tags** | 13 | Tags for categorizing companies |
| **Tag Assignments** | 26 | Companies tagged with relevant categories |

---

## 🏢 Test Companies

### Enterprise Customers (Won Deals)
1. **TechVision Solutions** (Denmark, Technology)
   - Deal: Enterprise CRM Implementation - **450,000 DKK**
   - Status: Customer, won deal
   - Tags: VIP Customer, Enterprise, Technology Sector
   - Contacts: Lars Jensen (CEO), Maria Nielsen (CTO), Peter Andersen (Sales Manager)

2. **FinTech Partners** (Finland, Financial Services)
   - Deal: Digital Payment Platform - **380,000 DKK**
   - Status: Customer, won deal
   - Tags: VIP Customer, Strategic Partner, Nordic Region
   - Contacts: Antti Virtanen (CEO), Liisa Mäkinen (Sales Director)

3. **Manufacturing Pro AS** (Norway, Manufacturing)
   - Deal: Manufacturing ERP System - **820,000 DKK**
   - Status: Customer, won deal with overdue invoice
   - Tags: VIP Customer, Enterprise, Requires Attention
   - Contacts: Bjørn Nilsen (COO), Hanne Berg (Purchasing Manager)

4. **CyberSec Solutions** (Denmark, Technology)
   - Deal: Cybersecurity Suite Annual License - **240,000 DKK**
   - Status: Customer, fully paid
   - Tags: VIP Customer, Technology Sector
   - Contacts: Christian Rasmussen (CEO), Louise Jørgensen (VP Sales)

### High-Potential Prospects
5. **Retail Dynamics AB** (Sweden, Retail)
   - Deal: Omnichannel Retail Solution - **650,000 DKK**
   - Stage: Proposal
   - Tags: Enterprise, High Potential, Nordic Region
   - Contacts: Jonas Andersson (VP Enterprise Sales), Maja Eriksson (Customer Success Manager)

6. **DataFlow Systems** (Denmark, Technology)
   - Deal: Cloud Analytics Platform - **350,000 DKK**
   - Stage: Proposal
   - Tags: High Potential, Technology Sector, Nordic Region
   - Contacts: Mikkel Christensen (CEO), Sophie Larsen (Head of Sales)

7. **Baltic Logistics Group** (Estonia, Logistics)
   - Deal: International Freight Management - **280,000 DKK**
   - Stage: Proposal
   - Tags: Enterprise, Nordic Region
   - Contacts: Mart Kallas (Operations Director), Kadi Tamm (Business Development)

### Negotiation Stage
8. **AgriTech Nordic** (Finland, Agriculture)
   - Deal: Farm Management Software - **320,000 DKK**
   - Stage: Negotiation
   - Tags: Enterprise, High Potential, Nordic Region
   - Contacts: Ville Korhonen (CEO), Hanna Lehtinen (Business Development Manager)

9. **Media Solutions Group** (Denmark, Media)
   - Deal: Media Production Suite - **220,000 DKK**
   - Stage: Negotiation
   - Contacts: Rasmus Frederiksen (Managing Director), Isabella Thomsen (Head of Production)

### Early Stage Prospects
10. **GreenEnergy AS** (Norway, Energy)
    - Deal: Solar Energy System - **500,000 DKK**
    - Stage: Prospecting
    - Tags: High Potential, Nordic Region
    - Contacts: Ole Hansen (VP Sales), Ingrid Johansen (Project Manager)

11. **SmartHome Tech** (Denmark, Technology)
    - Deal: SmartHome Installation Package - **85,000 DKK**
    - Stage: Prospecting
    - Tags: High Potential, Technology Sector
    - Contacts: Anders Olsen (CEO), Katrine Poulsen (Sales Lead)

12. **Nordic Food Services AB** (Sweden, Food & Beverage)
    - Deal: POS System for Restaurant Chain - **120,000 DKK**
    - Stage: Prospecting
    - Contacts: Gustav Karlsson (Founder), Ebba Lindgren (Sales Manager)

### Lost/Inactive
13. **EduSoft Solutions** (Denmark, Education)
    - Deal: E-learning Platform - **150,000 DKK** (Lost)
    - Status: Inactive
    - Contact: Søren Hansen (Managing Director)

14. **HealthTech Innovation** (Denmark, Healthcare)
    - Deal: Health Monitoring System - **280,000 DKK** (Lost)
    - Stage: Lost
    - Contacts: Thomas Møller (Founder & CEO), Emma Pedersen (Product Manager)

---

## 💼 Deal Pipeline Distribution

### By Stage
- **Prospecting**: 5 deals (~42M DKK pipeline)
- **Proposal**: 5 deals (~188M DKK pipeline)
- **Negotiation**: 3 deals (~117M DKK pipeline)
- **Won**: 4 deals (189M DKK - already closed)
- **Lost**: 2 deals (43M DKK - lost opportunities)

### Pipeline Metrics
- **Total Pipeline Value**: 347M DKK (excluding won/lost)
- **Won Deals Total**: 189M DKK
- **Average Deal Size**: 63M DKK (~630,000 DKK)
- **Win Rate**: 66% (4 won out of 6 closed deals)

---

## 💰 Financial Test Data

### Invoices Overview
- **Total Invoices**: 31
- **Paid**: 3 invoices (65.5M DKK fully paid)
- **Overdue**: 2 invoices (60M DKK with partial payments)
- **Sent**: 2 invoices (63.5M DKK awaiting payment)
- **Draft**: 1 invoice (35M DKK being prepared)

### Outstanding Receivables
- **Total Outstanding**: ~119M DKK
- **Overdue Amount**: 35M DKK (21M overdue balance after partial payments)
- **Current Amount**: 63.5M DKK (sent but not yet due)

### Payment Methods
- **Bank Transfer**: 14 payments (primary method)
- **Card**: 1 payment
- **Cash**: 1 payment
- **Other**: 1 payment

---

## 📋 Task Management Test Data

### Task Distribution
- **Pending**: 5 tasks
  - Follow up with TechVision on CRM Phase 2 (High priority)
  - Prepare proposal for Solar Energy System (Urgent)
  - Send payment reminder to Manufacturing Pro (Urgent)
  - Schedule demo for Omnichannel Retail Solution (Medium)
  - Research SmartHome competitors (Low)

- **In Progress**: 2 tasks
  - Negotiate contract terms with FinTech Partners (High)
  - Prepare pricing for Industrial Automation (High)

- **Completed**: 3 tasks
  - Send invoice to CyberSec Solutions
  - Complete CRM implementation Phase 1
  - Send quote to DataFlow Systems

---

## 📅 Calendar Events

### Upcoming Events
1. **Initial Discovery Call - Solar Energy** (Mar 14, 2025)
2. **Kick-off Meeting - TechVision CRM Phase 2** (Mar 16, 2025)
3. **Contract Negotiation - FinTech Partners** (Mar 18, 2025)
4. **Technical Review - Industrial Automation** (Mar 19, 2025)
5. **Product Demo - Retail Dynamics** (Mar 20, 2025)

### Past Events
- CRM Training Session - Day 1 (Feb 24, 2025)
- Contract Signing - CyberSec Solutions (Feb 10, 2025)
- ERP System Demo (Jan 22, 2025)
- Payment Gateway Technical Discussion (Feb 5, 2025)
- Quarterly Business Review (Mar 10, 2025)

---

## 📊 Activity Log Categories

### Call Activities (4)
- Successful calls with follow-up actions
- No-answer scenarios with voicemail
- Follow-up required flags

### Email Activities (3)
- Contract proposals sent
- Quote delivery confirmations
- Payment reminders

### Meeting Activities (3)
- Product demonstrations
- Contract signings
- Technical reviews

### Notes (3)
- Strategic insights
- Decision maker information
- Competition notes

### Payments (2)
- Payment received confirmations
- Transaction details and references

---

## 🏷️ Company Tags

### Available Tags
1. **VIP Customer** (Red) - High-value customers
2. **Enterprise** (Purple) - Large enterprise accounts
3. **Strategic Partner** (Orange) - Key strategic relationships
4. **High Potential** (Green) - High-growth opportunities
5. **Requires Attention** (Orange) - Needs immediate follow-up
6. **Nordic Region** (Cyan) - Nordic market focus
7. **Technology Sector** (Indigo) - Technology industry

### Tag Usage Examples
- **TechVision**: VIP Customer + Enterprise + Technology Sector
- **FinTech Partners**: VIP Customer + Strategic Partner + Nordic Region
- **Manufacturing Pro**: VIP Customer + Enterprise + Requires Attention
- **Retail Dynamics**: Enterprise + High Potential + Nordic Region

---

## 🧪 Testing Scenarios

### Scenario 1: Full Sales Cycle
**Company**: TechVision Solutions
1. View company profile with complete information
2. Check associated deals (Enterprise CRM Implementation)
3. Review quotes → orders → invoices pipeline
4. Verify payment history (Phase 1 fully paid)
5. Check pending tasks for Phase 2
6. Review activity timeline (calls, meetings, payments)

### Scenario 2: Overdue Invoice Management
**Company**: Manufacturing Pro AS
1. Navigate to invoices and filter by "overdue"
2. Review invoice details (820K DKK ERP system)
3. Check payment history (partial payment received)
4. Send payment reminder
5. View related tasks and activity logs

### Scenario 3: Pipeline Management
**Filter**: Proposal Stage
1. View all deals in Proposal stage (5 deals)
2. Sort by deal value (highest to lowest)
3. Check quote status for each deal
4. Review scheduled follow-up events
5. Update deal stages based on progress

### Scenario 4: Customer Segmentation
**Using Tags**: VIP Customer
1. Filter companies by "VIP Customer" tag
2. Review revenue contribution (4 companies, 189M DKK won)
3. Check account health (payment status, activity frequency)
4. Plan quarterly business reviews

### Scenario 5: Task & Calendar Management
1. View all pending tasks (5 tasks)
2. Filter by priority (2 urgent, 2 high, 1 low)
3. Check calendar for upcoming meetings (5 scheduled)
4. Complete tasks and update related deals
5. Schedule follow-up activities

---

## 📍 Geographic Distribution

### By Country
- **Denmark**: 8 companies (Copenhagen, Aarhus, Frederiksberg)
- **Sweden**: 3 companies (Stockholm, Gothenburg, Malmö)
- **Norway**: 3 companies (Oslo, Bergen)
- **Finland**: 2 companies (Helsinki)
- **Estonia**: 1 company (Tallinn)

### By Industry
- **Technology**: 6 companies
- **Manufacturing**: 1 company
- **Financial Services**: 1 company
- **Energy**: 1 company
- **Retail**: 1 company
- **Healthcare**: 1 company
- **Agriculture**: 1 company
- **Logistics**: 1 company
- **Food & Beverage**: 1 company
- **Education**: 1 company
- **Media**: 1 company
- **Consulting**: 1 company

---

## 🔍 Advanced Search & Filter Examples

### Find High-Value Opportunities
```
Filter: Stage = "Proposal" OR "Negotiation"
Sort: Expected Value (High to Low)
Result: 8 deals totaling 305M DKK
```

### Identify Accounts Needing Attention
```
Filter: Tags = "Requires Attention" OR Invoices = "Overdue"
Result: Companies with outstanding actions
```

### Pipeline Health Check
```
View: All deals by stage
Metrics: 
- Average time in stage
- Conversion rates
- Pipeline velocity
```

### Revenue Forecasting
```
Formula: Sum(Deal Value × Stage Probability)
Prospecting: 42M × 0.1 = 4.2M
Proposal: 188M × 0.3 = 56.4M
Negotiation: 117M × 0.7 = 81.9M
Total Forecast: 142.5M DKK
```

---

## 🎯 Key Performance Indicators (KPIs)

### Sales Performance
- **Win Rate**: 66% (4/6 closed deals)
- **Average Deal Size**: 630,000 DKK
- **Total Won Revenue**: 1,890,000 DKK
- **Pipeline Coverage**: 347M DKK (5.5x won revenue)

### Accounts Receivable
- **Days Sales Outstanding (DSO)**: ~30 days average
- **Collection Rate**: 65% (paid + partial payments)
- **Overdue Rate**: 6.5% (2/31 invoices)

### Activity Metrics
- **Calls**: 4 logged activities
- **Meetings**: 3 completed, 5 scheduled
- **Emails**: 3 sent (quotes, proposals, reminders)
- **Average Activities per Account**: 4.75

---

## 🚀 Demo & Showcase Tips

### Impressive Views to Showcase

1. **Dashboard Overview**
   - Total pipeline value (347M DKK)
   - Win rate trends (66%)
   - Revenue by stage
   - Top opportunities

2. **Company Timeline View**
   - TechVision Solutions (most complete data)
   - Shows full lifecycle: lead → quote → order → invoice → payment
   - Rich activity history

3. **Pipeline Kanban Board**
   - Drag-and-drop deals between stages
   - Visual representation of pipeline
   - Deal cards with key info

4. **Invoice Aging Report**
   - Current vs. overdue breakdown
   - Payment history visualization
   - Accounts requiring follow-up

5. **Calendar Integration**
   - Upcoming meetings with deal context
   - Color-coded by company/deal
   - One-click join for online meetings

---

## 🔧 Data Maintenance

### Cleanup Commands (if needed)

```sql
-- Delete all test companies (and cascade to related data)
DELETE FROM companies WHERE created_by = '87215d7d-5274-496e-ac46-c9d2f079368d';

-- Reset specific tables
TRUNCATE TABLE tasks CASCADE;
TRUNCATE TABLE events CASCADE;
TRUNCATE TABLE activity_log CASCADE;

-- Verify row counts
SELECT 'companies' as table_name, COUNT(*) FROM companies
UNION ALL
SELECT 'deals', COUNT(*) FROM deals
UNION ALL
SELECT 'invoices', COUNT(*) FROM invoices;
```

### Refresh Test Data
To regenerate fresh test data, simply re-run the test data creation script with updated dates and values.

---

## 📝 Notes

- All monetary values are in DKK (Danish Krone) with amounts stored in minor units (øre/cents)
- Dates are set relative to the current date to keep data relevant
- Contact information (emails, phones) are fictional but realistic
- Company details are representative of actual Nordic business scenarios
- All data respects RLS (Row Level Security) policies

---

## 📞 Support

If you encounter any issues with the test data or need additional scenarios:
1. Check the database directly via Supabase Studio
2. Review the SQL queries used to generate the data
3. Verify RLS policies are properly configured
4. Ensure all foreign key relationships are intact

---

**Last Updated**: October 12, 2025  
**Database**: CRMFlow Supabase Instance  
**Environment**: Development/Testing

---

## 🎉 Happy Testing!

This comprehensive test data set provides everything you need to:
- ✅ Test all CRM features end-to-end
- ✅ Demonstrate the system to stakeholders
- ✅ Train new users on the platform
- ✅ Validate reports and analytics
- ✅ Perform load and performance testing
- ✅ Showcase Nordic market capabilities


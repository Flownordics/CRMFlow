# CRMFlow Database

This directory contains the database schema, migrations, and RPC functions for CRMFlow.

## Schema

- `schema.sql` - Main database schema with tables for companies, people, deals, quotes, orders, invoices, and line items
- `seed.sql` - Sample data for development and testing

## RPC Functions

### `reorder_deal(dealId, newStageId, newIndex)`

This function handles reordering deals within and between stages in the Kanban board.

**Parameters:**
- `dealId` (uuid) - The ID of the deal to move
- `newStageId` (uuid) - The target stage ID
- `newIndex` (int) - The target position within the stage

**Usage:**
```sql
-- Move deal to position 2 in stage 'proposal'
SELECT reorder_deal('deal-uuid-here', 'proposal-stage-uuid', 2);

-- Move deal to the end of stage 'negotiation'
SELECT reorder_deal('deal-uuid-here', 'negotiation-stage-uuid', 5);
```

**Features:**
- Handles both reordering within the same stage and moving between stages
- Automatically adjusts positions of other deals to maintain order
- Uses row-level locking to prevent race conditions
- Maintains referential integrity

## Setup

1. Run the schema: `psql -f schema.sql`
2. Run the RPC function: `psql -f rpc_reorder_deal.sql`
3. Seed with sample data: `psql -f seed.sql`

## Indexes

The schema includes optimized indexes for:
- Deal stage and position (for Kanban ordering)
- Company and contact lookups
- Full-text search on deal titles
- Updated timestamps for sorting

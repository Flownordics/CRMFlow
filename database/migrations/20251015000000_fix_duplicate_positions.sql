-- =========================================
-- Fix Duplicate Position Values in Deals
-- =========================================
-- This migration fixes deals that have duplicate position values within the same stage
-- and improves the reorder_deal function to be more robust

-- Step 1: Fix existing duplicate positions by reassigning sequential positions
DO $$
DECLARE
    stage_rec RECORD;
    deal_rec RECORD;
    new_pos INTEGER;
BEGIN
    -- For each stage, reassign positions sequentially
    FOR stage_rec IN 
        SELECT DISTINCT stage_id 
        FROM public.deals 
        WHERE deleted_at IS NULL
        ORDER BY stage_id
    LOOP
        new_pos := 0;
        
        -- Reassign positions in order of current position, then by created_at
        FOR deal_rec IN 
            SELECT id 
            FROM public.deals 
            WHERE stage_id = stage_rec.stage_id 
              AND deleted_at IS NULL
            ORDER BY position, created_at
        LOOP
            UPDATE public.deals 
            SET position = new_pos 
            WHERE id = deal_rec.id;
            
            new_pos := new_pos + 1;
        END LOOP;
        
        RAISE NOTICE 'Fixed positions for stage %', stage_rec.stage_id;
    END LOOP;
END $$;

-- Step 2: Create improved reorder_deal function with better safeguards
CREATE OR REPLACE FUNCTION public.reorder_deal(
    p_deal uuid,
    p_new_stage uuid,
    p_new_index int
) RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_old_stage uuid;
    v_old_pos int;
    v_affected_rows int;
BEGIN
    -- Validate input parameters
    IF p_deal IS NULL THEN
        RAISE EXCEPTION 'deal ID cannot be null';
    END IF;
    
    IF p_new_stage IS NULL THEN
        RAISE EXCEPTION 'new stage ID cannot be null';
    END IF;
    
    IF p_new_index < 0 THEN
        RAISE EXCEPTION 'new index must be non-negative';
    END IF;

    -- Get current deal position and stage with row lock to prevent race conditions
    SELECT stage_id, position INTO v_old_stage, v_old_pos 
    FROM public.deals 
    WHERE id = p_deal AND deleted_at IS NULL
    FOR UPDATE;

    IF v_old_stage IS NULL THEN
        RAISE EXCEPTION 'deal not found or is deleted';
    END IF;

    -- Verify the target stage exists
    IF NOT EXISTS (SELECT 1 FROM public.stages WHERE id = p_new_stage) THEN
        RAISE EXCEPTION 'target stage not found';
    END IF;

    IF v_old_stage = p_new_stage THEN
        -- Reordering within the same stage
        -- Shift positions to make room for the new position
        UPDATE public.deals
            SET position = position + CASE WHEN position >= p_new_index THEN 1 ELSE 0 END,
                updated_at = now()
            WHERE stage_id = p_new_stage 
              AND id <> p_deal
              AND deleted_at IS NULL;

        -- Update the deal to its new position
        UPDATE public.deals 
            SET position = p_new_index,
                stage_id = p_new_stage,
                updated_at = now()
            WHERE id = p_deal
              AND deleted_at IS NULL;
              
        GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
        
        IF v_affected_rows <> 1 THEN
            RAISE EXCEPTION 'unexpected number of rows affected: % (expected 1)', v_affected_rows;
        END IF;
    ELSE
        -- Moving to a different stage
        -- Remove the hole in the old stage by shifting positions down
        UPDATE public.deals
            SET position = position - 1,
                updated_at = now()
            WHERE stage_id = v_old_stage 
              AND position > v_old_pos
              AND deleted_at IS NULL;

        -- Make room in the new stage by shifting positions up
        UPDATE public.deals
            SET position = position + 1,
                updated_at = now()
            WHERE stage_id = p_new_stage 
              AND position >= p_new_index
              AND deleted_at IS NULL;

        -- Move the deal to the new stage and position
        UPDATE public.deals 
            SET stage_id = p_new_stage,
                position = p_new_index,
                updated_at = now()
            WHERE id = p_deal
              AND deleted_at IS NULL;
              
        GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
        
        IF v_affected_rows <> 1 THEN
            RAISE EXCEPTION 'unexpected number of rows affected when moving deal: % (expected 1)', v_affected_rows;
        END IF;
    END IF;
    
    RAISE NOTICE 'Deal % moved from stage % to stage % at position %', p_deal, v_old_stage, p_new_stage, p_new_index;
END;
$function$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.reorder_deal(uuid, uuid, int) TO authenticated;

-- Step 3: Create a unique constraint to prevent duplicate positions in the future
-- Note: We use a unique index instead of a constraint because we need to filter out deleted deals
DROP INDEX IF EXISTS idx_deals_stage_position_unique;
CREATE UNIQUE INDEX idx_deals_stage_position_unique 
    ON public.deals (stage_id, position) 
    WHERE deleted_at IS NULL;

-- Verify the fix
DO $$
DECLARE
    duplicate_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO duplicate_count
    FROM (
        SELECT stage_id, position, COUNT(*) as cnt
        FROM public.deals
        WHERE deleted_at IS NULL
        GROUP BY stage_id, position
        HAVING COUNT(*) > 1
    ) duplicates;
    
    IF duplicate_count > 0 THEN
        RAISE EXCEPTION 'Still found % duplicate position values after migration', duplicate_count;
    ELSE
        RAISE NOTICE 'Migration successful: No duplicate positions found';
    END IF;
END $$;


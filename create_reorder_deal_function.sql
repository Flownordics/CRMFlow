-- Create reorder_deal function for Kanban drag & drop functionality
-- This function handles reordering deals within and between stages

create or replace function public.reorder_deal(
  p_deal uuid,
  p_new_stage uuid,
  p_new_index int
) returns void language plpgsql as $$
declare
  v_old_stage uuid;
  v_old_pos int;
begin
  -- Get current deal position and stage with row lock to prevent race conditions
  select stage_id, position into v_old_stage, v_old_pos 
  from public.deals 
  where id = p_deal 
  for update;

  if v_old_stage is null then
    raise exception 'deal not found';
  end if;

  if v_old_stage = p_new_stage then
    -- Reordering within the same stage
    -- Shift positions to make room for the new position
    update public.deals
      set position = position + case when position >= p_new_index then 1 else 0 end
      where stage_id = p_new_stage and id <> p_deal;

    -- Update the deal to its new position
    update public.deals 
      set position = p_new_index, stage_id = p_new_stage 
      where id = p_deal;
  else
    -- Moving to a different stage
    -- Remove the hole in the old stage by shifting positions down
    update public.deals
      set position = position - 1
      where stage_id = v_old_stage and position > v_old_pos;

    -- Make room in the new stage by shifting positions up
    update public.deals
      set position = position + 1
      where stage_id = p_new_stage and position >= p_new_index;

    -- Move the deal to the new stage and position
    update public.deals 
      set stage_id = p_new_stage, position = p_new_index 
      where id = p_deal;
  end if;
end; $$;

-- Grant execute permission to authenticated users
grant execute on function public.reorder_deal(uuid, uuid, int) to authenticated;

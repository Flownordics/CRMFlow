-- =========================================
-- CRMFlow – Auto Update Quote Status on Response
-- =========================================
-- This trigger automatically updates quote status when a customer responds
-- Accepted → 'accepted'
-- Rejected → 'declined'

CREATE OR REPLACE FUNCTION public.update_quote_status_on_response()
RETURNS TRIGGER AS $$
BEGIN
  -- Update quote status based on response type
  IF NEW.response_type = 'accepted' THEN
    UPDATE public.quotes
    SET status = 'accepted', updated_at = now()
    WHERE id = NEW.quote_id;
  ELSIF NEW.response_type = 'rejected' THEN
    UPDATE public.quotes
    SET status = 'declined', updated_at = now()
    WHERE id = NEW.quote_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS trg_update_quote_status_on_response ON public.quote_responses;
CREATE TRIGGER trg_update_quote_status_on_response
  AFTER INSERT ON public.quote_responses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_quote_status_on_response();

-- Comments
COMMENT ON FUNCTION public.update_quote_status_on_response() IS 'Automatically updates quote status when customer responds (accepted → accepted, rejected → declined)';

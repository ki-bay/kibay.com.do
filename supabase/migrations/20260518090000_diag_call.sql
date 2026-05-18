CREATE OR REPLACE FUNCTION public.kibay_diag_call_get_order(p_id TEXT, p_token TEXT)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_result jsonb;
BEGIN
  BEGIN
    v_result := public.get_order_by_token(p_id, p_token);
    RETURN jsonb_build_object('ok', true, 'result', v_result);
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('ok', false, 'sqlerrm', SQLERRM, 'sqlstate', SQLSTATE);
  END;
END $$;
GRANT EXECUTE ON FUNCTION public.kibay_diag_call_get_order(TEXT, TEXT) TO service_role;

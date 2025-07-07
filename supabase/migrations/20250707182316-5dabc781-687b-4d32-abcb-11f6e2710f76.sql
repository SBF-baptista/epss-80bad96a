-- Fix security definer view to respect Row Level Security policies
ALTER VIEW public.workflow_chain SET (security_invoker=on);
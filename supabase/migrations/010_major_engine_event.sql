-- ============================================================
-- PITLANE — Migration 010
-- Flags a service_history row as a major engine event (full engine
-- replacement or a complete overhaul) so it can be surfaced distinctly
-- from routine maintenance wherever the vehicle's history is shown —
-- this is exactly the kind of thing a future owner or workshop needs
-- to see at a glance.
-- ============================================================

alter table public.service_history
  add column event_type text not null default 'service'
  check (event_type in ('service', 'major_engine'));

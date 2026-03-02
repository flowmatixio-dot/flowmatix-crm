-- ============================================================
-- 006_realtime.sql — Realtime Subscriptions
-- Run after 005_indexes.sql
-- ============================================================

-- Enable realtime for key tables that need live updates
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE appointments;
ALTER PUBLICATION supabase_realtime ADD TABLE leads;

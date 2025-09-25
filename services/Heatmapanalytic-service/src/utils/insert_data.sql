INSERT INTO building_entry_logs (visitor_id, event_time, event_type, zone, building)
VALUES 
  ('user1', NOW() - INTERVAL '3 hours', 'entry', 'Zone A', 'Drawing Office 2'),
  ('user1', NOW() - INTERVAL '2 hours 30 minutes', 'exit', 'Zone A', 'Drawing Office 2'),
  ('user2', NOW() - INTERVAL '1 hour 45 minutes', 'entry', 'Zone B', 'Drawing Office 1'),
  ('user2', NOW() - INTERVAL '1 hour', 'exit', 'Zone B', 'Drawing Office 1'),
  ('user3', NOW() - INTERVAL '2 hours', 'entry', 'Zone C', 'Department of Electrical and Electronic Engineering'),
  ('user3', NOW() - INTERVAL '1 hour 30 minutes', 'exit', 'Zone C', 'Department of Electrical and Electronic Engineering'),
  ('user4', NOW() - INTERVAL '1 hour 15 minutes', 'entry', 'Zone D', 'Fluids Lab'),
  ('user4', NOW() - INTERVAL '45 minutes', 'exit', 'Zone D', 'Fluids Lab');

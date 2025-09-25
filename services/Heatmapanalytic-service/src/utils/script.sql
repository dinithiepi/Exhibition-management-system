CREATE TABLE IF NOT EXISTS building_entry_logs (
  id SERIAL PRIMARY KEY,
  visitor_id VARCHAR(50) NOT NULL,
  event_time TIMESTAMP NOT NULL,
  event_type VARCHAR(10) NOT NULL CHECK (event_type IN ('entry', 'exit')),
  zone VARCHAR(50),
  building VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS idx_event_time ON building_entry_logs(event_time);
CREATE INDEX IF NOT EXISTS idx_zone ON building_entry_logs(zone);
CREATE INDEX IF NOT EXISTS idx_building ON building_entry_logs(building);
CREATE INDEX IF NOT EXISTS idx_visitor_id ON building_entry_logs(visitor_id);

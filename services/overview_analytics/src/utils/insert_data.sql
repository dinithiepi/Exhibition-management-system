-- ============================================
-- Insert Data for BUILDING Table
-- ============================================

INSERT INTO BUILDING (building_id, Dept_Name, total_count) VALUES
('B1', 'Engineering Carpentry Shop', 0),
('B2', 'Engineering Workshop', 0),
('B3', '', 0),
('B4', 'Generator Room', 0),
('B5', '', 0),
('B6', 'Structure Lab', 0),
('B7', 'Administrative Building', 0),
('B8', 'Canteen', 0),
('B9', 'Lecture Room 10/11', 0),
('B10', 'Engineering Library', 0),
('B11', 'Department of Chemical and Process Engineering', 0),
('B12', 'Security Unit', 0),
('B13', 'Drawing Office 2', 0),
('B14', 'Faculty Canteen', 0),
('B15', 'Department of Manufacturing and Industrial Engineering', 0),
('B16', 'Professor E.O.E. Perera Theater', 0),
('B17', 'Electronic Lab', 0),
('B18', 'Washrooms', 0),
('B19', 'Electrical and Electronic Workshop', 0),
('B20', 'Department of Computer Engineering', 0),
('B21', '', 0),
('B22', 'Environmental Lab', 0),
('B23', 'Applied Mechanics Lab', 0),
('B24', 'New Mechanics Lab', 0),
('B25', '', 0),
('B26', '', 0),
('B27', '', 0),
('B28', 'Materials Lab', 0),
('B29', 'Thermodynamics Lab', 0),
('B30', 'Fluids Lab', 0),
('B31', 'Surveying and Soil Lab', 0),
('B32', 'Department of Engineering Mathematics', 0),
('B33', 'Drawing Office 1', 0),
('B34', 'Department of Electrical and Electronic Engineering', 0);
-- ============================================
-- Insert Data for EntryExitLog Table
-- ============================================

INSERT INTO EntryExitLog (tag_id, building_id, entry_time, exit_time) VALUES
(1, 'B1', '2025-09-23 10:15:20', '2025-09-23 12:45:35'),
(2, 'B1',  '2025-09-23 11:05:10', '2025-09-23 13:40:50'),
(3, 'B2',  '2025-09-23 14:20:00', '2025-09-23 16:10:45'),
(4, 'B3',  '2025-09-23 15:05:15', '2025-09-23 16:30:25'),
(5, 'B3',  '2025-09-23 17:45:30', '2025-09-23 18:25:40');

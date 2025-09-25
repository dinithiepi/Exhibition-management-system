-- ==============================
-- DATA INSERTION
-- ==============================

-- 1. Zone
INSERT INTO Zone (zone_name) VALUES
('North Wing'),
('South Wing'),
('East Wing'),
('West Wing'),
('Central Hall');

-- 2. Building
INSERT INTO Building (zone_ID, building_name, description) VALUES
(1, 'Innovation Center', 'Hub for startups and tech projects'),
(2, 'Robotics Lab', 'Showcasing autonomous robots'),
(3, 'AI Pavilion', 'Artificial Intelligence demonstrations'),
(4, 'Electronics Hall', 'Circuits, IoT and embedded systems'),
(5, 'Main Auditorium', 'Keynote speeches and major events');

-- 3. Exhibits
INSERT INTO Exhibits (exhibit_name, building_ID) VALUES
('Smart Home Automation', 1),
('Autonomous Drone', 2),
('AI Chatbot', 3),
('IoT Smart City Model', 4),
('Next-Gen Processor', 4),
('Future of Mobility', 5);

-- 4. Organizer
INSERT INTO Organizer (organizer_name, fname, lname, email, contact_no, password_hash) VALUES
('TechLead', 'Ravindu', 'Perera', 'ravindu.perera@example.com', '0771234567', 'hashpass1'),
('EventGuru', 'Sajith', 'Fernando', 'sajith.fernando@example.com', '0779876543', 'hashpass2'),
('ExpoMaster', 'Nadeesha', 'Gunasekara', 'nadeesha.g@example.com', '0713456789', 'hashpass3'),
('CoordPro', 'Chathura', 'Jayasinghe', 'chathura.j@example.com', '0754567890', 'hashpass4'),
('VisionOrg', 'Ishara', 'De Silva', 'ishara.desilva@example.com', '0782345678', 'hashpass5');

-- 5. Events
INSERT INTO Events (event_name, start_time, end_time, location, description, media_urls, event_category, organizer_ID) VALUES
('Opening Ceremony', '2025-09-10 09:00:00', '2025-09-10 11:00:00', 'Main Auditorium', 'Kickoff event with keynote speakers', '["url1","url2"]', 'Ceremony', 1),
('Robotics Showcase', '2025-09-11 10:00:00', '2025-09-11 13:00:00', 'Robotics Lab', 'Live demonstrations of autonomous robots', '["url3"]', 'Technology', 2),
('AI Workshop', '2025-09-12 14:00:00', '2025-09-12 17:00:00', 'AI Pavilion', 'Hands-on session with AI tools', '["url4"]', 'Workshop', 3),
('Electronics Expo', '2025-09-13 09:00:00', '2025-09-13 16:00:00', 'Electronics Hall', 'Exhibits on IoT and embedded systems', '["url5","url6"]', 'Exhibition', 4),
('Closing Ceremony', '2025-09-14 17:00:00', '2025-09-14 19:00:00', 'Main Auditorium', 'End of exhibition with awards', '["url7"]', 'Ceremony', 5);

-- 6. Admin
INSERT INTO Admin (user_name, email) VALUES
('admin_ravi', 'admin.ravi@example.com'),
('admin_sajith', 'admin.sajith@example.com'),
('admin_nadeesha', 'admin.nadeesha@example.com'),
('admin_chathura', 'admin.chathura@example.com'),
('admin_ishara', 'admin.ishara@example.com');

-- 7. Speaker
INSERT INTO Speaker (speaker_name, email) VALUES
('Prof. Lakmal Silva', 'lakmal.silva@example.com'),
('Dr. Anushka Jayawardena', 'anushka.j@example.com'),
('Mr. Tharindu Wickramasinghe', 'tharindu.w@example.com'),
('Ms. Kavindi Perera', 'kavindi.p@example.com'),
('Eng. Roshan Fernando', 'roshan.f@example.com');

-- 8. Event_Speaker (linking Events and Speakers)
INSERT INTO Event_Speaker (event_ID, speaker_ID) VALUES
(1, 1),
(1, 2),
(2, 3),
(3, 4),
(5, 5);

-- 9. Tag
INSERT INTO Tag (tag_name) VALUES
('AI'),
('Robotics'),
('IoT'),
('Innovation'),
('Keynote');

-- 10. Event_Tag (linking Events and Tags)
INSERT INTO Event_Tag (event_ID, tag_ID) VALUES
(1, 5),
(2, 2),
(3, 1),
(4, 3),
(4, 4),
(5, 5);
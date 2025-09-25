DROP DATABASE IF EXISTS organizer_dashboard;

-- Create Database
CREATE DATABASE organizer_dashboard;

-- Connect to the database
\c organizer_dashboard;

-- ==============================
-- TABLES
-- ==============================

-- 1. Zone
CREATE TABLE Zone (
    zone_ID SERIAL PRIMARY KEY,
    zone_name VARCHAR(100) NOT NULL
);

-- 2. Building
CREATE TABLE Building (
    building_ID SERIAL PRIMARY KEY,
    zone_ID INT NOT NULL,
    building_name VARCHAR(150) NOT NULL,
    description TEXT,
    CONSTRAINT fk_building_zone FOREIGN KEY (zone_ID) REFERENCES Zone(zone_ID) ON DELETE CASCADE
);

-- 3. Exhibits
CREATE TABLE Exhibits (
    exhibit_ID SERIAL PRIMARY KEY,
    exhibit_name VARCHAR(150) NOT NULL,
    building_ID INT NOT NULL,
    CONSTRAINT fk_exhibit_building FOREIGN KEY (building_ID) REFERENCES Building(building_ID) ON DELETE CASCADE
);

-- 4. Organizer
CREATE TABLE Organizer (
    organizer_ID SERIAL PRIMARY KEY,
    organizer_name VARCHAR(100),
    fname VARCHAR(100) NOT NULL,
    lname VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    contact_no VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL
);

-- 5. Events (linked to Organizer)
CREATE TABLE Events (
    event_ID SERIAL PRIMARY KEY,
    event_name VARCHAR(200) NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    location VARCHAR(200),
    description TEXT,
    media_urls TEXT,
    event_category VARCHAR(100),
    CONSTRAINT chk_event_time CHECK (start_time < end_time),
    organizer_ID INT,
    CONSTRAINT fk_event_organizer FOREIGN KEY (organizer_ID) REFERENCES Organizer(organizer_ID) ON DELETE SET NULL
);

-- 6. Admin
CREATE TABLE Admin (
    admin_ID SERIAL PRIMARY KEY,
    user_name VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL
);

-- ==============================
-- MANY-TO-MANY RELATIONSHIPS
-- ==============================

-- Speakers
CREATE TABLE Speaker (
    speaker_ID SERIAL PRIMARY KEY,
    speaker_name VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE
);

CREATE TABLE Event_Speaker (
    event_ID INT NOT NULL,
    speaker_ID INT NOT NULL,
    PRIMARY KEY (event_ID, speaker_ID),
    CONSTRAINT fk_es_event FOREIGN KEY (event_ID) REFERENCES Events(event_ID) ON DELETE CASCADE,
    CONSTRAINT fk_es_speaker FOREIGN KEY (speaker_ID) REFERENCES Speaker(speaker_ID) ON DELETE CASCADE
);

-- Tags
CREATE TABLE Tag (
    tag_ID SERIAL PRIMARY KEY,
    tag_name VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE Event_Tag (
    event_ID INT NOT NULL,
    tag_ID INT NOT NULL,
    PRIMARY KEY (event_ID, tag_ID),
    CONSTRAINT fk_et_event FOREIGN KEY (event_ID) REFERENCES Events(event_ID) ON DELETE CASCADE,
    CONSTRAINT fk_et_tag FOREIGN KEY (tag_ID) REFERENCES Tag(tag_ID) ON DELETE CASCADE
);
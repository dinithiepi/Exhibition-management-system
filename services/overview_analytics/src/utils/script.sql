-- Drop existing tables if any
DROP DATABASE IF EXISTS overview_analytics;
DROP TABLE IF EXISTS EntryExitLog CASCADE;
DROP TABLE IF EXISTS BUILDING CASCADE;

-- Create the database
CREATE DATABASE overview_analytics;

-- Switch to the database
\c overview_analytics;

-- 1. Building table
CREATE TABLE BUILDING (
    building_id TEXT PRIMARY KEY,
    Dept_Name VARCHAR(255),
    total_count BIGINT
);

-- Create EntryExitLog table
CREATE TABLE EntryExitLog (
    tag_id BIGINT PRIMARY KEY,
    building_id TEXT,
    entry_time TIMESTAMP,
    exit_time TIMESTAMP,
    direction TEXT,
    FOREIGN KEY (building_id) REFERENCES BUILDING(building_id)
);
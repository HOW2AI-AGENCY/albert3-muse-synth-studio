-- Add name and comment columns to track_versions table
ALTER TABLE track_versions
ADD COLUMN name TEXT,
ADD COLUMN comment TEXT;

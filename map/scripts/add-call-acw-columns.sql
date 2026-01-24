-- Add call_duration and acw_duration columns to time_study_observations
-- For Contact Center studies: call_duration = talk time, acw_duration = after call work
-- total_duration = call_duration + acw_duration (or just call_duration if no ACW)

ALTER TABLE time_study_observations ADD COLUMN IF NOT EXISTS call_duration_seconds DECIMAL(10,2);
ALTER TABLE time_study_observations ADD COLUMN IF NOT EXISTS acw_duration_seconds DECIMAL(10,2);

-- For existing observations, set call_duration = total_duration (no ACW tracked)
UPDATE time_study_observations 
SET call_duration_seconds = total_duration_seconds 
WHERE call_duration_seconds IS NULL AND total_duration_seconds IS NOT NULL;

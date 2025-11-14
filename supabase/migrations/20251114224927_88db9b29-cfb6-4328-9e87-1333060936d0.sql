-- Add priority column to flora_tasks table
CREATE TYPE task_priority AS ENUM ('high', 'medium', 'low');

ALTER TABLE flora_tasks
ADD COLUMN priority task_priority NOT NULL DEFAULT 'medium';
-- Add additional_contributions column to trips table
ALTER TABLE trips 
ADD COLUMN IF NOT EXISTS additional_contributions JSONB DEFAULT '[]'::jsonb;

-- Add comment to document the column
COMMENT ON COLUMN trips.additional_contributions IS 'Array of additional contribution rounds, each with id, amount, date, description, and contributions array';

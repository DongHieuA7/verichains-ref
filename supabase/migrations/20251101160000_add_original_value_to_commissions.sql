-- Add original_value column to commissions table
-- This will store the original value before calculating ref_percentage
ALTER TABLE public.commissions 
ADD COLUMN IF NOT EXISTS original_value numeric;

-- For existing records, set original_value = value (since we don't know the original)
UPDATE public.commissions SET original_value = value WHERE original_value IS NULL;

-- Make original_value NOT NULL with default for new records
ALTER TABLE public.commissions 
ALTER COLUMN original_value SET DEFAULT NULL;


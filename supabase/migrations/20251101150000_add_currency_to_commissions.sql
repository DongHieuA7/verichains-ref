-- Add currency column to commissions table
ALTER TABLE public.commissions 
ADD COLUMN IF NOT EXISTS currency text DEFAULT 'VND' CHECK (currency IN ('USD', 'VND'));

-- Update existing records to have USD as default
UPDATE public.commissions SET currency = 'VND' WHERE currency IS NULL;


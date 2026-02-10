-- Add missing columns to payment_transactions
ALTER TABLE public.payment_transactions 
ADD COLUMN IF NOT EXISTS payment_method TEXT,
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'BRL',
ADD COLUMN IF NOT EXISTS transaction_id TEXT;

-- Verify if external_id exists and copy to transaction_id if transaction_id is empty
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_transactions' AND column_name = 'external_id') THEN
        UPDATE public.payment_transactions 
        SET transaction_id = external_id 
        WHERE transaction_id IS NULL;
    END IF;
END $$;

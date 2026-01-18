-- Create tshirt_orders table for T-shirt purchases
CREATE TABLE IF NOT EXISTS public.tshirt_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  college TEXT,
  tshirt_size TEXT NOT NULL CHECK (tshirt_size IN ('XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL')),
  quantity INTEGER DEFAULT 1 CHECK (quantity >= 1 AND quantity <= 5),
  account_holder_name TEXT,
  payment_proof_url TEXT,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed')),
  proof_status TEXT DEFAULT 'pending' CHECK (proof_status IN ('pending', 'approved', 'rejected')),
  order_code TEXT UNIQUE,
  total_amount DECIMAL(10,2) DEFAULT 0,
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tshirt_orders ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can create tshirt orders"
  ON public.tshirt_orders FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view their own tshirt order"
  ON public.tshirt_orders FOR SELECT
  USING (
    (auth.uid() IN (SELECT user_id FROM public.profiles WHERE id = profile_id))
    OR
    (email = (auth.jwt() ->> 'email'))
  );

CREATE POLICY "Admins can view all tshirt orders"
  ON public.tshirt_orders FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update tshirt orders"
  ON public.tshirt_orders FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Create function to register tshirt order
CREATE OR REPLACE FUNCTION public.register_tshirt_order(
  p_full_name TEXT,
  p_email TEXT,
  p_phone TEXT,
  p_college TEXT,
  p_tshirt_size TEXT,
  p_quantity INTEGER DEFAULT 1,
  p_account_holder_name TEXT DEFAULT NULL,
  p_payment_proof_url TEXT DEFAULT NULL
)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_profile_id UUID;
  v_order_id UUID;
  v_price_per_shirt DECIMAL(10,2) := 200.00;
  v_total_amount DECIMAL(10,2);
BEGIN
  -- Calculate total amount
  v_total_amount := v_price_per_shirt * p_quantity;

  -- Check if email already has a pending order
  IF EXISTS (SELECT 1 FROM public.tshirt_orders WHERE email = p_email AND proof_status = 'pending') THEN
    RETURN json_build_object('success', false, 'message', 'You already have a pending T-shirt order. Please wait for approval or contact support.');
  END IF;

  -- Get profile ID if exists
  SELECT id INTO v_profile_id FROM public.profiles WHERE email = p_email;

  -- If profile doesn't exist, create one
  IF v_profile_id IS NULL THEN
    INSERT INTO public.profiles (full_name, email, phone, college)
    VALUES (p_full_name, p_email, p_phone, p_college)
    RETURNING id INTO v_profile_id;
  END IF;

  -- Insert into tshirt_orders
  INSERT INTO public.tshirt_orders (
    profile_id,
    full_name,
    email,
    phone,
    college,
    tshirt_size,
    quantity,
    account_holder_name,
    payment_proof_url,
    total_amount
  ) VALUES (
    v_profile_id,
    p_full_name,
    p_email,
    p_phone,
    p_college,
    p_tshirt_size,
    p_quantity,
    p_account_holder_name,
    p_payment_proof_url,
    v_total_amount
  ) RETURNING id INTO v_order_id;

  RETURN json_build_object(
    'success', true, 
    'message', 'T-shirt order submitted successfully',
    'order_id', v_order_id,
    'total_amount', v_total_amount
  );
END;
$$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tshirt_orders_email ON public.tshirt_orders(email);
CREATE INDEX IF NOT EXISTS idx_tshirt_orders_proof_status ON public.tshirt_orders(proof_status);
CREATE INDEX IF NOT EXISTS idx_tshirt_orders_created_at ON public.tshirt_orders(created_at DESC);

-- Add tshirt settings to settings table
INSERT INTO public.settings (key, value, category, description) 
VALUES 
  ('tshirt_price', '"200"', 'tshirt', 'Price per T-shirt in INR'),
  ('tshirt_upi_id', '""', 'tshirt', 'UPI ID for T-shirt payments'),
  ('tshirt_qr_code_url', '""', 'tshirt', 'QR code URL for T-shirt payments'),
  ('tshirt_orders_enabled', '"true"', 'tshirt', 'Enable/disable T-shirt orders')
ON CONFLICT (key) DO NOTHING;

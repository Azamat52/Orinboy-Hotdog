-- Supabase > SQL Editor ga to'liq nusxalab, Run bosing. Qayta ishga tushirish xavfsiz.
CREATE TABLE IF NOT EXISTS public.categories (id text PRIMARY KEY, data jsonb NOT NULL, sort int NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS public.products (id text PRIMARY KEY, data jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.promotions (id text PRIMARY KEY, data jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE SEQUENCE IF NOT EXISTS public.order_number_seq START 1001;
CREATE TABLE IF NOT EXISTS public.orders (id text PRIMARY KEY DEFAULT nextval('public.order_number_seq')::text, data jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.app_settings (key text PRIMARY KEY, value jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS public.admin_sessions (token text PRIMARY KEY, created_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.categories, public.products, public.promotions, public.orders, public.app_settings, public.admin_sessions TO service_role;
GRANT USAGE ON SEQUENCE public.order_number_seq TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_sessions ENABLE ROW LEVEL SECURITY;
NOTIFY pgrst, 'reload schema';

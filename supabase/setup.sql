-- =====================================================
-- SETUP DATABASE CHO TRIP PLANNER
-- =====================================================
-- Chạy script này trong Supabase SQL Editor
-- (Dashboard → SQL Editor → New Query → Paste & Run)

-- 1. Tạo bảng profiles (nếu chưa có)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'guest',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  CONSTRAINT valid_role CHECK (role IN ('admin', 'manager', 'guest'))
);

-- 2. Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Tạo policies cho profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Admin có thể xem tất cả profiles
CREATE POLICY "Admin can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 4. Tạo function để tự động tạo profile khi có user mới
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (
    NEW.id,
    NEW.email,
    'guest'  -- Mặc định là guest, admin phải set role thủ công
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Tạo trigger để gọi function trên
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Drop trigger cũ nếu có (trên tất cả các bảng)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT trigger_name, event_object_table 
            FROM information_schema.triggers 
            WHERE trigger_name = 'set_updated_at' 
            AND trigger_schema = 'public')
  LOOP
    EXECUTE 'DROP TRIGGER IF EXISTS ' || r.trigger_name || ' ON public.' || r.event_object_table;
  END LOOP;
END $$;

-- 7. Tạo function để update updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Tạo trigger cho updated_at chỉ trên bảng profiles
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- TẠO USER ADMIN ĐẦU TIÊN (Tùy chọn)
-- =====================================================
-- Uncomment và sửa email/password nếu muốn tạo admin ngay
/*
DO $$
DECLARE
  new_user_id UUID;
BEGIN
  -- Tạo user trong auth.users (cần có quyền service_role)
  -- Thay 'admin@example.com' và 'your-password' bằng thông tin của bạn
  new_user_id := extensions.uuid_generate_v4();
  
  -- Insert vào profiles với role admin
  INSERT INTO public.profiles (id, email, role)
  VALUES (
    new_user_id,
    'admin@example.com',
    'admin'
  );
  
  RAISE NOTICE 'Admin profile created with ID: %', new_user_id;
  RAISE NOTICE 'Bạn cần tạo user trong Authentication với cùng ID này';
END $$;
*/

-- =====================================================
-- CÁCH SET USER HIỆN TẠI THÀNH ADMIN
-- =====================================================
-- Sau khi tạo user qua Dashboard, chạy query này (thay email):
-- UPDATE public.profiles SET role = 'admin' WHERE email = 'admin@example.com';

-- =====================================================
-- KIỂM TRA
-- =====================================================
-- Xem tất cả profiles:
-- SELECT * FROM public.profiles;

-- Xem trigger đã được tạo chưa:
-- SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';

-- =====================================================
-- SỬA LỖI INFINITE RECURSION - TẮT RLS TẠM THỜI
-- =====================================================
-- Chạy script này trong Supabase SQL Editor

-- 1. Tắt RLS cho tất cả bảng liên quan (để test)
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips DISABLE ROW LEVEL SECURITY;

-- Nếu có bảng trip_participants, tắt luôn
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables 
               WHERE table_schema = 'public' 
               AND table_name = 'trip_participants') THEN
        EXECUTE 'ALTER TABLE public.trip_participants DISABLE ROW LEVEL SECURITY';
    END IF;
END $$;

-- 2. Xóa tất cả policies cũ
DROP POLICY IF EXISTS "Admin can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view trips" ON public.trips;
DROP POLICY IF EXISTS "Admin and Manager can create trips" ON public.trips;
DROP POLICY IF EXISTS "Users can update trips" ON public.trips;
DROP POLICY IF EXISTS "Admin can delete trips" ON public.trips;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.trips;

-- 3. Bật lại RLS với policies ĐƠN GIẢN (không có subquery)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

-- 4. Tạo policies đơn giản cho PROFILES (cho phép tất cả authenticated users)
CREATE POLICY "Allow all for authenticated users"
  ON public.profiles
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 5. Tạo policies đơn giản cho TRIPS (cho phép tất cả authenticated users)
CREATE POLICY "Allow all for authenticated users"
  ON public.trips
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- KIỂM TRA
-- =====================================================
-- Xem trạng thái RLS
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'trips', 'trip_participants');

-- Xem policies
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

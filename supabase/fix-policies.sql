-- =====================================================
-- SỬA LỖI RLS POLICIES - CHO PHÉP TẠO PLANNER VÀ TRIP
-- =====================================================
-- Chạy script này trong Supabase SQL Editor

-- 1. Sửa policies cho bảng profiles
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for users based on id" ON public.profiles;

-- Policy cho phép admin xem tất cả profiles
CREATE POLICY "Admin can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin')
    OR auth.uid() = id
  );

-- Policy cho phép user update profile của chính họ
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Policy cho phép admin insert profiles (để tạo planner)
CREATE POLICY "Admin can insert profiles"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin')
  );

-- 2. Tạo bảng trips nếu chưa có (hoặc sửa tên cột nếu đã có)
CREATE TABLE IF NOT EXISTS public.trips (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  destination TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  cover_image_url TEXT,
  manager_id UUID REFERENCES public.profiles(id),
  timeline JSONB DEFAULT '[]'::jsonb,
  expenses JSONB DEFAULT '[]'::jsonb,
  packing_list JSONB DEFAULT '[]'::jsonb,
  participants JSONB DEFAULT '[]'::jsonb,
  contributions JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 3. Enable RLS cho trips
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

-- 4. Xóa tất cả policies cũ của trips
DROP POLICY IF EXISTS "Admin can view all trips" ON public.trips;
DROP POLICY IF EXISTS "Manager can view their trips" ON public.trips;
DROP POLICY IF EXISTS "Admin can insert trips" ON public.trips;
DROP POLICY IF EXISTS "Manager can insert trips" ON public.trips;
DROP POLICY IF EXISTS "Admin can update trips" ON public.trips;
DROP POLICY IF EXISTS "Manager can update their trips" ON public.trips;
DROP POLICY IF EXISTS "Admin can delete trips" ON public.trips;

-- 5. Tạo policies mới cho trips

-- SELECT: Admin xem tất cả, Manager chỉ xem của mình
CREATE POLICY "Users can view trips"
  ON public.trips FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin')
    OR manager_id = auth.uid()
  );

-- INSERT: Admin và Manager đều có thể tạo trip
CREATE POLICY "Admin and Manager can create trips"
  ON public.trips FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM public.profiles 
      WHERE role IN ('admin', 'manager')
    )
  );

-- UPDATE: Admin update tất cả, Manager chỉ update của mình
CREATE POLICY "Users can update trips"
  ON public.trips FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin')
    OR manager_id = auth.uid()
  );

-- DELETE: Admin có thể xóa tất cả
CREATE POLICY "Admin can delete trips"
  ON public.trips FOR DELETE
  TO authenticated
  USING (
    auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin')
  );

-- =====================================================
-- KIỂM TRA
-- =====================================================
-- Xem tất cả policies:
-- SELECT schemaname, tablename, policyname FROM pg_policies WHERE tablename IN ('profiles', 'trips');

-- Test tạo trip (thay USER_ID bằng ID của bạn):
/*
INSERT INTO public.trips (name, destination, start_date, end_date, cover_image_url, manager_id)
VALUES ('Test Trip', 'Hanoi', '2025-01-01', '2025-01-05', 'https://example.com/image.jpg', 'YOUR_USER_ID');
*/

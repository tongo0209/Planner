-- =====================================================
-- THÊM CÁC CỘT CÒN THIẾU CHO BẢNG TRIPS
-- =====================================================

-- Thêm các cột JSONB nếu chưa có
ALTER TABLE public.trips 
ADD COLUMN IF NOT EXISTS contributions JSONB DEFAULT '[]'::jsonb;

ALTER TABLE public.trips 
ADD COLUMN IF NOT EXISTS timeline JSONB DEFAULT '[]'::jsonb;

ALTER TABLE public.trips 
ADD COLUMN IF NOT EXISTS expenses JSONB DEFAULT '[]'::jsonb;

ALTER TABLE public.trips 
ADD COLUMN IF NOT EXISTS packing_list JSONB DEFAULT '[]'::jsonb;

ALTER TABLE public.trips 
ADD COLUMN IF NOT EXISTS participants JSONB DEFAULT '[]'::jsonb;

-- Kiểm tra cấu trúc bảng
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'trips' AND table_schema = 'public'
ORDER BY ordinal_position;

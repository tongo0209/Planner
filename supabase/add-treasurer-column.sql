-- Thêm column treasurer_id vào bảng trips
ALTER TABLE public.trips 
ADD COLUMN IF NOT EXISTS treasurer_id TEXT;

-- Thêm comment để giải thích
COMMENT ON COLUMN public.trips.treasurer_id IS 'Tên/ID của người quản lý quỹ chung';

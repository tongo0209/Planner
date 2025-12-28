-- Thêm cột custom_id để tạo ID ngắn gọn, dễ chia sẻ
-- Thay vì dùng UUID dài, dùng custom_id dạng "paris-abc123"

ALTER TABLE trips ADD COLUMN IF NOT EXISTS custom_id TEXT UNIQUE;

-- Tạo index cho tìm kiếm nhanh
CREATE INDEX IF NOT EXISTS idx_trips_custom_id ON trips(custom_id);

-- Cập nhật RLS policy để cho phép query theo custom_id
DROP POLICY IF EXISTS "Cho phép đọc công khai cho trips" ON trips;
CREATE POLICY "Cho phép đọc công khai cho trips"
    ON trips FOR SELECT
    USING (true);

-- Comment
COMMENT ON COLUMN trips.custom_id IS 'ID tùy chỉnh ngắn gọn để chia sẻ với user (VD: paris-abc123)';

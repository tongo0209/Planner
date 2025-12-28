-- Tạo bảng lưu lịch sử truy cập chuyến đi
CREATE TABLE IF NOT EXISTS trip_access_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  custom_id TEXT NOT NULL,
  trip_name TEXT,
  trip_destination TEXT,
  accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Relationships
  FOREIGN KEY (custom_id) REFERENCES trips(custom_id) ON DELETE CASCADE,
  
  -- Constraint: mỗi custom_id được truy cập một lần duy nhất (update nếu truy cập lại)
  CONSTRAINT unique_recent_access UNIQUE(custom_id)
);

-- Tạo index cho tìm kiếm nhanh
CREATE INDEX IF NOT EXISTS idx_trip_access_history_accessed_at ON trip_access_history(accessed_at DESC);

-- Tạo RLS policy cho phép read công khai
ALTER TABLE trip_access_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access" ON trip_access_history;
CREATE POLICY "Allow public read access"
  ON trip_access_history FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow insert access history" ON trip_access_history;
CREATE POLICY "Allow insert access history"
  ON trip_access_history FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update access history" ON trip_access_history;
CREATE POLICY "Allow update access history"
  ON trip_access_history FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Comment
COMMENT ON TABLE trip_access_history IS 'Lưu lịch sử truy cập các chuyến đi (custom_id) để hiển thị danh sách gần đây';

-- Script để tạo custom_id cho các chuyến đi hiện có

-- Hàm tạo custom_id từ destination
CREATE OR REPLACE FUNCTION generate_custom_id(dest TEXT) 
RETURNS TEXT AS $$
DECLARE
  slug TEXT;
  random_suffix TEXT;
  new_id TEXT;
  counter INT := 0;
BEGIN
  -- Tạo slug từ destination
  slug := lower(dest);
  slug := regexp_replace(slug, '[áàảãạăắằẳẵặâấầẩẫậ]', 'a', 'g');
  slug := regexp_replace(slug, '[éèẻẽẹêếềểễệ]', 'e', 'g');
  slug := regexp_replace(slug, '[íìỉĩị]', 'i', 'g');
  slug := regexp_replace(slug, '[óòỏõọôốồổỗộơớờởỡợ]', 'o', 'g');
  slug := regexp_replace(slug, '[úùủũụưứừửữự]', 'u', 'g');
  slug := regexp_replace(slug, '[ýỳỷỹỵ]', 'y', 'g');
  slug := regexp_replace(slug, '[đ]', 'd', 'g');
  slug := regexp_replace(slug, '\s+', '-', 'g');
  slug := regexp_replace(slug, '[^a-z0-9-]', '', 'g');
  slug := substring(slug, 1, 20);
  
  -- Tạo random suffix và kiểm tra unique
  LOOP
    random_suffix := substring(md5(random()::text || clock_timestamp()::text), 1, 6);
    new_id := slug || '-' || random_suffix;
    
    -- Kiểm tra xem ID đã tồn tại chưa
    IF NOT EXISTS (SELECT 1 FROM trips WHERE custom_id = new_id) THEN
      RETURN new_id;
    END IF;
    
    counter := counter + 1;
    IF counter > 100 THEN
      -- Nếu thử quá 100 lần vẫn trùng, thêm timestamp
      new_id := slug || '-' || extract(epoch from now())::bigint::text;
      RETURN new_id;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Cập nhật custom_id cho tất cả trips chưa có custom_id
DO $$
DECLARE
  trip_record RECORD;
BEGIN
  FOR trip_record IN 
    SELECT id, destination 
    FROM trips 
    WHERE custom_id IS NULL
  LOOP
    UPDATE trips 
    SET custom_id = generate_custom_id(trip_record.destination)
    WHERE id = trip_record.id;
    
    RAISE NOTICE 'Updated trip % with destination "%"', trip_record.id, trip_record.destination;
  END LOOP;
END $$;

-- Xóa function sau khi dùng xong (optional)
-- DROP FUNCTION IF EXISTS generate_custom_id(TEXT);

-- Kiểm tra kết quả
SELECT id, name, destination, custom_id FROM trips ORDER BY created_at DESC LIMIT 10;

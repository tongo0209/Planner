import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("******************************************************************************************************");
  console.warn("*** CẢNH BÁO: Biến môi trường VITE_SUPABASE_URL hoặc VITE_SUPABASE_ANON_KEY chưa được đặt.             ***");
  console.warn("*** Vui lòng kiểm tra file .env của bạn.                                                          ***");
  console.warn("******************************************************************************************************");
}

/**
 * Khởi tạo và xuất client Supabase.
 * Ứng dụng sẽ sử dụng client này để tương tác với dịch vụ Supabase của bạn.
 */
export const supabase = createClient(supabaseUrl!, supabaseAnonKey!);
import { createClient } from '@supabase/supabase-js';

// Thay thế bằng thông tin Supabase của bạn
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_SERVICE_ROLE_KEY = 'YOUR_SERVICE_ROLE_KEY'; // Cần service role key, không phải anon key

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createAdminUser(email: string, password: string) {
  try {
    // Tạo user mới
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true
    });

    if (authError) {
      console.error('Lỗi khi tạo user:', authError);
      return;
    }

    console.log('✅ User đã được tạo:', authData.user.email);

    // Set role là admin trong bảng profiles
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: authData.user.id,
        email: authData.user.email,
        role: 'admin'
      });

    if (profileError) {
      console.error('Lỗi khi set role admin:', profileError);
      return;
    }

    console.log('✅ Role admin đã được set thành công!');
    console.log(`\nBạn có thể đăng nhập với:`);
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
  } catch (error) {
    console.error('Lỗi:', error);
  }
}

// Thay đổi email và password tại đây
const ADMIN_EMAIL = 'tont@tripsync.com';
const ADMIN_PASSWORD = 'Tongo0209';

createAdminUser(ADMIN_EMAIL, ADMIN_PASSWORD);

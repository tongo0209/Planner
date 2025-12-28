import React, { useState, useEffect } from 'react';
import { AuthUser, Trip, UserRole, TripCreationData, TripUpdateData } from './types';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import TripView from './components/TripView';
import { supabase } from './services/supabaseClient';
import { Spinner } from './components/ui';

type AppView = 'login' | 'dashboard' | 'trip';

// Hàm tạo custom_id ngắn gọn dễ chia sẻ (VD: "paris-a3x7k2")
const generateCustomId = (destination: string): string => {
  const slug = destination
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Loại bỏ dấu tiếng Việt
    .replace(/\s+/g, '-') // Thay khoảng trắng bằng dấu gạch ngang
    .replace(/[^a-z0-9-]/g, '') // Loại bỏ ký tự đặc biệt
    .substring(0, 20); // Giới hạn độ dài
  
  const randomId = Math.random().toString(36).substring(2, 8); // 6 ký tự ngẫu nhiên
  return `${slug}-${randomId}`;
};

// Hàm trợ giúp để lấy thông tin hồ sơ người dùng (đặc biệt là vai trò) từ bảng 'profiles'
const getUserProfile = async (userId: string) => {
    const { data, error } = await supabase.from('profiles').select('role').eq('id', userId).single();
    if (error) {
        console.error('Lỗi khi tìm nạp hồ sơ người dùng:', error);
        return null;
    }
    return data;
};

const App: React.FC = () => {
  const [view, setView] = useState<AppView>('login');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [users, setUsers] = useState<AuthUser[]>([]); // Sẽ chứa danh sách planners cho admin
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Kiểm tra phiên làm việc đang hoạt động khi component được gắn kết
  useEffect(() => {
    const checkSession = async () => {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            const profile = await getUserProfile(session.user.id);
            if (profile) {
                const currentUser: AuthUser = {
                    id: session.user.id,
                    email: session.user.email!,
                    role: profile.role as UserRole,
                };
                setUser(currentUser);
                await loadDataForUser(currentUser);
                setView('dashboard');
            } else {
                // Hồ sơ không tồn tại, người dùng không thể được xác định vai trò -> đăng xuất
                await supabase.auth.signOut();
            }
        }
        setLoading(false);
    };
    checkSession();
  }, []);

  // Helper function để tạo timeline skeleton nếu chưa có
  const ensureTimelineExists = (trip: any): any => {
    if (!trip.timeline || trip.timeline.length === 0) {
      const startDate = new Date(trip.start_date || trip.startDate);
      const endDate = new Date(trip.end_date || trip.endDate);
      const dayCount = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      
      return {
        ...trip,
        timeline: Array.from({ length: dayCount }, (_, i) => ({
          id: `day-placeholder-${i + 1}`,
          day: i + 1,
          dayTitle: `Ngày ${i + 1}`,
          time: '09:00',
          activity: 'Chưa có hoạt động',
          description: 'Nhấn "Gợi ý từ AI" hoặc thêm hoạt động thủ công',
          location: ''
        }))
      };
    }
    return trip;
  };

  // Hàm kiểm tra và tạo custom_id cho trips chưa có
  const ensureCustomId = async (trip: any): Promise<any> => {
    if (!trip.custom_id) {
      const customId = generateCustomId(trip.destination);
      
      // Cập nhật vào database
      const { error } = await supabase
        .from('trips')
        .update({ custom_id: customId })
        .eq('id', trip.id);
      
      if (error) {
        console.error('Lỗi khi cập nhật custom_id:', error);
        return trip;
      }
      
      return { ...trip, custom_id: customId };
    }
    return trip;
  };

  // Tải dữ liệu (chuyến đi, planners) dựa trên vai trò của người dùng
  const loadDataForUser = async (currentUser: AuthUser) => {
      if (currentUser.role === UserRole.ADMIN) {
          const { data: tripsData, error: tripsError } = await supabase.from('trips').select('*');
          if (tripsError) setError(tripsError.message);
          else {
              // Đảm bảo mọi trip đều có custom_id
              const tripsWithCustomIds = await Promise.all(
                (tripsData || []).map(async (trip: any) => await ensureCustomId(trip))
              );
              
              // Convert snake_case to camelCase và đảm bảo timeline tồn tại
              const formattedTrips = tripsWithCustomIds.map((trip: any) => {
                const tripWithTimeline = ensureTimelineExists(trip);
                return {
                  ...tripWithTimeline,
                  customId: tripWithTimeline.custom_id,
                  startDate: tripWithTimeline.start_date,
                  endDate: tripWithTimeline.end_date,
                  coverImageUrl: tripWithTimeline.cover_image_url,
                  managerId: tripWithTimeline.manager_id,
                  packingList: tripWithTimeline.packing_list,
                  additionalContributions: tripWithTimeline.additional_contributions,
                };
              });
              setTrips(formattedTrips);
          }

          // Admin cũng cần danh sách các planners
          const { data: plannersData, error: plannersError } = await supabase
              .from('profiles')
              .select('id, email, role')
              .eq('role', UserRole.MANAGER);
          if (plannersError) setError(plannersError.message);
          else setUsers(plannersData as AuthUser[] || []);

      } else if (currentUser.role === UserRole.MANAGER) {
          const { data: tripsData, error: tripsError } = await supabase.from('trips').select('*').eq('manager_id', currentUser.id);
          if (tripsError) setError(tripsError.message);
          else {
              // Đảm bảo mọi trip đều có custom_id
              const tripsWithCustomIds = await Promise.all(
                (tripsData || []).map(async (trip: any) => await ensureCustomId(trip))
              );
              
              // Convert snake_case to camelCase và đảm bảo timeline tồn tại
              const formattedTrips = tripsWithCustomIds.map((trip: any) => {
                const tripWithTimeline = ensureTimelineExists(trip);
                return {
                  ...tripWithTimeline,
                  customId: tripWithTimeline.custom_id,
                  startDate: tripWithTimeline.start_date,
                  endDate: tripWithTimeline.end_date,
                  coverImageUrl: tripWithTimeline.cover_image_url,
                  managerId: tripWithTimeline.manager_id,
                  packingList: tripWithTimeline.packing_list,
                  additionalContributions: tripWithTimeline.additional_contributions,
                };
              });
              setTrips(formattedTrips);
          }
      }
  };


  const handleLogin = async (email: string, pass: string) => {
    setError(null);
    setLoading(true);
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (signInError || !data.user) {
      setError(signInError?.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.');
      setLoading(false);
      return;
    }
    
    const profile = await getUserProfile(data.user.id);
    if (!profile) {
        setError('Không tìm thấy hồ sơ người dùng. Vui lòng liên hệ quản trị viên để được cấp vai trò.');
        await supabase.auth.signOut();
        setLoading(false);
        return;
    }

    const authUser: AuthUser = {
      id: data.user.id,
      email: data.user.email!,
      role: profile.role as UserRole,
    };
    setUser(authUser);
    await loadDataForUser(authUser);
    setView('dashboard');
    setLoading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setView('login');
  };

  const handleJoinTrip = async (tripId: string) => {
    setError(null);
    setLoading(true);
    
    // Thử tìm theo custom_id trước (dễ nhớ hơn)
    const { data: trip, error: fetchError } = await supabase
      .from('trips')
      .select('*')
      .eq('custom_id', tripId)
      .maybeSingle();
    
    if (fetchError || !trip) {
      // Fallback: thử tìm theo UUID nếu người dùng nhập UUID
      const { data: tripByUuid, error: fetchByUuidError } = await supabase
        .from('trips')
        .select('*')
        .eq('id', tripId)
        .maybeSingle();
      
      if (fetchByUuidError || !tripByUuid) {
        setError('Không tìm thấy ID chuyến đi. Vui lòng kiểm tra lại.');
        setLoading(false);
        return;
      }
      
      const tripWithTimeline = ensureTimelineExists(tripByUuid);
      const formattedTrip = {
        ...tripWithTimeline,
        customId: tripWithTimeline.custom_id,
        startDate: tripWithTimeline.start_date,
        endDate: tripWithTimeline.end_date,
        coverImageUrl: tripWithTimeline.cover_image_url,
        managerId: tripWithTimeline.manager_id,
        packingList: tripWithTimeline.packing_list,
        additionalContributions: tripWithTimeline.additional_contributions,
      };
      setSelectedTrip(formattedTrip);
      setView('trip');
    } else {
      const tripWithTimeline = ensureTimelineExists(trip);
      const formattedTrip = {
        ...tripWithTimeline,
        customId: tripWithTimeline.custom_id,
        startDate: tripWithTimeline.start_date,
        endDate: tripWithTimeline.end_date,
        coverImageUrl: tripWithTimeline.cover_image_url,
        managerId: tripWithTimeline.manager_id,
        packingList: tripWithTimeline.packing_list,
        additionalContributions: tripWithTimeline.additional_contributions,
      };
      setSelectedTrip(formattedTrip);
      setView('trip');
    }
    setLoading(false);
  };
  
  const handleSelectTrip = (tripId: string) => {
      const trip = trips.find(t => t.id === tripId);
      if(trip) {
        const tripWithTimeline = ensureTimelineExists(trip);
        setSelectedTrip(tripWithTimeline);
        setView('trip');
      }
  }

  const handleCreateTrip = async (tripData: TripCreationData): Promise<boolean> => {
      const newContributions = tripData.participants.map((p, index) => ({
        id: `c-${Date.now()}-${index}`,
        participant: p,
        amount: tripData.contributionAmount,
        paid: false,
      }));
      
      // Tự động tạo timeline skeleton theo số ngày
      const startDate = new Date(tripData.startDate);
      const endDate = new Date(tripData.endDate);
      const dayCount = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const initialTimeline = Array.from({ length: dayCount }, (_, i) => ({
        id: `day-placeholder-${i + 1}`,
        day: i + 1,
        dayTitle: `Ngày ${i + 1}`,
        time: '09:00',
        activity: 'Chưa có hoạt động',
        description: 'Nhấn "Gợi ý từ AI" hoặc thêm hoạt động thủ công',
        location: ''
      }));

      // Map camelCase to snake_case for database
      const customId = generateCustomId(tripData.destination);
      const newTrip = {
        custom_id: customId,
        name: tripData.name,
        destination: tripData.destination,
        start_date: tripData.startDate,
        end_date: tripData.endDate,
        cover_image_url: tripData.coverImageUrl,
        manager_id: tripData.managerId,
        timeline: initialTimeline,
        expenses: [],
        packing_list: [],
        participants: tripData.participants,
        contributions: newContributions,
      };
      
      const { data, error } = await supabase.from('trips').insert(newTrip).select().single();

      if (error) {
          setError(error.message);
          alert(`Lỗi tạo chuyến đi: ${error.message}`);
          return false;
      } else if (data) {
          // Convert snake_case back to camelCase for frontend
          const formattedTrip = {
            ...data,
            customId: data.custom_id,
            startDate: data.start_date,
            endDate: data.end_date,
            coverImageUrl: data.cover_image_url,
            managerId: data.manager_id,
            packingList: data.packing_list,
          };
          setTrips([...trips, formattedTrip]);
          alert('Chuyến đi đã được tạo thành công!');
          return true;
      }
      return false;
  }

  const handleUpdateTripDetails = async (tripId: string, updatedData: TripUpdateData): Promise<boolean> => {
    // Map camelCase to snake_case
    const dbData: any = {};
    if (updatedData.name) dbData.name = updatedData.name;
    if (updatedData.destination) dbData.destination = updatedData.destination;
    if (updatedData.startDate) dbData.start_date = updatedData.startDate;
    if (updatedData.endDate) dbData.end_date = updatedData.endDate;
    if (updatedData.coverImageUrl) dbData.cover_image_url = updatedData.coverImageUrl;
    if (updatedData.managerId !== undefined) dbData.manager_id = updatedData.managerId;
    
    const { data, error } = await supabase.from('trips').update(dbData).eq('id', tripId).select().single();
    if(error) {
        setError(error.message);
        alert(`Lỗi cập nhật chuyến đi: ${error.message}`);
        return false;
    } else if (data) {
        const formattedTrip = {
          ...data,
          customId: data.custom_id,
          startDate: data.start_date,
          endDate: data.end_date,
          coverImageUrl: data.cover_image_url,
          managerId: data.manager_id,
          packingList: data.packing_list,
        };
        setTrips(prevTrips => 
          prevTrips.map(trip => 
            trip.id === tripId ? formattedTrip : trip
          )
        );
        alert('Chuyến đi đã được cập nhật!');
        return true;
    }
    return false;
  };

  const handleCloneTrip = async (tripId: string) => {
    const originalTrip = trips.find(t => t.id === tripId);
    if (!originalTrip) return;
    
    const { id, ...tripToClone } = originalTrip;

    const customId = generateCustomId(originalTrip.destination);
    const clonedTripData = {
      ...tripToClone,
      custom_id: customId,
      name: `Bản sao của ${originalTrip.name}`,
      participants: [],
      contributions: [],
      expenses: [],
    };
    
    const { data, error } = await supabase.from('trips').insert(clonedTripData).select().single();

    if (error) {
        setError(error.message);
    } else if(data) {
        setTrips(prevTrips => [...prevTrips, data]);
        alert(`Chuyến đi '${originalTrip.name}' đã được nhân bản!`);
    }
  };

  const handleAddPlanner = async (email: string, password: string) => {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
          alert(`Lỗi tạo planner: ${error.message}`);
      } else if (data.user) {
          // Tự động set role là manager
          const { error: updateError } = await supabase
              .from('profiles')
              .update({ role: UserRole.MANAGER })
              .eq('id', data.user.id);
          
          if (updateError) {
              alert(`Planner đã được tạo nhưng lỗi khi set role: ${updateError.message}. Vui lòng set role 'manager' thủ công.`);
          } else {
              alert(`Planner ${email} đã được tạo thành công với role Manager!`);
              // Reload danh sách planners
              await loadDataForUser(user!);
          }
      }
  };

  const handleDeletePlanner = (userId: string) => {
      alert("Xóa người dùng vĩnh viễn là một hành động nhạy cảm và yêu cầu quyền quản trị viên phía máy chủ (server-side). Chức năng này chỉ mô phỏng việc xóa khỏi giao diện.");
      
      setTrips(prevTrips => 
          prevTrips.map(trip => 
              trip.managerId === userId ? { ...trip, managerId: '' } : trip
          )
      );
      setUsers(users.filter(u => u.id !== userId));
  };
  
  const handleResetPlannerPassword = async (userEmail: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(userEmail, {
        redirectTo: window.location.origin,
    });

    if (error) {
        alert(`Lỗi: ${error.message}`);
    } else {
        alert(`Đã gửi email đặt lại mật khẩu tới ${userEmail}.`);
    }
  };


  const handleUpdateTrip = async (updatedTrip: Trip) => {
    const { id, ...tripData } = updatedTrip;
    
    // Chỉ map sang snake_case, loại bỏ camelCase fields
    const dbData: any = {
      name: tripData.name,
      destination: tripData.destination,
      start_date: tripData.startDate,
      end_date: tripData.endDate,
      cover_image_url: tripData.coverImageUrl,
      manager_id: tripData.managerId,
      timeline: tripData.timeline,
      expenses: tripData.expenses,
      packing_list: tripData.packingList,
      participants: tripData.participants,
      contributions: tripData.contributions,
      additional_contributions: tripData.additionalContributions || [],
    };
    
    const { data, error } = await supabase.from('trips').update(dbData).eq('id', id).select().single();
    if (error) {
        setError(error.message);
        alert(`Lỗi lưu thay đổi: ${error.message}`);
    } else if (data) {
        const formattedTrip = {
          ...data,
          startDate: data.start_date,
          endDate: data.end_date,
          coverImageUrl: data.cover_image_url,
          managerId: data.manager_id,
          packingList: data.packing_list,
          additionalContributions: data.additional_contributions,
        };
        setTrips(prevTrips => prevTrips.map(trip => trip.id === data.id ? formattedTrip : trip));
        setSelectedTrip(formattedTrip);
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center text-white gap-4">
            <Spinner />
            <p>Đang tải dữ liệu...</p>
        </div>
      );
    }

    switch (view) {
      case 'login':
        return <Login onLogin={handleLogin} onJoinTrip={handleJoinTrip} error={error} />;
      case 'dashboard':
        if (!user) {
          setView('login');
          return null;
        }
        return <Dashboard 
            user={user} 
            trips={trips} 
            planners={users.filter(u => u.role === UserRole.MANAGER)}
            onSelectTrip={handleSelectTrip} 
            onSignOut={handleSignOut} 
            onCreateTrip={handleCreateTrip}
            onUpdateTripDetails={handleUpdateTripDetails}
            onCloneTrip={handleCloneTrip}
            onAddPlanner={handleAddPlanner}
            onDeletePlanner={handleDeletePlanner}
            onResetPlannerPassword={handleResetPlannerPassword}
        />;
      case 'trip':
        if (!selectedTrip) {
          setView(user ? 'dashboard' : 'login');
          return null;
        }
        return <TripView trip={selectedTrip} user={user} onBack={() => setView(user ? 'dashboard' : 'login')} onUpdateTrip={handleUpdateTrip} />;
      default:
        return <Login onLogin={handleLogin} onJoinTrip={handleJoinTrip} error={error} />;
    }
  };

  return (
    <div className="bg-gray-900">
      {renderContent()}
    </div>
  );
};

export default App;

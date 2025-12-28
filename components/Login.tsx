import React, { useState, useEffect } from 'react';
import { Input, Button } from './ui';

interface LoginProps {
  onLogin: (email: string, pass: string) => Promise<void>;
  onJoinTrip: (tripId: string) => void;
  error: string | null;
}

interface RecentTrip {
  customId: string;
  tripName: string;
  tripDestination: string;
  accessedAt: number;
}

type ActiveTab = 'login' | 'join';

const Login: React.FC<LoginProps> = ({ onLogin, onJoinTrip, error }) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tripId, setTripId] = useState('');
  const [recentTrips, setRecentTrips] = useState<RecentTrip[]>([]);

  useEffect(() => {
    // Tải danh sách chuyến đi gần đây khi component mount
    const stored = localStorage.getItem('recentTrips');
    if (stored) {
      const trips = JSON.parse(stored);
      const twoDaysAgo = new Date().getTime() - 2 * 24 * 60 * 60 * 1000;
      const filteredTrips = trips.filter((t: RecentTrip) => t.accessedAt > twoDaysAgo);
      setRecentTrips(filteredTrips);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(email, password);
  };
  
  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    onJoinTrip(tripId);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 p-4" style={{ background: `radial-gradient(circle, rgba(31,41,55,1) 0%, rgba(17,24,39,1) 100%)`}}>
      <div className="text-center mb-10">
        <h1 className="text-5xl font-extrabold text-white tracking-tight">TripSync AI</h1>
        <p className="text-indigo-300 mt-2 text-lg">Người bạn đồng hành thông minh của bạn.</p>
      </div>

      <div className="w-full max-w-md bg-gray-800/50 backdrop-blur-lg border border-gray-700 rounded-2xl shadow-2xl p-8">
        <div className="flex border-b border-gray-700 mb-6">
          <button 
            onClick={() => setActiveTab('login')} 
            className={`flex-1 py-3 font-semibold text-sm transition ${activeTab === 'login' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-gray-400 hover:text-white'}`}
          >
            Đăng nhập Admin / Planner
          </button>
          <button 
            onClick={() => setActiveTab('join')} 
            className={`flex-1 py-3 font-semibold text-sm transition ${activeTab === 'join' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-gray-400 hover:text-white'}`}
          >
            Tham gia chuyến đi
          </button>
        </div>

        {activeTab === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-6 animate-fade-in">
            <Input label="Email" id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@tripsync.com" autoComplete="email" />
            <Input label="Mật khẩu" id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" />
            <Button type="submit" className="w-full">Đăng nhập</Button>
            <p className="text-xs text-gray-400 text-center">Dùng `admin@tripsync.com` / `admin123` hoặc `manager@tripsync.com` / `manager123`</p>
          </form>
        ) : (
          <form onSubmit={handleJoin} className="space-y-6 animate-fade-in">
            <Input label="ID Chuyến đi" id="tripId" type="text" value={tripId} onChange={e => setTripId(e.target.value)} placeholder="Nhập ID chuyến đi (VD: paris-a3x7k2)" />
            <Button type="submit" className="w-full">Xem chuyến đi</Button>
             <p className="text-xs text-gray-400 text-center">Admin/Planner sẽ cung cấp ID ngắn gọn để bạn tham gia.</p>
            
            {/* Danh sách chuyến đi gần đây */}
            {recentTrips.length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-700">
                <p className="text-xs font-semibold text-gray-400 mb-3">⏱️ Chuyến đi gần đây (2 ngày)</p>
                <div className="space-y-2">
                  {recentTrips.map((trip, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setTripId(trip.customId);
                        onJoinTrip(trip.customId);
                      }}
                      className="w-full text-left px-3 py-2 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition text-sm"
                    >
                      <p className="text-white font-medium truncate">{trip.tripName}</p>
                      <p className="text-gray-400 text-xs">{trip.tripDestination}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </form>
        )}
        {error && <p className="mt-4 text-center text-red-400 text-sm">{error}</p>}
      </div>
    </div>
  );
};

export default Login;
import React, { useState } from 'react';
import { Input, Button } from './ui';

interface LoginProps {
  onLogin: (email: string, pass: string) => Promise<void>;
  onJoinTrip: (tripId: string) => void;
  error: string | null;
}

type ActiveTab = 'login' | 'join';

const Login: React.FC<LoginProps> = ({ onLogin, onJoinTrip, error }) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tripId, setTripId] = useState('');

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
          </form>
        )}
        {error && <p className="mt-4 text-center text-red-400 text-sm">{error}</p>}
      </div>
    </div>
  );
};

export default Login;
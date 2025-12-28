import React, { useState, useEffect } from 'react';
import { Trip, AuthUser, UserRole, TripCreationData, TripUpdateData } from '../types';
import { Card, Button, Modal, Input } from './ui';
import { PlusIcon, EllipsisVerticalIcon, PencilIcon, DocumentDuplicateIcon } from './icons';

interface DashboardProps {
  user: AuthUser;
  trips: Trip[];
  planners: AuthUser[];
  onSelectTrip: (tripId: string) => void;
  onSignOut: () => void;
  onCreateTrip: (tripData: TripCreationData) => Promise<boolean>;
  onUpdateTripDetails: (tripId: string, tripData: TripUpdateData) => Promise<boolean>;
  onCloneTrip: (tripId: string) => void;
  onAddPlanner: (email: string, password: string) => void;
  onDeletePlanner: (userId: string) => void;
  onResetPlannerPassword: (email: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ 
  user, trips, planners, onSelectTrip, onSignOut, onCreateTrip, onUpdateTripDetails, onCloneTrip,
  onAddPlanner, onDeletePlanner, onResetPlannerPassword 
}) => {
  const [isTripFormModalOpen, setIsTripFormModalOpen] = useState(false);
  const [isPlannerModalOpen, setIsPlannerModalOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  
  // State for trip form (create/edit)
  const [name, setName] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [participants, setParticipants] = useState('');
  const [contributionAmount, setContributionAmount] = useState('');
  const [assignedManagerId, setAssignedManagerId] = useState('');
  
  // State for planner management
  const [newPlannerEmail, setNewPlannerEmail] = useState('');
  const [newPlannerPassword, setNewPlannerPassword] = useState('');
  const [plannerToDelete, setPlannerToDelete] = useState<AuthUser | null>(null);
  const [activeActionsMenu, setActiveActionsMenu] = useState<string | null>(null);
  const [copiedTripId, setCopiedTripId] = useState<string | null>(null);

  useEffect(() => {
    if (isTripFormModalOpen) {
      if (editingTrip) {
        // Edit mode
        setName(editingTrip.name);
        setDestination(editingTrip.destination);
        setStartDate(editingTrip.startDate);
        setEndDate(editingTrip.endDate);
        setCoverImageUrl(editingTrip.coverImageUrl);
        setAssignedManagerId(editingTrip.managerId);
        // Fields for creation only
        setParticipants('');
        setContributionAmount('');
      } else {
        // Create mode
        setName('');
        setDestination('');
        setStartDate('');
        setEndDate('');
        setCoverImageUrl('');
        setParticipants('');
        setContributionAmount('');
        setAssignedManagerId(planners.length > 0 ? planners[0].id : '');
      }
    }
  }, [isTripFormModalOpen, editingTrip, planners]);

  const openCreateTripModal = () => {
    setEditingTrip(null);
    setIsTripFormModalOpen(true);
  };

  const openEditTripModal = (trip: Trip) => {
    setEditingTrip(trip);
    setIsTripFormModalOpen(true);
    setActiveActionsMenu(null);
  };
  
  const handleCloneTrip = (tripId: string) => {
    onCloneTrip(tripId);
    setActiveActionsMenu(null);
  };

  const handleCopyTripId = (tripId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(tripId);
    setCopiedTripId(tripId);
    setTimeout(() => setCopiedTripId(null), 2000);
  };

  const handleSubmitTripForm = async () => {
    if (name && destination && startDate && endDate && coverImageUrl) {
      let success = false;
      if (editingTrip) {
        // Update existing trip
        success = await onUpdateTripDetails(editingTrip.id, {
          name,
          destination,
          startDate,
          endDate,
          coverImageUrl,
          managerId: user.role === UserRole.ADMIN ? assignedManagerId : editingTrip.managerId,
        });
      } else {
        // Create new trip
        const participantList = participants.split(',').map(p => p.trim()).filter(Boolean);
        const contributionValue = parseFloat(contributionAmount) || 0;
        const managerIdForTrip = user.role === UserRole.ADMIN ? assignedManagerId : user.id;

        success = await onCreateTrip({
          name,
          destination,
          startDate,
          endDate,
          coverImageUrl,
          managerId: managerIdForTrip,
          participants: participantList,
          contributionAmount: contributionValue,
        });
      }
      // Chỉ đóng modal khi thành công
      if (success) {
        setIsTripFormModalOpen(false);
      }
    } else {
      // Show which fields are missing
      const missing = [];
      if (!name) missing.push('Tên chuyến đi');
      if (!destination) missing.push('Điểm đến');
      if (!startDate) missing.push('Ngày bắt đầu');
      if (!endDate) missing.push('Ngày kết thúc');
      if (!coverImageUrl) missing.push('URL ảnh bìa');
      alert(`Vui lòng điền đầy đủ thông tin:\n- ${missing.join('\n- ')}`);
    }
  };

  const handleAddPlanner = () => {
    if (newPlannerEmail && newPlannerPassword) {
        onAddPlanner(newPlannerEmail, newPlannerPassword);
        setNewPlannerEmail('');
        setNewPlannerPassword('');
    } else {
        alert("Vui lòng nhập cả email và mật khẩu.");
    }
  };
  
  const handleTriggerResetPassword = (email: string) => {
      onResetPlannerPassword(email);
  };

  const confirmDeletePlanner = () => {
    if (plannerToDelete) {
        onDeletePlanner(plannerToDelete.id);
        setPlannerToDelete(null);
    }
  };

  const userTrips = (user.role === UserRole.ADMIN) 
    ? trips 
    : trips.filter(trip => trip.managerId === user.id);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8" style={{ background: `radial-gradient(circle, rgba(31,41,55,1) 0%, rgba(17,24,39,1) 100%)` }}>
      <header className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-bold">Chào mừng, {user.email}</h1>
          <p className="text-gray-400">Bảng điều khiển chuyến đi của bạn [{user.role.toUpperCase()}]</p>
        </div>
        <Button onClick={onSignOut} variant="secondary">Đăng xuất</Button>
      </header>

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">Các chuyến đi của bạn</h2>
        <Button onClick={openCreateTripModal}>
          <PlusIcon className="w-5 h-5"/> Chuyến đi mới
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {userTrips.map(trip => (
          <div key={trip.id} className="group relative rounded-xl overflow-hidden cursor-pointer shadow-lg"
               onClick={(e) => {
                 // Prevent navigation when clicking on the actions menu
                 if (!(e.target as HTMLElement).closest('.actions-menu-container')) {
                   onSelectTrip(trip.id)
                 }
               }}
          >
             <img src={trip.coverImageUrl} alt={trip.name} className="w-full h-80 object-cover group-hover:scale-105 transition-transform duration-500" />
             <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
             <div className="absolute bottom-0 left-0 p-6 w-full">
                <h3 className="text-2xl font-bold">{trip.name}</h3>
                <p className="text-gray-300">{trip.destination}</p>
                <div className="flex items-center gap-2 mt-2">
                  <p className="text-xs text-gray-400 font-mono bg-black/40 px-2 py-1 rounded">
                    {trip.customId || trip.id}
                  </p>
                  <button
                    onClick={(e) => handleCopyTripId(trip.customId || trip.id, e)}
                    className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-2 py-1 rounded transition"
                    title="Copy ID để chia sẻ"
                  >
                    {copiedTripId === (trip.customId || trip.id) ? '✓ Đã copy' : '📋 Copy'}
                  </button>
                </div>
                 {trip.managerId === '' && user.role === UserRole.ADMIN && (
                    <p className="text-xs text-yellow-400 mt-1 font-semibold bg-yellow-900/50 px-2 py-1 rounded-full inline-block">Chưa được gán</p>
                 )}
             </div>
             <div className="actions-menu-container absolute top-4 right-4">
                <button onClick={() => setActiveActionsMenu(activeActionsMenu === trip.id ? null : trip.id)} className="p-2 bg-black/50 rounded-full hover:bg-black/70 transition">
                  <EllipsisVerticalIcon className="w-5 h-5" />
                </button>
                {activeActionsMenu === trip.id && (
                    <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-20 animate-fade-in-up">
                        <button onClick={() => openEditTripModal(trip)} className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-700 rounded-t-lg flex items-center gap-2"><PencilIcon className="w-4 h-4" /> Chỉnh sửa</button>
                        <button onClick={() => handleCloneTrip(trip.id)} className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-700 rounded-b-lg flex items-center gap-2"><DocumentDuplicateIcon className="w-4 h-4" /> Nhân bản</button>
                    </div>
                )}
             </div>
          </div>
        ))}
        {userTrips.length === 0 && <p className="text-gray-500">Bạn chưa tạo chuyến đi nào.</p>}
      </div>

      {user.role === UserRole.ADMIN && (
        <div className="mt-12">
           <h2 className="text-2xl font-semibold mb-4">Hành động của Admin</h2>
           <Button variant='secondary' onClick={() => setIsPlannerModalOpen(true)}>Quản lý Planner</Button>
        </div>
      )}

      <Modal isOpen={isTripFormModalOpen} onClose={() => setIsTripFormModalOpen(false)} title={editingTrip ? "Chỉnh sửa chuyến đi" : "Tạo chuyến đi mới"}>
        <div className="space-y-4">
            <Input label="Tên chuyến đi" value={name} onChange={e => setName(e.target.value)} placeholder="v.d., Mùa hè ở Paris" />
            <Input label="Điểm đến" value={destination} onChange={e => setDestination(e.target.value)} placeholder="v.d., Paris, Pháp" />
            <div className="grid grid-cols-2 gap-4">
                <Input label="Ngày bắt đầu" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                <Input label="Ngày kết thúc" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
            <Input label="URL ảnh bìa" value={coverImageUrl} onChange={e => setCoverImageUrl(e.target.value)} placeholder="https://picsum.photos/1200/800"/>
            
            {user.role === UserRole.ADMIN && (
              <div>
                <label htmlFor="planner-select" className="block text-sm font-medium text-gray-300 mb-1">Giao cho</label>
                <select 
                    id="planner-select"
                    value={assignedManagerId} 
                    onChange={e => setAssignedManagerId(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                    <option value="">-- Chưa được gán --</option>
                    <option value={user.id}>🔑 Tôi (Admin - {user.email})</option>
                    {planners.map(p => <option key={p.id} value={p.id}>👤 {p.email}</option>)}
                </select>
              </div>
            )}

            {!editingTrip && (
              <>
                <Input label="Thành viên (phân cách bằng dấu phẩy)" value={participants} onChange={e => setParticipants(e.target.value)} placeholder="Alex, Beth, Chris"/>
                <Input label="Số tiền đóng góp / người (VNĐ)" type="number" value={contributionAmount} onChange={e => setContributionAmount(e.target.value)} placeholder="2500000"/>
              </>
            )}
            <Button onClick={handleSubmitTripForm} className="w-full">{editingTrip ? "Lưu thay đổi" : "Tạo chuyến đi"}</Button>
        </div>
      </Modal>

      <Modal isOpen={isPlannerModalOpen} onClose={() => setIsPlannerModalOpen(false)} title="Quản lý Planners">
        <div className="space-y-4">
            <h4 className="font-semibold text-gray-300">Planner hiện tại</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                {planners.map(p => (
                    <div key={p.id} className="flex justify-between items-center bg-gray-700/50 p-2 rounded-lg">
                        <span className="text-white">{p.email}</span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleTriggerResetPassword(p.email)}
                                className="text-yellow-400 hover:text-yellow-300 text-xs px-2 py-1 rounded bg-yellow-500/10 hover:bg-yellow-500/20"
                            >
                                Đặt lại mật khẩu
                            </button>
                            <button 
                                onClick={() => setPlannerToDelete(p)}
                                className="text-red-400 hover:text-red-300 text-xs px-2 py-1 rounded bg-red-500/10 hover:bg-red-500/20"
                            >
                                Xóa
                            </button>
                        </div>
                    </div>
                ))}
            </div>
            <div className="pt-4 border-t border-gray-700">
                 <h4 className="font-semibold text-gray-300 mb-2">Thêm Planner mới</h4>
                 <div className="space-y-3">
                    <Input 
                        label="Email"
                        placeholder="planner@email.com" 
                        type="email"
                        value={newPlannerEmail} 
                        onChange={e => setNewPlannerEmail(e.target.value)}
                    />
                    <Input
                        label="Mật khẩu"
                        placeholder="••••••••"
                        type="password"
                        value={newPlannerPassword}
                        onChange={e => setNewPlannerPassword(e.target.value)}
                    />
                    <Button onClick={handleAddPlanner} className="w-full">Thêm</Button>
                 </div>
            </div>
        </div>
      </Modal>

      {plannerToDelete && (
        <Modal isOpen={!!plannerToDelete} onClose={() => setPlannerToDelete(null)} title="Xác nhận xóa Planner">
            <div className="space-y-4 text-gray-300">
                <p>Bạn có chắc chắn muốn xóa planner <strong className="text-white">{plannerToDelete.email}</strong> không?</p>
                <p>Tất cả các chuyến đi do planner này quản lý sẽ trở thành <strong className="text-yellow-400">chuyến đi chưa được gán</strong> và cần được phân quyền lại.</p>
                <div className="flex justify-end gap-4 pt-4">
                    <Button variant="secondary" onClick={() => setPlannerToDelete(null)}>Hủy</Button>
                    <Button variant="primary" className="!bg-red-600 hover:!bg-red-500" onClick={confirmDeletePlanner}>
                        Xác nhận Xóa
                    </Button>
                </div>
            </div>
        </Modal>
      )}

    </div>
  );
};

export default Dashboard;

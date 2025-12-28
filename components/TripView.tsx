import React, { useState } from 'react';
import { Trip, UserRole, AuthUser, TimelineEvent, PackingItem } from '../types';
import Timeline from './Timeline';
import Finances from './Finances';
import Weather from './Weather';
import TripStats from './TripStats';
import ExpenseChart from './ExpenseChart';
import ExpenseCategoryChart from './ExpenseCategoryChart';
import DailyExpenseChart from './DailyExpenseChart';
import { UsersIcon } from './icons';
import { Button, Input, Modal } from './ui';

interface TripViewProps {
  trip: Trip;
  user: AuthUser | null;
  onBack: () => void;
  onUpdateTrip: (updatedTrip: Trip) => void;
}

const TripView: React.FC<TripViewProps> = ({ trip, user, onBack, onUpdateTrip }) => {
  const [isEditingHeader, setIsEditingHeader] = useState(false);
  const [headerData, setHeaderData] = useState({
      name: trip.name,
      destination: trip.destination,
      startDate: trip.startDate,
      endDate: trip.endDate,
  });
  const [isParticipantModalOpen, setIsParticipantModalOpen] = useState(false);
  const [newParticipantName, setNewParticipantName] = useState('');
  const [participantToDelete, setParticipantToDelete] = useState<string | null>(null);
  const [editingParticipant, setEditingParticipant] = useState<string | null>(null);
  const [editParticipantName, setEditParticipantName] = useState('');


  const getDaysDuration = () => {
    try {
      const start = new Date(trip.startDate);
      const end = new Date(trip.endDate);
      if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return 1;
      const diffTime = Math.abs(end.getTime() - start.getTime());
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    } catch(e) {
      return 1;
    }
  };

  const isAdminOrManager = user?.role === UserRole.ADMIN || (user?.role === UserRole.MANAGER && user.id === trip.managerId);

  const handleHeaderSave = () => {
    onUpdateTrip({ ...trip, ...headerData });
    setIsEditingHeader(false);
  };

  const handleHeaderCancel = () => {
    setHeaderData({
      name: trip.name,
      destination: trip.destination,
      startDate: trip.startDate,
      endDate: trip.endDate,
    });
    setIsEditingHeader(false);
  }

  const handleUpdateTimeline = (updatedEvents: TimelineEvent[]) => {
    onUpdateTrip({ ...trip, timeline: updatedEvents });
  };
  
  const handleUpdatePackingList = (updatedItems: PackingItem[]) => {
    onUpdateTrip({ ...trip, packingList: updatedItems });
  };

  const handleAddParticipant = () => {
    const name = newParticipantName.trim();
    if (name && !trip.participants.includes(name)) {
      const updatedParticipants = [...trip.participants, name];
      
      const contributionAmount = trip.contributions[0]?.amount || 0;
      const newContribution = {
          id: `c-${Date.now()}`,
          participant: name,
          amount: contributionAmount,
          paid: false
      };
      const updatedContributions = [...trip.contributions, newContribution];
      
      onUpdateTrip({ ...trip, participants: updatedParticipants, contributions: updatedContributions });
      setNewParticipantName('');
    } else {
        alert("Tên thành viên không hợp lệ hoặc đã tồn tại.");
    }
  };

  const handleDeleteParticipant = (name: string) => {
    const hasPaid = trip.expenses.some(e => e.paidBy === name);
    if (hasPaid) {
      alert(`${name} đã thanh toán cho một số chi phí và không thể bị xóa để đảm bảo tính toàn vẹn tài chính.`);
      return;
    }

    const updatedParticipants = trip.participants.filter(p => p !== name);
    const updatedContributions = trip.contributions.filter(c => c.participant !== name);
    const updatedExpenses = trip.expenses.map(expense => ({
      ...expense,
      participants: expense.participants.filter(p => p !== name),
    }));

    onUpdateTrip({ ...trip, participants: updatedParticipants, contributions: updatedContributions, expenses: updatedExpenses });
    
  };
  
  const handleStartEditParticipant = (name: string) => {
    setEditingParticipant(name);
    setEditParticipantName(name);
  };
  
  const handleSaveParticipant = () => {
    const newName = editParticipantName.trim();
    if (!newName) {
      alert('Tên thành viên không được để trống');
      return;
    }
    if (newName !== editingParticipant && trip.participants.includes(newName)) {
      alert('Tên thành viên đã tồn tại');
      return;
    }
    
    const oldName = editingParticipant!;
    
    // Cập nhật tất cả chỗ xuất hiện của thành viên
    const updatedParticipants = trip.participants.map(p => p === oldName ? newName : p);
    const updatedContributions = trip.contributions.map(c => 
      c.participant === oldName ? { ...c, participant: newName } : c
    );
    const updatedExpenses = trip.expenses.map(expense => ({
      ...expense,
      paidBy: expense.paidBy === oldName ? newName : expense.paidBy,
      participants: expense.participants.map(p => p === oldName ? newName : p),
    }));
    
    // Cập nhật additionalContributions nếu có
    const updatedAdditionalContributions = (trip.additionalContributions || []).map(round => ({
      ...round,
      contributions: round.contributions.map(c => 
        c.participant === oldName ? { ...c, participant: newName } : c
      )
    }));

    onUpdateTrip({ 
      ...trip, 
      participants: updatedParticipants, 
      contributions: updatedContributions, 
      expenses: updatedExpenses,
      additionalContributions: updatedAdditionalContributions
    });
    
    setEditingParticipant(null);
    setEditParticipantName('');
  };
  
  const handleCancelEditParticipant = () => {
    setEditingParticipant(null);
    setEditParticipantName('');
  };


  return (
    <div className="min-h-screen bg-gray-900 text-white relative">
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-30"
        style={{ backgroundImage: `url(${trip.coverImageUrl})` }}
      ></div>
      <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/70 to-transparent"></div>
      
      <div className="relative z-10 p-4 sm:p-6 lg:p-8">
        <header className="flex justify-between items-start mb-8">
          <div>
             {isEditingHeader ? (
                <div className="space-y-2">
                    <Input value={headerData.name} onChange={e => setHeaderData({...headerData, name: e.target.value})} className="text-4xl md:text-5xl font-extrabold tracking-tight !p-0 !bg-transparent !border-0"/>
                    <Input value={headerData.destination} onChange={e => setHeaderData({...headerData, destination: e.target.value})} className="text-lg !p-0 !bg-transparent !border-0 text-gray-300"/>
                    <div className="flex gap-2">
                        <Input type="date" value={headerData.startDate} onChange={e => setHeaderData({...headerData, startDate: e.target.value})} className="text-md !p-0 !bg-transparent !border-0 text-indigo-400" />
                        <Input type="date" value={headerData.endDate} onChange={e => setHeaderData({...headerData, endDate: e.target.value})} className="text-md !p-0 !bg-transparent !border-0 text-indigo-400" />
                    </div>
                </div>
            ) : (
                <div>
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">{trip.name}</h1>
                    <p className="text-lg text-gray-300">{trip.destination}</p>
                    <p className="text-md text-indigo-400">{trip.startDate} đến {trip.endDate}</p>
                </div>
            )}
            <div className="flex items-center gap-2 mt-2 text-gray-400">
                <UsersIcon className="w-5 h-5" />
                <span>{trip.participants.length > 0 ? trip.participants.join(', ') : 'Chưa có thành viên'}</span>
                 {isAdminOrManager && (
                    <button 
                      onClick={() => setIsParticipantModalOpen(true)} 
                      className="ml-2 text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg font-medium transition"
                    >
                      + Quản lý thành viên
                    </button>
                )}
            </div>
          </div>
          <div className="flex gap-2">
             {isAdminOrManager && (
                isEditingHeader ? (
                    <>
                        <Button onClick={handleHeaderSave} variant="primary">Lưu</Button>
                        <Button onClick={handleHeaderCancel} variant="secondary">Hủy</Button>
                    </>
                ) : (
                    <Button onClick={() => setIsEditingHeader(true)} variant="secondary">Chỉnh sửa</Button>
                )
            )}
            <button onClick={onBack} className="bg-white/10 backdrop-blur-sm text-white font-semibold py-2 px-4 rounded-lg hover:bg-white/20 transition">
              &larr; Quay lại
            </button>
          </div>
        </header>

        <TripStats trip={trip} />

        <main className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          <div className="lg:col-span-2 space-y-6">
            <Timeline 
              initialEvents={trip.timeline}
              tripDuration={getDaysDuration()}
              tripDestination={trip.destination}
              tripStartDate={trip.startDate}
              isAdmin={isAdminOrManager}
              onUpdateEvents={handleUpdateTimeline}
            />
             <DailyExpenseChart 
                expenses={trip.expenses}
                startDate={trip.startDate}
                endDate={trip.endDate}
            />
            <ExpenseChart expenses={trip.expenses} participants={trip.participants} />
            <ExpenseCategoryChart expenses={trip.expenses} />
          </div>
          <div className="space-y-6">
            <Weather destination={trip.destination} />
            <Finances 
              trip={trip}
              isAdmin={isAdminOrManager}
              onUpdateTrip={onUpdateTrip}
            />
          </div>
        </main>
      </div>

      <Modal isOpen={isParticipantModalOpen} onClose={() => setIsParticipantModalOpen(false)} title="Quản lý thành viên">
        <div className="space-y-4">
            <h4 className="font-semibold text-gray-300">Thành viên hiện tại</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                {trip.participants.map(p => (
                    <div key={p} className="flex justify-between items-center bg-gray-700/50 p-2 rounded-lg">
                        {editingParticipant === p ? (
                          <div className="flex-1 flex gap-2">
                            <Input 
                              value={editParticipantName}
                              onChange={e => setEditParticipantName(e.target.value)}
                              onKeyPress={e => e.key === 'Enter' && handleSaveParticipant()}
                              className="flex-1"
                              autoFocus
                            />
                            <button
                              onClick={handleSaveParticipant}
                              className="text-green-400 hover:text-green-300 text-xs px-2 py-1 rounded bg-green-500/10 hover:bg-green-500/20"
                            >
                              Lưu
                            </button>
                            <button
                              onClick={handleCancelEditParticipant}
                              className="text-gray-400 hover:text-gray-300 text-xs px-2 py-1 rounded bg-gray-500/10 hover:bg-gray-500/20"
                            >
                              Hủy
                            </button>
                          </div>
                        ) : (
                          <>
                            <span className="text-white">{p}</span>
                            <div className="flex gap-2">
                              <button 
                                  onClick={() => handleStartEditParticipant(p)}
                                  className="text-blue-400 hover:text-blue-300 text-xs px-2 py-1 rounded bg-blue-500/10 hover:bg-blue-500/20"
                              >
                                  Sửa
                              </button>
                              <button 
                                  onClick={() => setParticipantToDelete(p)}
                                  className="text-red-400 hover:text-red-300 text-xs px-2 py-1 rounded bg-red-500/10 hover:bg-red-500/20"
                              >
                                  Xóa
                              </button>
                            </div>
                          </>
                        )}
                    </div>
                ))}
            </div>
            <div className="pt-4 border-t border-gray-700">
                 <h4 className="font-semibold text-gray-300 mb-2">Thêm thành viên mới</h4>
                 <div className="flex gap-2">
                    <Input 
                        placeholder="Tên thành viên" 
                        value={newParticipantName} 
                        onChange={e => setNewParticipantName(e.target.value)}
                        onKeyPress={e => e.key === 'Enter' && handleAddParticipant()}
                    />
                    <Button onClick={handleAddParticipant}>Thêm</Button>
                 </div>
            </div>
        </div>
      </Modal>

      {participantToDelete && (
        <Modal isOpen={!!participantToDelete} onClose={() => setParticipantToDelete(null)} title="Xác nhận xóa thành viên">
            <div className="space-y-4 text-gray-300">
                <p>Bạn có chắc chắn muốn xóa <strong className="text-white">{participantToDelete}</strong> khỏi chuyến đi không?</p>
                <p className="text-sm text-gray-400">Hành động này không thể hoàn tác.</p>
                <div className="flex justify-end gap-4 pt-4">
                    <Button variant="secondary" onClick={() => setParticipantToDelete(null)}>Hủy</Button>
                    <Button variant="primary" className="!bg-red-600 hover:!bg-red-500" onClick={() => {
                        handleDeleteParticipant(participantToDelete);
                        setParticipantToDelete(null);
                    }}>
                        Xác nhận Xóa
                    </Button>
                </div>
            </div>
        </Modal>
      )}

    </div>
  );
};

export default TripView;

import React, { useState, useMemo, useEffect, useCallback, memo } from 'react';
import { Expense, Contribution, Trip, formatCurrency, formatDate } from '../types';
import { Card, Button, Input, Modal, DateInput } from './ui';
import { useToast } from './Toast';
import { WalletIcon, PlusIcon } from './icons';
// `excelExportService` import động trong handler bên dưới — tránh bundle ExcelJS (~900KB) vào TripView chunk.

interface FinancesProps {
  trip: Trip;
  isAdmin: boolean;
  onUpdateTrip: (updatedTrip: Trip) => void;
}

const EXPENSE_CATEGORIES = ['Ăn uống', 'Di chuyển', 'Chỗ ở', 'Vé tham quan', 'Mua sắm', 'Khác'];

const Finances: React.FC<FinancesProps> = memo(({ trip, isAdmin, onUpdateTrip }) => {
  const toast = useToast();
  const [isExpenseFormOpen, setIsExpenseFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);

  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expensePaidBy, setExpensePaidBy] = useState(trip.participants[0] || '');
  const [expenseCategory, setExpenseCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [expenseDate, setExpenseDate] = useState(trip.startDate);
  const [expenseParticipants, setExpenseParticipants] = useState<string[]>(trip.participants);
  const [expensePaidFromFund, setExpensePaidFromFund] = useState(false);

  // State for additional contribution modal
  const [isAddFundModalOpen, setIsAddFundModalOpen] = useState(false);
  const [additionalFundAmount, setAdditionalFundAmount] = useState('');
  const [additionalFundDescription, setAdditionalFundDescription] = useState('');
  const [selectedFundParticipants, setSelectedFundParticipants] = useState<string[]>(trip.participants);
  const [editingRoundId, setEditingRoundId] = useState<string | null>(null);
  const [editRoundAmount, setEditRoundAmount] = useState('');
  const [editRoundDescription, setEditRoundDescription] = useState('');
  const [isEditingInitialFund, setIsEditingInitialFund] = useState(false);
  const [editInitialAmount, setEditInitialAmount] = useState('');
  const [isBalanceExpanded, setIsBalanceExpanded] = useState(false);
  
  // State for treasurer selection
  const [selectedTreasurer, setSelectedTreasurer] = useState(trip.treasurerId || '');

  // Sync selected treasurer when trip updates
  useEffect(() => {
    setSelectedTreasurer(trip.treasurerId || '');
  }, [trip.treasurerId]);

  useEffect(() => {
    if (isExpenseFormOpen) {
      if (editingExpense) {
        // Edit mode
        setExpenseDesc(editingExpense.description);
        setExpenseAmount(String(editingExpense.amount));
        setExpensePaidBy(editingExpense.paidBy);
        setExpenseCategory(editingExpense.category);
        setExpenseDate(editingExpense.date);
        setExpenseParticipants(editingExpense.participants);
        setExpensePaidFromFund(editingExpense.paidFromFund || false);
      } else {
        // Create mode - reset form
        setExpenseDesc('');
        setExpenseAmount('');
        setExpensePaidBy(trip.participants[0] || '');
        setExpenseCategory(EXPENSE_CATEGORIES[0]);
        setExpenseDate(trip.startDate);
        setExpenseParticipants(trip.participants);
        setExpensePaidFromFund(false);
      }
    }
  }, [isExpenseFormOpen, editingExpense, trip.participants, trip.startDate]);
  
  const openAddExpenseModal = () => {
    setEditingExpense(null);
    setIsExpenseFormOpen(true);
  };
  
  const openEditExpenseModal = (expense: Expense) => {
    setEditingExpense(expense);
    setIsExpenseFormOpen(true);
  };

  const { expenses, contributions, participants, additionalContributions } = trip;

  const financialSummary = useMemo(() => {
    const userBalances: { [key: string]: number } = {};
    participants.forEach(p => userBalances[p] = 0);

    // Tổng quỹ đã đóng (ban đầu + các đợt đóng thêm)
    const totalContributions = contributions
        .filter(c => c.paid)
        .reduce((sum, c) => sum + c.amount, 0);
    
    const totalAdditionalContributions = (additionalContributions || [])
        .flatMap(round => round.contributions)
        .filter(c => c.paid)
        .reduce((sum, c) => sum + c.amount, 0);
    
    const totalAllContributions = totalContributions + totalAdditionalContributions;

    // Tổng chi phí
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    
    // Tổng chi phí thanh toán từ quỹ
    const totalExpensesFromFund = expenses
        .filter(e => e.paidFromFund)
        .reduce((sum, e) => sum + e.amount, 0);
    
    // Số dư quỹ chung = Tổng đóng (ban đầu + đóng thêm) - Tổng chi từ quỹ
    const fundBalance = totalAllContributions - totalExpensesFromFund;

    const costPerPerson = participants.length > 0 ? (totalExpenses - totalAllContributions) / participants.length : 0;
    
    participants.forEach(p => {
        // Số tiền đã đóng vào quỹ (ban đầu)
        const contributedToFund = contributions.find(c => c.participant === p && c.paid)?.amount || 0;
        
        // Số tiền đã đóng thêm
        const additionalContributed = (additionalContributions || [])
            .flatMap(round => round.contributions)
            .filter(c => c.participant === p && c.paid)
            .reduce((sum, c) => sum + c.amount, 0);
        
        // Số tiền đã trả từ tiền cá nhân (không tính chi phí từ quỹ)
        const paidPersonally = expenses
            .filter(e => e.paidBy === p && !e.paidFromFund)
            .reduce((sum, e) => sum + e.amount, 0);
        
        // Tổng chi phí phải chia sẻ (bao gồm cả chi từ quỹ và cá nhân)
        const sharedExpenses = expenses
            .filter(e => e.participants.includes(p))
            .reduce((sum, e) => sum + (e.amount / e.participants.length), 0);

        userBalances[p] = contributedToFund + additionalContributed + paidPersonally - sharedExpenses;
    });

    const debtors = Object.entries(userBalances).filter(([, balance]) => balance < 0).map(([name, balance]) => ({ name, amount: -balance }));
    const creditors = Object.entries(userBalances).filter(([, balance]) => balance > 0).map(([name, balance]) => ({ name, amount: balance }));
    
    const transactions = [];

    // Nếu có thủ quỹ: mọi giao dịch qua thủ quỹ
    if (selectedTreasurer && selectedTreasurer.trim() !== '') {
      // Debtors thanh toán cho thủ quỹ
      debtors.forEach(debtor => {
        if (debtor.amount > 1) { // Threshold
          transactions.push({ from: debtor.name, to: selectedTreasurer, amount: debtor.amount });
        }
      });
      
      // Thủ quỹ hoàn lại cho creditors
      creditors.forEach(creditor => {
        if (creditor.name !== selectedTreasurer && creditor.amount > 1) {
          transactions.push({ from: selectedTreasurer, to: creditor.name, amount: creditor.amount });
        }
      });
    } else {
      // Nếu không có thủ quỹ: dùng logic cũ (debtor → creditor trực tiếp)
      let i = 0, j = 0;
      while (i < debtors.length && j < creditors.length) {
        const debtor = debtors[i];
        const creditor = creditors[j];
        const amount = Math.min(debtor.amount, creditor.amount);

        if (amount > 1) { // Threshold for VND
          transactions.push({ from: debtor.name, to: creditor.name, amount });
        }

        debtor.amount -= amount;
        creditor.amount -= amount;
        
        if (debtor.amount < 1) i++;
        if (creditor.amount < 1) j++;
      }
    }

    return { settledTransactions: transactions, finalBalances: userBalances, fundBalance, totalAllContributions, totalExpensesFromFund };
  }, [expenses, participants, contributions, additionalContributions, selectedTreasurer]);

  const totalCollectedContributions = contributions
    .filter(c => c.paid)
    .reduce((sum, c) => sum + c.amount, 0);

  const handleSubmitExpense = () => {
    const amount = parseFloat(expenseAmount);
    if (expenseDesc && !isNaN(amount) && amount > 0 && expenseDate && expenseParticipants.length > 0) {
        if (editingExpense) { // Update
            const updatedExpense: Expense = { 
              ...editingExpense, 
              description: expenseDesc, 
              amount, 
              paidBy: expensePaidFromFund ? 'Quỹ chung' : expensePaidBy, 
              category: expenseCategory, 
              date: expenseDate, 
              participants: expenseParticipants,
              paidFromFund: expensePaidFromFund
            };
            onUpdateTrip({ ...trip, expenses: trip.expenses.map(e => e.id === editingExpense.id ? updatedExpense : e) });
        } else { // Create
            const newExpense: Expense = { 
              id: Date.now().toString(), 
              description: expenseDesc, 
              amount, 
              paidBy: expensePaidFromFund ? 'Quỹ chung' : expensePaidBy, 
              category: expenseCategory, 
              date: expenseDate, 
              participants: expenseParticipants,
              paidFromFund: expensePaidFromFund
            };
            onUpdateTrip({ ...trip, expenses: [...trip.expenses, newExpense] });
        }
        setIsExpenseFormOpen(false);
        setEditingExpense(null);
    } else {
        toast.error('Vui lòng điền đầy đủ thông tin hợp lệ. Phải có ít nhất một người tham gia chi phí.');
    }
  };

  const handleDeleteExpense = () => {
    if (expenseToDelete) {
        onUpdateTrip({ ...trip, expenses: trip.expenses.filter(e => e.id !== expenseToDelete.id) });
        setExpenseToDelete(null);
    }
  };
  
  const handleToggleContributionPaid = (participantName: string) => {
    if (!isAdmin) return;
    const contributionAmount = trip.contributions.find(c => c.participant === participantName)?.amount;
    if (contributionAmount === undefined) return;
    
    let updatedContributions = [...trip.contributions];
    const existingContribution = updatedContributions.find(c => c.participant === participantName);
    if(existingContribution) {
        updatedContributions = updatedContributions.map(c => 
            c.participant === participantName ? { ...c, paid: !c.paid } : c
        );
    }
    onUpdateTrip({ ...trip, contributions: updatedContributions });
  };
  
  const handleParticipantToggle = (participant: string) => {
    setExpenseParticipants(prev => 
        prev.includes(participant) ? prev.filter(p => p !== participant) : [...prev, participant]
    );
  };
  
  const handleToggleFundParticipant = (participant: string) => {
    setSelectedFundParticipants(prev => 
        prev.includes(participant) ? prev.filter(p => p !== participant) : [...prev, participant]
    );
  };
  
  const handleAddFundContribution = () => {
    const amount = parseFloat(additionalFundAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Vui lòng nhập số tiền hợp lệ');
      return;
    }

    if (selectedFundParticipants.length === 0) {
      toast.error('Vui lòng chọn ít nhất 1 người tham gia đóng quỹ');
      return;
    }
    
    // Tầo đợt đóng góp mới chỉ với những người được chọn
    const newRound: any = {
      id: `round-${Date.now()}`,
      amount: amount,
      date: new Date().toISOString().split('T')[0],
      description: additionalFundDescription || `Đóng thêm ${formatCurrency(amount)}`,
      contributions: selectedFundParticipants.map(p => ({
        id: `c-${Date.now()}-${p}`,
        participant: p,
        amount: amount,
        paid: false // Mặc định chưa đóng
      }))
    };
    
    const updatedAdditionalContributions = [...(trip.additionalContributions || []), newRound];
    onUpdateTrip({ ...trip, additionalContributions: updatedAdditionalContributions });
    
    setIsAddFundModalOpen(false);
    setAdditionalFundAmount('');
    setAdditionalFundDescription('');
    setSelectedFundParticipants(trip.participants); // Reset về mặc định
  };
  
  const handleToggleAdditionalContribution = (roundId: string, participantName: string) => {
    if (!isAdmin) return;
    
    const updatedRounds = (trip.additionalContributions || []).map(round => {
      if (round.id === roundId) {
        return {
          ...round,
          contributions: round.contributions.map(c =>
            c.participant === participantName ? { ...c, paid: !c.paid } : c
          )
        };
      }
      return round;
    });
    
    onUpdateTrip({ ...trip, additionalContributions: updatedRounds });
  };
    const handleDeleteRound = (roundId: string) => {
    if (!isAdmin) return;
    if (!confirm('Bạn có chắc muốn xóa đợt đóng quỹ này?')) return;
    
    const updatedRounds = (trip.additionalContributions || []).filter(r => r.id !== roundId);
    onUpdateTrip({ ...trip, additionalContributions: updatedRounds });
  };
  
  const handleStartEditRound = (round: any) => {
    setEditingRoundId(round.id);
    setEditRoundAmount(round.amount.toString());
    setEditRoundDescription(round.description);
  };
  
  const handleSaveRound = (roundId: string) => {
    const amount = parseFloat(editRoundAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Vui lòng nhập số tiền hợp lệ');
      return;
    }
    
    const updatedRounds = (trip.additionalContributions || []).map(round => {
      if (round.id === roundId) {
        return {
          ...round,
          amount: amount,
          description: editRoundDescription,
          contributions: round.contributions.map(c => ({
            ...c,
            amount: amount // Cập nhật số tiền cho tất cả thành viên
          }))
        };
      }
      return round;
    });
    
    onUpdateTrip({ ...trip, additionalContributions: updatedRounds });
    setEditingRoundId(null);
  };
  
  const handleCancelEdit = () => {
    setEditingRoundId(null);
    setEditRoundAmount('');
    setEditRoundDescription('');
  };
  
  const handleStartEditInitialFund = () => {
    const firstContribution = contributions[0];
    if (firstContribution) {
      setEditInitialAmount(firstContribution.amount.toString());
      setIsEditingInitialFund(true);
    }
  };
  
  const handleSaveInitialFund = () => {
    const amount = parseFloat(editInitialAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Vui lòng nhập số tiền hợp lệ');
      return;
    }
    
    const updatedContributions = contributions.map(c => ({
      ...c,
      amount: amount
    }));
    
    onUpdateTrip({ ...trip, contributions: updatedContributions });
    setIsEditingInitialFund(false);
  };
  
  const handleCancelInitialEdit = () => {
    setIsEditingInitialFund(false);
    setEditInitialAmount('');
  };
  
  return (
    <Card>
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
            <WalletIcon className="w-6 h-6 text-indigo-300" />
            <h3 className="text-xl font-bold text-white">Tài chính</h3>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={async () => {
              const { exportFinancesToExcel } = await import('../services/excelExportService');
              exportFinancesToExcel(trip, selectedTreasurer);
            }}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition"
            title="Xuất file Excel"
          >
            📊 Xuất Excel
          </button>
          {isAdmin && (
              <Button onClick={openAddExpenseModal} variant="secondary">
                  <PlusIcon className="w-5 h-5" /> Thêm chi phí
              </Button>
          )}
        </div>
      </div>

      {/* Chọn thủ quỹ */}
      {isAdmin && (
        <div className="mb-6 p-4 bg-blue-600/20 border border-blue-500/30 rounded-lg">
          <label className="block text-sm font-semibold text-gray-300 mb-2">👤 Chọn người quản lý quỹ:</label>
          <select 
            value={selectedTreasurer} 
            onChange={(e) => {
              const newValue = e.target.value;
              setSelectedTreasurer(newValue);
              onUpdateTrip({ ...trip, treasurerId: newValue || undefined });
            }}
            className="w-full bg-gray-800 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">-- Chọn thủ quỹ --</option>
            {participants.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          {selectedTreasurer && (
            <p className="text-xs text-blue-300 mt-2">✓ Thủ quỹ: <strong>{selectedTreasurer}</strong></p>
          )}
          <div className="text-xs text-blue-200 mt-3 space-y-1">
            <p>📋 <strong>Quy tắc thanh toán:</strong></p>
            {selectedTreasurer ? (
              <ul className="ml-4 space-y-1">
                <li>• Người nợ tiền → thanh toán cho <strong>{selectedTreasurer}</strong></li>
                <li>• <strong>{selectedTreasurer}</strong> → hoàn lại cho người thừa tiền</li>
              </ul>
            ) : (
              <ul className="ml-4 space-y-1">
                <li>• Người nợ thanh toán trực tiếp cho người thừa</li>
                <li>• Vui lòng chọn thủ quỹ để tập trung giao dịch</li>
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Hiển thị thủ quỹ cho người dùng không phải admin */}
      {!isAdmin && selectedTreasurer && (
        <div className="mb-6 p-4 bg-yellow-600/20 border border-yellow-500/30 rounded-lg">
          <p className="text-sm text-yellow-300">
            👑 <strong>Thủ quỹ:</strong> {selectedTreasurer}
          </p>
          <p className="text-xs text-yellow-200 mt-2">Giao dịch thanh toán sẽ qua thủ quỹ</p>
        </div>
      )}

       <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-semibold text-gray-300">Quỹ đóng góp</h4>
              {isAdmin && (
                <button 
                  onClick={() => setIsAddFundModalOpen(true)}
                  className="text-xs bg-green-600 hover:bg-green-500 text-white px-3 py-1 rounded-lg font-medium transition"
                >
                  + Đóng thêm quỹ
                </button>
              )}
            </div>
            
            {/* Hiển thị số dư quỹ */}
            <div className="mb-3 p-3 bg-gradient-to-r from-indigo-600/20 to-purple-600/20 border border-indigo-500/30 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-300">💰 Số dư quỹ chung:</span>
                <span className={`text-lg font-bold ${financialSummary.fundBalance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatCurrency(financialSummary.fundBalance)}
                </span>
              </div>
              <div className="text-xs text-gray-400 mt-1">
                Đã thu: {formatCurrency(financialSummary.totalAllContributions)} | 
                Đã chi từ quỹ: {formatCurrency(financialSummary.totalExpensesFromFund)}
              </div>
            </div>
            
            <div className="space-y-3">
              {/* Quỹ ban đầu */}
              <div>
                {isEditingInitialFund ? (
                  <div className="bg-gray-700/50 p-3 rounded-lg mb-3">
                    <h5 className="text-xs font-semibold text-gray-400 mb-2">Sửa số tiền quỹ ban đầu</h5>
                    <div className="space-y-2 mb-3">
                      <input
                        type="number"
                        value={editInitialAmount}
                        onChange={(e) => setEditInitialAmount(e.target.value)}
                        placeholder="Số tiền"
                        className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white text-sm"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveInitialFund}
                        className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg"
                      >
                        Lưu
                      </button>
                      <button
                        onClick={handleCancelInitialEdit}
                        className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded-lg"
                      >
                        Hủy
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="text-xs font-semibold text-gray-400">📋 Đợt 1 - Quỹ ban đầu</h5>
                    {isAdmin && (
                      <button
                        onClick={handleStartEditInitialFund}
                        className="text-blue-400 hover:text-blue-300 text-xs"
                        title="Sửa"
                      >
                        ✏️
                      </button>
                    )}
                  </div>
                )}
                <div className="space-y-2 max-h-32 overflow-y-auto pr-2">
                {participants.map(p => {
                    const contribution = contributions.find(c => c.participant === p) || { paid: false, amount: 0 };
                    return (
                        <div key={p} className="flex items-center justify-between bg-gray-700/50 p-2 rounded-lg text-sm">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input 
                                    type="checkbox"
                                    checked={contribution.paid}
                                    onChange={() => handleToggleContributionPaid(p)}
                                    disabled={!isAdmin || isEditingInitialFund}
                                    className="form-checkbox h-5 w-5 bg-gray-800 border-gray-600 rounded text-indigo-600 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                />
                                <span className={`font-medium ${contribution.paid ? 'text-gray-400 line-through' : 'text-white'}`}>{p}</span>
                            </label>
                            <span className="text-gray-300">{formatCurrency(contribution.amount)}</span>
                        </div>
                    )
                })}
            </div>
              </div>
              
              {/* Các đợt đóng thêm */}
              {(trip.additionalContributions || []).map((round, index) => (
                <div key={round.id} className="border-t border-gray-700 pt-3 mt-3">
                  {editingRoundId === round.id ? (
                    <div className="bg-gray-700/50 p-3 rounded-lg mb-3">
                      <div className="space-y-2 mb-3">
                        <input
                          type="number"
                          value={editRoundAmount}
                          onChange={(e) => setEditRoundAmount(e.target.value)}
                          placeholder="Số tiền"
                          className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white text-sm"
                        />
                        <input
                          type="text"
                          value={editRoundDescription}
                          onChange={(e) => setEditRoundDescription(e.target.value)}
                          placeholder="Mô tả"
                          className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white text-sm"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveRound(round.id)}
                          className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg"
                        >
                          Lưu
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded-lg"
                        >
                          Hủy
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between mb-2">
                        <h5 className="text-xs font-semibold text-gray-400">
                        📋 Đợt {index + 2} - {round.description} ({formatDate(round.date)})
                      </h5>
                      {isAdmin && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleStartEditRound(round)}
                            className="text-blue-400 hover:text-blue-300 text-xs"
                            title="Sửa"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDeleteRound(round.id)}
                            className="text-red-400 hover:text-red-300 text-xs"
                            title="Xóa"
                          >
                            🗑️
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="space-y-2 max-h-32 overflow-y-auto pr-2">
                    {round.contributions.map(c => (
                      <div key={c.id} className="flex items-center justify-between bg-gray-700/50 p-2 rounded-lg text-sm">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input 
                            type="checkbox"
                            checked={c.paid}
                            onChange={() => handleToggleAdditionalContribution(round.id, c.participant)}
                            disabled={!isAdmin || editingRoundId === round.id}
                            className="form-checkbox h-5 w-5 bg-gray-800 border-gray-600 rounded text-green-600 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                          <span className={`font-medium ${c.paid ? 'text-gray-400 line-through' : 'text-white'}`}>{c.participant}</span>
                        </label>
                        <span className="text-gray-300">{formatCurrency(c.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
      </div>
      
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-semibold text-gray-300">Số dư cuối cùng</h4>
          <button
            onClick={() => setIsBalanceExpanded(!isBalanceExpanded)}
            className="text-indigo-400 hover:text-indigo-300 transition-transform"
            style={{ transform: isBalanceExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
          >
            ▶
          </button>
        </div>
        {isBalanceExpanded && (
          <div className="space-y-2">
             {Object.entries(financialSummary.finalBalances).map(([name, balance]) => {
               const balanceNum = typeof balance === 'number' ? balance : 0;
               return (
                <div key={name} className="flex items-center justify-between bg-gray-700/50 p-2 rounded-lg text-sm">
                    <span className="font-medium text-white">{name}</span>
                    <span className={`font-bold ${balanceNum >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {balanceNum >= 0 ? `+` : ``}{formatCurrency(balanceNum)}
                    </span>
                </div>
               );
             })}
          </div>
        )}
      </div>

      <div className="mb-6">
        <h4 className="font-semibold text-gray-300 mb-2">Gợi ý thanh toán</h4>
        <div className="max-h-40 overflow-y-auto pr-2 space-y-2">
            {financialSummary.settledTransactions.length > 0 ? financialSummary.settledTransactions.map((t) => (
                <div key={`${t.from}->${t.to}-${t.amount}`} className="flex items-center justify-between bg-gray-700/50 p-2 rounded-lg text-sm">
                    <span className="font-medium text-red-300 truncate">{t.from}</span>
                    <span className="text-gray-400 mx-2 flex-shrink-0">&rarr;</span>
                    <span className="font-medium text-green-300 truncate">{t.to}</span>
                    <span className="font-bold text-white ml-auto flex-shrink-0">{formatCurrency(t.amount)}</span>
                </div>
            )) : <p className="text-gray-400 text-center text-sm">Tất cả công nợ đã được giải quyết!</p>}
        </div>
      </div>

      <div>
        <h4 className="font-semibold text-gray-300 mb-2">Chi phí gần đây</h4>
        <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
            {expenses.slice().reverse().map(e => (
                <div key={e.id} className="group flex justify-between items-center bg-gray-700/50 p-3 rounded-lg">
                    <div>
                        <p className="font-medium text-white">{e.description}</p>
                        <p className="text-xs text-gray-400">Ngày: {formatDate(e.date)} | Bởi {e.paidBy} ({e.category})</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <p className="font-bold text-lg text-indigo-300">{formatCurrency(e.amount)}</p>
                        {isAdmin && (
                            <div className="flex gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => openEditExpenseModal(e)}
                                    aria-label={`Sửa chi phí: ${e.description}`}
                                    className="text-xs text-yellow-400 hover:text-yellow-300"
                                >
                                    Sửa
                                </button>
                                <button
                                    onClick={() => setExpenseToDelete(e)}
                                    aria-label={`Xóa chi phí: ${e.description}`}
                                    className="text-xs text-red-400 hover:text-red-300"
                                >
                                    Xóa
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            ))}
            {expenses.length === 0 && <p className="text-gray-500 text-center text-sm">Chưa có chi phí nào.</p>}
        </div>
      </div>

      <Modal isOpen={isExpenseFormOpen} onClose={() => setIsExpenseFormOpen(false)} title={editingExpense ? "Chỉnh sửa chi phí" : "Thêm chi phí mới"}>
        <div className="space-y-4">
            <Input label="Mô tả" value={expenseDesc} onChange={e => setExpenseDesc(e.target.value)} placeholder="v.d., Bữa tối tại nhà hàng" />
            <div className="grid grid-cols-2 gap-4">
                <Input label="Số tiền (VNĐ)" type="number" value={expenseAmount} onChange={e => setExpenseAmount(e.target.value)} placeholder="500000" />
                <DateInput label="Ngày" value={expenseDate} onChange={setExpenseDate} min={trip.startDate} max={trip.endDate} />
            </div>
             <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Loại chi phí</label>
                <select value={expenseCategory} onChange={e => setExpenseCategory(e.target.value)} className="w-full bg-gray-800 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Thanh toán bởi</label>
                
                {/* Checkbox thanh toán từ quỹ */}
                <div className="mb-2 flex items-center gap-3 p-2 bg-indigo-600/10 border border-indigo-500/30 rounded-lg">
                  <input 
                    type="checkbox"
                    id="paid-from-fund"
                    checked={expensePaidFromFund}
                    onChange={(e) => setExpensePaidFromFund(e.target.checked)}
                    className="form-checkbox h-5 w-5 bg-gray-800 border-gray-600 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="paid-from-fund" className="text-sm text-gray-300 cursor-pointer">
                    💰 Thanh toán từ quỹ chung
                  </label>
                </div>
                
                {!expensePaidFromFund && (
                  <select value={expensePaidBy} onChange={e => setExpensePaidBy(e.target.value)} className="w-full bg-gray-800 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                      {participants.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                )}
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Chia cho ai?</label>
                <div className="grid grid-cols-2 gap-2">
                    {participants.map(p => (
                        <label key={p} className="flex items-center gap-2 bg-gray-700/50 p-2 rounded-lg cursor-pointer">
                            <input
                                type="checkbox"
                                checked={expenseParticipants.includes(p)}
                                onChange={() => handleParticipantToggle(p)}
                                className="form-checkbox h-4 w-4 bg-gray-800 border-gray-600 rounded text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="text-sm text-white">{p}</span>
                        </label>
                    ))}
                </div>
            </div>
            <Button onClick={handleSubmitExpense} className="w-full">{editingExpense ? "Lưu thay đổi" : "Thêm chi phí"}</Button>
        </div>
      </Modal>
      
      {/* Modal đóng thêm quỹ */}
      <Modal 
        isOpen={isAddFundModalOpen} 
        onClose={() => { 
          setIsAddFundModalOpen(false); 
          setAdditionalFundAmount('');
          setAdditionalFundDescription('');
          setSelectedFundParticipants(trip.participants);
        }} 
        title="Đóng thêm vào quỹ chung"
      >
        <div className="space-y-4">
          <Input 
            label="Số tiền đóng thêm mỗi người (VNĐ)" 
            type="number" 
            value={additionalFundAmount} 
            onChange={e => setAdditionalFundAmount(e.target.value)} 
            placeholder="300000" 
          />
          
          <Input 
            label="Mô tả (tùy chọn)" 
            value={additionalFundDescription} 
            onChange={e => setAdditionalFundDescription(e.target.value)} 
            placeholder="VD: Đóng thêm cho ăn uống" 
          />
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Ai cần đóng?</label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {participants.map(p => {
                const balance = financialSummary.finalBalances[p] || 0;
                return (
                  <label key={p} className="flex items-center justify-between bg-gray-700/50 p-3 rounded-lg cursor-pointer hover:bg-gray-700 transition">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedFundParticipants.includes(p)}
                        onChange={() => handleToggleFundParticipant(p)}
                        className="form-checkbox h-5 w-5 bg-gray-800 border-gray-600 rounded text-green-600 focus:ring-green-500"
                      />
                      <div>
                        <span className="text-sm font-medium text-white">{p}</span>
                        <div className="text-xs text-gray-400">
                          Số dư: <span className={balance >= 0 ? 'text-green-400' : 'text-red-400'}>
                            {balance >= 0 ? '+' : ''}{formatCurrency(balance)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
          
          <div className="p-3 bg-blue-600/10 border border-blue-500/30 rounded-lg text-sm text-gray-300">
            💡 Chọn những người cần đóng thêm quỹ. <strong>{selectedFundParticipants.length}/{participants.length} người</strong> được chọn.
            {selectedFundParticipants.length < participants.length && (
              <div className="mt-1 text-yellow-400">
                ⚠️ Người đã chi nhiều có thể bỏ tick để không phải đóng thêm.
              </div>
            )}
          </div>
          
          <Button onClick={handleAddFundContribution} className="w-full">
            Tạo đợt đóng thêm
          </Button>
        </div>
      </Modal>

      {/* Modal xác nhận xóa chi phí */}
      <Modal 
        isOpen={!!expenseToDelete} 
        onClose={() => setExpenseToDelete(null)} 
        title="Xác nhận xóa chi phí"
      >
        <div className="space-y-4">
          <p className="text-gray-300">
            Bạn có chắc muốn xóa chi phí này không?
          </p>
          {expenseToDelete && (
            <div className="bg-gray-700/50 p-3 rounded-lg">
              <p className="font-medium text-white">{expenseToDelete.description}</p>
              <p className="text-sm text-gray-400 mt-1">
                {formatCurrency(expenseToDelete.amount)} - {formatDate(expenseToDelete.date)}
              </p>
            </div>
          )}
          <div className="flex gap-3">
            <Button onClick={() => setExpenseToDelete(null)} variant="secondary" className="flex-1">
              Hủy
            </Button>
            <Button onClick={handleDeleteExpense} className="flex-1 bg-red-600 hover:bg-red-500">
              Xóa
            </Button>
          </div>
        </div>
      </Modal>

    </Card>
  );
});

Finances.displayName = 'Finances';

export default Finances;

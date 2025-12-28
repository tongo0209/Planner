import React from 'react';
import { Trip, formatCurrency } from '../types';
import { Card } from './ui';
import { WalletIcon, UsersIcon, CalendarIcon } from './icons';

interface TripStatsProps {
  trip: Trip;
}

const StatCard: React.FC<{ icon: React.ReactNode, label: string, value: string | number }> = ({ icon, label, value }) => (
    <div className="flex items-center gap-4 bg-gray-800/60 p-4 rounded-lg">
        <div className="text-indigo-400">
            {icon}
        </div>
        <div>
            <p className="text-sm text-gray-400">{label}</p>
            <p className="text-lg font-bold text-white">{value}</p>
        </div>
    </div>
);


const TripStats: React.FC<TripStatsProps> = ({ trip }) => {
  const totalSpent = trip.expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const numParticipants = trip.participants.length;
  const avgSpent = numParticipants > 0 ? totalSpent / numParticipants : 0;
  
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
  const duration = getDaysDuration();

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard 
            icon={<WalletIcon className="w-8 h-8"/>} 
            label="Tổng chi tiêu" 
            value={formatCurrency(totalSpent)}
        />
        <StatCard 
            icon={<UsersIcon className="w-8 h-8"/>} 
            label="Chi phí / người" 
            value={formatCurrency(avgSpent)}
        />
        <StatCard 
            icon={<UsersIcon className="w-8 h-8"/>} 
            label="Thành viên" 
            value={numParticipants}
        />
        <StatCard 
            icon={<CalendarIcon className="w-8 h-8"/>} 
            label="Thời gian" 
            value={`${duration} ngày`}
        />
    </div>
  );
};

export default TripStats;

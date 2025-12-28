import React, { useMemo } from 'react';
import { Expense, formatCurrency } from '../types';
import { Card } from './ui';
import { CalendarIcon } from './icons';

interface DailyExpenseChartProps {
  expenses: Expense[];
  startDate: string;
  endDate: string;
}

const BAR_COLORS = [
    'bg-sky-400',
    'bg-emerald-400',
    'bg-yellow-400',
    'bg-orange-400',
    'bg-pink-400',
    'bg-purple-400',
    'bg-indigo-400',
];

const DailyExpenseChart: React.FC<DailyExpenseChartProps> = ({ expenses, startDate, endDate }) => {
  const dailySummary = useMemo(() => {
    if (!expenses || !startDate || !endDate) {
      return { data: [], maxAmount: 0 };
    }

    const totalsByDate: Map<string, number> = new Map();
    const currentDate = new Date(startDate);
    const lastDate = new Date(endDate);
    
    // Initialize all dates of the trip with 0 amount
    while(currentDate <= lastDate) {
        totalsByDate.set(currentDate.toISOString().split('T')[0], 0);
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Sum expenses for each date
    expenses.forEach(expense => {
        const date = expense.date;
        if(totalsByDate.has(date)) {
            totalsByDate.set(date, (totalsByDate.get(date) || 0) + expense.amount);
        }
    });

    const data = Array.from(totalsByDate.entries())
        .map(([date, amount]) => ({
             date, 
             amount,
             // Format date for display, e.g., "Jul 20"
             label: new Date(date + 'T00:00:00').toLocaleDateString('vi-VN', { month: 'short', day: 'numeric' })
        }))
        .sort((a, b) => a.date.localeCompare(b.date));
        
    const maxAmount = data.length > 0 ? Math.max(...data.map(d => d.amount)) : 0;

    return { data, maxAmount };
  }, [expenses, startDate, endDate]);

  if (dailySummary.data.length === 0 || dailySummary.maxAmount === 0) {
    return null; // Don't render if no data or no expenses
  }

  return (
    <Card>
      <div className="flex items-center gap-3 mb-6">
        <CalendarIcon className="w-6 h-6 text-indigo-300" />
        <h3 className="text-xl font-bold text-white">Chi tiêu theo ngày</h3>
      </div>
      <div className="space-y-4">
        {dailySummary.data.map(({ label, amount }, index) => {
          const percentage = dailySummary.maxAmount > 0 ? (amount / dailySummary.maxAmount) * 100 : 0;
          const barColor = BAR_COLORS[index % BAR_COLORS.length];
          
          return (
            <div key={label} className="grid grid-cols-[80px_1fr_120px] items-center gap-3 text-sm animate-fade-in-up" style={{ animationDelay: `${index * 50}ms`}}>
                <div className="font-medium text-gray-300 truncate text-right">{label}</div>
                <div className="bg-gray-700 rounded-full h-5 w-full overflow-hidden">
                    <div
                        className={`${barColor} h-5 rounded-full transition-all duration-700 ease-in-out flex items-center justify-end pr-2 text-xs font-bold text-black/50`}
                        style={{ width: `${percentage}%` }}
                    >
                    </div>
                </div>
                <div className="font-semibold text-white text-left">{formatCurrency(amount)}</div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

export default DailyExpenseChart;

import React, { useMemo } from 'react';
import { Expense, formatCurrency } from '../types';
import { Card } from './ui';
import { WalletIcon } from './icons';

interface ExpenseChartProps {
  expenses: Expense[];
  participants: string[];
}

const BAR_COLORS = [
    'bg-sky-400',
    'bg-emerald-400',
    'bg-yellow-400',
    'bg-orange-400',
    'bg-pink-400',
    'bg-purple-400',
];

const ExpenseChart: React.FC<ExpenseChartProps> = ({ expenses, participants }) => {
  const [isExpanded, setIsExpanded] = React.useState(true);
  const expenseSummary = useMemo(() => {
    if (!expenses || expenses.length === 0) {
        return { data: [], maxAmount: 0 };
    }

    const totalsByPayer: { [key: string]: number } = {};
    participants.forEach(p => totalsByPayer[p] = 0);

    expenses.forEach(expense => {
      if (totalsByPayer[expense.paidBy] !== undefined) {
        totalsByPayer[expense.paidBy] += expense.amount;
      } else {
        // This case handles if a payer is not in the main participants list for some reason
        totalsByPayer[expense.paidBy] = expense.amount;
      }
    });

    const data = Object.entries(totalsByPayer)
        .map(([name, amount]) => ({ name, amount }))
        .filter(item => item.amount > 0)
        .sort((a, b) => b.amount - a.amount);
        
    const maxAmount = data.length > 0 ? Math.max(...data.map(d => d.amount)) : 0;

    return { data, maxAmount };
  }, [expenses, participants]);

  if (expenseSummary.data.length === 0) {
    return null; // Don't render the card if there are no expenses
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <WalletIcon className="w-6 h-6 text-indigo-300" />
          <h3 className="text-xl font-bold text-white">Chi tiêu theo người</h3>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-indigo-400 hover:text-indigo-300 transition-transform"
          style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
        >
          ▶
        </button>
      </div>
      {isExpanded && (
      <div className="space-y-4">
        {expenseSummary.data.map(({ name, amount }, index) => {
          const percentage = expenseSummary.maxAmount > 0 ? (amount / expenseSummary.maxAmount) * 100 : 0;
          const barColor = BAR_COLORS[index % BAR_COLORS.length];
          
          return (
            <div key={name} className="grid grid-cols-[80px_1fr_120px] items-center gap-3 text-sm animate-fade-in-up" style={{ animationDelay: `${index * 100}ms`}}>
                <div className="font-medium text-gray-300 truncate text-right">{name}</div>
                <div className="bg-gray-700 rounded-full h-5 w-full overflow-hidden">
                    <div
                        className={`${barColor} h-5 rounded-full transition-all duration-700 ease-in-out`}
                        style={{ width: `${percentage}%` }}
                    ></div>
                </div>
                <div className="font-semibold text-white text-left">{formatCurrency(amount)}</div>
            </div>
          );
        })}
      </div>
      )}
    </Card>
  );
};

export default ExpenseChart;

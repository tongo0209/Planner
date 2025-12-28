import React, { useMemo } from 'react';
import { Expense, formatCurrency } from '../types';
import { Card } from './ui';
import { ClipboardIcon } from './icons';

interface ExpenseCategoryChartProps {
  expenses: Expense[];
}

const CATEGORY_COLORS = [
    '#38bdf8', // sky-400
    '#34d399', // emerald-400
    '#facc15', // yellow-400
    '#fb923c', // orange-400
    '#f472b6', // pink-400
    '#c084fc', // purple-400
];

const ExpenseCategoryChart: React.FC<ExpenseCategoryChartProps> = ({ expenses }) => {
  const categorySummary = useMemo(() => {
    if (!expenses || expenses.length === 0) {
      return { data: [], total: 0 };
    }

    const totalsByCategory: { [key: string]: number } = {};
    let total = 0;

    expenses.forEach(expense => {
      totalsByCategory[expense.category] = (totalsByCategory[expense.category] || 0) + expense.amount;
      total += expense.amount;
    });

    const data = Object.entries(totalsByCategory)
      .map(([name, amount], index) => ({
        name,
        amount,
        percentage: total > 0 ? (amount / total) * 100 : 0,
        color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
      }))
      .sort((a, b) => b.amount - a.amount);

    return { data, total };
  }, [expenses]);

  if (categorySummary.data.length === 0) {
    return null;
  }
  
  const conicGradient = categorySummary.data.reduce((acc, item, index, arr) => {
    const startAngle = arr.slice(0, index).reduce((sum, prev) => sum + prev.percentage, 0);
    const endAngle = startAngle + item.percentage;
    return `${acc}, ${item.color} ${startAngle}% ${endAngle}%`;
  }, '');


  return (
    <Card>
      <div className="flex items-center gap-3 mb-6">
        <ClipboardIcon className="w-6 h-6 text-indigo-300" />
        <h3 className="text-xl font-bold text-white">Phân loại chi phí</h3>
      </div>
      <div className="flex flex-col md:flex-row items-center gap-6">
        <div className="relative w-40 h-40 flex-shrink-0">
          <div 
            className="w-full h-full rounded-full"
            style={{ background: `conic-gradient(${conicGradient})` }}
          ></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-24 h-24 bg-gray-800 rounded-full flex flex-col items-center justify-center text-center">
                <span className="text-xs text-gray-400">Tổng</span>
                <span className="font-bold text-white text-lg">{formatCurrency(categorySummary.total)}</span>
            </div>
          </div>
        </div>
        <div className="w-full space-y-3 max-h-40 overflow-y-auto pr-2">
          {categorySummary.data.map(({ name, amount, percentage, color }) => (
            <div key={name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }}></div>
                    <span className="text-gray-300">{name}</span>
                </div>
                <div className="font-semibold text-white">
                    {formatCurrency(amount)} <span className="text-sm font-bold text-gray-400">({percentage.toFixed(1)}%)</span>
                </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};

export default ExpenseCategoryChart;

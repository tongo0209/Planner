import React, { useMemo } from 'react';
import { Expense, formatCurrency } from '../types';
import { Card } from './ui';
import { ClipboardIcon } from './icons';

interface ExpenseCategoryChartProps {
  expenses: Expense[];
}

const CATEGORY_COLORS = [
  '#06b6d4', // teal-ish (darker)
  '#10b981', // emerald
  '#f59e0b', // amber
  '#f97316', // orange
  '#ec4899', // fuchsia
  '#8b5cf6', // indigo
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

    // Create sorted data first, then assign colors consistently
    const entries = Object.entries(totalsByCategory)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);

    const data = entries.map((entry, index) => ({
      ...entry,
      percentage: total > 0 ? (entry.amount / total) * 100 : 0,
      color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
    }));

    return { data, total };
  }, [expenses]);

  if (categorySummary.data.length === 0) return null;

  // Build conic-gradient string and create scoped CSS to avoid inline styles
  let angleAccumulator = 0;
  const conicSegments = categorySummary.data.map(item => {
    const start = angleAccumulator;
    angleAccumulator += item.percentage;
    const end = angleAccumulator;
    return `${item.color} ${start}% ${end}%`;
  }).join(', ');

  const uid = useMemo(() => `donut-${Math.random().toString(36).slice(2,9)}`, [conicSegments]);

  const generatedCSS = useMemo(() => {
    const segments = conicSegments || '';
    const swatchRules = categorySummary.data.map((d, i) => `.${uid}-swatch-${i}{background-color: ${d.color} !important;}`).join('\n');
    return `.${uid}{background: conic-gradient(${segments}) !important; transform: rotate(-90deg) !important;} .${uid}-inner{background: #081025 !important;} ${swatchRules}`;
  }, [conicSegments, categorySummary.data, uid]);

  return (
    <Card>
      <style>{generatedCSS}</style>
      <div className="flex items-center gap-3 mb-6">
        <ClipboardIcon className="w-6 h-6 text-indigo-300" />
        <h3 className="text-xl font-bold text-white">Phân loại chi phí</h3>
      </div>
      <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
        <div className="relative w-44 h-44 flex-shrink-0">
          <div className={`w-full h-full rounded-full shadow-[0_6px_18px_rgba(0,0,0,0.6)] ${uid}`} />

          {/* inner ring */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className={`w-32 h-32 rounded-full flex flex-col items-center justify-center text-center border border-gray-800 ${uid}-inner`}>
                <span className="text-xs text-gray-400">Tổng</span>
                <span className="font-bold text-white text-l">{formatCurrency(categorySummary.total)}</span>
            </div>
          </div>
        </div>

        <div className="w-full max-w-md">
          <div className="grid grid-cols-1 gap-3 max-h-56 overflow-y-auto pr-2">
            {categorySummary.data.map(({ name, amount, percentage }, idx) => (
              <div
                key={name}
                className="flex items-center justify-between bg-gray-800/40 hover:bg-gray-800/60 transition-colors rounded-md p-2"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full flex-shrink-0 shadow-sm ${uid}-swatch-${idx}`} />
                  <div>
                    <div className="text-sm text-gray-200 font-medium">{name}</div>
                    <div className="text-xs text-gray-400">{formatCurrency(amount)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-sm font-semibold text-white">{percentage.toFixed(1)}%</div>
                  <div className="w-8 h-5 text-xs flex items-center justify-center rounded bg-gray-700 text-gray-200">
                    {Math.round(percentage)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default ExpenseCategoryChart;

import { Workbook } from 'exceljs';
import { Trip, formatCurrency, formatDate } from '../types';

interface FinancialSummary {
  settledTransactions: Array<{ from: string; to: string; amount: number }>;
  finalBalances: { [key: string]: number };
  fundBalance: number;
  totalAllContributions: number;
  totalExpensesFromFund: number;
}

export const generateFinancialSummary = (trip: Trip, selectedTreasurer: string): FinancialSummary => {
  const userBalances: { [key: string]: number } = {};
  const { participants, expenses, contributions, additionalContributions } = trip;
  
  participants.forEach(p => userBalances[p] = 0);

  // Total fund collected (initial + additional rounds)
  const totalContributions = contributions
    .filter(c => c.paid)
    .reduce((sum, c) => sum + c.amount, 0);
  
  const totalAdditionalContributions = (additionalContributions || [])
    .flatMap(round => round.contributions)
    .filter(c => c.paid)
    .reduce((sum, c) => sum + c.amount, 0);
  
  const totalAllContributions = totalContributions + totalAdditionalContributions;

  // Total expenses
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  
  // Total expenses from fund
  const totalExpensesFromFund = expenses
    .filter(e => e.paidFromFund)
    .reduce((sum, e) => sum + e.amount, 0);
  
  // Fund balance
  const fundBalance = totalAllContributions - totalExpensesFromFund;

  participants.forEach(p => {
    const contributedToFund = contributions.find(c => c.participant === p && c.paid)?.amount || 0;
    const additionalContributed = (additionalContributions || [])
      .flatMap(round => round.contributions)
      .filter(c => c.participant === p && c.paid)
      .reduce((sum, c) => sum + c.amount, 0);
    
    const paidPersonally = expenses
      .filter(e => e.paidBy === p && !e.paidFromFund)
      .reduce((sum, e) => sum + e.amount, 0);
    
    const sharedExpenses = expenses
      .filter(e => e.participants.includes(p))
      .reduce((sum, e) => sum + (e.amount / e.participants.length), 0);

    userBalances[p] = contributedToFund + additionalContributed + paidPersonally - sharedExpenses;
  });

  const debtors = Object.entries(userBalances)
    .filter(([, balance]) => balance < 0)
    .map(([name, balance]) => ({ name, amount: -balance }));
  const creditors = Object.entries(userBalances)
    .filter(([, balance]) => balance > 0)
    .map(([name, balance]) => ({ name, amount: balance }));
  
  const transactions = [];

  if (selectedTreasurer && selectedTreasurer.trim() !== '') {
    debtors.forEach(debtor => {
      if (debtor.amount > 1) {
        transactions.push({ from: debtor.name, to: selectedTreasurer, amount: debtor.amount });
      }
    });
    
    creditors.forEach(creditor => {
      if (creditor.name !== selectedTreasurer && creditor.amount > 1) {
        transactions.push({ from: selectedTreasurer, to: creditor.name, amount: creditor.amount });
      }
    });
  } else {
    let i = 0, j = 0;
    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i];
      const creditor = creditors[j];
      const amount = Math.min(debtor.amount, creditor.amount);

      if (amount > 1) {
        transactions.push({ from: debtor.name, to: creditor.name, amount });
      }

      debtor.amount -= amount;
      creditor.amount -= amount;
      
      if (debtor.amount < 1) i++;
      if (creditor.amount < 1) j++;
    }
  }

  return { settledTransactions: transactions, finalBalances: userBalances, fundBalance, totalAllContributions, totalExpensesFromFund };
};

export const exportFinancesToExcel = (trip: Trip, selectedTreasurer: string = ''): void => {
  const financialSummary = generateFinancialSummary(trip, selectedTreasurer);
  const workbook = new Workbook();

  // ========== Sheet 1: Fund Summary ==========
  const fundSheet = workbook.addWorksheet('Tổng Hợp Quỹ');
  
  // Title
  const titleRow = fundSheet.addRow(['TỔNG HỢP QUỸ', '']);
  titleRow.height = 25;
  titleRow.getCell(1).font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
  titleRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
  titleRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
  
  fundSheet.addRow(['', '']);
  
  // Summary data
  const rows = [
    { label: 'Tổng quỹ đóng góp:', value: financialSummary.totalAllContributions },
    { label: 'Tổng chi từ quỹ:', value: financialSummary.totalExpensesFromFund },
    { label: 'Số dư quỹ hiện tại:', value: financialSummary.fundBalance },
  ];
  
  rows.forEach(row => {
    const r = fundSheet.addRow([row.label, formatCurrency(row.value)]);
    r.getCell(1).font = { bold: true, size: 11 };
    r.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E7FF' } };
    r.getCell(1).border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
    r.getCell(2).font = { bold: true, size: 11 };
    r.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E7FF' } };
    r.getCell(2).border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
    r.getCell(2).alignment = { horizontal: 'right' };
  });
  
  fundSheet.addRow(['', '']);
  
  const treasurerRow = fundSheet.addRow(['NGƯỜI QUẢN LÝ QUỸ', selectedTreasurer || 'Không có']);
  treasurerRow.getCell(1).font = { bold: true, size: 11 };
  treasurerRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
  treasurerRow.getCell(1).font!.color = { argb: 'FFFFFFFF' };
  treasurerRow.getCell(2).font = { size: 11 };
  treasurerRow.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E7FF' } };
  
  fundSheet.columns = [{ width: 30 }, { width: 25 }];

  // ========== Sheet 2: Fund Contributions ==========
  const fundContribSheet = workbook.addWorksheet('Quỹ Đóng Góp');
  
  const titleRow2 = fundContribSheet.addRow(['QUỸ ĐÓNG GÓP CHI TIẾT', '', '', '']);
  titleRow2.height = 25;
  titleRow2.getCell(1).font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
  titleRow2.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
  
  const headerRow = fundContribSheet.addRow(['Tên người', 'Quỹ lần 1', 'Quỹ lần 2+', 'Tổng cộng']);
  headerRow.height = 18;
  headerRow.eachCell(cell => {
    cell.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
  });

  trip.participants.forEach(p => {
    const initialFund = trip.contributions.find(c => c.participant === p && c.paid)?.amount || 0;
    const additionalFund = (trip.additionalContributions || [])
      .flatMap(round => round.contributions)
      .filter(c => c.participant === p && c.paid)
      .reduce((sum, c) => sum + c.amount, 0);
    
    const r = fundContribSheet.addRow([p, initialFund, additionalFund, initialFund + additionalFund]);
    r.getCell(1).border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
    for (let i = 2; i <= 4; i++) {
      r.getCell(i).numFmt = '#,##0';
      r.getCell(i).border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
      r.getCell(i).alignment = { horizontal: 'right' };
    }
  });
  
  fundContribSheet.columns = [{ width: 20 }, { width: 15 }, { width: 15 }, { width: 15 }];

  // ========== Sheet 3: Expense Details ==========
  const expenseSheet = workbook.addWorksheet('Chi Phí');
  
  const titleRow3 = expenseSheet.addRow(['CHI PHÍ THEO NGÀY', '', '', '', '', '']);
  titleRow3.height = 25;
  titleRow3.getCell(1).font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
  titleRow3.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
  
  const expenseHeaderRow = expenseSheet.addRow(['Ngày', 'Mô tả', 'Danh mục', 'Số tiền', 'Người trả', 'Ghi chú']);
  expenseHeaderRow.height = 18;
  expenseHeaderRow.eachCell(cell => {
    cell.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
  });

  const sortedExpenses = [...trip.expenses].sort((a, b) => a.date.localeCompare(b.date));
  
  sortedExpenses.forEach(expense => {
    const note = expense.paidFromFund ? '(Thanh toán từ quỹ)' : `(Chia cho ${expense.participants.length} người)`;
    const r = expenseSheet.addRow([formatDate(expense.date), expense.description, expense.category, expense.amount, expense.paidBy, note]);
    
    for (let i = 1; i <= 6; i++) {
      r.getCell(i).border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
    }
    r.getCell(4).numFmt = '#,##0';
    r.getCell(4).alignment = { horizontal: 'right' };
  });
  
  expenseSheet.columns = [{ width: 12 }, { width: 30 }, { width: 15 }, { width: 15 }, { width: 20 }, { width: 30 }];

  // ========== Sheet 4: Settlement ==========
  const settlementSheet = workbook.addWorksheet('Thanh Toán');
  
  const titleRow4 = settlementSheet.addRow(['THANH TOÁN - AI CHUYỂN CHO AI', '', '']);
  titleRow4.height = 25;
  titleRow4.getCell(1).font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
  titleRow4.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
  
  const settlementHeaderRow = settlementSheet.addRow(['Từ', 'Đến', 'Số tiền']);
  settlementHeaderRow.height = 18;
  settlementHeaderRow.eachCell(cell => {
    cell.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
  });

  financialSummary.settledTransactions.forEach(transaction => {
    const r = settlementSheet.addRow([transaction.from, transaction.to, transaction.amount]);
    
    for (let i = 1; i <= 3; i++) {
      r.getCell(i).border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
    }
    r.getCell(3).numFmt = '#,##0';
    r.getCell(3).alignment = { horizontal: 'right' };
  });
  
  settlementSheet.columns = [{ width: 20 }, { width: 20 }, { width: 15 }];

  // Write file
  const fileName = `${trip.name}_Tài_Chính_${new Date().toISOString().split('T')[0]}.xlsx`;
  workbook.xlsx.writeBuffer().then(buffer => {
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  });
};

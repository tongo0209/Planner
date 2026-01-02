export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  GUEST = 'guest',
}

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  password?: string; // For mock user management
}

export interface TimelineEvent {
  id: string;
  day: number;
  dayTitle?: string; // Custom title cho ngày (vd: "Ngày khám phá", "Ngày nghỉ ngơi")
  time: string;
  activity: string;
  description: string;
  location?: string; // Tên hiển thị ngắn (VD: "Bảo tàng")
  locationUrl?: string; // Link Google Maps đầy đủ
}

export interface Expense {
  id:string;
  description: string;
  amount: number;
  paidBy: string; // User's name or ID, or "Quỹ chung" for fund payments
  participants: string[]; // Array of user names or IDs
  category: string;
  date: string; // YYYY-MM-DD format
  paidFromFund?: boolean; // true nếu thanh toán từ quỹ chung
}

export interface PackingItem {
  id: string;
  item: string;
  packed: boolean;
}

export interface Contribution {
  id: string;
  participant: string;
  amount: number;
  paid: boolean;
}

export interface AdditionalContributionRound {
  id: string;
  amount: number;
  date: string;
  description: string;
  contributions: Contribution[];
}

export interface Trip {
  id: string;
  customId?: string; // ID ngắn gọn dễ chia sẻ (VD: "paris-a3x7k2")
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  coverImageUrl: string;
  managerId: string;
  timeline: TimelineEvent[];
  expenses: Expense[];
  packingList: PackingItem[];
  participants: string[]; // For financial calculations, just names for simplicity
  contributions: Contribution[];
  additionalContributions?: AdditionalContributionRound[]; // Các đợt đóng thêm quỹ
}

export interface WeatherInfo {
    location: string;
    temperature: number;
    condition: string;
    icon: string;
}

export interface TripCreationData {
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  coverImageUrl: string;
  managerId: string;
  participants: string[];
  contributionAmount: number;
}

export interface TripUpdateData {
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  coverImageUrl: string;
  managerId: string;
}

/**
 * Formats a number as a VND currency string.
 * @param amount The number to format.
 * @returns A string representing the amount in VND (e.g., "2.500.000 ₫").
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

/**
 * Formats an ISO date string (YYYY-MM-DD) to dd/mm/yyyy for UI display.
 * If input is falsy or not in expected format, returns the input unchanged.
 */
export const formatDate = (isoDate?: string): string => {
  if (!isoDate || typeof isoDate !== 'string') return '';
  // Expecting YYYY-MM-DD (may include time in ISO). Extract date part.
  const datePart = isoDate.split('T')[0];
  const parts = datePart.split('-');
  if (parts.length !== 3) return isoDate;
  const [year, month, day] = parts;
  return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
};

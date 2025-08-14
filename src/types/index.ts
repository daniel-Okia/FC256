// User Types
export type UserRole = 'admin' | 'manager' | 'member';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  phone?: string;
  dateJoined: string;
}

// Auth Types
export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  error: string | null;
}

// Member Types - Enhanced with more positions
export type Position = 
  | 'Goalkeeper' 
  | 'Centre-back'
  | 'Left-back'
  | 'Right-back'
  | 'Sweeper'
  | 'Defensive Midfielder'
  | 'Central Midfielder'
  | 'Attacking Midfielder'
  | 'Left Midfielder'
  | 'Right Midfielder'
  | 'Left Winger'
  | 'Right Winger'
  | 'Centre Forward'
  | 'Striker'
  | 'Second Striker'
  | 'Coach' 
  | 'Manager';

export type MemberStatus = 'active' | 'inactive' | 'injured' | 'suspended';

export interface Member {
  id: string;
  name: string;
  position: Position;
  jerseyNumber: number;
  email: string;
  phone: string;
  status: MemberStatus;
  dateJoined: string;
  avatarUrl?: string;
}

// Event Types
export type EventType = 'training' | 'friendly';

// Match Result Types
export type MatchResult = 'win' | 'draw' | 'loss';

export interface MatchDetails {
  // New simplified score fields
  fc256Score: number;
  opponentScore: number;
  result: MatchResult; // From FC256's perspective
  venue: 'home' | 'away' | 'neutral';
  
  // Team composition
  fc256Players?: number; // Number of players FC256 fielded
  opponentPlayers?: number; // Number of players opponent fielded
  
  // Player statistics
  goalScorers?: string[]; // Member IDs who scored
  assists?: string[]; // Member IDs who assisted
  yellowCards?: string[]; // Member IDs who received yellow cards
  redCards?: string[]; // Member IDs who received red cards
  manOfTheMatch?: string; // Member ID
  matchReport?: string; // Detailed match report
  attendance?: number; // Number of spectators
  
  // Legacy fields for backward compatibility
  homeScore?: number;
  awayScore?: number;
}

export interface Event {
  id: string;
  type: EventType;
  date: string;
  time: string;
  location: string;
  description?: string;
  opponent?: string; // For friendly matches
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  // Match result fields for completed friendlies
  isCompleted?: boolean;
  matchDetails?: MatchDetails;
}

// Attendance Types
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export interface Attendance {
  id: string;
  eventId: string;
  memberId: string;
  status: AttendanceStatus;
  notes?: string;
  recordedBy: string;
  recordedAt: string;
}

// Leadership Types - Expanded with comprehensive football club roles
export type LeadershipRole = 
  // Technical Staff
  | 'Head Coach' 
  | 'Assistant Coach' 
  | 'Goalkeeping Coach'
  | 'Fitness Trainer'
  | 'Physiotherapist'
  | 'Team Doctor'
  | 'Nutritionist'
  
  // Team Leadership
  | 'Captain' 
  | 'Vice Captain'
  | 'Team Leader'
  
  // Administrative Roles
  | 'Chairman'
  | 'Vice Chairman'
  | 'Team Manager' 
  | 'Secretary'
  | 'Treasurer'
  | 'Public Relations Officer'
  | 'Media Officer'
  
  // Equipment & Logistics
  | 'Equipment Manager'
  | 'Kit Manager'
  | 'Transport Coordinator'
  | 'Groundskeeper'
  
  // Disciplinary & Welfare
  | 'Disciplinary Officer'
  | 'Welfare Officer'
  | 'Player Liaison'
  | 'Youth Coordinator'
  
  // Match Officials & Support
  | 'Match Coordinator'
  | 'Scout'
  | 'Analyst'
  | 'Referee Liaison'
  
  // Social & Events
  | 'Social Secretary'
  | 'Events Coordinator'
  | 'Fundraising Officer'
  | 'Community Outreach Officer';

export interface Leadership {
  id: string;
  memberId: string;
  role: LeadershipRole;
  startDate: string;
  endDate?: string;
  isActive: boolean;
}

// Contribution Types
export type ContributionType = 'monetary' | 'in-kind';
export type PaymentMethod = 'cash' | 'bank transfer' | 'mobile money' | 'other';

export interface Contribution {
  id: string;
  memberId: string;
  eventId?: string;
  type: ContributionType;
  amount?: number; // Amount in UGX
  description: string;
  paymentMethod?: PaymentMethod;
  date: string;
  recordedBy: string;
  recordedAt: string;
}

// Expense Types
export type ExpenseCategory = 
  | 'equipment' 
  | 'transport' 
  | 'medical' 
  | 'facilities' 
  | 'referees' 
  | 'food' 
  | 'uniforms' 
  | 'training' 
  | 'administration' 
  | 'other';

export interface Expense {
  id: string;
  category: ExpenseCategory;
  amount: number; // Amount in UGX
  description: string;
  paymentMethod?: PaymentMethod;
  date: string;
  recordedBy: string;
  recordedAt: string;
  eventId?: string; // Optional link to specific event
  receipt?: string; // Optional receipt URL or reference
  fundingSource?: 'contributions' | 'membership_fees'; // Track funding source
}

// UI Types
export interface NavItem {
  name: string;
  path: string;
  icon: string;
  roles: UserRole[];
}

export interface Option {
  label: string;
  value: string;
}

export interface TableColumn<T> {
  key: keyof T | string;
  title: string;
  render?: (item: T) => React.ReactNode;
}

// Chart Data Types
export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
    borderWidth?: number;
  }[];
}

export interface PositionDistribution {
  position: string;
  count: number;
  percentage: number;
}

export interface FinancialTrend {
  month: string;
  contributions: number;
  expenses: number;
  net: number;
}

// Inventory Types
export type InventoryCategory = 
  | 'playing_equipment'
  | 'training_equipment' 
  | 'medical_supplies'
  | 'uniforms'
  | 'accessories'
  | 'maintenance'
  | 'other';

export type InventoryStatus = 'fully_stocked' | 'low_stock' | 'out_of_stock' | 'needs_replacement';
export type InventoryCondition = 'excellent' | 'good' | 'fair' | 'poor' | 'damaged';

export interface InventoryItem {
  id: string;
  name: string;
  category: InventoryCategory;
  description?: string;
  quantity: number;
  minQuantity: number; // Minimum stock level
  maxQuantity: number; // Maximum stock level
  status: InventoryStatus;
  condition: InventoryCondition;
  allocatedMembers: string[]; // Member IDs responsible for the equipment
  lastChecked: string;
  checkedBy: string;
  createdAt: string;
  updatedAt: string;
}

// Membership Fee Types
export type PaymentPeriod = '3_months' | '5_months' | '6_months' | '1_year';
export type PaymentStatus = 'paid' | 'pending' | 'overdue' | 'partial';
export type PaymentMethod = 'cash' | 'bank_transfer' | 'mobile_money' | 'other';

export interface MembershipFee {
  id: string;
  memberId: string;
  period: PaymentPeriod;
  amount: number; // Amount in UGX
  amountPaid: number; // Amount actually paid (for partial payments)
  status: PaymentStatus;
  paymentMethod?: PaymentMethod;
  startDate: string; // Period start date
  endDate: string; // Period end date
  dueDate: string; // Payment due date
  paidDate?: string; // Date payment was completed
  notes?: string;
  recordedBy: string;
  recordedAt: string;
  updatedAt: string;
}

export interface FeeStructure {
  period: PaymentPeriod;
  months: number;
  amount: number;
  savings: number;
  label: string;
  description: string;
}

interface PlayerAnalytics {
  member: Member;
  attendedSessions: number;
  totalSessions: number;
  totalSystemSessions: number;
  attendanceRate: number;
  systemWideAttendanceRate: number;
  lateArrivals: number;
  excusedAbsences: number;
  attendanceScore: number;
}
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

// Member Types
export type Position = 
  | 'Goalkeeper' 
  | 'Defender' 
  | 'Midfielder' 
  | 'Forward' 
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
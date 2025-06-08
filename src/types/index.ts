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

// Leadership Types
export type LeadershipRole = 
  | 'Head Coach' 
  | 'Assistant Coach' 
  | 'Team Manager' 
  | 'Captain' 
  | 'Vice Captain' 
  | 'Fitness Trainer';

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
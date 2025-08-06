import { UserRole } from '../types';

/**
 * Permission utility to check if a user can perform a specific action
 */
export const canUserAccess = (userRole: UserRole | undefined, allowedRoles: UserRole[]): boolean => {
  if (!userRole) return false;
  return allowedRoles.includes(userRole);
};

/**
 * Define role-based permissions for different actions
 */
export const Permissions = {
  // Auth permissions
  LOGIN: ['admin', 'manager', 'member'] as UserRole[],
  
  // Member permissions
  VIEW_MEMBERS: ['admin', 'manager', 'member'] as UserRole[],
  CREATE_MEMBER: ['admin', 'manager'] as UserRole[],
  EDIT_MEMBER: ['admin', 'manager'] as UserRole[],
  DELETE_MEMBER: ['admin', 'manager'] as UserRole[],
  
  // Event permissions
  VIEW_EVENTS: ['admin', 'manager', 'member'] as UserRole[], // Allow members to view events
  CREATE_EVENT: ['admin', 'manager'] as UserRole[],
  EDIT_EVENT: ['admin', 'manager'] as UserRole[],
  DELETE_EVENT: ['admin', 'manager'] as UserRole[],
  
  // Attendance permissions
  VIEW_ATTENDANCE: ['admin', 'manager', 'member'] as UserRole[], // Allow members to view attendance
  MARK_ATTENDANCE: ['admin', 'manager'] as UserRole[],
  
  // Leadership permissions
  VIEW_LEADERSHIP: ['admin', 'manager', 'member'] as UserRole[],
  MANAGE_LEADERSHIP: ['admin', 'manager'] as UserRole[],
  
  // Contribution and Expense permissions
  VIEW_CONTRIBUTIONS: ['admin', 'manager', 'member'] as UserRole[], // Allow members to view contributions
  CREATE_CONTRIBUTION: ['admin', 'manager'] as UserRole[],
  EDIT_CONTRIBUTION: ['admin', 'manager'] as UserRole[],
  DELETE_CONTRIBUTION: ['admin', 'manager'] as UserRole[],
  
  // Dashboard permissions
  VIEW_DASHBOARD: ['admin', 'manager', 'member'] as UserRole[],
  EXPORT_REPORTS: ['admin', 'manager'] as UserRole[],
  
  // Inventory permissions
  VIEW_INVENTORY: ['admin', 'manager', 'member'] as UserRole[],
  MANAGE_INVENTORY: ['admin', 'manager'] as UserRole[],
  
  // Membership Fee permissions
  VIEW_MEMBERSHIP_FEES: ['admin', 'manager', 'member'] as UserRole[],
  MANAGE_MEMBERSHIP_FEES: ['admin', 'manager'] as UserRole[],
  RECORD_FEE_PAYMENT: ['admin', 'manager'] as UserRole[],
};
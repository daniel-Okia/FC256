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
 * Members now have VIEW access to everything, but only admins can perform CRUD operations
 */
export const Permissions = {
  // Auth permissions
  LOGIN: ['admin', 'manager', 'member'] as UserRole[],
  
  // Member permissions - Members can view all, only admins can modify
  VIEW_MEMBERS: ['admin', 'manager', 'member'] as UserRole[],
  CREATE_MEMBER: ['admin'] as UserRole[], // Only admin
  EDIT_MEMBER: ['admin'] as UserRole[], // Only admin
  DELETE_MEMBER: ['admin'] as UserRole[], // Only admin
  
  // Event permissions - Members can view all, only admins can modify
  VIEW_EVENTS: ['admin', 'manager', 'member'] as UserRole[],
  CREATE_EVENT: ['admin'] as UserRole[], // Only admin
  EDIT_EVENT: ['admin'] as UserRole[], // Only admin
  DELETE_EVENT: ['admin'] as UserRole[], // Only admin
  
  // Attendance permissions - Members can view all, only admins can modify
  VIEW_ATTENDANCE: ['admin', 'manager', 'member'] as UserRole[],
  MARK_ATTENDANCE: ['admin'] as UserRole[], // Only admin
  
  // Leadership permissions - Members can view all, only admins can modify
  VIEW_LEADERSHIP: ['admin', 'manager', 'member'] as UserRole[],
  MANAGE_LEADERSHIP: ['admin'] as UserRole[], // Only admin
  
  // Contribution and Expense permissions - Members can view all, only admins can modify
  VIEW_CONTRIBUTIONS: ['admin', 'manager', 'member'] as UserRole[],
  CREATE_CONTRIBUTION: ['admin'] as UserRole[], // Only admin
  EDIT_CONTRIBUTION: ['admin'] as UserRole[], // Only admin
  DELETE_CONTRIBUTION: ['admin'] as UserRole[], // Only admin
  
  // Dashboard permissions - All can view, only admins can export
  VIEW_DASHBOARD: ['admin', 'manager', 'member'] as UserRole[],
  EXPORT_REPORTS: ['admin'] as UserRole[], // Only admin
};
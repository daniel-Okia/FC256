import { format, parseISO, isValid, isToday, isYesterday, getDay } from 'date-fns';

/**
 * Formats a date string to a human-readable format
 */
export const formatDate = (dateString: string, formatStr: string = 'MMM d, yyyy'): string => {
  try {
    const date = parseISO(dateString);
    if (!isValid(date)) {
      return 'Invalid date';
    }
    return format(date, formatStr);
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid date';
  }
};

/**
 * Formats a date and time string
 */
export const formatDateTime = (dateString: string): string => {
  try {
    const date = parseISO(dateString);
    if (!isValid(date)) {
      return 'Invalid date';
    }
    return format(date, 'MMM d, yyyy h:mm a');
  } catch (error) {
    console.error('Error formatting date time:', error);
    return 'Invalid date';
  }
};

/**
 * Returns a relative date string like "Today", "Yesterday", or the formatted date
 */
export const getRelativeDate = (dateString: string): string => {
  try {
    const date = parseISO(dateString);
    if (!isValid(date)) {
      return 'Invalid date';
    }
    
    if (isToday(date)) {
      return 'Today';
    }
    
    if (isYesterday(date)) {
      return 'Yesterday';
    }
    
    return format(date, 'MMM d, yyyy');
  } catch (error) {
    console.error('Error getting relative date:', error);
    return 'Invalid date';
  }
};

/**
 * Returns the day of the week
 */
export const getDayOfWeek = (dateString: string): string => {
  try {
    const date = parseISO(dateString);
    if (!isValid(date)) {
      return 'Invalid date';
    }
    
    return format(date, 'EEEE');
  } catch (error) {
    console.error('Error getting day of week:', error);
    return 'Invalid date';
  }
};

/**
 * Checks if the date is a Wednesday
 */
export const isWednesday = (dateString: string): boolean => {
  try {
    const date = parseISO(dateString);
    if (!isValid(date)) {
      return false;
    }
    
    return getDay(date) === 3; // 0 = Sunday, 3 = Wednesday
  } catch (error) {
    console.error('Error checking if date is Wednesday:', error);
    return false;
  }
};

/**
 * Checks if the date is a Saturday
 */
export const isSaturday = (dateString: string): boolean => {
  try {
    const date = parseISO(dateString);
    if (!isValid(date)) {
      return false;
    }
    
    return getDay(date) === 6; // 0 = Sunday, 6 = Saturday
  } catch (error) {
    console.error('Error checking if date is Saturday:', error);
    return false;
  }
};

/**
 * Returns an array of dates for the current month
 */
export const getDatesForCurrentMonth = (): Date[] => {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  
  const dates: Date[] = [];
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  for (let i = 1; i <= daysInMonth; i++) {
    const date = new Date(year, month, i);
    dates.push(date);
  }
  
  return dates;
};
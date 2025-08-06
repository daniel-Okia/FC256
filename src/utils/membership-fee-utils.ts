import { PaymentPeriod, FeeStructure, MembershipFee, PaymentStatus } from '../types';

/**
 * Fee structure configuration for FC256
 */
export const FEE_STRUCTURES: FeeStructure[] = [
  {
    period: '3_months',
    months: 3,
    amount: 45000,
    savings: 0,
    label: '3 Months',
    description: 'Quarterly payment - Standard rate'
  },
  {
    period: '5_months',
    months: 5,
    amount: 75000,
    savings: 0,
    label: '5 Months',
    description: 'Special period - August to December 2024'
  },
  {
    period: '6_months',
    months: 6,
    amount: 75000,
    savings: 15000,
    label: '6 Months',
    description: 'Semi-annual payment - Save UGX 15,000'
  },
  {
    period: '1_year',
    months: 12,
    amount: 150000,
    savings: 30000,
    label: '1 Year',
    description: 'Annual payment - Save UGX 30,000'
  }
];

/**
 * Get fee structure by period
 */
export const getFeeStructure = (period: PaymentPeriod): FeeStructure | null => {
  return FEE_STRUCTURES.find(structure => structure.period === period) || null;
};

/**
 * Calculate fee amount for a given period
 */
export const calculateFeeAmount = (period: PaymentPeriod): number => {
  const structure = getFeeStructure(period);
  return structure ? structure.amount : 0;
};

/**
 * Calculate period dates based on start date and period
 */
export const calculatePeriodDates = (startDate: string, period: PaymentPeriod): {
  startDate: string;
  endDate: string;
  dueDate: string;
} => {
  const start = new Date(startDate);
  const structure = getFeeStructure(period);
  
  if (!structure) {
    throw new Error(`Invalid payment period: ${period}`);
  }
  
  // Calculate end date
  const end = new Date(start);
  end.setMonth(end.getMonth() + structure.months);
  end.setDate(end.getDate() - 1); // End on the last day of the period
  
  // Calculate due date (7 days before period starts)
  const due = new Date(start);
  due.setDate(due.getDate() - 7);
  
  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
    dueDate: due.toISOString().split('T')[0],
  };
};

/**
 * Determine payment status based on dates and amounts
 */
export const determinePaymentStatus = (fee: MembershipFee): PaymentStatus => {
  const now = new Date();
  const dueDate = new Date(fee.dueDate);
  const endDate = new Date(fee.endDate);
  
  // If fully paid
  if (fee.amountPaid >= fee.amount) {
    return 'paid';
  }
  
  // If partially paid
  if (fee.amountPaid > 0 && fee.amountPaid < fee.amount) {
    return 'partial';
  }
  
  // If past due date and not paid
  if (now > dueDate && fee.amountPaid === 0) {
    return 'overdue';
  }
  
  // If within payment window
  return 'pending';
};

/**
 * Get payment status color for UI
 */
export const getPaymentStatusColor = (status: PaymentStatus): string => {
  switch (status) {
    case 'paid':
      return 'success';
    case 'pending':
      return 'info';
    case 'partial':
      return 'warning';
    case 'overdue':
      return 'danger';
    default:
      return 'default';
  }
};

/**
 * Calculate remaining balance for a fee
 */
export const calculateRemainingBalance = (fee: MembershipFee): number => {
  return Math.max(0, fee.amount - fee.amountPaid);
};

/**
 * Get current active period for new payments (August 2024 start)
 */
export const getCurrentPeriodStart = (): string => {
  // Since the system started in August 2024, use that as the base
  const augustStart = new Date('2024-08-01');
  const now = new Date();
  
  // If we're still in the first year (2024), return August 2024
  if (now.getFullYear() === 2024) {
    return augustStart.toISOString().split('T')[0];
  }
  
  // For subsequent years, start from January
  return new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
};

/**
 * Check if member has active/valid membership
 */
export const hasActiveMembership = (memberFees: MembershipFee[]): boolean => {
  const now = new Date();
  
  return memberFees.some(fee => {
    const endDate = new Date(fee.endDate);
    return fee.status === 'paid' && endDate >= now;
  });
};

/**
 * Get member's current membership status
 */
export const getMembershipStatus = (memberFees: MembershipFee[]): {
  status: 'active' | 'expired' | 'pending' | 'overdue';
  currentFee?: MembershipFee;
  expiryDate?: string;
} => {
  const now = new Date();
  
  // Find the most recent fee that covers the current date
  const activeFee = memberFees.find(fee => {
    const startDate = new Date(fee.startDate);
    const endDate = new Date(fee.endDate);
    return startDate <= now && endDate >= now;
  });
  
  if (activeFee) {
    if (activeFee.status === 'paid') {
      return {
        status: 'active',
        currentFee: activeFee,
        expiryDate: activeFee.endDate,
      };
    } else if (activeFee.status === 'partial') {
      return {
        status: 'pending',
        currentFee: activeFee,
      };
    } else if (activeFee.status === 'overdue') {
      return {
        status: 'overdue',
        currentFee: activeFee,
      };
    }
  }
  
  // Check if there's a future fee that's paid
  const futureFee = memberFees.find(fee => {
    const startDate = new Date(fee.startDate);
    return startDate > now && fee.status === 'paid';
  });
  
  if (futureFee) {
    return {
      status: 'active',
      currentFee: futureFee,
      expiryDate: futureFee.endDate,
    };
  }
  
  // Check if membership has expired
  const latestFee = memberFees
    .sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime())[0];
  
  if (latestFee && new Date(latestFee.endDate) < now) {
    return {
      status: 'expired',
      currentFee: latestFee,
    };
  }
  
  return {
    status: 'pending',
  };
};
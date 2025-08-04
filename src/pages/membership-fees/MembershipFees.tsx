import React, { useState, useEffect } from 'react';
import { DollarSign, Plus, Edit, Trash2, Download, Calendar, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { MembershipFeeService, MemberService } from '../../services/firestore';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/common/EmptyState';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { MembershipFee, Member, MembershipPeriod, PaymentMethod, MembershipStatus as MembershipStatusType } from '../../types';
import { formatDate } from '../../utils/date-utils';
import { formatUGX } from '../../utils/currency-utils';
import { canUserAccess, Permissions } from '../../utils/permissions';
import { useForm } from 'react-hook-form';

interface MembershipFeeFormData {
  memberId: string;
  period: MembershipPeriod;
  paymentDate: string;
  periodCovered: string;
  paymentMethod: PaymentMethod;
  notes?: string;
}

interface MembershipStatusData {
  memberId: string;
  member: Member;
  currentStatus: MembershipStatusType;
  lastPaymentDate?: string;
  lastPeriodCovered?: string;
  monthsOwed: number;
  totalOwed: number;
  paidPeriods: string[];
  nextDueDate: string;
}

const MONTHLY_FEE = 15000; // UGX 15,000 per month
const QUARTERLY_FEE = MONTHLY_FEE * 3; // UGX 45,000 per quarter

const MembershipFees: React.FC = () => {
  const { user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [membershipFees, setMembershipFees] = useState<MembershipFee[]>([]);
  const [membershipStatuses, setMembershipStatuses] = useState<MembershipStatusData[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFee, setEditingFee] = useState<MembershipFee | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [feeToDelete, setFeeToDelete] = useState<MembershipFee | null>(null);
  const [activeTab, setActiveTab] = useState<'status' | 'payments'>('status');

  const canManageFees = user && canUserAccess(user.role, Permissions.MANAGE_MEMBERSHIP_FEES);
  const canExport = user && canUserAccess(user.role, Permissions.EXPORT_REPORTS);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<MembershipFeeFormData>();

  const watchPeriod = watch('period');

  // Load data from Firestore
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [membersData, feesData] = await Promise.all([
          MemberService.getAllMembers(),
          MembershipFeeService.getAllMembershipFees(),
        ]);
        setMembers(membersData);
        setMembershipFees(feesData);
        
        // Calculate membership statuses
        const statuses = calculateMembershipStatuses(membersData, feesData);
        setMembershipStatuses(statuses);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();

    // Set up real-time listeners
    const unsubscribeMembers = MemberService.subscribeToMembers(setMembers);
    const unsubscribeFees = MembershipFeeService.subscribeToMembershipFees((fees) => {
      setMembershipFees(fees);
      // Recalculate statuses when fees change
      const statuses = calculateMembershipStatuses(members, fees);
      setMembershipStatuses(statuses);
      setLoading(false);
    });

    return () => {
      unsubscribeMembers();
      unsubscribeFees();
    };
  }, [members]);

  const calculateMembershipStatuses = (membersData: Member[], feesData: MembershipFee[]): MembershipStatusData[] => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1; // 1-12
    const currentYear = currentDate.getFullYear();
    const currentPeriod = `${currentYear}-${currentMonth.toString().padStart(2, '0')}`;

    return membersData
      .filter(member => member.status === 'active') // Only track active members
      .map(member => {
        const memberFees = feesData.filter(fee => fee.memberId === member.id);
        
        // Get all paid periods
        const paidPeriods = memberFees.map(fee => fee.periodCovered).sort();
        
        // Find last payment
        const lastPayment = memberFees
          .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())[0];
        
        // Calculate months owed (simplified - count from member join date to current)
        const joinDate = new Date(member.dateJoined);
        const monthsSinceJoining = (currentYear - joinDate.getFullYear()) * 12 + (currentMonth - (joinDate.getMonth() + 1)) + 1;
        const monthsPaid = paidPeriods.length;
        const monthsOwed = Math.max(0, monthsSinceJoining - monthsPaid);
        
        // Determine status
        let status: MembershipStatusType = 'current';
        if (monthsOwed > 0) {
          status = 'overdue';
        } else if (monthsPaid > monthsSinceJoining) {
          status = 'paid_ahead';
        }
        
        // Calculate next due date
        const nextDueDate = new Date(currentYear, currentMonth, 1); // First day of next month
        
        return {
          memberId: member.id,
          member,
          currentStatus: status,
          lastPaymentDate: lastPayment?.paymentDate,
          lastPeriodCovered: lastPayment?.periodCovered,
          monthsOwed,
          totalOwed: monthsOwed * MONTHLY_FEE,
          paidPeriods,
          nextDueDate: nextDueDate.toISOString().split('T')[0],
        };
      })
      .sort((a, b) => a.member.name.toLowerCase().localeCompare(b.member.name.toLowerCase()));
  };

  const memberOptions = members
    .filter(m => m.status === 'active')
    .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()))
    .map(member => ({
      value: member.id,
      label: `${member.name} (#${member.jerseyNumber})`,
    }));

  const periodOptions = [
    { value: 'monthly', label: 'Monthly (UGX 15,000)' },
    { value: 'quarterly', label: 'Quarterly (UGX 45,000)' },
  ];

  const paymentMethodOptions = [
    { value: 'cash', label: 'Cash' },
    { value: 'bank transfer', label: 'Bank Transfer' },
    { value: 'mobile money', label: 'Mobile Money' },
    { value: 'other', label: 'Other' },
  ];

  const getStatusBadgeVariant = (status: MembershipStatusType) => {
    switch (status) {
      case 'current':
        return 'success';
      case 'overdue':
        return 'danger';
      case 'paid_ahead':
        return 'info';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: MembershipStatusType) => {
    switch (status) {
      case 'current':
        return <CheckCircle size={16} className="text-green-600" />;
      case 'overdue':
        return <AlertCircle size={16} className="text-red-600" />;
      case 'paid_ahead':
        return <Clock size={16} className="text-blue-600" />;
      default:
        return null;
    }
  };

  const generatePeriodCovered = (period: MembershipPeriod, paymentDate: string): string => {
    const date = new Date(paymentDate);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;

    if (period === 'monthly') {
      return `${year}-${month.toString().padStart(2, '0')}`;
    } else {
      const quarter = Math.ceil(month / 3);
      return `${year}-Q${quarter}`;
    }
  };

  const statusColumns = [
    {
      key: 'member',
      title: 'Member',
      render: (status: MembershipStatusData) => (
        <div className="flex items-center">
          <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-primary-100 via-yellow-100 to-secondary-100 dark:from-primary-900/30 dark:via-yellow-900/20 dark:to-secondary-900/30 rounded-full flex items-center justify-center border border-yellow-200 dark:border-yellow-800/30 mr-3">
            <span className="text-sm font-bold text-primary-600 dark:text-primary-400">
              #{status.member.jerseyNumber}
            </span>
          </div>
          <div>
            <div className="font-medium text-gray-900 dark:text-white">
              {status.member.name}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {status.member.position}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      render: (status: MembershipStatusData) => (
        <div className="flex items-center space-x-2">
          {getStatusIcon(status.currentStatus)}
          <Badge variant={getStatusBadgeVariant(status.currentStatus)} className="capitalize">
            {status.currentStatus.replace('_', ' ')}
          </Badge>
        </div>
      ),
    },
    {
      key: 'lastPayment',
      title: 'Last Payment',
      render: (status: MembershipStatusData) => (
        <div>
          {status.lastPaymentDate ? (
            <>
              <div className="font-medium text-gray-900 dark:text-white">
                {formatDate(status.lastPaymentDate)}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Period: {status.lastPeriodCovered}
              </div>
            </>
          ) : (
            <span className="text-gray-500 dark:text-gray-400">No payments</span>
          )}
        </div>
      ),
    },
    {
      key: 'owed',
      title: 'Amount Owed',
      render: (status: MembershipStatusData) => (
        <div>
          <div className={`font-medium ${status.monthsOwed > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
            {status.monthsOwed > 0 ? formatUGX(status.totalOwed) : 'Paid Up'}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {status.monthsOwed} month{status.monthsOwed !== 1 ? 's' : ''} behind
          </div>
        </div>
      ),
    },
    {
      key: 'paidPeriods',
      title: 'Paid Periods',
      render: (status: MembershipStatusData) => (
        <div>
          <div className="font-medium text-gray-900 dark:text-white">
            {status.paidPeriods.length} periods
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {formatUGX(status.paidPeriods.length * MONTHLY_FEE)} total
          </div>
        </div>
      ),
    },
  ];

  const paymentColumns = [
    {
      key: 'member',
      title: 'Member',
      render: (fee: MembershipFee) => {
        const member = members.find(m => m.id === fee.memberId);
        return member ? (
          <div>
            <div className="font-medium text-gray-900 dark:text-white">
              {member.name}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              #{member.jerseyNumber} • {member.position}
            </div>
          </div>
        ) : (
          'Unknown Member'
        );
      },
    },
    {
      key: 'period',
      title: 'Period',
      render: (fee: MembershipFee) => (
        <div>
          <Badge variant={fee.period === 'monthly' ? 'info' : 'warning'} className="capitalize mb-1">
            {fee.period}
          </Badge>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {fee.periodCovered}
          </div>
        </div>
      ),
    },
    {
      key: 'amount',
      title: 'Amount',
      render: (fee: MembershipFee) => (
        <div className="font-medium text-green-600 dark:text-green-400">
          {formatUGX(fee.amount)}
        </div>
      ),
    },
    {
      key: 'paymentDate',
      title: 'Payment Date',
      render: (fee: MembershipFee) => formatDate(fee.paymentDate),
    },
    {
      key: 'paymentMethod',
      title: 'Payment Method',
      render: (fee: MembershipFee) => (
        <span className="capitalize">{fee.paymentMethod}</span>
      ),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (fee: MembershipFee) => (
        <div className="flex space-x-2">
          {canManageFees && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEdit(fee);
                }}
              >
                <Edit size={16} />
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteClick(fee);
                }}
              >
                <Trash2 size={16} />
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  const handleCreate = () => {
    setEditingFee(null);
    reset({
      memberId: '',
      period: 'monthly',
      paymentDate: new Date().toISOString().split('T')[0],
      periodCovered: '',
      paymentMethod: 'cash',
      notes: '',
    });
    setIsModalOpen(true);
  };

  const handleEdit = (fee: MembershipFee) => {
    setEditingFee(fee);
    setValue('memberId', fee.memberId);
    setValue('period', fee.period);
    setValue('paymentDate', fee.paymentDate.split('T')[0]);
    setValue('periodCovered', fee.periodCovered);
    setValue('paymentMethod', fee.paymentMethod);
    setValue('notes', fee.notes || '');
    setIsModalOpen(true);
  };

  const handleDeleteClick = (fee: MembershipFee) => {
    setFeeToDelete(fee);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (feeToDelete) {
      try {
        await MembershipFeeService.deleteMembershipFee(feeToDelete.id);
        setIsDeleteModalOpen(false);
        setFeeToDelete(null);
      } catch (error) {
        console.error('Error deleting membership fee:', error);
      }
    }
  };

  const onSubmit = async (data: MembershipFeeFormData) => {
    try {
      setSubmitting(true);
      
      const amount = data.period === 'monthly' ? MONTHLY_FEE : QUARTERLY_FEE;
      const periodCovered = data.periodCovered || generatePeriodCovered(data.period, data.paymentDate);
      
      const feeData = {
        memberId: data.memberId,
        period: data.period,
        amount,
        paymentDate: new Date(data.paymentDate).toISOString(),
        periodCovered,
        paymentMethod: data.paymentMethod,
        notes: data.notes || '',
        recordedBy: user?.id || '',
        recordedAt: new Date().toISOString(),
      };

      if (editingFee) {
        await MembershipFeeService.updateMembershipFee(editingFee.id, feeData);
      } else {
        await MembershipFeeService.createMembershipFee(feeData);
      }

      setIsModalOpen(false);
      reset();
    } catch (error) {
      console.error('Error saving membership fee:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      // TODO: Implement membership fees PDF export
      console.log('Exporting membership fees...');
    } catch (error) {
      console.error('Error exporting membership fees:', error);
    } finally {
      setExporting(false);
    }
  };

  // Calculate statistics
  const totalCollected = membershipFees.reduce((sum, fee) => sum + fee.amount, 0);
  const currentMembers = membershipStatuses.filter(s => s.currentStatus === 'current').length;
  const overdueMembers = membershipStatuses.filter(s => s.currentStatus === 'overdue').length;
  const totalOwed = membershipStatuses.reduce((sum, s) => sum + s.totalOwed, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Membership Fees"
        description={`Track monthly and quarterly membership fee payments (UGX 15,000/month)`}
        actions={
          <div className="flex space-x-2">
            {canManageFees && (
              <Button 
                onClick={handleCreate} 
                leftIcon={<Plus size={18} />}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Record Payment
              </Button>
            )}
            {canExport && (
              <Button
                onClick={handleExport}
                leftIcon={<Download size={18} />}
                isLoading={exporting}
                variant="outline"
              >
                Export PDF
              </Button>
            )}
          </div>
        }
      />

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600 dark:text-green-400">
                Total Collected
              </p>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                {formatUGX(totalCollected)}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
        </div>
        
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                Current Members
              </p>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                {currentMembers}
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
        </div>
        
        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border border-red-200 dark:border-red-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-600 dark:text-red-400">
                Overdue Members
              </p>
              <p className="text-2xl font-bold text-red-900 dark:text-red-100">
                {overdueMembers}
              </p>
            </div>
            <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
        </div>
        
        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                Total Outstanding
              </p>
              <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">
                {formatUGX(totalOwed)}
              </p>
            </div>
            <Clock className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
          </div>
        </div>
      </div>

      {/* Fee Structure Info */}
      <Card className="mb-6 bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 border border-blue-200 dark:border-blue-800">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Membership Fee Structure
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-neutral-800 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                {formatUGX(MONTHLY_FEE)}
              </div>
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Monthly Payment</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Due every month</div>
            </div>
            <div className="bg-white dark:bg-neutral-800 rounded-lg p-4 border border-green-200 dark:border-green-700">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400 mb-2">
                {formatUGX(QUARTERLY_FEE)}
              </div>
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Quarterly Payment</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Due every 3 months</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8">
            {[
              { key: 'status', label: 'Member Status', count: membershipStatuses.length },
              { key: 'payments', label: 'Payment History', count: membershipFees.length },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.key
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </nav>
        </div>
      </div>

      <Card>
        {activeTab === 'status' ? (
          membershipStatuses.length > 0 ? (
            <Table
              data={membershipStatuses}
              columns={statusColumns}
              onRowClick={(status) => console.log('Clicked status:', status)}
            />
          ) : (
            <EmptyState
              title="No membership status data"
              description="No active members found to track membership fees."
              icon={<DollarSign size={24} />}
            />
          )
        ) : (
          membershipFees.length > 0 ? (
            <Table
              data={membershipFees}
              columns={paymentColumns}
              onRowClick={(fee) => console.log('Clicked fee:', fee)}
            />
          ) : (
            <EmptyState
              title="No membership fee payments"
              description="No membership fee payments have been recorded yet."
              icon={<DollarSign size={24} />}
              action={
                canManageFees
                  ? {
                      label: 'Record First Payment',
                      onClick: handleCreate,
                    }
                  : undefined
              }
            />
          )
        )}
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingFee ? 'Edit Membership Fee Payment' : 'Record Membership Fee Payment'}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Select
            label="Member"
            options={memberOptions}
            placeholder="Select a team member"
            error={errors.memberId?.message}
            required
            {...register('memberId', { required: 'Member is required' })}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Select
              label="Payment Period"
              options={periodOptions}
              placeholder="Select payment period"
              error={errors.period?.message}
              required
              {...register('period', { required: 'Payment period is required' })}
            />

            <Input
              label="Payment Date"
              type="date"
              error={errors.paymentDate?.message}
              required
              {...register('paymentDate', { required: 'Payment date is required' })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Period Covered"
              placeholder={watchPeriod === 'monthly' ? 'e.g., 2024-01' : 'e.g., 2024-Q1'}
              error={errors.periodCovered?.message}
              helperText={watchPeriod === 'monthly' ? 'Format: YYYY-MM (e.g., 2024-01 for January 2024)' : 'Format: YYYY-QX (e.g., 2024-Q1 for Q1 2024)'}
              {...register('periodCovered')}
            />

            <Select
              label="Payment Method"
              options={paymentMethodOptions}
              placeholder="Select payment method"
              error={errors.paymentMethod?.message}
              required
              {...register('paymentMethod', { required: 'Payment method is required' })}
            />
          </div>

          <Input
            label="Notes (Optional)"
            placeholder="Additional notes about the payment..."
            error={errors.notes?.message}
            {...register('notes')}
          />

          {/* Payment Summary */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
              Payment Summary
            </h4>
            <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
              <p><strong>Amount:</strong> {formatUGX(watchPeriod === 'monthly' ? MONTHLY_FEE : QUARTERLY_FEE)}</p>
              <p><strong>Period:</strong> {watchPeriod === 'monthly' ? 'Monthly' : 'Quarterly'}</p>
              {watchPeriod === 'quarterly' && (
                <p><strong>Covers:</strong> 3 months (equivalent to 3 monthly payments)</p>
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              isLoading={submitting}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {editingFee ? 'Update Payment' : 'Record Payment'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Membership Fee Payment"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-300">
            Are you sure you want to delete this membership fee payment? This action cannot be undone.
          </p>
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              variant="outline"
              onClick={() => setIsDeleteModalOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              Delete Payment
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default MembershipFees;
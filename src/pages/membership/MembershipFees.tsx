import React, { useState, useEffect } from 'react';
import { CreditCard, Plus, Edit, Trash2, Eye, AlertTriangle, Download, Calendar, DollarSign, Users, TrendingUp, Clock } from 'lucide-react';
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
import { MembershipFee, Member, PaymentPeriod, PaymentStatus, PaymentMethod } from '../../types';
import { formatDate } from '../../utils/date-utils';
import { formatUGX } from '../../utils/currency-utils';
import { canUserAccess, Permissions } from '../../utils/permissions';
import { 
  FEE_STRUCTURES, 
  calculatePeriodDates, 
  calculateRemainingBalance,
  getPaymentStatusColor,
  getMembershipStatus,
  getCurrentPeriodStart
} from '../../utils/membership-fee-utils';
import { useForm } from 'react-hook-form';

interface MembershipFeeFormData {
  memberId: string;
  period: PaymentPeriod;
  startDate: string;
  amountPaid: number;
  paymentMethod?: PaymentMethod;
  notes?: string;
}

interface PaymentFormData {
  amountPaid: number;
  paymentMethod: PaymentMethod;
  paidDate: string;
  notes?: string;
}

interface MemberWithFeeStatus {
  member: Member;
  currentFee?: MembershipFee;
  status: 'active' | 'expired' | 'pending' | 'overdue';
  expiryDate?: string;
  totalPaid: number;
  totalOwed: number;
}

const MembershipFees: React.FC = () => {
  const { user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [membershipFees, setMembershipFees] = useState<MembershipFee[]>([]);
  const [membersWithStatus, setMembersWithStatus] = useState<MemberWithFeeStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingFee, setEditingFee] = useState<MembershipFee | null>(null);
  const [selectedFee, setSelectedFee] = useState<MembershipFee | null>(null);
  const [feeToDelete, setFeeToDelete] = useState<MembershipFee | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'fees' | 'payments'>('overview');

  const canManageFees = user && canUserAccess(user.role, Permissions.MANAGE_MEMBERSHIP_FEES);
  const canRecordPayment = user && canUserAccess(user.role, Permissions.RECORD_FEE_PAYMENT);
  const canExport = user && canUserAccess(user.role, Permissions.EXPORT_REPORTS);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<MembershipFeeFormData>();

  const {
    register: registerPayment,
    handleSubmit: handleSubmitPayment,
    reset: resetPayment,
    setValue: setValuePayment,
    formState: { errors: errorsPayment },
  } = useForm<PaymentFormData>();

  const watchPeriod = watch('period');
  const watchStartDate = watch('startDate');

  // Load data
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
      } catch (error) {
        console.error('Error loading membership fee data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();

    // Set up real-time listeners
    const unsubscribeMembers = MemberService.subscribeToMembers(setMembers);
    const unsubscribeFees = MembershipFeeService.subscribeToMembershipFees(setMembershipFees);

    return () => {
      unsubscribeMembers();
      unsubscribeFees();
    };
  }, []);

  // Calculate member status with fees
  useEffect(() => {
    if (members.length > 0) {
      const membersWithFeeStatus: MemberWithFeeStatus[] = members.map(member => {
        const memberFees = membershipFees.filter(fee => fee.memberId === member.id);
        const membershipStatus = getMembershipStatus(memberFees);
        
        const totalPaid = memberFees.reduce((sum, fee) => sum + fee.amountPaid, 0);
        const totalOwed = memberFees.reduce((sum, fee) => sum + calculateRemainingBalance(fee), 0);
        
        return {
          member,
          currentFee: membershipStatus.currentFee,
          status: membershipStatus.status,
          expiryDate: membershipStatus.expiryDate,
          totalPaid,
          totalOwed,
        };
      });
      
      setMembersWithStatus(membersWithFeeStatus);
    }
  }, [members, membershipFees]);

  const memberOptions = members
    .filter(m => m.status === 'active')
    .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()))
    .map(member => ({
      value: member.id,
      label: `${member.name} (#${member.jerseyNumber})`,
    }));

  const periodOptions = FEE_STRUCTURES.map(structure => ({
    value: structure.period,
    label: `${structure.label} - ${formatUGX(structure.amount)}${structure.savings > 0 ? ` (Save ${formatUGX(structure.savings)})` : ''}`,
  }));

  const paymentMethodOptions = [
    { value: 'cash', label: 'Cash' },
    { value: 'bank_transfer', label: 'Bank Transfer' },
    { value: 'mobile_money', label: 'Mobile Money' },
    { value: 'other', label: 'Other' },
  ];

  const getStatusBadgeVariant = (status: PaymentStatus | string) => {
    return getPaymentStatusColor(status as PaymentStatus);
  };

  const getMemberById = (id: string) => members.find(m => m.id === id);

  // Statistics
  const [stats, setStats] = useState({
    totalMembers: 0,
    paidMembers: 0,
    pendingPayments: 0,
    totalCollected: 0,
    totalOutstanding: 0,
    overdueCount: 0,
  });

  useEffect(() => {
    // Calculate stats based on actual fee records, not member status
    const paidFees = membershipFees.filter(fee => fee.status === 'paid').length;
    const pendingFees = membershipFees.filter(fee => fee.status === 'pending' || fee.status === 'partial').length;
    const totalCollected = membershipFees.reduce((sum, fee) => sum + fee.amountPaid, 0);
    
    setStats({
      totalMembers: members.filter(m => m.status === 'active').length,
      paidMembers: paidFees,
      pendingPayments: pendingFees,
      totalCollected: Math.round(totalCollected),
      totalOutstanding: 0, // Not used anymore
      overdueCount: 0, // Not used anymore
    });
  }, [members, membershipFees]);

  // Overview columns for member status
  const overviewColumns = [
    {
      key: 'member',
      title: 'Member',
      render: (memberStatus: MemberWithFeeStatus) => (
        <div className="flex items-center">
          <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-primary-100 via-yellow-100 to-secondary-100 dark:from-primary-900/30 dark:via-yellow-900/20 dark:to-secondary-900/30 rounded-full flex items-center justify-center border border-yellow-200 dark:border-yellow-800/30 mr-3">
            <span className="text-sm font-bold text-primary-600 dark:text-primary-400">
              #{memberStatus.member.jerseyNumber}
            </span>
          </div>
          <div>
            <div className="font-medium text-gray-900 dark:text-white">
              {memberStatus.member.name}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {memberStatus.member.position}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      title: 'Membership Status',
      render: (memberStatus: MemberWithFeeStatus) => (
        <div>
          <Badge variant={getStatusBadgeVariant(memberStatus.status)} className="capitalize mb-1">
            {memberStatus.status}
          </Badge>
          {memberStatus.expiryDate && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Expires: {formatDate(memberStatus.expiryDate, 'MMM d, yyyy')}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'currentPeriod',
      title: 'Current Period',
      render: (memberStatus: MemberWithFeeStatus) => {
        if (!memberStatus.currentFee) {
          return <span className="text-gray-500 dark:text-gray-400">No active period</span>;
        }
        
        const structure = FEE_STRUCTURES.find(s => s.period === memberStatus.currentFee!.period);
        return (
          <div>
            <div className="font-medium text-gray-900 dark:text-white">
              {structure?.label || memberStatus.currentFee.period}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {formatDate(memberStatus.currentFee.startDate, 'MMM d')} - {formatDate(memberStatus.currentFee.endDate, 'MMM d, yyyy')}
            </div>
          </div>
        );
      },
    },
    {
      key: 'payment',
      title: 'Payment Status',
      render: (memberStatus: MemberWithFeeStatus) => {
        if (!memberStatus.currentFee) {
          return <span className="text-gray-500 dark:text-gray-400">No payment due</span>;
        }
        
        const remaining = calculateRemainingBalance(memberStatus.currentFee);
        return (
          <div>
            <div className="font-medium text-gray-900 dark:text-white">
              {formatUGX(memberStatus.currentFee.amountPaid)} / {formatUGX(memberStatus.currentFee.amount)}
            </div>
            {remaining > 0 && (
              <div className="text-sm text-red-600 dark:text-red-400">
                Outstanding: {formatUGX(remaining)}
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (memberStatus: MemberWithFeeStatus) => (
        <div className="flex space-x-1">
          {memberStatus.currentFee && (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                handleViewFee(memberStatus.currentFee!);
              }}
              className="p-1"
            >
              <Eye size={14} />
            </Button>
          )}
          {canRecordPayment && memberStatus.currentFee && memberStatus.currentFee.status !== 'paid' && (
            <Button
              size="sm"
              variant="success"
              onClick={(e) => {
                e.stopPropagation();
                handleRecordPayment(memberStatus.currentFee!);
              }}
              className="p-1"
            >
              <DollarSign size={14} />
            </Button>
          )}
          {canManageFees && (
            <Button
              size="sm"
              variant="primary"
              onClick={(e) => {
                e.stopPropagation();
                handleCreateForMember(memberStatus.member);
              }}
              className="p-1"
            >
              <Plus size={14} />
            </Button>
          )}
        </div>
      ),
    },
  ];

  // Fee records columns
  const feeColumns = [
    {
      key: 'member',
      title: 'Member',
      render: (fee: MembershipFee) => {
        const member = getMemberById(fee.memberId);
        return member ? (
          <div>
            <div className="font-medium text-gray-900 dark:text-white">
              {member.name}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              #{member.jerseyNumber} • {member.position}
            </div>
          </div>
        ) : 'Unknown Member';
      },
    },
    {
      key: 'period',
      title: 'Period',
      render: (fee: MembershipFee) => {
        const structure = FEE_STRUCTURES.find(s => s.period === fee.period);
        return (
          <div>
            <div className="font-medium text-gray-900 dark:text-white">
              {structure?.label || fee.period}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {formatDate(fee.startDate, 'MMM d')} - {formatDate(fee.endDate, 'MMM d, yyyy')}
            </div>
          </div>
        );
      },
    },
    {
      key: 'amount',
      title: 'Amount',
      render: (fee: MembershipFee) => (
        <div>
          <div className="font-medium text-gray-900 dark:text-white">
            {formatUGX(fee.amount)}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Paid: {formatUGX(fee.amountPaid)}
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      render: (fee: MembershipFee) => (
        <Badge variant={getStatusBadgeVariant(fee.status)} className="capitalize">
          {fee.status}
        </Badge>
      ),
    },
    {
      key: 'dueDate',
      title: 'Due Date',
      render: (fee: MembershipFee) => (
        <div>
          <div className="text-gray-900 dark:text-white">
            {formatDate(fee.dueDate, 'MMM d, yyyy')}
          </div>
          {fee.paidDate && (
            <div className="text-sm text-green-600 dark:text-green-400">
              Paid: {formatDate(fee.paidDate, 'MMM d')}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (fee: MembershipFee) => (
        <div className="flex space-x-1">
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              handleViewFee(fee);
            }}
            className="p-1"
          >
            <Eye size={14} />
          </Button>
          {canRecordPayment && fee.status !== 'paid' && (
            <Button
              size="sm"
              variant="success"
              onClick={(e) => {
                e.stopPropagation();
                handleRecordPayment(fee);
              }}
              className="p-1"
            >
              <DollarSign size={14} />
            </Button>
          )}
          {canManageFees && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEdit(fee);
                }}
                className="p-1"
              >
                <Edit size={14} />
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteClick(fee);
                }}
                className="p-1"
              >
                <Trash2 size={14} />
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
      period: '3_months',
      startDate: getCurrentPeriodStart(),
      amountPaid: 0,
      paymentMethod: undefined,
      notes: '',
    });
    setIsModalOpen(true);
  };

  const handleCreateForMember = (member: Member) => {
    setEditingFee(null);
    reset({
      memberId: member.id,
      period: '5_months', // Default to 5 months for current period
      startDate: getCurrentPeriodStart(),
      amountPaid: 0,
      paymentMethod: undefined,
      notes: '',
    });
    setIsModalOpen(true);
  };

  const handleEdit = (fee: MembershipFee) => {
    setEditingFee(fee);
    setValue('memberId', fee.memberId);
    setValue('period', fee.period);
    setValue('startDate', fee.startDate);
    setValue('amountPaid', fee.amountPaid);
    setValue('paymentMethod', fee.paymentMethod);
    setValue('notes', fee.notes || '');
    setIsModalOpen(true);
  };

  const handleRecordPayment = (fee: MembershipFee) => {
    setSelectedFee(fee);
    const remainingAmount = calculateRemainingBalance(fee);
    resetPayment({
      amountPaid: remainingAmount, // Default to full remaining amount
      paymentMethod: 'cash',
      paidDate: new Date().toISOString().split('T')[0],
      notes: '',
    });
    setIsPaymentModalOpen(true);
  };

  const handleViewFee = (fee: MembershipFee) => {
    setSelectedFee(fee);
    setIsViewModalOpen(true);
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
      
      const structure = FEE_STRUCTURES.find(s => s.period === data.period);
      if (!structure) {
        throw new Error('Invalid payment period selected');
      }
      
      const { startDate, endDate, dueDate } = calculatePeriodDates(data.startDate, data.period);
      
      // Determine initial status
      let status: PaymentStatus = 'pending';
      if (data.amountPaid >= structure.amount) {
        status = 'paid';
      } else if (data.amountPaid > 0) {
        status = 'partial';
      }
      
      const feeData: Omit<MembershipFee, 'id'> = {
        memberId: data.memberId,
        period: data.period,
        amount: structure.amount,
        amountPaid: data.amountPaid,
        status,
        paymentMethod: data.paymentMethod,
        startDate,
        endDate,
        dueDate,
        paidDate: status === 'paid' ? new Date().toISOString().split('T')[0] : undefined,
        notes: data.notes,
        recordedBy: user?.id || '',
        recordedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
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

  const onSubmitPayment = async (data: PaymentFormData) => {
    if (!selectedFee) return;

    try {
      setSubmitting(true);
      
      const newAmountPaid = selectedFee.amountPaid + data.amountPaid;
      let newStatus: PaymentStatus = 'partial';
      
      if (newAmountPaid >= selectedFee.amount) {
        newStatus = 'paid';
      }
      
      const updateData: Partial<MembershipFee> = {
        amountPaid: newAmountPaid,
        status: newStatus,
        paymentMethod: data.paymentMethod,
        paidDate: newStatus === 'paid' ? data.paidDate : selectedFee.paidDate,
        notes: data.notes || selectedFee.notes,
        updatedAt: new Date().toISOString(),
      };

      await MembershipFeeService.updateMembershipFee(selectedFee.id, updateData);
      
      setIsPaymentModalOpen(false);
      resetPayment();
      setSelectedFee(null);
    } catch (error) {
      console.error('Error recording payment:', error);
    } finally {
      setSubmitting(false);
    }
  };

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
        description={`Track and manage member fee payments with flexible payment periods (${stats.totalMembers} active members)`}
        actions={
          <div className="flex space-x-2">
            {canManageFees && (
              <Button 
                onClick={handleCreate} 
                leftIcon={<Plus size={18} />}
                className="bg-primary-600 hover:bg-primary-700 text-white"
              >
                Add Fee Record
              </Button>
            )}
            {canExport && (
              <Button
                onClick={() => {}} // TODO: Implement export
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

      {/* Fee Structure Information */}
      <Card className="mb-6 bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 border border-blue-200 dark:border-blue-800">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            FC256 Membership Fee Structure
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEE_STRUCTURES.map((structure) => (
              <div key={structure.period} className="bg-white dark:bg-neutral-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                    {formatUGX(structure.amount)}
                  </div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                    {structure.label}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {structure.description}
                  </div>
                  {structure.savings > 0 && (
                    <div className="text-xs text-green-600 dark:text-green-400 mt-2 font-medium">
                      Save {formatUGX(structure.savings)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                Active Members
              </p>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                {stats.totalMembers}
              </p>
            </div>
            <Users className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
        </div>
        
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600 dark:text-green-400">
                Paid Up
              </p>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                {stats.paidMembers}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
        </div>
        
        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                Pending
              </p>
              <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">
                {stats.pendingPayments}
              </p>
            </div>
            <Clock className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
          </div>
        </div>
        
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600 dark:text-purple-400">
                Collected
              </p>
              <p className="text-xl font-bold text-purple-900 dark:text-purple-100">
                {formatUGX(stats.totalCollected)}
              </p>
            </div>
            <CreditCard className="h-6 w-6 text-purple-600 dark:text-purple-400" />
          </div>
        </div>
        
        <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4 border border-indigo-200 dark:border-indigo-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                Total Records
              </p>
              <p className="text-xl font-bold text-indigo-900 dark:text-indigo-100">
                {membershipFees.length}
              </p>
            </div>
            <Calendar className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8">
            {[
              { key: 'overview', label: 'Member Overview', count: membersWithStatus.length },
              { key: 'fees', label: 'Fee Records', count: membershipFees.length },
              { key: 'payments', label: 'Recent Payments', count: membershipFees.filter(f => f.status === 'paid').length },
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

      {/* Tab Content */}
      <Card>
        {activeTab === 'overview' && (
          <>
            {membersWithStatus.length > 0 ? (
              <Table
                data={membersWithStatus}
                columns={overviewColumns}
                onRowClick={(memberStatus) => {
                  if (memberStatus.currentFee) {
                    handleViewFee(memberStatus.currentFee);
                  }
                }}
              />
            ) : (
              <EmptyState
                title="No members found"
                description="No active members to display membership status for."
                icon={<Users size={24} />}
              />
            )}
          </>
        )}

        {activeTab === 'fees' && (
          <>
            {membershipFees.length > 0 ? (
              <Table
                data={membershipFees}
                columns={feeColumns}
                onRowClick={(fee) => handleViewFee(fee)}
              />
            ) : (
              <EmptyState
                title="No fee records found"
                description="No membership fee records have been created yet."
                icon={<CreditCard size={24} />}
                action={
                  canManageFees
                    ? {
                        label: 'Add Fee Record',
                        onClick: handleCreate,
                      }
                    : undefined
                }
              />
            )}
          </>
        )}

        {activeTab === 'payments' && (
          <>
            {membershipFees.filter(f => f.status === 'paid').length > 0 ? (
              <Table
                data={membershipFees.filter(f => f.status === 'paid')}
                columns={feeColumns}
                onRowClick={(fee) => handleViewFee(fee)}
              />
            ) : (
              <EmptyState
                title="No payments recorded"
                description="No completed payments found."
                icon={<DollarSign size={24} />}
              />
            )}
          </>
        )}
      </Card>

      {/* Create/Edit Fee Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingFee ? 'Edit Membership Fee' : 'Add Membership Fee'}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Select
            label="Member"
            options={[{ value: '', label: 'Select a member...' }, ...memberOptions]}
            placeholder="Choose a team member"
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
              label="Period Start Date"
              type="date"
              error={errors.startDate?.message}
              required
              {...register('startDate', { required: 'Start date is required' })}
            />
          </div>

          {/* Period Preview */}
          {watchPeriod && watchStartDate && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                Payment Period Preview
              </h4>
              {(() => {
                try {
                  const structure = FEE_STRUCTURES.find(s => s.period === watchPeriod);
                  const dates = calculatePeriodDates(watchStartDate, watchPeriod);
                  
                  return (
                    <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                      <p><strong>Period:</strong> {structure?.label} ({structure?.months} months)</p>
                      <p><strong>Amount:</strong> {formatUGX(structure?.amount || 0)}</p>
                      <p><strong>Coverage:</strong> {formatDate(dates.startDate, 'MMM d')} - {formatDate(dates.endDate, 'MMM d, yyyy')}</p>
                      <p><strong>Due Date:</strong> {formatDate(dates.dueDate, 'MMM d, yyyy')}</p>
                      {structure?.savings && structure.savings > 0 && (
                        <p className="text-green-600 dark:text-green-400"><strong>Savings:</strong> {formatUGX(structure.savings)}</p>
                      )}
                    </div>
                  );
                } catch (error) {
                  return <p className="text-red-600 dark:text-red-400">Error calculating period dates</p>;
                }
              })()}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Amount Paid (UGX)"
              type="number"
              min="0"
              step="1000"
              placeholder="0"
              error={errors.amountPaid?.message}
              helperText="Enter 0 if creating a pending fee record"
              {...register('amountPaid', { 
                min: { value: 0, message: 'Amount cannot be negative' },
                valueAsNumber: true
              })}
            />

            <Select
              label="Payment Method (if paid)"
              options={[{ value: '', label: 'Select method...' }, ...paymentMethodOptions]}
              placeholder="Select payment method"
              error={errors.paymentMethod?.message}
              {...register('paymentMethod')}
            />
          </div>

          <Input
            label="Notes (Optional)"
            placeholder="Additional notes about this fee record..."
            error={errors.notes?.message}
            {...register('notes')}
          />

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
              className="bg-primary-600 hover:bg-primary-700 text-white"
            >
              {editingFee ? 'Update Fee Record' : 'Add Fee Record'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Record Payment Modal */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title="Record Payment"
        size="md"
      >
        {selectedFee && (
          <form onSubmit={handleSubmitPayment(onSubmitPayment)} className="space-y-6">
            <div className="bg-gray-50 dark:bg-neutral-700/30 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                {getMemberById(selectedFee.memberId)?.name}
              </h4>
              <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <p><strong>Period:</strong> {FEE_STRUCTURES.find(s => s.period === selectedFee.period)?.label}</p>
                <p><strong>Total Amount:</strong> {formatUGX(selectedFee.amount)}</p>
                <p><strong>Already Paid:</strong> {formatUGX(selectedFee.amountPaid)}</p>
                <p><strong>Remaining:</strong> {formatUGX(calculateRemainingBalance(selectedFee))}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Payment Amount (UGX)"
                type="number"
                min="1"
                step="1000"
                error={errorsPayment.amountPaid?.message}
                required
                {...registerPayment('amountPaid', { 
                  required: 'Payment amount is required',
                  min: { value: 1, message: 'Payment amount must be positive' },
                  max: { value: calculateRemainingBalance(selectedFee), message: 'Cannot exceed remaining balance' },
                  valueAsNumber: true
                })}
              />

              <Input
                label="Payment Date"
                type="date"
                error={errorsPayment.paidDate?.message}
                required
                {...registerPayment('paidDate', { required: 'Payment date is required' })}
              />
            </div>

            <Select
              label="Payment Method"
              options={paymentMethodOptions}
              placeholder="Select payment method"
              error={errorsPayment.paymentMethod?.message}
              required
              {...registerPayment('paymentMethod', { required: 'Payment method is required' })}
            />

            <Input
              label="Payment Notes (Optional)"
              placeholder="Additional notes about this payment..."
              error={errorsPayment.notes?.message}
              {...registerPayment('notes')}
            />

            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsPaymentModalOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                isLoading={submitting}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Record Payment
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* View Fee Details Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title="Membership Fee Details"
        size="lg"
      >
        {selectedFee && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Member
                </label>
                <p className="text-gray-900 dark:text-white font-medium">
                  {getMemberById(selectedFee.memberId)?.name || 'Unknown Member'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Payment Period
                </label>
                <p className="text-gray-900 dark:text-white">
                  {FEE_STRUCTURES.find(s => s.period === selectedFee.period)?.label || selectedFee.period}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Period Coverage
                </label>
                <p className="text-gray-900 dark:text-white">
                  {formatDate(selectedFee.startDate, 'MMM d')} - {formatDate(selectedFee.endDate, 'MMM d, yyyy')}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Status
                </label>
                <Badge variant={getStatusBadgeVariant(selectedFee.status)} className="capitalize">
                  {selectedFee.status}
                </Badge>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Total Amount
                </label>
                <p className="text-gray-900 dark:text-white font-bold">
                  {formatUGX(selectedFee.amount)}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Amount Paid
                </label>
                <p className="text-gray-900 dark:text-white font-bold">
                  {formatUGX(selectedFee.amountPaid)}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Due Date
                </label>
                <p className="text-gray-900 dark:text-white">
                  {formatDate(selectedFee.dueDate, 'MMM d, yyyy')}
                </p>
              </div>
              {selectedFee.paidDate && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Paid Date
                  </label>
                  <p className="text-gray-900 dark:text-white">
                    {formatDate(selectedFee.paidDate, 'MMM d, yyyy')}
                  </p>
                </div>
              )}
            </div>

            {calculateRemainingBalance(selectedFee) > 0 && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <div className="flex items-center">
                  <AlertTriangle size={20} className="text-yellow-600 dark:text-yellow-400 mr-2" />
                  <div>
                    <h4 className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                      Outstanding Balance
                    </h4>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      {formatUGX(calculateRemainingBalance(selectedFee))} remaining to be paid
                    </p>
                  </div>
                </div>
              </div>
            )}

            {selectedFee.notes && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notes
                </label>
                <p className="text-gray-900 dark:text-white">
                  {selectedFee.notes}
                </p>
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              {canRecordPayment && selectedFee.status !== 'paid' && (
                <Button
                  onClick={() => {
                    setIsViewModalOpen(false);
                    handleRecordPayment(selectedFee);
                  }}
                  leftIcon={<DollarSign size={16} />}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  Record Payment
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => setIsViewModalOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Fee Record"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-300">
            Are you sure you want to delete this membership fee record? This action cannot be undone.
          </p>
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              variant="outline"
              onClick={() => setIsDeleteModalOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              Delete Record
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default MembershipFees;
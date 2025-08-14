import React, { useState, useEffect } from 'react';
import { CreditCard, Plus, Edit, Trash2, TrendingDown, Download } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ContributionService, ExpenseService, MemberService } from '../../services/firestore';
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
import { Contribution, Expense, Member, ContributionType, PaymentMethod, ExpenseCategory } from '../../types';
import { formatDate } from '../../utils/date-utils';
import { formatUGX } from '../../utils/currency-utils';
import { canUserAccess, Permissions } from '../../utils/permissions';
import { ContributionsPDFExporter } from '../../utils/pdf-export';
import { useForm } from 'react-hook-form';

interface ContributionFormData {
  memberId: string;
  type: ContributionType;
  amount?: number;
  description: string;
  paymentMethod?: PaymentMethod;
  date: string;
}

interface ExpenseFormData {
  category: ExpenseCategory;
  amount: number;
  description: string;
  paymentMethod?: PaymentMethod;
  date: string;
  receipt?: string;
  fundingSource: 'contributions' | 'membership_fees';
}

type TransactionType = 'contribution' | 'expense';

const Contributions: React.FC = () => {
  const { user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<TransactionType>('contribution');
  const [editingContribution, setEditingContribution] = useState<Contribution | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ type: TransactionType; item: Contribution | Expense } | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'contributions' | 'expenses'>('all');

  const canCreateTransaction = user && canUserAccess(user.role, Permissions.CREATE_CONTRIBUTION);
  const canEditTransaction = user && canUserAccess(user.role, Permissions.EDIT_CONTRIBUTION);
  const canDeleteTransaction = user && canUserAccess(user.role, Permissions.DELETE_CONTRIBUTION);
  const canExport = user && canUserAccess(user.role, Permissions.EXPORT_REPORTS);

  const {
    register: registerContribution,
    handleSubmit: handleSubmitContribution,
    reset: resetContribution,
    setValue: setValueContribution,
    watch: watchContribution,
    formState: { errors: errorsContribution },
  } = useForm<ContributionFormData>();

  const {
    register: registerExpense,
    handleSubmit: handleSubmitExpense,
    reset: resetExpense,
    setValue: setValueExpense,
    formState: { errors: errorsExpense },
  } = useForm<ExpenseFormData>();

  const watchContributionType = watchContribution('type');

  // Load data from Firestore
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [membersData, contributionsData, expensesData] = await Promise.all([
          MemberService.getAllMembers(),
          ContributionService.getAllContributions(),
          ExpenseService.getAllExpenses(),
        ]);
        setMembers(membersData);
        setContributions(contributionsData);
        setExpenses(expensesData);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();

    // Set up real-time listeners
    const unsubscribeMembers = MemberService.subscribeToMembers(setMembers);
    const unsubscribeContributions = ContributionService.subscribeToContributions((contributions) => {
      setContributions(contributions);
      setLoading(false);
    });
    const unsubscribeExpenses = ExpenseService.subscribeToExpenses((expenses) => {
      setExpenses(expenses);
      setLoading(false);
    });

    return () => {
      unsubscribeMembers();
      unsubscribeContributions();
      unsubscribeExpenses();
    };
  }, []);

  // Sort member options alphabetically
  const memberOptions = members
    .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()))
    .map(member => ({
      value: member.id,
      label: `${member.name} (#${member.jerseyNumber})`,
    }));

  const typeOptions = [
    { value: 'monetary', label: 'Monetary' },
    { value: 'in-kind', label: 'In-Kind' },
  ];

  const paymentMethodOptions = [
    { value: 'cash', label: 'Cash' },
    { value: 'bank transfer', label: 'Bank Transfer' },
    { value: 'mobile money', label: 'Mobile Money' },
    { value: 'other', label: 'Other' },
  ];

  const expenseCategoryOptions = [
    { value: 'equipment', label: 'Equipment' },
    { value: 'transport', label: 'Transport' },
    { value: 'medical', label: 'Medical' },
    { value: 'facilities', label: 'Facilities' },
    { value: 'referees', label: 'Referees' },
    { value: 'food', label: 'Food & Refreshments' },
    { value: 'uniforms', label: 'Uniforms' },
    { value: 'training', label: 'Training Materials' },
    { value: 'administration', label: 'Administration' },
    { value: 'other', label: 'Other' },
  ];

  const fundingSourceOptions = [
    { value: 'contributions', label: 'Contribution Fund' },
    { value: 'membership_fees', label: 'Membership Fee Fund' },
  ];
  const getMemberById = (id: string) => members.find(m => m.id === id);

  // Combine contributions and expenses for display
  const allTransactions = [
    ...contributions.map(c => ({ ...c, transactionType: 'contribution' as const })),
    ...expenses.map(e => ({ ...e, transactionType: 'expense' as const }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const filteredTransactions = allTransactions.filter(transaction => {
    if (activeTab === 'contributions') return transaction.transactionType === 'contribution';
    if (activeTab === 'expenses') return transaction.transactionType === 'expense';
    return true;
  });

  const columns = [
    {
      key: 'type',
      title: 'Type',
      render: (transaction: any) => (
        <Badge
          variant={transaction.transactionType === 'contribution' ? 'success' : 'danger'}
          className="capitalize"
        >
          {transaction.transactionType}
        </Badge>
      ),
    },
    {
      key: 'member',
      title: 'Member/Category',
      render: (transaction: any) => {
        if (transaction.transactionType === 'contribution') {
          const member = getMemberById(transaction.memberId);
          return member ? `${member.name} (#${member.jerseyNumber})` : 'Unknown Member';
        } else {
          return (
            <div>
              <span className="capitalize font-medium">
                {transaction.category.replace('_', ' ')}
              </span>
              {transaction.fundingSource && (
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  From: {transaction.fundingSource.replace('_', ' ')}
                </div>
              )}
            </div>
          );
        }
      },
    },
    {
      key: 'date',
      title: 'Date',
      render: (transaction: any) => formatDate(transaction.date),
    },
    {
      key: 'description',
      title: 'Description',
      render: (transaction: any) => transaction.description,
    },
    {
      key: 'amount',
      title: 'Amount',
      render: (transaction: any) => {
        if (transaction.transactionType === 'contribution') {
          return transaction.amount ? (
            <div className="flex items-center font-medium text-green-600 dark:text-green-400">
              +{formatUGX(transaction.amount)}
            </div>
          ) : (
            'N/A'
          );
        } else {
          return (
            <div className="flex items-center font-medium text-red-600 dark:text-red-400">
              -{formatUGX(transaction.amount)}
            </div>
          );
        }
      },
    },
    {
      key: 'paymentMethod',
      title: 'Payment Method',
      render: (transaction: any) =>
        transaction.paymentMethod ? (
          <span className="capitalize">{transaction.paymentMethod}</span>
        ) : (
          'N/A'
        ),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (transaction: any) => (
        <div className="flex space-x-2">
          {canEditTransaction && (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                handleEdit(transaction);
              }}
            >
              <Edit size={16} />
            </Button>
          )}
          {canDeleteTransaction && (
            <Button
              size="sm"
              variant="danger"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteClick(transaction);
              }}
            >
              <Trash2 size={16} />
            </Button>
          )}
        </div>
      ),
    },
  ];

  const handleCreateContribution = () => {
    setModalType('contribution');
    setEditingContribution(null);
    setEditingExpense(null);
    resetContribution({
      memberId: '',
      type: 'monetary',
      amount: undefined,
      description: '',
      paymentMethod: undefined,
      date: '',
    });
    setIsModalOpen(true);
  };

  const handleCreateExpense = () => {
    setModalType('expense');
    setEditingContribution(null);
    setEditingExpense(null);
    resetExpense({
      category: 'equipment',
      amount: 0,
      description: '',
      paymentMethod: undefined,
      date: '',
      receipt: '',
      fundingSource: 'contributions',
    });
    setIsModalOpen(true);
  };

  const handleEdit = (transaction: any) => {
    if (transaction.transactionType === 'contribution') {
      setModalType('contribution');
      setEditingContribution(transaction);
      setEditingExpense(null);
      setValueContribution('memberId', transaction.memberId);
      setValueContribution('type', transaction.type);
      setValueContribution('amount', transaction.amount);
      setValueContribution('description', transaction.description);
      setValueContribution('paymentMethod', transaction.paymentMethod);
      setValueContribution('date', transaction.date.split('T')[0]);
    } else {
      setModalType('expense');
      setEditingExpense(transaction);
      setEditingContribution(null);
      setValueExpense('category', transaction.category);
      setValueExpense('amount', transaction.amount);
      setValueExpense('description', transaction.description);
      setValueExpense('paymentMethod', transaction.paymentMethod);
      setValueExpense('date', transaction.date.split('T')[0]);
      setValueExpense('receipt', transaction.receipt || '');
      setValueExpense('fundingSource', transaction.fundingSource || 'contributions');
    }
    setIsModalOpen(true);
  };

  const handleDeleteClick = (transaction: any) => {
    setItemToDelete({
      type: transaction.transactionType,
      item: transaction
    });
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (itemToDelete) {
      try {
        if (itemToDelete.type === 'contribution') {
          await ContributionService.deleteContribution(itemToDelete.item.id);
        } else {
          await ExpenseService.deleteExpense(itemToDelete.item.id);
        }
        setIsDeleteModalOpen(false);
        setItemToDelete(null);
      } catch (error) {
        console.error('Error deleting transaction:', error);
      }
    }
  };

  const onSubmitContribution = async (data: ContributionFormData) => {
    try {
      setSubmitting(true);
      
      const contributionData: any = {
        memberId: data.memberId,
        type: data.type,
        description: data.description,
        date: new Date(data.date).toISOString(),
        recordedBy: user?.id || '',
        recordedAt: new Date().toISOString(),
      };

      // Only include amount and paymentMethod for monetary contributions
      if (data.type === 'monetary') {
        // Ensure amount is properly converted to number
        contributionData.amount = parseFloat(String(data.amount)) || 0;
        contributionData.paymentMethod = data.paymentMethod;
      }

      console.log('Submitting contribution:', contributionData);

      if (editingContribution) {
        await ContributionService.updateContribution(editingContribution.id, contributionData);
      } else {
        await ContributionService.createContribution(contributionData);
      }

      setIsModalOpen(false);
      resetContribution();
    } catch (error) {
      console.error('Error saving contribution:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const onSubmitExpense = async (data: ExpenseFormData) => {
    try {
      setSubmitting(true);
      
      const expenseData = {
        category: data.category,
        amount: parseFloat(String(data.amount)) || 0, // Ensure proper number conversion
        description: data.description,
        paymentMethod: data.paymentMethod,
        date: new Date(data.date).toISOString(),
        receipt: data.receipt || '',
        fundingSource: data.fundingSource,
        recordedBy: user?.id || '',
        recordedAt: new Date().toISOString(),
      };

      console.log('Submitting expense:', expenseData);

      if (editingExpense) {
        await ExpenseService.updateExpense(editingExpense.id, expenseData);
      } else {
        await ExpenseService.createExpense(expenseData);
      }

      setIsModalOpen(false);
      resetExpense();
    } catch (error) {
      console.error('Error saving expense:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      console.log('Starting contributions export...');
      
      // Calculate totals with proper number handling
      const totalContributions = contributions
        .filter(c => c.type === 'monetary' && c.amount !== undefined && c.amount !== null)
        .reduce((sum, c) => {
          const amount = parseFloat(String(c.amount)) || 0;
          return sum + amount;
        }, 0);
      
      const totalExpenses = expenses
        .filter(e => e.amount !== undefined && e.amount !== null)
        .reduce((sum, e) => {
          const amount = parseFloat(String(e.amount)) || 0;
          return sum + amount;
        }, 0);
      
      const remainingBalance = totalContributions - totalExpenses;

      console.log('Export data:', {
        contributions: contributions.length,
        expenses: expenses.length,
        members: members.length,
        totalContributions,
        totalExpenses,
        remainingBalance
      });
      const exporter = new ContributionsPDFExporter();
      exporter.exportContributions({
        contributions,
        expenses,
        members,
        totalContributions: Math.round(totalContributions),
        totalExpenses: Math.round(totalExpenses),
        remainingBalance: Math.round(remainingBalance),
      });
    } catch (error) {
      console.error('Error exporting contributions:', error);
      alert('Failed to export contributions PDF. Please check the console for details.');
    } finally {
      setExporting(false);
    }
  };

  // Calculate totals with proper number handling
  const totalContributions = contributions
    .filter(c => c.type === 'monetary' && c.amount !== undefined && c.amount !== null)
    .reduce((sum, c) => {
      const amount = parseFloat(String(c.amount)) || 0;
      return sum + amount;
    }, 0);
  
  const totalExpenses = expenses
    .filter(e => e.amount !== undefined && e.amount !== null)
    .reduce((sum, e) => {
      const amount = parseFloat(String(e.amount)) || 0;
      return sum + amount;
    }, 0);
  
  const remainingBalance = totalContributions - totalExpenses;

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
        title="Contributions & Expenses"
        description={`Track team contributions and expenses in UGX (${filteredTransactions.length} transactions)`}
        actions={
          <div className="flex space-x-2">
            {canCreateTransaction && (
              <>
                <Button 
                  onClick={handleCreateContribution} 
                  leftIcon={<Plus size={18} />}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  Add Contribution
                </Button>
                <Button 
                  onClick={handleCreateExpense} 
                  leftIcon={<TrendingDown size={18} />}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Add Expense
                </Button>
              </>
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

      {/* Financial Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600 dark:text-green-400">
                Total Contributions
              </p>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                {formatUGX(Math.round(totalContributions))}
              </p>
            </div>
            <CreditCard className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
        </div>
        
        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border border-red-200 dark:border-red-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-600 dark:text-red-400">
                Total Expenses
              </p>
              <p className="text-2xl font-bold text-red-900 dark:text-red-100">
                {formatUGX(Math.round(totalExpenses))}
              </p>
            </div>
            <TrendingDown className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
        </div>
        
        <div className={`rounded-lg p-4 border ${
          remainingBalance >= 0 
            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
            : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${
                remainingBalance >= 0 
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-yellow-600 dark:text-yellow-400'
              }`}>
                {remainingBalance >= 0 ? 'Available Balance' : 'Deficit'}
              </p>
              <p className={`text-2xl font-bold ${
                remainingBalance >= 0 
                  ? 'text-blue-900 dark:text-blue-100'
                  : 'text-yellow-900 dark:text-yellow-100'
              }`}>
                {formatUGX(Math.round(Math.abs(remainingBalance)))}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600 dark:text-purple-400">
                Total Transactions
              </p>
              <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                {allTransactions.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8">
            {[
              { key: 'all', label: 'All Transactions', count: allTransactions.length },
              { key: 'contributions', label: 'Contributions', count: contributions.length },
              { key: 'expenses', label: 'Expenses', count: expenses.length },
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
        {filteredTransactions.length > 0 ? (
          <Table
            data={filteredTransactions}
            columns={columns}
            onRowClick={(transaction) => console.log('Clicked transaction:', transaction)}
          />
        ) : (
          <EmptyState
            title={`No ${activeTab === 'all' ? 'transactions' : activeTab} yet`}
            description={`There are no ${activeTab === 'all' ? 'transactions' : activeTab} recorded at the moment.`}
            icon={activeTab === 'expenses' ? <TrendingDown size={24} /> : <CreditCard size={24} />}
            action={
              canCreateTransaction
                ? {
                    label: activeTab === 'expenses' ? 'Add Expense' : 'Add Contribution',
                    onClick: activeTab === 'expenses' ? handleCreateExpense : handleCreateContribution,
                  }
                : undefined
            }
          />
        )}
      </Card>

      {/* Create/Edit Contribution Modal */}
      <Modal
        isOpen={isModalOpen && modalType === 'contribution'}
        onClose={() => setIsModalOpen(false)}
        title={editingContribution ? 'Edit Contribution' : 'Add Contribution'}
        size="lg"
      >
        <form onSubmit={handleSubmitContribution(onSubmitContribution)} className="space-y-6">
          <Select
            label="Member"
            options={memberOptions}
            placeholder="Select a team member"
            error={errorsContribution.memberId?.message}
            required
            {...registerContribution('memberId', { required: 'Member is required' })}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Select
              label="Contribution Type"
              options={typeOptions}
              placeholder="Select type"
              error={errorsContribution.type?.message}
              required
              {...registerContribution('type', { required: 'Type is required' })}
            />

            <Input
              label="Date"
              type="date"
              error={errorsContribution.date?.message}
              required
              {...registerContribution('date', { required: 'Date is required' })}
            />
          </div>

          {watchContributionType === 'monetary' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Input
                  label="Amount (UGX)"
                  type="number"
                  step="1"
                  min="0"
                  placeholder="e.g., 50000"
                  error={errorsContribution.amount?.message}
                  required
                  {...registerContribution('amount', { 
                    required: watchContributionType === 'monetary' ? 'Amount is required for monetary contributions' : false,
                    min: { value: 0, message: 'Amount must be positive' },
                    valueAsNumber: true
                  })}
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Enter amount in Ugandan Shillings
                </p>
              </div>

              <Select
                label="Payment Method"
                options={paymentMethodOptions}
                placeholder="Select payment method"
                error={errorsContribution.paymentMethod?.message}
                required
                {...registerContribution('paymentMethod', { 
                  required: watchContributionType === 'monetary' ? 'Payment method is required for monetary contributions' : false 
                })}
              />
            </div>
          )}

          <Input
            label="Description"
            placeholder={watchContributionType === 'monetary' ? 'e.g., Monthly dues, tournament fee' : 'e.g., Training equipment, jerseys'}
            error={errorsContribution.description?.message}
            required
            {...registerContribution('description', { required: 'Description is required' })}
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
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {editingContribution ? 'Update Contribution' : 'Add Contribution'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Create/Edit Expense Modal */}
      <Modal
        isOpen={isModalOpen && modalType === 'expense'}
        onClose={() => setIsModalOpen(false)}
        title={editingExpense ? 'Edit Expense' : 'Add Expense'}
        size="lg"
      >
        <form onSubmit={handleSubmitExpense(onSubmitExpense)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Select
              label="Category"
              options={expenseCategoryOptions}
              placeholder="Select category"
              error={errorsExpense.category?.message}
              required
              {...registerExpense('category', { required: 'Category is required' })}
            />

            <Select
              label="Funding Source"
              options={fundingSourceOptions}
              placeholder="Select funding source"
              error={errorsExpense.fundingSource?.message}
              required
              helperText="Choose which fund to use for this expense"
              {...registerExpense('fundingSource', { required: 'Funding source is required' })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Expense Date"
              type="date"
              error={errorsExpense.date?.message}
              required
              {...registerExpense('date', { required: 'Date is required' })}
            />

            <div>
              <Input
                label="Amount (UGX)"
                type="number"
                step="1"
                min="0"
                placeholder="e.g., 25000"
                error={errorsExpense.amount?.message}
                required
                {...registerExpense('amount', { 
                  required: 'Amount is required',
                  min: { value: 0, message: 'Amount must be positive' },
                  valueAsNumber: true
                })}
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Enter amount in Ugandan Shillings
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Description"
              placeholder="e.g., Football boots, Transport to match"
              error={errorsExpense.description?.message}
              required
              {...registerExpense('description', { required: 'Description is required' })}
            />
            <Select
              label="Payment Method"
              options={paymentMethodOptions}
              placeholder="Select payment method"
              error={errorsExpense.paymentMethod?.message}
              {...registerExpense('paymentMethod')}
            />
          </div>


          <Input
            label="Receipt Reference (Optional)"
            placeholder="Receipt number or reference"
            error={errorsExpense.receipt?.message}
            {...registerExpense('receipt')}
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
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {editingExpense ? 'Update Expense' : 'Add Expense'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title={`Delete ${itemToDelete?.type === 'contribution' ? 'Contribution' : 'Expense'}`}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-300">
            Are you sure you want to delete this {itemToDelete?.type}? This action cannot be undone.
          </p>
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              variant="outline"
              onClick={() => setIsDeleteModalOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Contributions;
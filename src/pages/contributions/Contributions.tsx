import React, { useState, useEffect } from 'react';
import { CreditCard, Plus, Edit, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ContributionService, MemberService } from '../../services/firestore';
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
import { Contribution, Member, ContributionType, PaymentMethod } from '../../types';
import { formatDate } from '../../utils/date-utils';
import { formatUGX } from '../../utils/currency-utils';
import { canUserAccess, Permissions } from '../../utils/permissions';
import { useForm } from 'react-hook-form';

interface ContributionFormData {
  memberId: string;
  type: ContributionType;
  amount?: number;
  description: string;
  paymentMethod?: PaymentMethod;
  date: string;
}

const Contributions: React.FC = () => {
  const { user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContribution, setEditingContribution] = useState<Contribution | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [contributionToDelete, setContributionToDelete] = useState<Contribution | null>(null);

  const canCreateContribution = user && canUserAccess(user.role, Permissions.CREATE_CONTRIBUTION);
  const canEditContribution = user && canUserAccess(user.role, Permissions.EDIT_CONTRIBUTION);
  const canDeleteContribution = user && canUserAccess(user.role, Permissions.DELETE_CONTRIBUTION);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ContributionFormData>();

  const watchType = watch('type');

  // Load data from Firestore
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [membersData, contributionsData] = await Promise.all([
          MemberService.getAllMembers(),
          ContributionService.getAllContributions(),
        ]);
        setMembers(membersData);
        setContributions(contributionsData);
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

    return () => {
      unsubscribeMembers();
      unsubscribeContributions();
    };
  }, []);

  const memberOptions = members.map(member => ({
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

  const getMemberById = (id: string) => members.find(m => m.id === id);

  const columns = [
    {
      key: 'member',
      title: 'Member',
      render: (contribution: Contribution) => {
        const member = getMemberById(contribution.memberId);
        return member ? `${member.name} (#${member.jerseyNumber})` : 'Unknown Member';
      },
    },
    {
      key: 'date',
      title: 'Date',
      render: (contribution: Contribution) => formatDate(contribution.date),
    },
    {
      key: 'type',
      title: 'Type',
      render: (contribution: Contribution) => (
        <Badge
          variant={contribution.type === 'monetary' ? 'primary' : 'secondary'}
          className="capitalize"
        >
          {contribution.type}
        </Badge>
      ),
    },
    {
      key: 'description',
      title: 'Description',
      render: (contribution: Contribution) => contribution.description,
    },
    {
      key: 'amount',
      title: 'Amount',
      render: (contribution: Contribution) =>
        contribution.amount ? (
          <div className="flex items-center font-medium text-green-600 dark:text-green-400">
            {formatUGX(contribution.amount)}
          </div>
        ) : (
          'N/A'
        ),
    },
    {
      key: 'paymentMethod',
      title: 'Payment Method',
      render: (contribution: Contribution) =>
        contribution.paymentMethod ? (
          <span className="capitalize">{contribution.paymentMethod}</span>
        ) : (
          'N/A'
        ),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (contribution: Contribution) => (
        <div className="flex space-x-2">
          {canEditContribution && (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                handleEdit(contribution);
              }}
            >
              <Edit size={16} />
            </Button>
          )}
          {canDeleteContribution && (
            <Button
              size="sm"
              variant="danger"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteClick(contribution);
              }}
            >
              <Trash2 size={16} />
            </Button>
          )}
        </div>
      ),
    },
  ];

  const handleCreate = () => {
    setEditingContribution(null);
    reset({
      memberId: '',
      type: 'monetary',
      amount: undefined,
      description: '',
      paymentMethod: undefined,
      date: '',
    });
    setIsModalOpen(true);
  };

  const handleEdit = (contribution: Contribution) => {
    setEditingContribution(contribution);
    setValue('memberId', contribution.memberId);
    setValue('type', contribution.type);
    setValue('amount', contribution.amount);
    setValue('description', contribution.description);
    setValue('paymentMethod', contribution.paymentMethod);
    setValue('date', contribution.date.split('T')[0]);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (contribution: Contribution) => {
    setContributionToDelete(contribution);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (contributionToDelete) {
      try {
        await ContributionService.deleteContribution(contributionToDelete.id);
        setIsDeleteModalOpen(false);
        setContributionToDelete(null);
      } catch (error) {
        console.error('Error deleting contribution:', error);
      }
    }
  };

  const onSubmit = async (data: ContributionFormData) => {
    try {
      setSubmitting(true);
      
      const contributionData = {
        memberId: data.memberId,
        type: data.type,
        amount: data.type === 'monetary' ? data.amount : undefined,
        description: data.description,
        paymentMethod: data.type === 'monetary' ? data.paymentMethod : undefined,
        date: new Date(data.date).toISOString(),
        recordedBy: user?.id || '',
      };

      if (editingContribution) {
        await ContributionService.updateContribution(editingContribution.id, contributionData);
      } else {
        await ContributionService.createContribution(contributionData);
      }

      setIsModalOpen(false);
      reset();
    } catch (error) {
      console.error('Error saving contribution:', error);
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
        title="Contributions"
        description="Track and manage team contributions in UGX"
        actions={
          canCreateContribution && (
            <Button 
              onClick={handleCreate} 
              leftIcon={<Plus size={18} />}
              className="bg-primary-600 hover:bg-primary-700 text-white"
            >
              Add Contribution
            </Button>
          )
        }
      />

      <Card>
        {contributions.length > 0 ? (
          <Table
            data={contributions}
            columns={columns}
            onRowClick={(contribution) => console.log('Clicked contribution:', contribution)}
          />
        ) : (
          <EmptyState
            title="No contributions yet"
            description="There are no contributions recorded at the moment."
            icon={<CreditCard size={24} />}
            action={
              canCreateContribution
                ? {
                    label: 'Add Contribution',
                    onClick: handleCreate,
                  }
                : undefined
            }
          />
        )}
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingContribution ? 'Edit Contribution' : 'Add Contribution'}
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
              label="Contribution Type"
              options={typeOptions}
              placeholder="Select type"
              error={errors.type?.message}
              required
              {...register('type', { required: 'Type is required' })}
            />

            <Input
              label="Date"
              type="date"
              error={errors.date?.message}
              required
              {...register('date', { required: 'Date is required' })}
            />
          </div>

          {watchType === 'monetary' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Input
                  label="Amount (UGX)"
                  type="number"
                  step="1"
                  min="0"
                  placeholder="e.g., 50000"
                  error={errors.amount?.message}
                  required
                  {...register('amount', { 
                    required: watchType === 'monetary' ? 'Amount is required for monetary contributions' : false,
                    min: { value: 0, message: 'Amount must be positive' }
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
                error={errors.paymentMethod?.message}
                required
                {...register('paymentMethod', { 
                  required: watchType === 'monetary' ? 'Payment method is required for monetary contributions' : false 
                })}
              />
            </div>
          )}

          <Input
            label="Description"
            placeholder={watchType === 'monetary' ? 'e.g., Monthly dues, tournament fee' : 'e.g., Training equipment, jerseys'}
            error={errors.description?.message}
            required
            {...register('description', { required: 'Description is required' })}
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
              {editingContribution ? 'Update Contribution' : 'Add Contribution'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Contribution"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-300">
            Are you sure you want to delete this contribution? This action cannot be undone.
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
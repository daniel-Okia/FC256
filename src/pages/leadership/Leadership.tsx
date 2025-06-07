import React, { useState, useEffect } from 'react';
import { Crown, Plus, Edit, Trash2, User, Calendar } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { LeadershipService, MemberService } from '../../services/firestore';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Table from '../../components/ui/Table';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/common/EmptyState';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Avatar from '../../components/ui/Avatar';
import { Leadership as LeadershipType, Member, LeadershipRole } from '../../types';
import { formatDate } from '../../utils/date-utils';
import { canUserAccess, Permissions } from '../../utils/permissions';
import { useForm } from 'react-hook-form';

interface LeadershipFormData {
  memberId: string;
  role: LeadershipRole;
  startDate: string;
  endDate?: string;
}

const Leadership: React.FC = () => {
  const { user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [leadershipRoles, setLeadershipRoles] = useState<LeadershipType[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<LeadershipType | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<LeadershipType | null>(null);

  const canManageLeadership = user && canUserAccess(user.role, Permissions.MANAGE_LEADERSHIP);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<LeadershipFormData>();

  const roleOptions = [
    { value: 'Head Coach', label: 'Head Coach' },
    { value: 'Assistant Coach', label: 'Assistant Coach' },
    { value: 'Team Manager', label: 'Team Manager' },
    { value: 'Captain', label: 'Captain' },
    { value: 'Vice Captain', label: 'Vice Captain' },
    { value: 'Fitness Trainer', label: 'Fitness Trainer' },
  ];

  // Load data from Firestore
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [membersData, leadershipData] = await Promise.all([
          MemberService.getAllMembers(),
          LeadershipService.getAllLeadership(),
        ]);
        setMembers(membersData);
        setLeadershipRoles(leadershipData);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();

    // Set up real-time listeners
    const unsubscribeMembers = MemberService.subscribeToMembers(setMembers);
    const unsubscribeLeadership = LeadershipService.subscribeToLeadership((leadership) => {
      setLeadershipRoles(leadership);
      setLoading(false);
    });

    return () => {
      unsubscribeMembers();
      unsubscribeLeadership();
    };
  }, []);

  const memberOptions = members.map(member => ({
    value: member.id,
    label: `${member.name} (#${member.jerseyNumber})`,
  }));

  const getMemberById = (id: string) => members.find(m => m.id === id);

  const getRoleBadgeVariant = (role: LeadershipRole) => {
    switch (role) {
      case 'Head Coach':
      case 'Captain':
        return 'primary';
      case 'Assistant Coach':
      case 'Vice Captain':
        return 'secondary';
      case 'Team Manager':
        return 'success';
      case 'Fitness Trainer':
        return 'warning';
      default:
        return 'default';
    }
  };

  const columns = [
    {
      key: 'member',
      title: 'Member',
      render: (leadership: LeadershipType) => {
        const member = getMemberById(leadership.memberId);
        return member ? (
          <div className="flex items-center">
            <Avatar size="sm" className="mr-3" />
            <div>
              <div className="font-medium text-gray-900 dark:text-white">
                {member.name}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                #{member.jerseyNumber} • {member.position}
              </div>
            </div>
          </div>
        ) : (
          'Unknown Member'
        );
      },
    },
    {
      key: 'role',
      title: 'Role',
      render: (leadership: LeadershipType) => (
        <Badge variant={getRoleBadgeVariant(leadership.role)}>
          {leadership.role}
        </Badge>
      ),
    },
    {
      key: 'startDate',
      title: 'Start Date',
      render: (leadership: LeadershipType) => formatDate(leadership.startDate),
    },
    {
      key: 'endDate',
      title: 'End Date',
      render: (leadership: LeadershipType) => 
        leadership.endDate ? formatDate(leadership.endDate) : 'Active',
    },
    {
      key: 'status',
      title: 'Status',
      render: (leadership: LeadershipType) => (
        <Badge variant={leadership.isActive ? 'success' : 'warning'}>
          {leadership.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (leadership: LeadershipType) => (
        <div className="flex space-x-2">
          {canManageLeadership && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEdit(leadership);
                }}
              >
                <Edit size={16} />
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteClick(leadership);
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
    setEditingRole(null);
    reset({
      memberId: '',
      role: 'Head Coach',
      startDate: '',
      endDate: '',
    });
    setIsModalOpen(true);
  };

  const handleEdit = (role: LeadershipType) => {
    setEditingRole(role);
    setValue('memberId', role.memberId);
    setValue('role', role.role);
    setValue('startDate', role.startDate);
    setValue('endDate', role.endDate || '');
    setIsModalOpen(true);
  };

  const handleDeleteClick = (role: LeadershipType) => {
    setRoleToDelete(role);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (roleToDelete) {
      try {
        await LeadershipService.deleteLeadership(roleToDelete.id);
        setIsDeleteModalOpen(false);
        setRoleToDelete(null);
      } catch (error) {
        console.error('Error deleting leadership role:', error);
      }
    }
  };

  const onSubmit = async (data: LeadershipFormData) => {
    try {
      setSubmitting(true);
      
      const roleData = {
        memberId: data.memberId,
        role: data.role,
        startDate: data.startDate,
        endDate: data.endDate || undefined,
        isActive: !data.endDate || new Date(data.endDate) > new Date(),
      };

      if (editingRole) {
        await LeadershipService.updateLeadership(editingRole.id, roleData);
      } else {
        await LeadershipService.createLeadership(roleData);
      }

      setIsModalOpen(false);
      reset();
    } catch (error) {
      console.error('Error saving leadership role:', error);
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
        title="Leadership Roles"
        description="Manage team leadership positions and responsibilities"
        actions={
          canManageLeadership && (
            <Button 
              onClick={handleCreate} 
              leftIcon={<Plus size={18} />}
              className="bg-primary-600 hover:bg-primary-700 text-white"
            >
              Add Leadership Role
            </Button>
          )
        }
      />

      <Card>
        {leadershipRoles.length > 0 ? (
          <Table
            data={leadershipRoles}
            columns={columns}
            onRowClick={(role) => console.log('Clicked role:', role)}
          />
        ) : (
          <EmptyState
            title="No leadership roles assigned"
            description="There are no leadership roles assigned at the moment."
            icon={<Crown size={24} />}
            action={
              canManageLeadership
                ? {
                    label: 'Add Leadership Role',
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
        title={editingRole ? 'Edit Leadership Role' : 'Add Leadership Role'}
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

          <Select
            label="Leadership Role"
            options={roleOptions}
            placeholder="Select leadership role"
            error={errors.role?.message}
            required
            {...register('role', { required: 'Role is required' })}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Start Date"
              type="date"
              error={errors.startDate?.message}
              required
              {...register('startDate', { required: 'Start date is required' })}
            />

            <Input
              label="End Date"
              type="date"
              helperText="Leave empty for ongoing role"
              error={errors.endDate?.message}
              {...register('endDate')}
            />
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
              className="bg-primary-600 hover:bg-primary-700 text-white"
            >
              {editingRole ? 'Update Role' : 'Add Role'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Remove Leadership Role"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-300">
            Are you sure you want to remove this leadership role? This action cannot be undone.
          </p>
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              variant="outline"
              onClick={() => setIsDeleteModalOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              Remove Role
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Leadership;
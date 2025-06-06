import React, { useState } from 'react';
import { Crown, Plus, Edit, Trash2, User, Calendar } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Table from '../../components/ui/Table';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/common/EmptyState';
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
  
  // Mock members data
  const [members] = useState<Member[]>([
    {
      id: '1',
      name: 'John Doe',
      position: 'Forward',
      jerseyNumber: 10,
      email: 'john@example.com',
      phone: '+1234567890',
      status: 'active',
      dateJoined: '2023-01-15',
    },
    {
      id: '2',
      name: 'Jane Smith',
      position: 'Midfielder',
      jerseyNumber: 8,
      email: 'jane@example.com',
      phone: '+1234567891',
      status: 'active',
      dateJoined: '2023-02-20',
    },
    {
      id: '3',
      name: 'Mike Johnson',
      position: 'Defender',
      jerseyNumber: 4,
      email: 'mike@example.com',
      phone: '+1234567892',
      status: 'active',
      dateJoined: '2023-03-10',
    },
  ]);

  const [leadershipRoles, setLeadershipRoles] = useState<LeadershipType[]>([
    {
      id: '1',
      memberId: '1',
      role: 'Captain',
      startDate: '2024-01-01',
      isActive: true,
    },
    {
      id: '2',
      memberId: '2',
      role: 'Vice Captain',
      startDate: '2024-01-01',
      isActive: true,
    },
    {
      id: '3',
      memberId: '3',
      role: 'Team Manager',
      startDate: '2024-01-01',
      endDate: '2024-06-30',
      isActive: false,
    },
  ]);

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
    reset();
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

  const handleDelete = () => {
    if (roleToDelete) {
      setLeadershipRoles(prev => prev.filter(r => r.id !== roleToDelete.id));
      setIsDeleteModalOpen(false);
      setRoleToDelete(null);
    }
  };

  const onSubmit = (data: LeadershipFormData) => {
    const roleData: LeadershipType = {
      id: editingRole?.id || Date.now().toString(),
      memberId: data.memberId,
      role: data.role,
      startDate: data.startDate,
      endDate: data.endDate || undefined,
      isActive: !data.endDate || new Date(data.endDate) > new Date(),
    };

    if (editingRole) {
      setLeadershipRoles(prev => 
        prev.map(r => r.id === editingRole.id ? roleData : r)
      );
    } else {
      setLeadershipRoles(prev => [...prev, roleData]);
    }

    setIsModalOpen(false);
    reset();
  };

  return (
    <div>
      <PageHeader
        title="Leadership Roles"
        description="Manage team leadership positions and responsibilities"
        actions={
          canManageLeadership && (
            <Button onClick={handleCreate} leftIcon={<Plus size={18} />}>
              Assign Role
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
                    label: 'Assign Role',
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
        title={editingRole ? 'Edit Leadership Role' : 'Assign Leadership Role'}
        size="md"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Select
            label="Member"
            options={memberOptions}
            error={errors.memberId?.message}
            {...register('memberId', { required: 'Member is required' })}
          />

          <Select
            label="Role"
            options={roleOptions}
            error={errors.role?.message}
            {...register('role', { required: 'Role is required' })}
          />

          <Input
            label="Start Date"
            type="date"
            error={errors.startDate?.message}
            {...register('startDate', { required: 'Start date is required' })}
          />

          <Input
            label="End Date (Optional)"
            type="date"
            helperText="Leave empty for ongoing role"
            error={errors.endDate?.message}
            {...register('endDate')}
          />

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">
              {editingRole ? 'Update Role' : 'Assign Role'}
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
          <div className="flex justify-end space-x-3">
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
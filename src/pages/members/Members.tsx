import React, { useState, useEffect } from 'react';
import { UserPlus, Download, Search, Edit, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Member, Position, MemberStatus } from '../../types';
import { MemberService } from '../../services/firestore';
import PageHeader from '../../components/layout/PageHeader';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Table from '../../components/ui/Table';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import { canUserAccess, Permissions } from '../../utils/permissions';
import { exportToCSV } from '../../utils/export-utils';
import { useForm } from 'react-hook-form';

interface MemberFormData {
  name: string;
  position: Position;
  jerseyNumber: number;
  email: string;
  phone: string;
  status: MemberStatus;
}

const Members: React.FC = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<Member | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const canCreateMember = user && canUserAccess(user.role, Permissions.CREATE_MEMBER);
  const canEditMember = user && canUserAccess(user.role, Permissions.EDIT_MEMBER);
  const canDeleteMember = user && canUserAccess(user.role, Permissions.DELETE_MEMBER);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<MemberFormData>();

  const positionOptions = [
    { value: 'Goalkeeper', label: 'Goalkeeper' },
    { value: 'Defender', label: 'Defender' },
    { value: 'Midfielder', label: 'Midfielder' },
    { value: 'Forward', label: 'Forward' },
    { value: 'Coach', label: 'Coach' },
    { value: 'Manager', label: 'Manager' },
  ];

  const statusOptions = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'injured', label: 'Injured' },
    { value: 'suspended', label: 'Suspended' },
  ];

  // Load members from Firestore
  useEffect(() => {
    const loadMembers = async () => {
      try {
        setLoading(true);
        const membersData = await MemberService.getAllMembers();
        setMembers(membersData);
      } catch (error) {
        console.error('Error loading members:', error);
      } finally {
        setLoading(false);
      }
    };

    loadMembers();

    // Set up real-time listener
    const unsubscribe = MemberService.subscribeToMembers((membersData) => {
      setMembers(membersData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredMembers = members.filter((member) =>
    member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'warning';
      case 'injured':
        return 'danger';
      case 'suspended':
        return 'error';
      default:
        return 'default';
    }
  };

  const columns = [
    {
      key: 'jerseyNumber',
      title: '#',
      render: (member: Member) => (
        <span className="font-semibold">{member.jerseyNumber}</span>
      ),
    },
    {
      key: 'name',
      title: 'Name',
      render: (member: Member) => (
        <div className="font-medium text-gray-900 dark:text-white">
          {member.name}
        </div>
      ),
    },
    {
      key: 'position',
      title: 'Position',
    },
    {
      key: 'email',
      title: 'Email',
    },
    {
      key: 'phone',
      title: 'Phone',
    },
    {
      key: 'status',
      title: 'Status',
      render: (member: Member) => (
        <Badge
          variant={getStatusBadgeVariant(member.status)}
          className="capitalize"
        >
          {member.status}
        </Badge>
      ),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (member: Member) => (
        <div className="flex space-x-2">
          {canEditMember && (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                handleEdit(member);
              }}
            >
              <Edit size={16} />
            </Button>
          )}
          {canDeleteMember && (
            <Button
              size="sm"
              variant="danger"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteClick(member);
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
    setEditingMember(null);
    reset({
      name: '',
      position: 'Forward',
      jerseyNumber: 1,
      email: '',
      phone: '',
      status: 'active',
    });
    setIsModalOpen(true);
  };

  const handleEdit = (member: Member) => {
    setEditingMember(member);
    setValue('name', member.name);
    setValue('position', member.position);
    setValue('jerseyNumber', member.jerseyNumber);
    setValue('email', member.email);
    setValue('phone', member.phone);
    setValue('status', member.status);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (member: Member) => {
    setMemberToDelete(member);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (memberToDelete) {
      try {
        await MemberService.deleteMember(memberToDelete.id);
        setIsDeleteModalOpen(false);
        setMemberToDelete(null);
      } catch (error) {
        console.error('Error deleting member:', error);
      }
    }
  };

  const onSubmit = async (data: MemberFormData) => {
    try {
      setSubmitting(true);
      
      if (editingMember) {
        await MemberService.updateMember(editingMember.id, data);
      } else {
        await MemberService.createMember({
          ...data,
          dateJoined: new Date().toISOString().split('T')[0],
        });
      }

      setIsModalOpen(false);
      reset();
    } catch (error) {
      console.error('Error saving member:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleExport = () => {
    const headers = [
      { key: 'jerseyNumber', label: 'Jersey Number' },
      { key: 'name', label: 'Name' },
      { key: 'position', label: 'Position' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone' },
      { key: 'status', label: 'Status' },
      { key: 'dateJoined', label: 'Date Joined' },
    ];

    exportToCSV(members, 'members-list', headers);
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
        title="Team Members"
        description="Manage your team roster and player information"
        actions={
          <div className="flex space-x-2">
            {canCreateMember && (
              <Button
                variant="primary"
                leftIcon={<UserPlus size={18} />}
                onClick={handleCreate}
                className="bg-primary-600 hover:bg-primary-700 text-white"
              >
                Add Member
              </Button>
            )}
            {canUserAccess(user?.role, Permissions.EXPORT_REPORTS) && (
              <Button
                variant="outline"
                leftIcon={<Download size={18} />}
                onClick={handleExport}
              >
                Export
              </Button>
            )}
          </div>
        }
      />

      <div className="mb-6">
        <Input
          placeholder="Search members..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          leftIcon={<Search size={18} />}
          fullWidth
        />
      </div>

      {filteredMembers.length > 0 ? (
        <Table
          data={filteredMembers}
          columns={columns}
          onRowClick={(member) => console.log('Member clicked:', member)}
          className="bg-white dark:bg-neutral-800 rounded-lg shadow"
        />
      ) : (
        <EmptyState
          title="No members found"
          description="There are no team members at the moment."
          icon={<UserPlus size={24} />}
          action={
            canCreateMember
              ? {
                  label: 'Add Member',
                  onClick: handleCreate,
                }
              : undefined
          }
        />
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingMember ? 'Edit Member' : 'Add New Member'}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Full Name"
              error={errors.name?.message}
              {...register('name', { required: 'Name is required' })}
            />

            <Input
              label="Jersey Number"
              type="number"
              error={errors.jerseyNumber?.message}
              {...register('jerseyNumber', { 
                required: 'Jersey number is required',
                min: { value: 1, message: 'Jersey number must be at least 1' },
                max: { value: 99, message: 'Jersey number must be at most 99' }
              })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Position"
              options={positionOptions}
              error={errors.position?.message}
              {...register('position', { required: 'Position is required' })}
            />

            <Select
              label="Status"
              options={statusOptions}
              error={errors.status?.message}
              {...register('status', { required: 'Status is required' })}
            />
          </div>

          <Input
            label="Email"
            type="email"
            error={errors.email?.message}
            {...register('email', { 
              required: 'Email is required',
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: 'Invalid email address',
              },
            })}
          />

          <Input
            label="Phone"
            type="tel"
            error={errors.phone?.message}
            {...register('phone', { required: 'Phone is required' })}
          />

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={submitting}>
              {editingMember ? 'Update Member' : 'Add Member'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Member"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-300">
            Are you sure you want to delete this member? This action cannot be undone.
          </p>
          <div className="flex justify-end space-x-3">
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

export default Members;
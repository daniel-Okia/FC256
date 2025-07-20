import React, { useState, useEffect } from 'react';
import { UserPlus, Download, Search, Edit, Trash2, Eye } from 'lucide-react';
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
import { MembersPDFExporter } from '../../utils/pdf-export';
import { useForm } from 'react-hook-form';

interface MemberFormData {
  name: string;
  position: Position;
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
  const [exporting, setExporting] = useState(false);
  const [viewingMember, setViewingMember] = useState<Member | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  const canCreateMember = user && canUserAccess(user.role, Permissions.CREATE_MEMBER);
  const canEditMember = user && canUserAccess(user.role, Permissions.EDIT_MEMBER);
  const canDeleteMember = user && canUserAccess(user.role, Permissions.DELETE_MEMBER);
  const canExport = user && canUserAccess(user.role, Permissions.EXPORT_REPORTS);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<MemberFormData>();

  // Enhanced position options with more football positions
  const positionOptions = [
    { value: 'Goalkeeper', label: 'Goalkeeper' },
    { value: 'Centre-back', label: 'Centre-back' },
    { value: 'Left-back', label: 'Left-back' },
    { value: 'Right-back', label: 'Right-back' },
    { value: 'Sweeper', label: 'Sweeper' },
    { value: 'Defensive Midfielder', label: 'Defensive Midfielder' },
    { value: 'Central Midfielder', label: 'Central Midfielder' },
    { value: 'Attacking Midfielder', label: 'Attacking Midfielder' },
    { value: 'Left Midfielder', label: 'Left Midfielder' },
    { value: 'Right Midfielder', label: 'Right Midfielder' },
    { value: 'Left Winger', label: 'Left Winger' },
    { value: 'Right Winger', label: 'Right Winger' },
    { value: 'Centre Forward', label: 'Centre Forward' },
    { value: 'Striker', label: 'Striker' },
    { value: 'Second Striker', label: 'Second Striker' },
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

  // Filter and sort members
  const filteredMembers = members
    .filter((member) =>
      member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));

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

  const handleView = (member: Member) => {
    setViewingMember(member);
    setIsViewModalOpen(true);
  };

  const columns = [
    {
      key: 'jerseyNumber',
      title: 'Jersey #',
      render: (member: Member) => (
        <div className="font-bold text-primary-600 dark:text-primary-400">
          #{member.jerseyNumber}
        </div>
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
      render: (member: Member) => (
        <span className="text-gray-700 dark:text-gray-300">
          {member.position}
        </span>
      ),
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
      key: 'email',
      title: 'Email',
      render: (member: Member) => (
        <span className="text-sm text-gray-600 dark:text-gray-400 break-all">
          {member.email}
        </span>
      ),
    },
    {
      key: 'phone',
      title: 'Phone',
      render: (member: Member) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {member.phone}
        </span>
      ),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (member: Member) => (
        <div className="flex space-x-1">
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              handleView(member);
            }}
            className="p-1"
          >
            <Eye size={14} />
          </Button>
          {canEditMember && (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                handleEdit(member);
              }}
              className="p-1"
            >
              <Edit size={14} />
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
              className="p-1"
            >
              <Trash2 size={14} />
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
      position: 'Centre Forward',
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
      
      // Generate a jersey number automatically (simple incrementing logic)
      const maxJerseyNumber = members.reduce((max, member) => 
        Math.max(max, member.jerseyNumber || 0), 0
      );
      const newJerseyNumber = maxJerseyNumber + 1;
      
      const memberData = {
        ...data,
        jerseyNumber: editingMember ? editingMember.jerseyNumber : newJerseyNumber,
        dateJoined: editingMember ? editingMember.dateJoined : new Date().toISOString().split('T')[0],
      };
      
      if (editingMember) {
        await MemberService.updateMember(editingMember.id, memberData);
      } else {
        await MemberService.createMember(memberData);
      }

      setIsModalOpen(false);
      reset();
    } catch (error) {
      console.error('Error saving member:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      console.log('Starting member export with data:', members.length);
      const exporter = new MembersPDFExporter();
      exporter.exportMembers(members);
    } catch (error) {
      console.error('Error exporting members:', error);
      alert('Failed to export PDF. Please check the console for details.');
    } finally {
      setExporting(false);
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
    <div className="w-full max-w-full overflow-hidden">
      <PageHeader
        title="Team Members"
        description={`Manage your team roster and player information (${filteredMembers.length} members)`}
        actions={
          <div className="flex flex-col sm:flex-row gap-2">
            {canCreateMember && (
              <Button
                variant="primary"
                leftIcon={<UserPlus size={18} />}
                onClick={handleCreate}
                className="bg-primary-600 hover:bg-primary-700 text-white w-full sm:w-auto"
              >
                Add Member
              </Button>
            )}
            {canExport && (
              <Button
                variant="outline"
                leftIcon={<Download size={18} />}
                onClick={handleExport}
                isLoading={exporting}
                className="w-full sm:w-auto"
              >
                Export PDF
              </Button>
            )}
          </div>
        }
      />

      <div className="mb-6">
        <Input
          placeholder="Search members by name, position, or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          leftIcon={<Search size={18} />}
          fullWidth
        />
      </div>

      {filteredMembers.length > 0 ? (
        <div className="w-full overflow-hidden">
          <Table
            data={filteredMembers}
            columns={columns}
            onRowClick={(member) => handleView(member)}
            className="w-full"
          />
        </div>
      ) : (
        <EmptyState
          title={searchTerm ? "No members found" : "No members yet"}
          description={
            searchTerm 
              ? `No members match "${searchTerm}". Try adjusting your search.`
              : "There are no team members at the moment."
          }
          icon={<UserPlus size={24} />}
          action={
            canCreateMember && !searchTerm
              ? {
                  label: 'Add Member',
                  onClick: handleCreate,
                }
              : undefined
          }
        />
      )}

      {/* View Member Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title="Member Details"
        size="lg"
      >
        {viewingMember && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Full Name
                </label>
                <p className="text-gray-900 dark:text-white font-medium">
                  {viewingMember.name}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Jersey Number
                </label>
                <p className="text-gray-900 dark:text-white font-bold text-primary-600 dark:text-primary-400">
                  #{viewingMember.jerseyNumber}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Position
                </label>
                <p className="text-gray-900 dark:text-white">
                  {viewingMember.position}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Status
                </label>
                <Badge
                  variant={getStatusBadgeVariant(viewingMember.status)}
                  className="capitalize"
                >
                  {viewingMember.status}
                </Badge>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email Address
                </label>
                <p className="text-gray-900 dark:text-white break-all">
                  {viewingMember.email}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Phone Number
                </label>
                <p className="text-gray-900 dark:text-white">
                  {viewingMember.phone}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Date Joined
                </label>
                <p className="text-gray-900 dark:text-white">
                  {new Date(viewingMember.dateJoined).toLocaleDateString()}
                </p>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              {canEditMember && (
                <Button
                  onClick={() => {
                    setIsViewModalOpen(false);
                    handleEdit(viewingMember);
                  }}
                  leftIcon={<Edit size={16} />}
                  className="bg-primary-600 hover:bg-primary-700 text-white"
                >
                  Edit Member
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

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingMember ? 'Edit Member' : 'Add New Member'}
        size="xl"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Input
            label="Full Name"
            placeholder="Enter member's full name"
            error={errors.name?.message}
            required
            {...register('name', { required: 'Name is required' })}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Select
              label="Position"
              options={positionOptions}
              placeholder="Select position"
              error={errors.position?.message}
              required
              {...register('position', { required: 'Position is required' })}
            />

            <Select
              label="Status"
              options={statusOptions}
              placeholder="Select status"
              error={errors.status?.message}
              required
              {...register('status', { required: 'Status is required' })}
            />
          </div>

          <Input
            label="Email Address"
            type="email"
            placeholder="member@example.com"
            error={errors.email?.message}
            required
            {...register('email', { 
              required: 'Email is required',
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: 'Invalid email address',
              },
            })}
          />

          <Input
            label="Phone Number"
            type="tel"
            placeholder="+256 700 123 456"
            error={errors.phone?.message}
            required
            {...register('phone', { required: 'Phone is required' })}
          />

          {!editingMember && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                <strong>Note:</strong> Jersey number will be assigned automatically when the member is created.
              </p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              isLoading={submitting}
              className="bg-primary-600 hover:bg-primary-700 text-white w-full sm:w-auto"
            >
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
            Are you sure you want to delete <strong>{memberToDelete?.name}</strong>? This action cannot be undone.
          </p>
          <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              variant="outline"
              onClick={() => setIsDeleteModalOpen(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button 
              variant="danger" 
              onClick={handleDelete}
              className="w-full sm:w-auto"
            >
              Delete Member
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Members;
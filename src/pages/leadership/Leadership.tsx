import React, { useState, useEffect } from 'react';
import { Crown, Plus, Edit, Trash2, User, Calendar, Download } from 'lucide-react';
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
import { LeadershipPDFExporter } from '../../utils/pdf-export';
import { useForm } from 'react-hook-form';

interface LeadershipFormData {
  memberId: string;
  role: LeadershipRole;
}

const Leadership: React.FC = () => {
  const { user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [leadershipRoles, setLeadershipRoles] = useState<LeadershipType[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<LeadershipType | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<LeadershipType | null>(null);

  const canManageLeadership = user && canUserAccess(user.role, Permissions.MANAGE_LEADERSHIP);
  const canExport = user && canUserAccess(user.role, Permissions.EXPORT_REPORTS);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<LeadershipFormData>();

  // Comprehensive role options organized by category
  const roleOptions = [
    // Technical Staff
    { value: 'Head Coach', label: '🏆 Head Coach' },
    { value: 'Assistant Coach', label: '🥅 Assistant Coach' },
    { value: 'Goalkeeping Coach', label: '🧤 Goalkeeping Coach' },
    { value: 'Fitness Trainer', label: '💪 Fitness Trainer' },
    { value: 'Physiotherapist', label: '🏥 Physiotherapist' },
    { value: 'Team Doctor', label: '👨‍⚕️ Team Doctor' },
    { value: 'Nutritionist', label: '🥗 Nutritionist' },
    
    // Team Leadership
    { value: 'Captain', label: '👑 Captain' },
    { value: 'Vice Captain', label: '🔰 Vice Captain' },
    { value: 'Team Leader', label: '👥 Team Leader' },
    
    // Administrative Roles
    { value: 'Chairman', label: '🏛️ Chairman' },
    { value: 'Vice Chairman', label: '🏛️ Vice Chairman' },
    { value: 'Team Manager', label: '📋 Team Manager' },
    { value: 'Secretary', label: '📝 Secretary' },
    { value: 'Treasurer', label: '💰 Treasurer' },
    { value: 'Public Relations Officer', label: '📢 Public Relations Officer' },
    { value: 'Media Officer', label: '📺 Media Officer' },
    
    // Equipment & Logistics
    { value: 'Equipment Manager', label: '⚽ Equipment Manager' },
    { value: 'Kit Manager', label: '👕 Kit Manager' },
    { value: 'Transport Coordinator', label: '🚌 Transport Coordinator' },
    { value: 'Groundskeeper', label: '🌱 Groundskeeper' },
    
    // Disciplinary & Welfare
    { value: 'Disciplinary Officer', label: '⚖️ Disciplinary Officer' },
    { value: 'Welfare Officer', label: '🤝 Welfare Officer' },
    { value: 'Player Liaison', label: '🔗 Player Liaison' },
    { value: 'Youth Coordinator', label: '👶 Youth Coordinator' },
    
    // Match Officials & Support
    { value: 'Match Coordinator', label: '📅 Match Coordinator' },
    { value: 'Scout', label: '🔍 Scout' },
    { value: 'Analyst', label: '📊 Analyst' },
    { value: 'Referee Liaison', label: '👨‍⚖️ Referee Liaison' },
    
    // Social & Events
    { value: 'Social Secretary', label: '🎉 Social Secretary' },
    { value: 'Events Coordinator', label: '🎪 Events Coordinator' },
    { value: 'Fundraising Officer', label: '💵 Fundraising Officer' },
    { value: 'Community Outreach Officer', label: '🌍 Community Outreach Officer' },
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
    // Technical Staff
    if (['Head Coach', 'Assistant Coach', 'Goalkeeping Coach'].includes(role)) {
      return 'primary';
    }
    // Team Leadership
    if (['Captain', 'Vice Captain', 'Team Leader'].includes(role)) {
      return 'warning';
    }
    // Administrative
    if (['Chairman', 'Vice Chairman', 'Secretary', 'Treasurer'].includes(role)) {
      return 'success';
    }
    // Equipment & Logistics
    if (['Equipment Manager', 'Kit Manager', 'Transport Coordinator', 'Groundskeeper'].includes(role)) {
      return 'info';
    }
    // Medical & Fitness
    if (['Fitness Trainer', 'Physiotherapist', 'Team Doctor', 'Nutritionist'].includes(role)) {
      return 'secondary';
    }
    // Default
    return 'default';
  };

  const getRoleCategory = (role: LeadershipRole): string => {
    const technicalStaff = ['Head Coach', 'Assistant Coach', 'Goalkeeping Coach', 'Fitness Trainer', 'Physiotherapist', 'Team Doctor', 'Nutritionist'];
    const teamLeadership = ['Captain', 'Vice Captain', 'Team Leader'];
    const administrative = ['Chairman', 'Vice Chairman', 'Team Manager', 'Secretary', 'Treasurer', 'Public Relations Officer', 'Media Officer'];
    const equipment = ['Equipment Manager', 'Kit Manager', 'Transport Coordinator', 'Groundskeeper'];
    const disciplinary = ['Disciplinary Officer', 'Welfare Officer', 'Player Liaison', 'Youth Coordinator'];
    const matchSupport = ['Match Coordinator', 'Scout', 'Analyst', 'Referee Liaison'];
    const social = ['Social Secretary', 'Events Coordinator', 'Fundraising Officer', 'Community Outreach Officer'];

    if (technicalStaff.includes(role)) return 'Technical Staff';
    if (teamLeadership.includes(role)) return 'Team Leadership';
    if (administrative.includes(role)) return 'Administrative';
    if (equipment.includes(role)) return 'Equipment & Logistics';
    if (disciplinary.includes(role)) return 'Disciplinary & Welfare';
    if (matchSupport.includes(role)) return 'Match Support';
    if (social.includes(role)) return 'Social & Events';
    return 'Other';
  };

  const columns = [
    {
      key: 'member',
      title: 'Member',
      render: (leadership: LeadershipType) => {
        const member = getMemberById(leadership.memberId);
        return member ? (
          <div className="flex items-center">
            <Avatar size="sm\" className="mr-3" />
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
        <div>
          <Badge variant={getRoleBadgeVariant(leadership.role)} className="mb-1">
            {leadership.role}
          </Badge>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {getRoleCategory(leadership.role)}
          </div>
        </div>
      ),
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
      key: 'startDate',
      title: 'Start Date',
      render: (leadership: LeadershipType) => formatDate(leadership.startDate),
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
    });
    setIsModalOpen(true);
  };

  const handleEdit = (role: LeadershipType) => {
    setEditingRole(role);
    setValue('memberId', role.memberId);
    setValue('role', role.role);
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
        startDate: new Date().toISOString().split('T')[0], // Set to current date
        isActive: true, // Always active when created
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

  const handleExport = async () => {
    try {
      setExporting(true);
      const exporter = new LeadershipPDFExporter();
      exporter.exportLeadership({
        leadership: leadershipRoles,
        members,
      });
    } catch (error) {
      console.error('Error exporting leadership:', error);
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
    <div>
      <PageHeader
        title="Leadership Roles"
        description="Manage team leadership positions and responsibilities across all club functions"
        actions={
          <div className="flex space-x-2">
            {canManageLeadership && (
              <Button 
                onClick={handleCreate} 
                leftIcon={<Plus size={18} />}
                className="bg-primary-600 hover:bg-primary-700 text-white"
              >
                Add Leadership Role
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

          <div>
            <Select
              label="Leadership Role"
              options={roleOptions}
              placeholder="Select leadership role"
              error={errors.role?.message}
              required
              {...register('role', { required: 'Role is required' })}
            />
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Choose from technical staff, administrative, equipment management, disciplinary, and social roles
            </p>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-center">
              <Crown size={20} className="text-blue-600 dark:text-blue-400 mr-2" />
              <div>
                <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Leadership Assignment
                </h4>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  The role will be assigned immediately and marked as active. Members can hold multiple leadership positions.
                </p>
              </div>
            </div>
          </div>

          {/* Role Categories Info */}
          <div className="bg-gray-50 dark:bg-neutral-700/30 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
              Role Categories Available:
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div>
                <p className="font-medium text-primary-600 dark:text-primary-400">🏆 Technical Staff</p>
                <p className="text-gray-600 dark:text-gray-400">Coaches, trainers, medical staff</p>
              </div>
              <div>
                <p className="font-medium text-yellow-600 dark:text-yellow-400">👑 Team Leadership</p>
                <p className="text-gray-600 dark:text-gray-400">Captain, vice captain, team leaders</p>
              </div>
              <div>
                <p className="font-medium text-green-600 dark:text-green-400">🏛️ Administrative</p>
                <p className="text-gray-600 dark:text-gray-400">Chairman, secretary, treasurer</p>
              </div>
              <div>
                <p className="font-medium text-blue-600 dark:text-blue-400">⚽ Equipment & Logistics</p>
                <p className="text-gray-600 dark:text-gray-400">Equipment, transport, grounds</p>
              </div>
              <div>
                <p className="font-medium text-purple-600 dark:text-purple-400">⚖️ Disciplinary & Welfare</p>
                <p className="text-gray-600 dark:text-gray-400">Discipline, welfare, player liaison</p>
              </div>
              <div>
                <p className="font-medium text-red-600 dark:text-red-400">🎉 Social & Events</p>
                <p className="text-gray-600 dark:text-gray-400">Events, fundraising, community</p>
              </div>
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
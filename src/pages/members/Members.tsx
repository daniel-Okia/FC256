import React, { useState } from 'react';
import { UserPlus, Download, Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Member } from '../../types';
import PageHeader from '../../components/layout/PageHeader';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import { canUserAccess, Permissions } from '../../utils/permissions';
import { exportToCSV } from '../../utils/export-utils';

const Members: React.FC = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');

  // Mock data for demonstration
  const members: Member[] = [
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
      status: 'injured',
      dateJoined: '2023-03-10',
    },
  ];

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
  ];

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

  return (
    <div>
      <PageHeader
        title="Team Members"
        description="Manage your team roster and player information"
        actions={
          <>
            {canUserAccess(user?.role, Permissions.CREATE_MEMBER) && (
              <Button
                variant="primary"
                leftIcon={<UserPlus size={18} />}
                className="mr-2"
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
          </>
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

      <Table
        data={filteredMembers}
        columns={columns}
        onRowClick={(member) => console.log('Member clicked:', member)}
        className="bg-white dark:bg-neutral-800 rounded-lg shadow"
      />
    </div>
  );
};

export default Members;
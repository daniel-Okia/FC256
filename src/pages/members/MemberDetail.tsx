import React from 'react';
import { useParams } from 'react-router-dom';
import { User, Phone, Mail, Calendar, Activity } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { Member } from '../../types';
import { formatDate } from '../../utils/date-utils';

const MemberDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  // Mock data for demonstration
  const member: Member = {
    id: '1',
    name: 'John Doe',
    position: 'Forward',
    jerseyNumber: 10,
    email: 'john@example.com',
    phone: '+1234567890',
    status: 'active',
    dateJoined: '2023-01-15',
  };

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

  return (
    <div>
      <PageHeader
        title={member.name}
        description={`#${member.jerseyNumber} · ${member.position}`}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <div className="text-center">
            <div className="inline-block p-4 rounded-full bg-primary-100 dark:bg-primary-900/30 mb-4">
              <User size={48} className="text-primary-600 dark:text-primary-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {member.name}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {member.position}
            </p>
            <div className="mt-2">
              <Badge
                variant={getStatusBadgeVariant(member.status)}
                size="lg"
                className="capitalize"
              >
                {member.status}
              </Badge>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <div className="flex items-center text-gray-500 dark:text-gray-400">
              <Mail size={18} className="mr-2" />
              <span>{member.email}</span>
            </div>
            <div className="flex items-center text-gray-500 dark:text-gray-400">
              <Phone size={18} className="mr-2" />
              <span>{member.phone}</span>
            </div>
            <div className="flex items-center text-gray-500 dark:text-gray-400">
              <Calendar size={18} className="mr-2" />
              <span>Joined {formatDate(member.dateJoined)}</span>
            </div>
          </div>
        </Card>

        <Card className="lg:col-span-2" title="Recent Activity">
          <div className="space-y-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <Activity size={18} className="text-primary-600 dark:text-primary-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-gray-900 dark:text-white">
                  Attended training session
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Wednesday, March 15, 2024
                </p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <Activity size={18} className="text-primary-600 dark:text-primary-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-gray-900 dark:text-white">
                  Played in friendly match vs FC Victory
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Saturday, March 11, 2024
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default MemberDetail;
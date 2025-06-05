import React from 'react';
import { Calendar } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Table from '../../components/ui/Table';
import EmptyState from '../../components/common/EmptyState';
import { useAuth } from '../../context/AuthContext';
import { Event } from '../../types';
import { formatDate } from '../../utils/date-utils';
import { canUserAccess, Permissions } from '../../utils/permissions';

const Friendlies: React.FC = () => {
  const { user } = useAuth();
  const canCreateFriendly = user && canUserAccess(user.role, Permissions.CREATE_EVENT);

  // Mock data for demonstration
  const friendlies: Event[] = [
    {
      id: '1',
      type: 'friendly',
      date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      time: '15:00',
      location: 'Victory Park',
      description: 'Preparation match',
      opponent: 'FC Victory',
      createdBy: '1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: '2',
      type: 'friendly',
      date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
      time: '16:30',
      location: 'Central Stadium',
      description: 'Tactical practice match',
      opponent: 'United FC',
      createdBy: '1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  const columns = [
    {
      key: 'date',
      title: 'Date',
      render: (friendly: Event) => formatDate(friendly.date),
    },
    {
      key: 'time',
      title: 'Time',
      render: (friendly: Event) => friendly.time,
    },
    {
      key: 'opponent',
      title: 'Opponent',
      render: (friendly: Event) => friendly.opponent,
    },
    {
      key: 'location',
      title: 'Location',
      render: (friendly: Event) => friendly.location,
    },
    {
      key: 'description',
      title: 'Description',
      render: (friendly: Event) => friendly.description || 'No description',
    },
  ];

  const handleCreateFriendly = () => {
    // Implementation for creating a new friendly match
    console.log('Create friendly match');
  };

  return (
    <div>
      <PageHeader
        title="Friendly Matches"
        description="Schedule and manage friendly matches"
        actions={
          canCreateFriendly && (
            <Button onClick={handleCreateFriendly}>Schedule Friendly</Button>
          )
        }
      />

      <Card>
        {friendlies.length > 0 ? (
          <Table
            data={friendlies}
            columns={columns}
            onRowClick={(friendly) => console.log('Clicked friendly:', friendly)}
          />
        ) : (
          <EmptyState
            title="No friendly matches scheduled"
            description="There are no upcoming friendly matches scheduled at the moment."
            icon={<Calendar size={24} />}
            action={
              canCreateFriendly
                ? {
                    label: 'Schedule Friendly',
                    onClick: handleCreateFriendly,
                  }
                : undefined
            }
          />
        )}
      </Card>
    </div>
  );
};

export default Friendlies;
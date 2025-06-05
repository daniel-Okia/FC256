import React from 'react';
import { CreditCard } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/common/EmptyState';
import { Contribution } from '../../types';
import { formatDate } from '../../utils/date-utils';
import { canUserAccess, Permissions } from '../../utils/permissions';

const Contributions: React.FC = () => {
  const { user } = useAuth();
  const canCreateContribution = user && canUserAccess(user.role, Permissions.CREATE_CONTRIBUTION);

  // Mock data for demonstration
  const contributions: Contribution[] = [
    {
      id: '1',
      memberId: '1',
      type: 'monetary',
      amount: 100,
      description: 'Monthly Dues',
      paymentMethod: 'bank transfer',
      date: new Date().toISOString(),
      recordedBy: '1',
      recordedAt: new Date().toISOString(),
    },
    {
      id: '2',
      memberId: '2',
      type: 'in-kind',
      description: 'Training Equipment',
      date: new Date().toISOString(),
      recordedBy: '1',
      recordedAt: new Date().toISOString(),
    },
  ];

  const columns = [
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
        contribution.amount ? `$${contribution.amount}` : 'N/A',
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
  ];

  const handleCreateContribution = () => {
    // Implementation for creating a new contribution
    console.log('Create contribution');
  };

  return (
    <div>
      <PageHeader
        title="Contributions"
        description="Track and manage team contributions"
        actions={
          canCreateContribution && (
            <Button onClick={handleCreateContribution}>Add Contribution</Button>
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
                    onClick: handleCreateContribution,
                  }
                : undefined
            }
          />
        )}
      </Card>
    </div>
  );
};

export default Contributions;
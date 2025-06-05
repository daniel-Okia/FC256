import React from 'react';
import { Users, Calendar, Award, CreditCard } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/layout/PageHeader';
import DashboardCard from './DashboardCard';
import AttendanceChart from './AttendanceChart';
import ContributionsChart from './ContributionsChart';
import UpcomingEvents from './UpcomingEvents';

const Dashboard: React.FC = () => {
  const { user } = useAuth();

  return (
    <div>
      <PageHeader
        title={`Welcome, ${user?.name}`}
        description="Team management dashboard and overview"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <DashboardCard
          title="Team Members"
          value="24"
          description="Active players"
          icon={<Users className="h-6 w-6 text-primary-600 dark:text-primary-400" />}
          trend={{ value: 8, isPositive: true }}
          link={{ text: 'View all members', to: '/members' }}
        />
        <DashboardCard
          title="Training Sessions"
          value="8"
          description="This month"
          icon={<Calendar className="h-6 w-6 text-primary-600 dark:text-primary-400" />}
          trend={{ value: 0, isPositive: true }}
          link={{ text: 'View training', to: '/training' }}
        />
        <DashboardCard
          title="Friendly Matches"
          value="3"
          description="This month"
          icon={<Award className="h-6 w-6 text-primary-600 dark:text-primary-400" />}
          trend={{ value: 50, isPositive: true }}
          link={{ text: 'View friendlies', to: '/friendlies' }}
        />
        <DashboardCard
          title="Contributions"
          value="$7,400"
          description="Total this month"
          icon={<CreditCard className="h-6 w-6 text-primary-600 dark:text-primary-400" />}
          trend={{ value: 12, isPositive: true }}
          link={{ text: 'View contributions', to: '/contributions' }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <AttendanceChart />
        <ContributionsChart />
      </div>

      <div className="grid grid-cols-1 gap-6">
        <UpcomingEvents />
      </div>
    </div>
  );
};

export default Dashboard;
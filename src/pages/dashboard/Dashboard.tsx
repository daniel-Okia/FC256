import React, { useState, useEffect } from 'react';
import { Users, Calendar, Award, CreditCard } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { MemberService, EventService, ContributionService } from '../../services/firestore';
import PageHeader from '../../components/layout/PageHeader';
import DashboardCard from './DashboardCard';
import AttendanceChart from './AttendanceChart';
import ContributionsChart from './ContributionsChart';
import UpcomingEvents from './UpcomingEvents';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatUGX } from '../../utils/currency-utils';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalMembers: 0,
    activeMembers: 0,
    trainingSessionsThisMonth: 0,
    friendliesThisMonth: 0,
    totalContributions: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        
        // Load all data in parallel
        const [members, events, contributions] = await Promise.all([
          MemberService.getAllMembers(),
          EventService.getAllEvents(),
          ContributionService.getAllContributions(),
        ]);

        // Calculate stats
        const activeMembers = members.filter(m => m.status === 'active').length;
        
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        
        const eventsThisMonth = events.filter(event => {
          const eventDate = new Date(event.date);
          return eventDate.getMonth() === currentMonth && eventDate.getFullYear() === currentYear;
        });
        
        const trainingSessionsThisMonth = eventsThisMonth.filter(e => e.type === 'training').length;
        const friendliesThisMonth = eventsThisMonth.filter(e => e.type === 'friendly').length;
        
        const contributionsThisMonth = contributions.filter(contribution => {
          const contributionDate = new Date(contribution.date);
          return contributionDate.getMonth() === currentMonth && contributionDate.getFullYear() === currentYear;
        });
        
        const totalContributions = contributionsThisMonth
          .filter(c => c.type === 'monetary' && c.amount)
          .reduce((sum, c) => sum + (c.amount || 0), 0);

        setStats({
          totalMembers: members.length,
          activeMembers,
          trainingSessionsThisMonth,
          friendliesThisMonth,
          totalContributions,
        });
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

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
        title={`Welcome, ${user?.name}`}
        description="Team management dashboard and overview"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <DashboardCard
          title="Team Members"
          value={stats.activeMembers.toString()}
          description={`${stats.totalMembers} total members`}
          icon={<Users className="h-6 w-6 text-primary-600 dark:text-primary-400" />}
          trend={{ value: 8, isPositive: true }}
          link={{ text: 'View all members', to: '/members' }}
        />
        <DashboardCard
          title="Training Sessions"
          value={stats.trainingSessionsThisMonth.toString()}
          description="This month"
          icon={<Calendar className="h-6 w-6 text-primary-600 dark:text-primary-400" />}
          trend={{ value: 0, isPositive: true }}
          link={{ text: 'View training', to: '/training' }}
        />
        <DashboardCard
          title="Friendly Matches"
          value={stats.friendliesThisMonth.toString()}
          description="This month"
          icon={<Award className="h-6 w-6 text-primary-600 dark:text-primary-400" />}
          trend={{ value: 50, isPositive: true }}
          link={{ text: 'View friendlies', to: '/friendlies' }}
        />
        <DashboardCard
          title="Contributions"
          value={formatUGX(stats.totalContributions)}
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
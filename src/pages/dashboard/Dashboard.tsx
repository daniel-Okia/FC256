import React, { useState, useEffect } from 'react';
import { Users, Calendar, Award, CreditCard } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { MemberService, EventService, ContributionService, AttendanceService } from '../../services/firestore';
import PageHeader from '../../components/layout/PageHeader';
import DashboardCard from './DashboardCard';
import AttendanceChart from './AttendanceChart';
import UpcomingEvents from './UpcomingEvents';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatUGX } from '../../utils/currency-utils';

interface DashboardStats {
  totalMembers: number;
  activeMembers: number;
  trainingSessionsThisMonth: number;
  friendliesThisMonth: number;
  totalContributions: number;
  // Previous month data for comparison
  trainingSessionsLastMonth: number;
  friendliesLastMonth: number;
  totalContributionsLastMonth: number;
  activeMembersLastMonth: number;
}

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalMembers: 0,
    activeMembers: 0,
    trainingSessionsThisMonth: 0,
    friendliesThisMonth: 0,
    totalContributions: 0,
    trainingSessionsLastMonth: 0,
    friendliesLastMonth: 0,
    totalContributionsLastMonth: 0,
    activeMembersLastMonth: 0,
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

        // Get current date info
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        // Get last month info
        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

        // Calculate current month stats
        const activeMembers = members.filter(m => m.status === 'active').length;
        
        const eventsThisMonth = events.filter(event => {
          const eventDate = new Date(event.date);
          return eventDate.getMonth() === currentMonth && eventDate.getFullYear() === currentYear;
        });
        
        const eventsLastMonth = events.filter(event => {
          const eventDate = new Date(event.date);
          return eventDate.getMonth() === lastMonth && eventDate.getFullYear() === lastMonthYear;
        });
        
        const trainingSessionsThisMonth = eventsThisMonth.filter(e => e.type === 'training').length;
        const friendliesThisMonth = eventsThisMonth.filter(e => e.type === 'friendly').length;
        
        const trainingSessionsLastMonth = eventsLastMonth.filter(e => e.type === 'training').length;
        const friendliesLastMonth = eventsLastMonth.filter(e => e.type === 'friendly').length;
        
        // Calculate contributions for current month
        const contributionsThisMonth = contributions.filter(contribution => {
          const contributionDate = new Date(contribution.date);
          return contributionDate.getMonth() === currentMonth && contributionDate.getFullYear() === currentYear;
        });
        
        const contributionsLastMonth = contributions.filter(contribution => {
          const contributionDate = new Date(contribution.date);
          return contributionDate.getMonth() === lastMonth && contributionDate.getFullYear() === lastMonthYear;
        });
        
        const totalContributions = contributionsThisMonth
          .filter(c => c.type === 'monetary' && c.amount)
          .reduce((sum, c) => sum + (c.amount || 0), 0);
          
        const totalContributionsLastMonth = contributionsLastMonth
          .filter(c => c.type === 'monetary' && c.amount)
          .reduce((sum, c) => sum + (c.amount || 0), 0);

        // For active members comparison, we'll use a simple assumption
        // In a real app, you'd track historical member status changes
        const activeMembersLastMonth = Math.max(0, activeMembers - 2); // Simple approximation

        setStats({
          totalMembers: members.length,
          activeMembers,
          trainingSessionsThisMonth,
          friendliesThisMonth,
          totalContributions,
          trainingSessionsLastMonth,
          friendliesLastMonth,
          totalContributionsLastMonth,
          activeMembersLastMonth,
        });
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  // Calculate percentage changes
  const calculatePercentageChange = (current: number, previous: number): { value: number; isPositive: boolean } => {
    if (previous === 0) {
      return { value: current > 0 ? 100 : 0, isPositive: current >= 0 };
    }
    
    const change = ((current - previous) / previous) * 100;
    return {
      value: Math.abs(Math.round(change)),
      isPositive: change >= 0,
    };
  };

  const membersTrend = calculatePercentageChange(stats.activeMembers, stats.activeMembersLastMonth);
  const trainingTrend = calculatePercentageChange(stats.trainingSessionsThisMonth, stats.trainingSessionsLastMonth);
  const friendliesTrend = calculatePercentageChange(stats.friendliesThisMonth, stats.friendliesLastMonth);
  const contributionsTrend = calculatePercentageChange(stats.totalContributions, stats.totalContributionsLastMonth);

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
          trend={membersTrend}
          link={{ text: 'View all members', to: '/members' }}
        />
        <DashboardCard
          title="Training Sessions"
          value={stats.trainingSessionsThisMonth.toString()}
          description="This month"
          icon={<Calendar className="h-6 w-6 text-primary-600 dark:text-primary-400" />}
          trend={trainingTrend}
          link={{ text: 'View training', to: '/training' }}
        />
        <DashboardCard
          title="Friendly Matches"
          value={stats.friendliesThisMonth.toString()}
          description="This month"
          icon={<Award className="h-6 w-6 text-primary-600 dark:text-primary-400" />}
          trend={friendliesTrend}
          link={{ text: 'View friendlies', to: '/friendlies' }}
        />
        <DashboardCard
          title="Contributions"
          value={formatUGX(stats.totalContributions)}
          description="Total this month"
          icon={<CreditCard className="h-6 w-6 text-primary-600 dark:text-primary-400" />}
          trend={contributionsTrend}
          link={{ text: 'View contributions', to: '/contributions' }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <AttendanceChart />
        <UpcomingEvents />
      </div>
    </div>
  );
};

export default Dashboard;
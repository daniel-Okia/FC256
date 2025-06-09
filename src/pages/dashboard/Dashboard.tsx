import React, { useState, useEffect } from 'react';
import { Users, Calendar, Award, CreditCard, TrendingDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { MemberService, EventService, ContributionService, ExpenseService, AttendanceService } from '../../services/firestore';
import PageHeader from '../../components/layout/PageHeader';
import DashboardCard from './DashboardCard';
import AttendanceChart from './AttendanceChart';
import UpcomingEvents from './UpcomingEvents';
import RecentTransactions from './RecentTransactions';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatUGX } from '../../utils/currency-utils';

interface DashboardStats {
  totalMembers: number;
  activeMembers: number;
  trainingSessionsThisMonth: number;
  friendliesThisMonth: number;
  totalContributions: number;
  totalExpenses: number;
  remainingBalance: number;
}

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalMembers: 0,
    activeMembers: 0,
    trainingSessionsThisMonth: 0,
    friendliesThisMonth: 0,
    totalContributions: 0,
    totalExpenses: 0,
    remainingBalance: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        
        // Load all data in parallel
        const [members, events, contributions, expenses] = await Promise.all([
          MemberService.getAllMembers(),
          EventService.getAllEvents(),
          ContributionService.getAllContributions(),
          ExpenseService.getAllExpenses(),
        ]);

        // Get current date info
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        // Calculate current month stats
        const activeMembers = members.filter(m => m.status === 'active').length;
        
        const eventsThisMonth = events.filter(event => {
          const eventDate = new Date(event.date);
          return eventDate.getMonth() === currentMonth && eventDate.getFullYear() === currentYear;
        });
        
        const trainingSessionsThisMonth = eventsThisMonth.filter(e => e.type === 'training').length;
        const friendliesThisMonth = eventsThisMonth.filter(e => e.type === 'friendly').length;
        
        // Calculate total contributions (monetary only)
        const totalContributions = contributions
          .filter(c => c.type === 'monetary' && c.amount)
          .reduce((sum, c) => sum + (c.amount || 0), 0);
          
        // Calculate total expenses
        const totalExpenses = expenses
          .reduce((sum, e) => sum + (e.amount || 0), 0);
          
        // Calculate remaining balance
        const remainingBalance = totalContributions - totalExpenses;

        setStats({
          totalMembers: members.length,
          activeMembers,
          trainingSessionsThisMonth,
          friendliesThisMonth,
          totalContributions,
          totalExpenses,
          remainingBalance,
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <DashboardCard
          title="Team Members"
          value={stats.activeMembers.toString()}
          description={`${stats.totalMembers} total members`}
          icon={<Users className="h-6 w-6 text-primary-600 dark:text-primary-400" />}
          link={{ text: 'View all members', to: '/members' }}
        />
        <DashboardCard
          title="Training Sessions"
          value={stats.trainingSessionsThisMonth.toString()}
          description="This month"
          icon={<Calendar className="h-6 w-6 text-primary-600 dark:text-primary-400" />}
          link={{ text: 'View training', to: '/training' }}
        />
        <DashboardCard
          title="Friendly Matches"
          value={stats.friendliesThisMonth.toString()}
          description="This month"
          icon={<Award className="h-6 w-6 text-primary-600 dark:text-primary-400" />}
          link={{ text: 'View friendlies', to: '/friendlies' }}
        />
        <DashboardCard
          title="Total Contributions"
          value={formatUGX(stats.totalContributions)}
          description="All time monetary"
          icon={<CreditCard className="h-6 w-6 text-green-600 dark:text-green-400" />}
          link={{ text: 'View contributions', to: '/contributions' }}
        />
        <DashboardCard
          title="Total Expenses"
          value={formatUGX(stats.totalExpenses)}
          description="All time spending"
          icon={<TrendingDown className="h-6 w-6 text-red-600 dark:text-red-400" />}
          link={{ text: 'View expenses', to: '/contributions' }}
        />
      </div>

      {/* Balance Summary */}
      <div className="mb-8">
        <div className="bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Financial Summary
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Current balance after all contributions and expenses
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {formatUGX(stats.remainingBalance)}
              </p>
              <p className={`text-sm font-medium ${
                stats.remainingBalance >= 0 
                  ? 'text-green-600 dark:text-green-400' 
                  : 'text-red-600 dark:text-red-400'
              }`}>
                {stats.remainingBalance >= 0 ? 'Available Balance' : 'Deficit'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <AttendanceChart />
        <UpcomingEvents />
      </div>

      {/* Recent Transactions Section */}
      <div className="mb-8">
        <RecentTransactions />
      </div>
    </div>
  );
};

export default Dashboard;
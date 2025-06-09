import React, { useState, useEffect } from 'react';
import { Users, Calendar, Award, CreditCard, TrendingDown, Download } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { MemberService, EventService, ContributionService, ExpenseService, AttendanceService } from '../../services/firestore';
import PageHeader from '../../components/layout/PageHeader';
import DashboardCard from './DashboardCard';
import AttendanceChart from './AttendanceChart';
import UpcomingEvents from './UpcomingEvents';
import RecentTransactions from './RecentTransactions';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Button from '../../components/ui/Button';
import { formatUGX } from '../../utils/currency-utils';
import { DashboardPDFExporter } from '../../utils/pdf-export';
import { canUserAccess, Permissions } from '../../utils/permissions';

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
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [exporting, setExporting] = useState(false);

  const canExport = user && canUserAccess(user.role, Permissions.EXPORT_REPORTS);

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

        console.log('Dashboard data loaded:', {
          members: members.length,
          events: events.length,
          contributions: contributions.length,
          expenses: expenses.length
        });

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
        
        // Calculate total contributions (monetary only) with proper number handling
        const monetaryContributions = contributions.filter(c => 
          c.type === 'monetary' && 
          c.amount !== undefined && 
          c.amount !== null && 
          !isNaN(Number(c.amount)) && 
          Number(c.amount) > 0
        );
        
        const totalContributions = monetaryContributions.reduce((sum, c) => {
          const amount = parseFloat(String(c.amount)) || 0;
          console.log('Processing contribution:', { id: c.id, amount: c.amount, parsed: amount });
          return sum + amount;
        }, 0);
          
        // Calculate total expenses with proper number handling
        const validExpenses = expenses.filter(e => 
          e.amount !== undefined && 
          e.amount !== null && 
          !isNaN(Number(e.amount)) && 
          Number(e.amount) > 0
        );
        
        const totalExpenses = validExpenses.reduce((sum, e) => {
          const amount = parseFloat(String(e.amount)) || 0;
          console.log('Processing expense:', { id: e.id, amount: e.amount, parsed: amount });
          return sum + amount;
        }, 0);
          
        // Calculate remaining balance
        const remainingBalance = totalContributions - totalExpenses;

        console.log('Financial calculations:', {
          monetaryContributions: monetaryContributions.length,
          totalContributions,
          validExpenses: validExpenses.length,
          totalExpenses,
          remainingBalance
        });

        // Get upcoming events
        const upcoming = events
          .filter(event => new Date(event.date) >= now)
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
          .slice(0, 5);
        setUpcomingEvents(upcoming);

        // Get recent transactions
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const recentContributions = contributions
          .filter(c => new Date(c.date) >= thirtyDaysAgo && c.type === 'monetary' && c.amount)
          .map(c => ({ ...c, type: 'contribution' }));
        
        const recentExpenses = expenses
          .filter(e => new Date(e.date) >= thirtyDaysAgo && e.amount)
          .map(e => ({ ...e, type: 'expense' }));
        
        const recent = [...recentContributions, ...recentExpenses]
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 10);
        setRecentTransactions(recent);

        setStats({
          totalMembers: members.length,
          activeMembers,
          trainingSessionsThisMonth,
          friendliesThisMonth,
          totalContributions: Math.round(totalContributions), // Round to avoid floating point issues
          totalExpenses: Math.round(totalExpenses),
          remainingBalance: Math.round(remainingBalance),
        });
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();

    // Set up real-time listeners for automatic updates
    const unsubscribeContributions = ContributionService.subscribeToContributions(() => {
      console.log('Contributions updated, reloading dashboard data');
      loadDashboardData();
    });

    const unsubscribeExpenses = ExpenseService.subscribeToExpenses(() => {
      console.log('Expenses updated, reloading dashboard data');
      loadDashboardData();
    });

    return () => {
      unsubscribeContributions();
      unsubscribeExpenses();
    };
  }, []);

  const handleExportDashboard = async () => {
    try {
      setExporting(true);
      const exporter = new DashboardPDFExporter();
      exporter.exportDashboard({
        stats,
        upcomingEvents,
        recentTransactions,
      });
    } catch (error) {
      console.error('Error exporting dashboard:', error);
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
        title={`Welcome, ${user?.name}`}
        description="Team management dashboard and overview"
        actions={
          canExport && (
            <Button
              onClick={handleExportDashboard}
              leftIcon={<Download size={18} />}
              isLoading={exporting}
              variant="outline"
            >
              Export Dashboard
            </Button>
          )
        }
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
        <div className={`rounded-lg p-6 border ${
          stats.remainingBalance >= 0 
            ? 'bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 border-green-200 dark:border-green-800'
            : 'bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border-red-200 dark:border-red-800'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Financial Summary
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Current balance after all contributions and expenses
              </p>
              <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                <span className="font-medium">In:</span> {formatUGX(stats.totalContributions)} • 
                <span className="font-medium ml-2">Out:</span> {formatUGX(stats.totalExpenses)}
              </div>
            </div>
            <div className="text-right">
              <p className={`text-3xl font-bold ${
                stats.remainingBalance >= 0 
                  ? 'text-green-600 dark:text-green-400' 
                  : 'text-red-600 dark:text-red-400'
              }`}>
                {formatUGX(Math.abs(stats.remainingBalance))}
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
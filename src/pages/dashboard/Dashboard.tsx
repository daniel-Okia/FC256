import React, { useState, useEffect } from 'react';
import { Users, Calendar, Award, CreditCard, TrendingDown, Download, Filter } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { MemberService, EventService, ContributionService, ExpenseService, AttendanceService } from '../../services/firestore';
import PageHeader from '../../components/layout/PageHeader';
import DashboardCard from './DashboardCard';
import AttendanceChart from './AttendanceChart';
import PositionChart from './PositionChart';
import FinancialChart from './FinancialChart';
import UpcomingEvents from './UpcomingEvents';
import RecentTransactions from './RecentTransactions';
import RecentResults from './RecentResults';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
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

interface DateRange {
  startDate: string;
  endDate: string;
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
  const [attendanceTrends, setAttendanceTrends] = useState<any[]>([]);
  const [exporting, setExporting] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: '',
    endDate: '',
  });

  const canExport = user && canUserAccess(user.role, Permissions.EXPORT_REPORTS);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        
        // Load all data in parallel
        const [members, events, contributions, expenses, attendance] = await Promise.all([
          MemberService.getAllMembers(),
          EventService.getAllEvents(),
          ContributionService.getAllContributions(),
          ExpenseService.getAllExpenses(),
          AttendanceService.getAllAttendance(),
        ]);

        console.log('Dashboard data loaded:', {
          members: members.length,
          events: events.length,
          contributions: contributions.length,
          expenses: expenses.length,
          attendance: attendance.length
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

        // Calculate attendance trends for the last 30 days
        const recentTrainingEvents = events.filter(event => {
          const eventDate = new Date(event.date);
          return event.type === 'training' && eventDate >= thirtyDaysAgo && eventDate <= now;
        });

        const attendanceTrendsData = recentTrainingEvents.map(event => {
          const eventAttendance = attendance.filter(a => 
            a.eventId === event.id && a.status === 'present'
          );
          
          return {
            date: event.date,
            type: event.type,
            opponent: event.opponent,
            presentCount: eventAttendance.length,
            totalMembers: activeMembers,
            attendanceRate: activeMembers > 0 ? (eventAttendance.length / activeMembers) * 100 : 0,
          };
        });

        setAttendanceTrends(attendanceTrendsData);

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
      
      // Filter data by date range if specified
      let filteredData = {
        stats,
        upcomingEvents,
        recentTransactions,
        attendanceTrends,
      };

      if (dateRange.startDate && dateRange.endDate) {
        filteredData = await getFilteredDashboardData(dateRange);
      }
      
      exporter.exportDashboard({
        ...filteredData,
        dateRange: dateRange.startDate && dateRange.endDate ? dateRange : undefined,
      });
    } catch (error) {
      console.error('Error exporting dashboard:', error);
    } finally {
      setExporting(false);
    }
  };

  const getFilteredDashboardData = async (dateRange: DateRange) => {
    try {
      // Load all data fresh for filtering
      const [members, events, contributions, expenses, attendance] = await Promise.all([
        MemberService.getAllMembers(),
        EventService.getAllEvents(),
        ContributionService.getAllContributions(),
        ExpenseService.getAllExpenses(),
        AttendanceService.getAllAttendance(),
      ]);

      // Fix date parsing to handle timezone issues
      const startDate = new Date(dateRange.startDate + 'T00:00:00');
      const endDate = new Date(dateRange.endDate + 'T23:59:59');
      
      // Ensure we're working with valid dates
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        console.error('Invalid date range provided');
        throw new Error('Invalid date range');
      }

      console.log('Filtering data from', startDate, 'to', endDate);

      // Filter events by date range
      const filteredEvents = events.filter(event => {
        const eventDate = new Date(event.date.split('T')[0] + 'T00:00:00');
        return eventDate >= startDate && eventDate <= endDate;
      });

      // Filter contributions by date range
      const filteredContributions = contributions.filter(contribution => {
        const contributionDate = new Date(contribution.date.split('T')[0] + 'T00:00:00');
        return contributionDate >= startDate && contributionDate <= endDate;
      });

      // Filter expenses by date range
      const filteredExpenses = expenses.filter(expense => {
        const expenseDate = new Date(expense.date.split('T')[0] + 'T00:00:00');
        return expenseDate >= startDate && expenseDate <= endDate;
      });

      // Filter attendance by event date (not recorded date)
      const filteredAttendance = attendance.filter(attendanceRecord => {
        const event = events.find(e => e.id === attendanceRecord.eventId);
        if (!event) return false;
        const eventDate = new Date(event.date.split('T')[0] + 'T00:00:00');
        return eventDate >= startDate && eventDate <= endDate;
      });

      console.log('Filtered results:', {
        events: filteredEvents.length,
        contributions: filteredContributions.length,
        expenses: filteredExpenses.length,
        attendance: filteredAttendance.length,
        dateRange: { startDate: startDate.toISOString(), endDate: endDate.toISOString() }
      });

      // Calculate filtered stats
      const activeMembers = members.filter(m => m.status === 'active').length;
      const trainingSessionsInRange = filteredEvents.filter(e => e.type === 'training').length;
      const friendliesInRange = filteredEvents.filter(e => e.type === 'friendly').length;
      
      // Calculate financial totals for the date range
      const totalContributions = filteredContributions
        .filter(c => c.type === 'monetary' && c.amount !== undefined && c.amount !== null)
        .reduce((sum, c) => sum + (parseFloat(String(c.amount)) || 0), 0);
      
      const totalExpenses = filteredExpenses
        .filter(e => e.amount !== undefined && e.amount !== null)
        .reduce((sum, e) => sum + (parseFloat(String(e.amount)) || 0), 0);
      
      const remainingBalance = totalContributions - totalExpenses;

      const filteredStats = {
        totalMembers: members.length, // Total members doesn't change
        activeMembers,
        trainingSessionsThisMonth: trainingSessionsInRange,
        friendliesThisMonth: friendliesInRange,
        totalContributions: Math.round(totalContributions),
        totalExpenses: Math.round(totalExpenses),
        remainingBalance: Math.round(remainingBalance),
      };

      // Get upcoming events from filtered events
      const now = new Date();
      const filteredUpcomingEvents = filteredEvents
        .filter(event => new Date(event.date) >= now)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(0, 5);

      // Get recent transactions from filtered data
      const recentContributions = filteredContributions
        .filter(c => c.type === 'monetary' && c.amount)
        .map(c => ({ ...c, type: 'contribution' }));
      
      const recentExpenses = filteredExpenses
        .filter(e => e.amount)
        .map(e => ({ ...e, type: 'expense' }));
      
      const filteredRecentTransactions = [...recentContributions, ...recentExpenses]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 10);

      // Calculate attendance trends for filtered events
      const filteredTrainingEvents = filteredEvents.filter(event => event.type === 'training');
      
      const filteredAttendanceTrends = filteredTrainingEvents.map(event => {
        const eventAttendance = filteredAttendance.filter(a => 
          a.eventId === event.id && a.status === 'present'
        );
        
        return {
          date: event.date,
          type: event.type,
          opponent: event.opponent,
          presentCount: eventAttendance.length,
          totalMembers: activeMembers,
          attendanceRate: activeMembers > 0 ? (eventAttendance.length / activeMembers) * 100 : 0,
        };
      });

      return {
        stats: filteredStats,
        upcomingEvents: filteredUpcomingEvents,
        recentTransactions: filteredRecentTransactions,
        attendanceTrends: filteredAttendanceTrends,
      };
    } catch (error) {
      console.error('Error filtering dashboard data:', error);
      // Return original data if filtering fails
      return {
        stats,
        upcomingEvents,
        recentTransactions,
        attendanceTrends,
      };
    }
  };

  const handleFilteredExport = () => {
    setIsFilterModalOpen(true);
  };

  const handleDateRangeExport = () => {
    if (!dateRange.startDate || !dateRange.endDate) {
      alert('Please select both start and end dates');
      return;
    }
    
    setIsFilterModalOpen(false);
    handleExportDashboard();
  };

  const resetDateRange = () => {
    setDateRange({ startDate: '', endDate: '' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-full overflow-hidden">
      <PageHeader
        title={`Welcome, ${user?.name}`}
        description="Team management dashboard and overview"
        actions={
          canExport && (
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                onClick={handleExportDashboard}
                leftIcon={<Download size={18} />}
                isLoading={exporting}
                variant="outline"
                className="w-full sm:w-auto"
              >
                Export Dashboard
              </Button>
              <Button
                onClick={handleFilteredExport}
                leftIcon={<Filter size={18} />}
                variant="primary"
                className="w-full sm:w-auto bg-gradient-to-r from-primary-600 to-yellow-500 hover:from-primary-700 hover:to-yellow-600 text-white"
              >
                Export with Date Filter
              </Button>
            </div>
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

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <PositionChart />
        <FinancialChart />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <AttendanceChart />
        <RecentResults />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <UpcomingEvents />
      </div>

      {/* Recent Transactions Section */}
      <div className="mb-8">
        <RecentTransactions />
      </div>

      {/* Date Filter Modal */}
      <Modal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        title="Export Dashboard with Date Filter"
        size="lg"
      >
        <div className="space-y-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-center">
              <Filter size={20} className="text-blue-600 dark:text-blue-400 mr-2" />
              <div>
                <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Date Range Export
                </h4>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Select a date range to filter the dashboard data for export. This will include transactions, events, and statistics within the specified period.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Start Date"
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
              required
            />
            <Input
              label="End Date"
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
              required
            />
          </div>

          {dateRange.startDate && dateRange.endDate && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <h4 className="text-sm font-medium text-green-900 dark:text-green-100 mb-2">
                Selected Date Range
              </h4>
              <p className="text-sm text-green-700 dark:text-green-300">
                <strong>From:</strong> {new Date(dateRange.startDate).toLocaleDateString()} <br />
                <strong>To:</strong> {new Date(dateRange.endDate).toLocaleDateString()} <br />
                <strong>Duration:</strong> {Math.ceil((new Date(dateRange.endDate).getTime() - new Date(dateRange.startDate).getTime()) / (1000 * 60 * 60 * 24))} days
              </p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
            <Button
              variant="outline"
              onClick={resetDateRange}
              className="w-full sm:w-auto"
            >
              Clear Dates
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsFilterModalOpen(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDateRangeExport}
              isLoading={exporting}
              className="bg-gradient-to-r from-primary-600 to-yellow-500 hover:from-primary-700 hover:to-yellow-600 text-white w-full sm:w-auto"
              leftIcon={<Download size={18} />}
            >
              Export Filtered Dashboard
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Dashboard;
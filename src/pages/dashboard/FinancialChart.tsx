import React, { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
} from 'chart.js';
import { TrendingUp, TrendingDown, DollarSign, Calendar } from 'lucide-react';
import Card from '../../components/ui/Card';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { ContributionService, ExpenseService } from '../../services/firestore';
import { Contribution, Expense, FinancialTrend } from '../../types';
import { formatUGX } from '../../utils/currency-utils';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface FinancialChartProps {
  className?: string;
}

const FinancialChart: React.FC<FinancialChartProps> = ({ className }) => {
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [financialTrends, setFinancialTrends] = useState<FinancialTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalStats, setTotalStats] = useState({
    totalContributions: 0,
    totalExpenses: 0,
    netBalance: 0,
    monthlyAverage: 0,
  });

  useEffect(() => {
    const loadFinancialData = async () => {
      try {
        setLoading(true);
        
        const [contributionsData, expensesData] = await Promise.all([
          ContributionService.getAllContributions(),
          ExpenseService.getAllExpenses(),
        ]);
        
        setContributions(contributionsData);
        setExpenses(expensesData);
        
        // Calculate monthly trends for the last 6 months
        const now = new Date();
        let monthlyData: FinancialTrend[] = [];
        
        for (let i = 5; i >= 0; i--) {
          const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const monthKey = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
          const shortMonth = date.toLocaleDateString('en-US', { month: 'short' });
          
          // Calculate contributions for this month
          const monthContributions = contributionsData
            .filter(c => {
              const cDate = new Date(c.date);
              return cDate.getMonth() === date.getMonth() && 
                     cDate.getFullYear() === date.getFullYear() &&
                     c.type === 'monetary' &&
                     c.amount !== undefined &&
                     c.amount !== null;
            })
            .reduce((sum, c) => sum + (parseFloat(String(c.amount)) || 0), 0);
          
          // Calculate expenses for this month
          const monthExpenses = expensesData
            .filter(e => {
              const eDate = new Date(e.date);
              return eDate.getMonth() === date.getMonth() && 
                     eDate.getFullYear() === date.getFullYear() &&
                     e.amount !== undefined &&
                     e.amount !== null;
            })
            .reduce((sum, e) => sum + (parseFloat(String(e.amount)) || 0), 0);
          
          // Only include months that have contributions OR expenses (not empty months)
          if (monthContributions > 0 || monthExpenses > 0) {
            monthlyData.push({
              month: shortMonth,
              contributions: Math.round(monthContributions),
              expenses: Math.round(monthExpenses),
              net: Math.round(monthContributions - monthExpenses),
            });
          }
        }
        
        // If no months have data, show a message instead of empty chart
        if (monthlyData.length === 0) {
          // Create a single entry to show "No Data" state
          monthlyData = [{
            month: 'No Data',
            contributions: 0,
            expenses: 0,
            net: 0,
          }];
        }
        
        setFinancialTrends(monthlyData);
        
        // Calculate total stats
        const totalContributions = contributionsData
          .filter(c => c.type === 'monetary' && c.amount !== undefined && c.amount !== null)
          .reduce((sum, c) => sum + (parseFloat(String(c.amount)) || 0), 0);
        
        const totalExpenses = expensesData
          .filter(e => e.amount !== undefined && e.amount !== null)
          .reduce((sum, e) => sum + (parseFloat(String(e.amount)) || 0), 0);
        
        const netBalance = totalContributions - totalExpenses;
        const monthlyAverage = monthlyData.length > 0 
          ? (monthlyData[0].month === 'No Data' ? 0 : monthlyData.reduce((sum, month) => sum + month.net, 0) / monthlyData.length)
          : 0;
        
        setTotalStats({
          totalContributions: Math.round(totalContributions),
          totalExpenses: Math.round(totalExpenses),
          netBalance: Math.round(netBalance),
          monthlyAverage: Math.round(monthlyAverage),
        });
        
      } catch (error) {
        console.error('Error loading financial data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadFinancialData();

    // Set up real-time listeners
    const unsubscribeContributions = ContributionService.subscribeToContributions(() => {
      loadFinancialData();
    });

    const unsubscribeExpenses = ExpenseService.subscribeToExpenses(() => {
      loadFinancialData();
    });

    return () => {
      unsubscribeContributions();
      unsubscribeExpenses();
    };
  }, []);

  const data = {
    labels: financialTrends.map(trend => trend.month),
    datasets: [
      {
        label: 'Contributions',
        data: financialTrends.map(trend => trend.contributions),
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
        borderColor: 'rgba(34, 197, 94, 1)',
        borderWidth: 2,
        borderRadius: 4,
        borderSkipped: false,
      },
      {
        label: 'Expenses',
        data: financialTrends.map(trend => trend.expenses),
        backgroundColor: 'rgba(239, 68, 68, 0.8)',
        borderColor: 'rgba(239, 68, 68, 1)',
        borderWidth: 2,
        borderRadius: 4,
        borderSkipped: false,
      },
      {
        label: 'Net Balance',
        data: financialTrends.map(trend => trend.net),
        backgroundColor: financialTrends.map(trend => 
          trend.net >= 0 ? 'rgba(59, 130, 246, 0.8)' : 'rgba(245, 158, 11, 0.8)'
        ),
        borderColor: financialTrends.map(trend => 
          trend.net >= 0 ? 'rgba(59, 130, 246, 1)' : 'rgba(245, 158, 11, 1)'
        ),
        borderWidth: 2,
        borderRadius: 4,
        borderSkipped: false,
      },
    ],
  };

  const options: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          padding: 20,
          usePointStyle: true,
          font: {
            size: 12,
            weight: '600',
          },
          color: document.documentElement.classList.contains('dark') ? '#D1D5DB' : '#4B5563',
        },
      },
      tooltip: {
        backgroundColor: document.documentElement.classList.contains('dark') ? '#374151' : '#FFFFFF',
        titleColor: document.documentElement.classList.contains('dark') ? '#F9FAFB' : '#111827',
        bodyColor: document.documentElement.classList.contains('dark') ? '#D1D5DB' : '#4B5563',
        borderColor: document.documentElement.classList.contains('dark') ? '#4B5563' : '#E5E7EB',
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12,
        callbacks: {
          label: function(context) {
            const value = context.raw as number;
            return `${context.dataset.label}: ${formatUGX(Math.abs(value))}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          color: document.documentElement.classList.contains('dark') ? '#374151' : '#F3F4F6',
        },
        ticks: {
          color: document.documentElement.classList.contains('dark') ? '#D1D5DB' : '#6B7280',
          font: {
            size: 11,
            weight: '500',
          },
        },
      },
      y: {
        grid: {
          color: document.documentElement.classList.contains('dark') ? '#374151' : '#F3F4F6',
        },
        ticks: {
          color: document.documentElement.classList.contains('dark') ? '#D1D5DB' : '#6B7280',
          font: {
            size: 11,
          },
          callback: function(value) {
            return formatUGX(value as number);
          },
        },
      },
    },
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
  };

  if (loading) {
    return (
      <Card
        title="Financial Trends"
        subtitle="Monthly contributions and expenses overview"
        className={className}
      >
        <div className="h-80 flex items-center justify-center">
          <LoadingSpinner size="md" />
        </div>
      </Card>
    );
  }

  return (
    <Card
      title="Financial Trends"
      subtitle="Monthly contributions and expenses overview (Last 6 months)"
      className={className}
    >
      {financialTrends.length > 0 ? (
        <div>
          {/* Summary Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                    Total Income
                  </p>
                  <p className="text-lg font-bold text-green-900 dark:text-green-100">
                    {formatUGX(totalStats.totalContributions)}
                  </p>
                </div>
                <div className="p-2 bg-green-200 dark:bg-green-800 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 rounded-xl p-4 border border-red-200 dark:border-red-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-red-600 dark:text-red-400">
                    Total Expenses
                  </p>
                  <p className="text-lg font-bold text-red-900 dark:text-red-100">
                    {formatUGX(totalStats.totalExpenses)}
                  </p>
                </div>
                <div className="p-2 bg-red-200 dark:bg-red-800 rounded-lg">
                  <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
              </div>
            </div>
            
            <div className={`bg-gradient-to-br rounded-xl p-4 border ${
              totalStats.netBalance >= 0 
                ? 'from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800'
                : 'from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 border-yellow-200 dark:border-yellow-800'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-semibold ${
                    totalStats.netBalance >= 0 
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-yellow-600 dark:text-yellow-400'
                  }`}>
                    Net Balance
                  </p>
                  <p className={`text-lg font-bold ${
                    totalStats.netBalance >= 0 
                      ? 'text-blue-900 dark:text-blue-100'
                      : 'text-yellow-900 dark:text-yellow-100'
                  }`}>
                    {formatUGX(Math.abs(totalStats.netBalance))}
                  </p>
                </div>
                <div className={`p-2 rounded-lg ${
                  totalStats.netBalance >= 0 
                    ? 'bg-blue-200 dark:bg-blue-800'
                    : 'bg-yellow-200 dark:bg-yellow-800'
                }`}>
                  <DollarSign className={`h-5 w-5 ${
                    totalStats.netBalance >= 0 
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-yellow-600 dark:text-yellow-400'
                  }`} />
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-purple-600 dark:text-purple-400">
                    Monthly Avg
                  </p>
                  <p className="text-lg font-bold text-purple-900 dark:text-purple-100">
                    {formatUGX(Math.abs(totalStats.monthlyAverage))}
                  </p>
                </div>
                <div className="p-2 bg-purple-200 dark:bg-purple-800 rounded-lg">
                  <Calendar className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className="h-80 bg-gradient-to-br from-gray-50/50 to-white dark:from-gray-800/50 dark:to-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <Bar data={data} options={options} />
          </div>

          {/* Monthly Breakdown */}
          <div className="mt-6">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              Monthly Breakdown
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {financialTrends.map((trend, index) => (
                <div
                  key={trend.month}
                  className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {trend.month}
                    </span>
                    <span className={`text-sm font-bold ${
                      trend.net >= 0 
                        ? 'text-green-600 dark:text-green-400' 
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      {trend.net >= 0 ? '+' : ''}{formatUGX(trend.net)}
                    </span>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Income:</span>
                      <span className="text-green-600 dark:text-green-400">
                        {formatUGX(trend.contributions)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Expenses:</span>
                      <span className="text-red-600 dark:text-red-400">
                        {formatUGX(trend.expenses)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="h-80 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
              <DollarSign className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No Financial Data Available
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              No contributions or expenses found to display financial trends.
            </p>
          </div>
        </div>
      )}
    </Card>
  );
};

export default FinancialChart;
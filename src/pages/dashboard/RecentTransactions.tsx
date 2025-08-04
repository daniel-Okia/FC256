import React, { useState, useEffect } from 'react';
import { CreditCard, TrendingDown, Users, TrendingUp } from 'lucide-react';
import { ContributionService, ExpenseService, MemberService } from '../../services/firestore';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Avatar from '../../components/ui/Avatar';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { Contribution, Expense, Member } from '../../types';
import { formatDate } from '../../utils/date-utils';
import { formatUGX } from '../../utils/currency-utils';

interface RecentTransactionsProps {
  className?: string;
}

interface Transaction {
  id: string;
  type: 'contribution' | 'expense';
  amount: number;
  description: string;
  date: string;
  member?: Member;
  category?: string;
  paymentMethod?: string;
}

const RecentTransactions: React.FC<RecentTransactionsProps> = ({ className }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalContributors: 0,
    totalContributions: 0,
    totalExpenses: 0,
    thisMonthContributions: 0,
    thisMonthExpenses: 0,
  });

  useEffect(() => {
    const loadTransactionsData = async () => {
      try {
        setLoading(true);
        
        // Load contributions, expenses, and members
        const [contributions, expenses, members] = await Promise.all([
          ContributionService.getAllContributions(),
          ExpenseService.getAllExpenses(),
          MemberService.getAllMembers(),
        ]);

        // Get recent transactions (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        // Convert contributions to transactions with proper number handling
        const contributionTransactions: Transaction[] = contributions
          .filter(contribution => {
            const contributionDate = new Date(contribution.date);
            return contributionDate >= thirtyDaysAgo && 
                   contribution.type === 'monetary' && 
                   contribution.amount !== undefined && 
                   contribution.amount !== null;
          })
          .map(contribution => {
            const member = members.find(m => m.id === contribution.memberId);
            return {
              id: contribution.id,
              type: 'contribution' as const,
              amount: parseFloat(String(contribution.amount)) || 0,
              description: contribution.description,
              date: contribution.date,
              member,
              paymentMethod: contribution.paymentMethod,
            };
          });

        // Convert expenses to transactions with proper number handling
        const expenseTransactions: Transaction[] = expenses
          .filter(expense => {
            const expenseDate = new Date(expense.date);
            return expenseDate >= thirtyDaysAgo && 
                   expense.amount !== undefined && 
                   expense.amount !== null;
          })
          .map(expense => ({
            id: expense.id,
            type: 'expense' as const,
            amount: parseFloat(String(expense.amount)) || 0,
            description: expense.description,
            date: expense.date,
            category: expense.category,
            paymentMethod: expense.paymentMethod,
          }));

        // Combine and sort by date (latest first)
        const allTransactions = [...contributionTransactions, ...expenseTransactions]
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 10); // Get latest 10 transactions

        setTransactions(allTransactions);

        // Calculate stats with proper number handling
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        
        const thisMonthContributions = contributions
          .filter(contribution => {
            const contributionDate = new Date(contribution.date);
            return contributionDate.getMonth() === currentMonth && 
                   contributionDate.getFullYear() === currentYear &&
                   contribution.type === 'monetary' &&
                   contribution.amount !== undefined &&
                   contribution.amount !== null;
          })
          .reduce((sum, c) => sum + (parseFloat(String(c.amount)) || 0), 0);

        const thisMonthExpenses = expenses
          .filter(expense => {
            const expenseDate = new Date(expense.date);
            return expenseDate.getMonth() === currentMonth && 
                   expenseDate.getFullYear() === currentYear &&
                   expense.amount !== undefined &&
                   expense.amount !== null;
          })
          .reduce((sum, e) => sum + (parseFloat(String(e.amount)) || 0), 0);

        const uniqueContributors = new Set(contributions.map(c => c.memberId)).size;
        
        const totalContributions = contributions
          .filter(c => c.type === 'monetary' && c.amount !== undefined && c.amount !== null)
          .reduce((sum, c) => sum + (parseFloat(String(c.amount)) || 0), 0);
        
        const totalExpenses = expenses
          .filter(e => e.amount !== undefined && e.amount !== null)
          .reduce((sum, e) => sum + (parseFloat(String(e.amount)) || 0), 0);

        setStats({
          totalContributors: uniqueContributors,
          totalContributions: Math.round(totalContributions),
          totalExpenses: Math.round(totalExpenses),
          thisMonthContributions: Math.round(thisMonthContributions),
          thisMonthExpenses: Math.round(thisMonthExpenses),
        });
      } catch (error) {
        console.error('Error loading transactions data:', error);
        setTransactions([]);
      } finally {
        setLoading(false);
      }
    };

    loadTransactionsData();

    // Set up real-time listeners
    const unsubscribeContributions = ContributionService.subscribeToContributions(() => {
      loadTransactionsData();
    });

    const unsubscribeExpenses = ExpenseService.subscribeToExpenses(() => {
      loadTransactionsData();
    });

    const unsubscribeMembers = MemberService.subscribeToMembers(() => {
      loadTransactionsData();
    });

    return () => {
      unsubscribeContributions();
      unsubscribeExpenses();
      unsubscribeMembers();
    };
  }, []);

  const getTransactionIcon = (transaction: Transaction) => {
    return transaction.type === 'contribution' ? (
      <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
        <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
      </div>
    ) : (
      <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
        <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
      </div>
    );
  };

  if (loading) {
    return (
      <Card
        title="Recent Transactions"
        subtitle="Latest contributions and expenses"
        className={className}
      >
        <div className="flex justify-center py-8">
          <LoadingSpinner size="md" />
        </div>
      </Card>
    );
  }

  return (
    <Card
      title="Recent Transactions"
      subtitle="Latest contributions and expenses"
      className={className}
    >
      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                Contributors
              </p>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                {stats.totalContributors}
              </p>
            </div>
            <Users className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
        </div>
        
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600 dark:text-green-400">
                This Month In
              </p>
              <p className="text-xl font-bold text-green-900 dark:text-green-100">
                {formatUGX(stats.thisMonthContributions)}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
        </div>
        
        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-600 dark:text-red-400">
                This Month Out
              </p>
              <p className="text-xl font-bold text-red-900 dark:text-red-100">
                {formatUGX(stats.thisMonthExpenses)}
              </p>
            </div>
            <TrendingDown className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
        </div>
        
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600 dark:text-purple-400">
                Net This Month
              </p>
              <p className={`text-xl font-bold ${
                (stats.thisMonthContributions - stats.thisMonthExpenses) >= 0
                  ? 'text-green-900 dark:text-green-100'
                  : 'text-red-900 dark:text-red-100'
              }`}>
                {formatUGX(stats.thisMonthContributions - stats.thisMonthExpenses)}
              </p>
            </div>
            <CreditCard className="h-8 w-8 text-purple-600 dark:text-purple-400" />
          </div>
        </div>
      </div>

      {/* Recent Transactions List */}
      <div className="space-y-4">
        {transactions.length > 0 ? (
          transactions.map((transaction) => (
            <div
              key={`${transaction.type}-${transaction.id}`}
              className="flex items-center justify-between p-4 bg-gray-50 dark:bg-neutral-700/30 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-700/50 transition-colors"
            >
              <div className="flex items-center space-x-3">
                {getTransactionIcon(transaction)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <p className="font-medium text-gray-900 dark:text-white truncate">
                      {transaction.type === 'contribution' && transaction.member
                        ? transaction.member.name
                        : transaction.description
                      }
                    </p>
                    <Badge
                      variant={transaction.type === 'contribution' ? 'success' : 'danger'}
                      size="sm"
                      className="capitalize"
                    >
                      {transaction.type}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                    {transaction.type === 'contribution' 
                      ? transaction.description
                      : `${transaction.category} - ${transaction.description}`
                    }
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    {formatDate(transaction.date)}
                  </p>
                </div>
              </div>
              
              <div className="text-right">
                <p className={`font-semibold ${
                  transaction.type === 'contribution'
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {transaction.type === 'contribution' ? '+' : '-'}{formatUGX(Math.round(transaction.amount))}
                </p>
                {transaction.paymentMethod && (
                  <p className="text-xs text-gray-500 dark:text-gray-500 capitalize">
                    {transaction.paymentMethod}
                  </p>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
              <CreditCard size={32} className="text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No Recent Transactions
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              No contributions or expenses have been recorded in the last 30 days.
            </p>
          </div>
        )}
      </div>

      {transactions.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Showing latest {transactions.length} transactions
            </p>
            <a
              href="/contributions"
              className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
            >
              View all transactions →
            </a>
          </div>
        </div>
      )}
    </Card>
  );
};

export default RecentTransactions;
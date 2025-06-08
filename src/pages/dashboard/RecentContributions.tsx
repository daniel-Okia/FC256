import React, { useState, useEffect } from 'react';
import { CreditCard, Users, TrendingUp } from 'lucide-react';
import { ContributionService, MemberService } from '../../services/firestore';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Avatar from '../../components/ui/Avatar';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { Contribution, Member } from '../../types';
import { formatDate } from '../../utils/date-utils';
import { formatUGX } from '../../utils/currency-utils';

interface RecentContributionsProps {
  className?: string;
}

interface ContributionWithMember {
  contribution: Contribution;
  member: Member;
}

const RecentContributions: React.FC<RecentContributionsProps> = ({ className }) => {
  const [contributionsWithMembers, setContributionsWithMembers] = useState<ContributionWithMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalContributors: 0,
    totalAmount: 0,
    thisMonthAmount: 0,
  });

  useEffect(() => {
    const loadContributionsData = async () => {
      try {
        setLoading(true);
        
        // Load contributions and members
        const [contributions, members] = await Promise.all([
          ContributionService.getAllContributions(),
          MemberService.getAllMembers(),
        ]);

        // Get recent contributions (last 30 days) and sort by date (latest first)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const recentContributions = contributions
          .filter(contribution => {
            const contributionDate = new Date(contribution.date);
            return contributionDate >= thirtyDaysAgo;
          })
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 10); // Get latest 10 contributions

        // Combine with member data and sort by member name
        const contributionsWithMemberData: ContributionWithMember[] = recentContributions
          .map(contribution => {
            const member = members.find(m => m.id === contribution.memberId);
            return member ? { contribution, member } : null;
          })
          .filter((item): item is ContributionWithMember => item !== null)
          .sort((a, b) => a.member.name.toLowerCase().localeCompare(b.member.name.toLowerCase()));

        setContributionsWithMembers(contributionsWithMemberData);

        // Calculate stats
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        
        const thisMonthContributions = contributions.filter(contribution => {
          const contributionDate = new Date(contribution.date);
          return contributionDate.getMonth() === currentMonth && 
                 contributionDate.getFullYear() === currentYear &&
                 contribution.type === 'monetary';
        });

        const uniqueContributors = new Set(contributions.map(c => c.memberId)).size;
        const totalAmount = contributions
          .filter(c => c.type === 'monetary' && c.amount)
          .reduce((sum, c) => sum + (c.amount || 0), 0);
        const thisMonthAmount = thisMonthContributions
          .filter(c => c.amount)
          .reduce((sum, c) => sum + (c.amount || 0), 0);

        setStats({
          totalContributors: uniqueContributors,
          totalAmount,
          thisMonthAmount,
        });
      } catch (error) {
        console.error('Error loading contributions data:', error);
        setContributionsWithMembers([]);
      } finally {
        setLoading(false);
      }
    };

    loadContributionsData();

    // Set up real-time listeners
    const unsubscribeContributions = ContributionService.subscribeToContributions(() => {
      loadContributionsData();
    });

    const unsubscribeMembers = MemberService.subscribeToMembers(() => {
      loadContributionsData();
    });

    return () => {
      unsubscribeContributions();
      unsubscribeMembers();
    };
  }, []);

  const getContributionTypeVariant = (type: string) => {
    return type === 'monetary' ? 'success' : 'secondary';
  };

  if (loading) {
    return (
      <Card
        title="Recent Contributions"
        subtitle="Latest member contributions and team funding"
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
      title="Recent Contributions"
      subtitle="Latest member contributions and team funding"
      className={className}
    >
      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                Total Contributors
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
                This Month
              </p>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                {formatUGX(stats.thisMonthAmount)}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
        </div>
        
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600 dark:text-purple-400">
                Total Raised
              </p>
              <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                {formatUGX(stats.totalAmount)}
              </p>
            </div>
            <CreditCard className="h-8 w-8 text-purple-600 dark:text-purple-400" />
          </div>
        </div>
      </div>

      {/* Recent Contributions List */}
      <div className="space-y-4">
        {contributionsWithMembers.length > 0 ? (
          contributionsWithMembers.map(({ contribution, member }) => (
            <div
              key={contribution.id}
              className="flex items-center justify-between p-4 bg-gray-50 dark:bg-neutral-700/30 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-700/50 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <Avatar
                  src={member.avatarUrl}
                  alt={member.name}
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <p className="font-medium text-gray-900 dark:text-white truncate">
                      {member.name}
                    </p>
                    <Badge
                      variant={getContributionTypeVariant(contribution.type)}
                      size="sm"
                      className="capitalize"
                    >
                      {contribution.type}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                    {contribution.description}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    {formatDate(contribution.date)}
                  </p>
                </div>
              </div>
              
              <div className="text-right">
                {contribution.type === 'monetary' && contribution.amount ? (
                  <p className="font-semibold text-green-600 dark:text-green-400">
                    {formatUGX(contribution.amount)}
                  </p>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    In-Kind
                  </p>
                )}
                {contribution.paymentMethod && (
                  <p className="text-xs text-gray-500 dark:text-gray-500 capitalize">
                    {contribution.paymentMethod}
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
              No Recent Contributions
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              No contributions have been recorded in the last 30 days.
            </p>
          </div>
        )}
      </div>

      {contributionsWithMembers.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Showing latest {contributionsWithMembers.length} contributions
            </p>
            <a
              href="/contributions"
              className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
            >
              View all contributions →
            </a>
          </div>
        </div>
      )}
    </Card>
  );
};

export default RecentContributions;
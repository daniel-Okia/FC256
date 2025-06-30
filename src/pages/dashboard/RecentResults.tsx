import React, { useState, useEffect } from 'react';
import { Trophy, Target, TrendingUp, Calendar, MapPin, Users } from 'lucide-react';
import { EventService } from '../../services/firestore';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { Event, MatchResult } from '../../types';
import { formatDate } from '../../utils/date-utils';

interface RecentResultsProps {
  className?: string;
}

const RecentResults: React.FC<RecentResultsProps> = ({ className }) => {
  const [recentMatches, setRecentMatches] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalMatches: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    winRate: 0,
  });

  useEffect(() => {
    const loadRecentResults = async () => {
      try {
        setLoading(true);
        
        // Get all friendly matches
        const allEvents = await EventService.getAllEvents();
        
        // Filter for completed friendly matches with results
        const completedFriendlies = allEvents
          .filter(event => 
            event.type === 'friendly' && 
            event.isCompleted && 
            event.matchDetails &&
            new Date(event.date) <= new Date()
          )
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) // Latest first
          .slice(0, 8); // Get last 8 matches

        setRecentMatches(completedFriendlies);

        // Calculate statistics
        const wins = completedFriendlies.filter(m => m.matchDetails?.result === 'win').length;
        const draws = completedFriendlies.filter(m => m.matchDetails?.result === 'draw').length;
        const losses = completedFriendlies.filter(m => m.matchDetails?.result === 'loss').length;
        const winRate = completedFriendlies.length > 0 ? Math.round((wins / completedFriendlies.length) * 100) : 0;

        setStats({
          totalMatches: completedFriendlies.length,
          wins,
          draws,
          losses,
          winRate,
        });
      } catch (error) {
        console.error('Error loading recent results:', error);
        setRecentMatches([]);
      } finally {
        setLoading(false);
      }
    };

    loadRecentResults();

    // Set up real-time listener
    const unsubscribe = EventService.subscribeToEvents((allEvents) => {
      try {
        const completedFriendlies = allEvents
          .filter(event => 
            event.type === 'friendly' && 
            event.isCompleted && 
            event.matchDetails &&
            new Date(event.date) <= new Date()
          )
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 8);

        setRecentMatches(completedFriendlies);

        const wins = completedFriendlies.filter(m => m.matchDetails?.result === 'win').length;
        const draws = completedFriendlies.filter(m => m.matchDetails?.result === 'draw').length;
        const losses = completedFriendlies.filter(m => m.matchDetails?.result === 'loss').length;
        const winRate = completedFriendlies.length > 0 ? Math.round((wins / completedFriendlies.length) * 100) : 0;

        setStats({
          totalMatches: completedFriendlies.length,
          wins,
          draws,
          losses,
          winRate,
        });
        setLoading(false);
      } catch (error) {
        console.error('Error processing real-time results:', error);
        setRecentMatches([]);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const getResultBadge = (result: MatchResult) => {
    switch (result) {
      case 'win':
        return <Badge variant="success" size="sm">Win</Badge>;
      case 'draw':
        return <Badge variant="warning" size="sm">Draw</Badge>;
      case 'loss':
        return <Badge variant="danger" size="sm">Loss</Badge>;
      default:
        return null;
    }
  };

  const getScoreDisplay = (match: Event) => {
    if (!match.matchDetails) return 'N/A';
    return `${match.matchDetails.fc256Score || 0} - ${match.matchDetails.opponentScore || 0}`;
  };

  const getResultIcon = (result: MatchResult) => {
    switch (result) {
      case 'win':
        return <Trophy className="h-5 w-5 text-green-600 dark:text-green-400" />;
      case 'draw':
        return <Target className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />;
      case 'loss':
        return <TrendingUp className="h-5 w-5 text-red-600 dark:text-red-400 rotate-180" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <Card
        title="Recent Match Results"
        subtitle="Latest friendly match outcomes and performance"
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
      title="Recent Match Results"
      subtitle="Latest friendly match outcomes and performance"
      className={className}
    >
      {recentMatches.length > 0 ? (
        <div>
          {/* Performance Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                    Total Matches
                  </p>
                  <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                    {stats.totalMatches}
                  </p>
                </div>
                <div className="p-2 bg-blue-200 dark:bg-blue-800 rounded-lg">
                  <Trophy className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                    Wins
                  </p>
                  <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                    {stats.wins}
                  </p>
                </div>
                <div className="p-2 bg-green-200 dark:bg-green-800 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 rounded-xl p-4 border border-yellow-200 dark:border-yellow-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-yellow-600 dark:text-yellow-400">
                    Draws
                  </p>
                  <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">
                    {stats.draws}
                  </p>
                </div>
                <div className="p-2 bg-yellow-200 dark:bg-yellow-800 rounded-lg">
                  <Target className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-purple-600 dark:text-purple-400">
                    Win Rate
                  </p>
                  <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                    {stats.winRate}%
                  </p>
                </div>
                <div className="p-2 bg-purple-200 dark:bg-purple-800 rounded-lg">
                  <Trophy className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Recent Matches List */}
          <div className="space-y-4">
            {recentMatches.map((match) => (
              <div
                key={match.id}
                className="group p-4 bg-gray-50 dark:bg-neutral-700/30 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-700/50 transition-all duration-200 border border-transparent hover:border-gray-200 dark:hover:border-gray-600 cursor-pointer"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      {getResultIcon(match.matchDetails!.result)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-medium text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                          FC256 vs {match.opponent}
                        </h4>
                        {getResultBadge(match.matchDetails!.result)}
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center">
                          <Calendar size={14} className="mr-1" />
                          {formatDate(match.date, 'MMM d, yyyy')}
                        </div>
                        <div className="flex items-center">
                          <MapPin size={14} className="mr-1" />
                          <span className="capitalize">{match.matchDetails!.venue}</span>
                        </div>
                        {match.matchDetails!.fc256Players && match.matchDetails!.opponentPlayers && (
                          <div className="flex items-center">
                            <Users size={14} className="mr-1" />
                            {match.matchDetails!.fc256Players}v{match.matchDetails!.opponentPlayers}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {getScoreDisplay(match)}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Final Score
                    </div>
                  </div>
                </div>

                {/* Match Details */}
                {match.matchDetails!.matchReport && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                      {match.matchDetails!.matchReport}
                    </p>
                  </div>
                )}

                {/* Player Stats Preview */}
                {(match.matchDetails!.goalScorers?.length || match.matchDetails!.manOfTheMatch) && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                    <div className="flex items-center justify-between text-sm">
                      {match.matchDetails!.goalScorers && match.matchDetails!.goalScorers.length > 0 && (
                        <span className="text-gray-600 dark:text-gray-400">
                          ⚽ {match.matchDetails!.goalScorers.length} goal{match.matchDetails!.goalScorers.length > 1 ? 's' : ''}
                        </span>
                      )}
                      {match.matchDetails!.manOfTheMatch && (
                        <span className="text-yellow-600 dark:text-yellow-400 font-medium">
                          🏆 Man of the Match
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* View More Link */}
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Showing latest {recentMatches.length} completed matches
              </p>
              <a
                href="/friendlies"
                className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
              >
                View all matches →
              </a>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
            <Trophy size={32} className="text-gray-400 dark:text-gray-500" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No Match Results Yet
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            No completed friendly matches with results found.
          </p>
          <div className="flex justify-center">
            <a
              href="/friendlies"
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
            >
              <Trophy size={16} className="mr-1" />
              Schedule Friendly Match
            </a>
          </div>
        </div>
      )}
    </Card>
  );
};

export default RecentResults;
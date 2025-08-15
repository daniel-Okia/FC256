import React, { useState, useEffect } from 'react';
import { TrendingUp, Users, Trophy, Target, Award, Calendar, Download, Filter } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { 
  MemberService, 
  AttendanceService, 
  EventService, 
  ContributionService 
} from '../../services/firestore';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Select from '../../components/ui/Select';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import { Member, Attendance, Event, Contribution } from '../../types';
import { formatDate } from '../../utils/date-utils';
import { formatUGX } from '../../utils/currency-utils';
import { canUserAccess, Permissions } from '../../utils/permissions';
import { PlayerAnalyticsPDFExporter } from '../../utils/pdf-export';

interface PlayerAnalytics {
  member: Member;
  attendedSessions: number;
  totalSessions: number;
  totalSystemSessions: number;
  attendanceRate: number;
  systemWideAttendanceRate: number;
  lateArrivals: number;
  excusedAbsences: number;
  attendanceScore: number;
  goalsScored: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  manOfTheMatchAwards: number;
  matchesPlayed: number;
  performanceScore: number;
  totalContributions: number;
  monetaryContributions: number;
  inKindContributions: number;
  totalContributionAmount: number;
  contributionScore: number;
  overallRating: number;
}

interface TeamStats {
  totalPlayers: number;
  averageRating: number;
  topPerformer: PlayerAnalytics | null;
  attendanceLeader: PlayerAnalytics | null;
  topScorer: PlayerAnalytics | null;
}

const PlayerAnalytics: React.FC = () => {
  const { user } = useAuth();
  const [playerAnalytics, setPlayerAnalytics] = useState<PlayerAnalytics[]>([]);
  const [teamStats, setTeamStats] = useState<TeamStats>({
    totalPlayers: 0,
    averageRating: 0,
    topPerformer: null,
    attendanceLeader: null,
    topScorer: null,
  });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [sortBy, setSortBy] = useState<'overall' | 'attendance' | 'performance' | 'contribution'>('overall');
  const [filterPosition, setFilterPosition] = useState<string>('all');

  const canExport = user && canUserAccess(user.role, Permissions.EXPORT_REPORTS);

  useEffect(() => {
    const loadAnalyticsData = async () => {
      try {
        setLoading(true);
        
        // Load all required data
        const [members, attendance, events, contributions] = await Promise.all([
          MemberService.getAllMembers(),
          AttendanceService.getAllAttendance(),
          EventService.getAllEvents(),
          ContributionService.getAllContributions(),
        ]);

        console.log('Analytics data loaded:', {
          members: members.length,
          attendance: attendance.length,
          events: events.length,
          contributions: contributions.length
        });

        // Filter active members only
        const activeMembers = members.filter(m => m.status === 'active');
        
        if (activeMembers.length === 0) {
          setPlayerAnalytics([]);
          setTeamStats({
            totalPlayers: 0,
            averageRating: 0,
            topPerformer: null,
            attendanceLeader: null,
            topScorer: null,
          });
          setLoading(false);
          return;
        }

        // Calculate analytics for each player
        const analytics: PlayerAnalytics[] = activeMembers.map(member => {
          // Get member join date
          const memberJoinDate = new Date(member.dateJoined);
          
          // Get all events that occurred after member joined (inclusive of join date)
          const eventsAfterJoining = events.filter(event => {
            const eventDate = new Date(event.date);
            // Set both dates to start of day for fair comparison
            const memberJoinDateOnly = new Date(memberJoinDate.getFullYear(), memberJoinDate.getMonth(), memberJoinDate.getDate());
            const eventDateOnly = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
            return eventDateOnly >= memberJoinDateOnly;
          });
          
          console.log(`Member ${member.name}:`, {
            joinDate: member.dateJoined,
            memberJoinDateOnly: memberJoinDate.toISOString().split('T')[0],
            eligibleEvents: eventsAfterJoining.length,
            totalSystemSessions: events.length,
            eventsAfterJoining: eventsAfterJoining.map(e => ({ id: e.id, date: e.date, type: e.type }))
          });
          
          // Get attendance records for this member
          const memberAttendanceRecords = attendance.filter(a => a.memberId === member.id);
          
          // Get valid attendance records that match events after member joined
          const validAttendanceRecords = memberAttendanceRecords.filter(attendanceRecord => {
            // Find the event for this attendance record
            const event = events.find(e => e.id === attendanceRecord.eventId);
            if (!event) return false;
            
            // Check if this event is in the eligible events list
            return eventsAfterJoining.some(eligibleEvent => eligibleEvent.id === event.id);
          });
          
          console.log(`Member ${member.name} attendance records:`, {
            totalAttendanceRecords: memberAttendanceRecords.length,
            validAttendanceRecords: validAttendanceRecords.length,
            attendanceDetails: validAttendanceRecords.map(a => {
              const event = events.find(e => e.id === a.eventId);
              return {
                eventId: a.eventId,
                status: a.status,
                recordedAt: a.recordedAt,
                eventDate: event?.date,
                eventType: event?.type
              };
            })
          });
          
          // Count attendance statuses
          const attendedSessions = validAttendanceRecords.filter(a => a.status === 'present').length;
          const lateArrivals = validAttendanceRecords.filter(a => a.status === 'late').length;
          const excusedAbsences = validAttendanceRecords.filter(a => a.status === 'excused').length;
          
          // Total system events (all events from inception)
          const totalSystemSessions = events.length;
          
          // Events eligible for this member (after they joined)
          const totalEligibleSessions = eventsAfterJoining.length;
          
          // Calculate attendance rates with better handling
          let attendanceRate = 0;
          let systemWideAttendanceRate = 0;
          
          if (totalEligibleSessions > 0) {
            attendanceRate = (attendedSessions / totalEligibleSessions) * 100;
          }
          
          if (totalSystemSessions > 0) {
            systemWideAttendanceRate = (attendedSessions / totalSystemSessions) * 100;
          }
          
          // If member has no eligible sessions but has attendance records, 
          // it means they attended sessions before officially joining
          if (totalEligibleSessions === 0 && memberAttendanceRecords.length > 0) {
            // Count all their attendance records for system-wide rate
            const allAttendedSessions = memberAttendanceRecords.filter(a => a.status === 'present').length;
            systemWideAttendanceRate = totalSystemSessions > 0 ? (allAttendedSessions / totalSystemSessions) * 100 : 0;
            
            // For individual rate, use a fair calculation based on their actual participation
            attendanceRate = memberAttendanceRecords.length > 0 ? (allAttendedSessions / memberAttendanceRecords.length) * 100 : 0;
            
            console.log(`Member ${member.name} - Special case (no eligible sessions but has records):`, {
              allAttendanceRecords: memberAttendanceRecords.length,
              allAttendedSessions,
              calculatedAttendanceRate: attendanceRate,
              calculatedSystemWideRate: systemWideAttendanceRate
            });
          }
          
          const attendanceScore = Math.min(100, attendanceRate);

          console.log(`${member.name} attendance summary:`, {
            attendedSessions,
            totalEligibleSessions,
            totalSystemSessions,
            attendanceRate: Math.round(attendanceRate),
            systemWideRate: Math.round(systemWideAttendanceRate),
            lateArrivals,
            excusedAbsences,
            validRecordsCount: validAttendanceRecords.length
          });

          // Match performance analytics
          const friendlyMatches = events.filter(e => 
            e.type === 'friendly' && 
            e.isCompleted && 
            e.matchDetails
          );
          
          let goalsScored = 0;
          let assists = 0;
          let yellowCards = 0;
          let redCards = 0;
          let manOfTheMatchAwards = 0;
          let matchesPlayed = 0;

          friendlyMatches.forEach(match => {
            if (!match.matchDetails) return;
            
            // Check if player participated in this match
            const participated = 
              match.matchDetails.goalScorers?.includes(member.id) ||
              match.matchDetails.assists?.includes(member.id) ||
              match.matchDetails.yellowCards?.includes(member.id) ||
              match.matchDetails.redCards?.includes(member.id) ||
              match.matchDetails.manOfTheMatch === member.id;
            
            if (participated) {
              matchesPlayed++;
            }
            
            // Count statistics
            if (match.matchDetails.goalScorers) {
              goalsScored += match.matchDetails.goalScorers.filter(id => id === member.id).length;
            }
            if (match.matchDetails.assists) {
              assists += match.matchDetails.assists.filter(id => id === member.id).length;
            }
            if (match.matchDetails.yellowCards) {
              yellowCards += match.matchDetails.yellowCards.filter(id => id === member.id).length;
            }
            if (match.matchDetails.redCards) {
              redCards += match.matchDetails.redCards.filter(id => id === member.id).length;
            }
            if (match.matchDetails.manOfTheMatch === member.id) {
              manOfTheMatchAwards++;
            }
          });

          // Check if player is defender or goalkeeper
          const isDefenderOrKeeper = ['Goalkeeper', 'Centre-back', 'Left-back', 'Right-back', 'Sweeper'].includes(member.position);
          
          // Calculate defensive bonus for defenders and goalkeepers
          let defensiveBonus = 0;
          if (isDefenderOrKeeper && matchesPlayed > 0) {
            // Get total goals scored by all players in matches this player participated
            const totalTeamGoals = friendlyMatches.reduce((total, match) => {
              if (!match.matchDetails?.goalScorers) return total;
              
              // Check if this player participated in this match
              const playerParticipated = 
                match.matchDetails.goalScorers.includes(member.id) ||
                match.matchDetails.assists?.includes(member.id) ||
                match.matchDetails.yellowCards?.includes(member.id) ||
                match.matchDetails.redCards?.includes(member.id) ||
                match.matchDetails.manOfTheMatch === member.id;
              
              if (playerParticipated) {
                return total + (match.matchDetails.goalScorers?.length || 0);
              }
              return total;
            }, 0);
            
            // Defensive bonus: 30% of total team goals for defenders/keepers who attended matches
            defensiveBonus = Math.round(totalTeamGoals * 0.3);
          }
          
          // Performance score (0-100) with defensive bonus
          const performanceScore = Math.min(100,
            (goalsScored * 10) + 
            (assists * 5) + 
            (manOfTheMatchAwards * 15) + 
            defensiveBonus + // Add defensive bonus
            (matchesPlayed * 2) - // Participation bonus
            (yellowCards * 2) - 
            (redCards * 10)
          );

          // Contribution analytics
          const memberContributions = contributions.filter(c => c.memberId === member.id);
          const monetaryContributions = memberContributions.filter(c => c.type === 'monetary').length;
          const inKindContributions = memberContributions.filter(c => c.type === 'in-kind').length;
          const totalContributionAmount = memberContributions
            .filter(c => c.type === 'monetary' && c.amount)
            .reduce((sum, c) => sum + (c.amount || 0), 0);
          
          // Contribution score (0-100)
          const contributionScore = Math.min(100, 
            Math.max(0, (totalContributionAmount / 50000) * 100) // Scale based on 50k UGX as 100%
          );

          // Overall rating with new weights: Attendance 50%, Performance 35%, Contribution 15%
          const overallRating = Math.round(
            (attendanceScore * 0.5) + 
            (performanceScore * 0.35) + 
            (contributionScore * 0.15)
          );

          return {
            member,
            attendedSessions,
            totalSessions: Math.max(totalEligibleSessions, memberAttendanceRecords.length), // Use the higher value for display
            totalSystemSessions: totalSystemSessions, // All sessions from inception
            attendanceRate,
            systemWideAttendanceRate, // For overall ranking
            lateArrivals,
            excusedAbsences,
            attendanceScore,
            goalsScored,
            assists,
            yellowCards,
            redCards,
            manOfTheMatchAwards,
            matchesPlayed,
            performanceScore,
            totalContributions: memberContributions.length,
            monetaryContributions,
            inKindContributions,
            totalContributionAmount,
            contributionScore,
            overallRating,
          };
        });

        // Calculate team statistics
        const averageRating = analytics.length > 0 
          ? analytics.reduce((sum, p) => sum + p.overallRating, 0) / analytics.length 
          : 0;
        
        const topPerformer = analytics.reduce((prev, current) => 
          prev.overallRating > current.overallRating ? prev : current, analytics[0]
        );
        
        // Attendance leader based on attendance rate (fair for all members)
        // For attendance leader, consider both attendance rate AND total sessions attended
        // This gives preference to members who have attended more sessions overall
        const attendanceLeader = analytics.reduce((prev, current) => {
          // Primary: Compare system-wide attendance rate
          if (current.systemWideAttendanceRate > prev.systemWideAttendanceRate) {
            return current;
          } else if (current.systemWideAttendanceRate === prev.systemWideAttendanceRate) {
            // Secondary: If rates are equal, prefer member with more total sessions attended
            return current.attendedSessions > prev.attendedSessions ? current : prev;
          }
          return prev;
        }, analytics[0]
        );
        
        const topScorer = analytics.reduce((prev, current) => 
          prev.goalsScored > current.goalsScored ? prev : current, analytics[0]
        );

        setPlayerAnalytics(analytics);
        setTeamStats({
          totalPlayers: activeMembers.length,
          averageRating: Math.round(averageRating),
          topPerformer: analytics.length > 0 ? topPerformer : null,
          attendanceLeader: analytics.length > 0 ? attendanceLeader : null,
          topScorer: analytics.length > 0 ? topScorer : null,
        });

      } catch (error) {
        console.error('Error loading analytics data:', error);
        setPlayerAnalytics([]);
      } finally {
        setLoading(false);
      }
    };

    loadAnalyticsData();

    // Set up real-time listeners
    const unsubscribeMembers = MemberService.subscribeToMembers(() => loadAnalyticsData());
    const unsubscribeAttendance = AttendanceService.subscribeToAttendance(() => loadAnalyticsData());
    const unsubscribeEvents = EventService.subscribeToEvents(() => loadAnalyticsData());
    const unsubscribeContributions = ContributionService.subscribeToContributions(() => loadAnalyticsData());

    return () => {
      unsubscribeMembers();
      unsubscribeAttendance();
      unsubscribeEvents();
      unsubscribeContributions();
    };
  }, []);

  // Get unique positions for filter
  const positions = ['all', ...Array.from(new Set(playerAnalytics.map(p => p.member.position)))];
  const positionOptions = positions.map(pos => ({
    value: pos,
    label: pos === 'all' ? 'All Positions' : pos
  }));

  // Sort and filter players
  const sortedAndFilteredPlayers = playerAnalytics
    .filter(player => filterPosition === 'all' || player.member.position === filterPosition)
    .sort((a, b) => {
      switch (sortBy) {
        case 'attendance':
          return b.attendanceRate - a.attendanceRate;
        case 'performance':
          return b.performanceScore - a.performanceScore;
        case 'contribution':
          return b.contributionScore - a.contributionScore;
        default:
          return b.overallRating - a.overallRating;
      }
    });

  const columns = [
    {
      key: 'rank',
      title: 'Rank',
      render: (player: PlayerAnalytics, index: number) => (
        <div className="font-bold text-primary-600 dark:text-primary-400">
          #{index + 1}
        </div>
      ),
    },
    {
      key: 'member',
      title: 'Player',
      render: (player: PlayerAnalytics) => (
        <div>
          <div className="font-medium text-gray-900 dark:text-white">
            {player.member.name}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            #{player.member.jerseyNumber} • {player.member.position}
          </div>
        </div>
      ),
    },
    {
      key: 'overallRating',
      title: 'Overall Rating',
      render: (player: PlayerAnalytics) => (
        <div className="text-center">
          <div className={`text-2xl font-bold ${
            player.overallRating >= 80 ? 'text-green-600 dark:text-green-400' :
            player.overallRating >= 60 ? 'text-yellow-600 dark:text-yellow-400' :
            'text-red-600 dark:text-red-400'
          }`}>
            {player.overallRating}%
          </div>
        </div>
      ),
    },
    {
      key: 'attendance',
      title: 'Attendance',
      render: (player: PlayerAnalytics) => (
        <div>
          <div className="font-medium text-gray-900 dark:text-white">
            {Math.round(player.attendanceRate)}%
          </div>
          {player.totalSessions > 0 ? (
            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {player.attendedSessions}/{player.totalSessions} eligible
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                ({player.attendedSessions}/{player.totalSystemSessions} total system)
              </div>
            </div>
          ) : (
            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {player.attendedSessions}/{player.totalSystemSessions} total
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                (No eligible sessions since join date)
              </div>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'performance',
      title: 'Match Performance',
      render: (player: PlayerAnalytics) => (
        <div className="space-y-1">
          <div className="font-medium text-gray-900 dark:text-white">
            {Math.round(player.performanceScore)}%
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            ⚽{player.goalsScored} 🎯{player.assists} 🏆{player.manOfTheMatchAwards}
          </div>
        </div>
      ),
    },
    {
      key: 'contributions',
      title: 'Contributions',
      render: (player: PlayerAnalytics) => (
        <div>
          <div className="font-medium text-gray-900 dark:text-white">
            {Math.round(player.contributionScore)}%
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {formatUGX(player.totalContributionAmount)}
          </div>
        </div>
      ),
    },
  ];

  const handleExport = async () => {
    try {
      setExporting(true);
      const exporter = new PlayerAnalyticsPDFExporter();
      exporter.exportPlayerAnalytics({
        playerAnalytics: sortedAndFilteredPlayers,
        teamStats,
      });
    } catch (error) {
      console.error('Error exporting player analytics:', error);
    } finally {
      setExporting(false);
    }
  };

  const sortOptions = [
    { value: 'overall', label: 'Overall Rating' },
    { value: 'attendance', label: 'Attendance Rate' },
    { value: 'performance', label: 'Match Performance' },
    { value: 'contribution', label: 'Contributions' },
  ];

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
        title="Player Analytics"
        description={`Comprehensive performance analysis for ${teamStats.totalPlayers} active players`}
        actions={
          canExport && (
            <Button
              onClick={handleExport}
              leftIcon={<Download size={18} />}
              isLoading={exporting}
              variant="outline"
            >
              Export PDF
            </Button>
          )
        }
      />

      {/* Team Overview Stats */}
      {teamStats.totalPlayers > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                  Team Average
                </p>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                  {teamStats.averageRating}/100
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600 dark:text-green-400">
                  Top Performer
                </p>
                <p className="text-lg font-bold text-green-900 dark:text-green-100">
                  {teamStats.topPerformer?.member.name.split(' ')[0] || 'N/A'}
                </p>
                <p className="text-xs text-green-700 dark:text-green-300">
                  {teamStats.topPerformer?.overallRating || 0}/100
                </p>
              </div>
              <Trophy className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
          </div>
          
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600 dark:text-purple-400">
                  Attendance Leader
                </p>
                <p className="text-lg font-bold text-purple-900 dark:text-purple-100">
                  {teamStats.attendanceLeader?.member.name.split(' ')[0] || 'N/A'}
                </p>
                {teamStats.attendanceLeader && (
                  <p className="text-xs text-purple-700 dark:text-purple-300">
                    {Math.round(teamStats.attendanceLeader.systemWideAttendanceRate || 0)}% system-wide
                  </p>
                )}
              </div>
              <Calendar className="h-8 w-8 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          
          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                  Top Scorer
                </p>
                <p className="text-lg font-bold text-yellow-900 dark:text-yellow-100">
                  {teamStats.topScorer?.member.name.split(' ')[0] || 'N/A'}
                </p>
                <p className="text-xs text-yellow-700 dark:text-yellow-300">
                  {teamStats.topScorer?.goalsScored || 0} goals
                </p>
              </div>
              <Target className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Select
          label="Sort by"
          options={sortOptions}
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
        />
        
        <Select
          label="Filter by Position"
          options={positionOptions}
          value={filterPosition}
          onChange={(e) => setFilterPosition(e.target.value)}
        />
      </div>

      {/* Player Analytics Table */}
      <Card>
        {sortedAndFilteredPlayers.length > 0 ? (
          <Table
            data={sortedAndFilteredPlayers.map((player, index) => ({ ...player, index }))}
            columns={columns}
            onRowClick={(player) => console.log('Clicked player:', player)}
          />
        ) : playerAnalytics.length === 0 ? (
          <EmptyState
            title="No player data available"
            description="No active players found to analyze. Add active team members to see analytics."
            icon={<Users size={24} />}
          />
        ) : (
          <EmptyState
            title="No players match the filter"
            description={`No players found for position: ${filterPosition}`}
            icon={<Filter size={24} />}
          />
        )}
      </Card>

      {/* Top Performers Section */}
      {playerAnalytics.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
          {/* Top 3 Overall */}
          <Card title="Top Overall Performers" className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
            <div className="space-y-3">
              {playerAnalytics
                .sort((a, b) => b.overallRating - a.overallRating)
                .slice(0, 3)
                .map((player, index) => (
                  <div key={player.member.id} className="flex items-center justify-between p-3 bg-white dark:bg-neutral-800 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                        index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : 'bg-orange-600'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {player.member.name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {player.member.position}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-blue-600 dark:text-blue-400">
                        {player.overallRating}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        rating
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </Card>

          {/* Top 3 Attendance */}
          <Card title="Attendance Champions" className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
            <div className="space-y-3">
              {playerAnalytics
                .sort((a, b) => {
                  // Primary sort: system-wide attendance rate
                  if (b.systemWideAttendanceRate !== a.systemWideAttendanceRate) {
                    return b.systemWideAttendanceRate - a.systemWideAttendanceRate;
                  }
                  // Secondary sort: total sessions attended
                  return b.attendedSessions - a.attendedSessions;
                })
                .slice(0, 3)
                .map((player, index) => (
                  <div key={player.member.id} className="flex items-center justify-between p-3 bg-white dark:bg-neutral-800 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                        index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : 'bg-orange-600'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {player.member.name}
                        </div>
                        {player.totalSessions > 0 ? (
                          <div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {player.attendedSessions}/{player.totalSessions} eligible
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {player.attendedSessions}/{player.totalSystemSessions} total
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {player.attendedSessions}/{player.totalSystemSessions} total
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              No eligible sessions
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-600 dark:text-green-400">
                        {Math.round(player.systemWideAttendanceRate)}%
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        system-wide
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </Card>

          {/* Top 3 Contributors */}
          <Card title="Top Contributors" className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20">
            <div className="space-y-3">
              {playerAnalytics
                .sort((a, b) => b.totalContributionAmount - a.totalContributionAmount)
                .slice(0, 3)
                .map((player, index) => (
                  <div key={player.member.id} className="flex items-center justify-between p-3 bg-white dark:bg-neutral-800 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                        index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : 'bg-orange-600'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {player.member.name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {player.totalContributions} contributions
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-purple-600 dark:text-purple-400">
                        {formatUGX(player.totalContributionAmount)}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </Card>
        </div>
      )}

      {/* Performance Insights */}
      {playerAnalytics.length > 0 && (
        <Card title="Team Performance Insights & Rating System" className="mt-8">
          {/* Rating System Explanation */}
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-3">
              FC256 Player Rating System
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <h5 className="font-medium text-blue-800 dark:text-blue-200 mb-2">Attendance (50%)</h5>
                <p className="text-blue-700 dark:text-blue-300">
                  Based on training session and match attendance rate
                </p>
              </div>
              <div>
                <h5 className="font-medium text-blue-800 dark:text-blue-200 mb-2">Match Performance (35%)</h5>
                <p className="text-blue-700 dark:text-blue-300">
                  Goals, assists, MOTM awards, participation. Defenders & goalkeepers get 30% bonus from team goals
                </p>
              </div>
              <div>
                <h5 className="font-medium text-blue-800 dark:text-blue-200 mb-2">Contributions (15%)</h5>
                <p className="text-blue-700 dark:text-blue-300">
                  Financial contributions to team activities and equipment
                </p>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                {Math.round(playerAnalytics.reduce((sum, p) => sum + p.systemWideAttendanceRate, 0) / playerAnalytics.length)}%
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Average System-Wide Attendance</p>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">
                {playerAnalytics.reduce((sum, p) => sum + p.goalsScored, 0)}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Goals Scored</p>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-2">
                {formatUGX(playerAnalytics.reduce((sum, p) => sum + p.totalContributionAmount, 0))}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Contributions</p>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400 mb-2">
                {playerAnalytics.filter(p => p.overallRating >= 75).length}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Excellent Performers (75%+)</p>
            </div>
          </div>
          
          {/* Attendance Details Section */}
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-3">
              Attendance Calculation Details
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h5 className="font-medium text-blue-800 dark:text-blue-200 mb-2">Individual Attendance Rate</h5>
                <p className="text-blue-700 dark:text-blue-300">
                  Based on sessions available since the member joined the team (fair individual comparison)
                </p>
              </div>
              <div>
                <h5 className="font-medium text-blue-800 dark:text-blue-200 mb-2">System-Wide Attendance Rate</h5>
                <p className="text-blue-700 dark:text-blue-300">
                  Based on all sessions from system inception (used for overall ranking and attendance champions)
                </p>
              </div>
            </div>
            <div className="mt-3 text-xs text-blue-600 dark:text-blue-400">
              <strong>Note:</strong> Members who joined later are not penalized for sessions before they joined, 
              but overall rankings consider total system contribution for fairness. Members with no eligible sessions 
              since their join date will show their total system attendance instead.
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default PlayerAnalytics;
import React, { useState, useEffect } from 'react';
import { User, TrendingUp, Trophy, Calendar, Target, Award, CreditCard, Users, Eye, Download } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { MemberService, AttendanceService, EventService, ContributionService } from '../../services/firestore';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Modal from '../../components/ui/Modal';
import Select from '../../components/ui/Select';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Avatar from '../../components/ui/Avatar';
import EmptyState from '../../components/common/EmptyState';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { Member, Attendance, Event, Contribution } from '../../types';
import { formatDate } from '../../utils/date-utils';
import { formatUGX } from '../../utils/currency-utils';
import { canUserAccess, Permissions } from '../../utils/permissions';
import { PlayerPerformancePDFExporter } from '../../utils/pdf-export';

interface PlayerStats {
  member: Member;
  attendance: {
    totalSessions: number;
    attended: number;
    missed: number;
    late: number;
    excused: number;
    attendanceRate: number;
    recentAttendance: { event: Event; attendance: Attendance }[];
  };
  friendlies: {
    totalMatches: number;
    goals: number;
    assists: number;
    yellowCards: number;
    redCards: number;
    manOfTheMatchCount: number;
    recentMatches: Event[];
  };
  contributions: {
    totalContributions: number;
    monetaryAmount: number;
    inKindCount: number;
    recentContributions: Contribution[];
  };
  overallRating: number;
}

const PlayerPerformance: React.FC = () => {
  const { user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [playerStats, setPlayerStats] = useState<PlayerStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerStats | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [filterPosition, setFilterPosition] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const canExport = user && canUserAccess(user.role, Permissions.EXPORT_REPORTS);

  useEffect(() => {
    const loadPlayerPerformanceData = async () => {
      try {
        setLoading(true);
        
        // Load all required data
        const [membersData, attendanceData, eventsData, contributionsData] = await Promise.all([
          MemberService.getAllMembers(),
          AttendanceService.getAllAttendance(),
          EventService.getAllEvents(),
          ContributionService.getAllContributions(),
        ]);

        console.log('Loaded data:', {
          members: membersData.length,
          attendance: attendanceData.length,
          events: eventsData.length,
          contributions: contributionsData.length
        });

        setMembers(membersData);

        // Calculate performance stats for each member
        const stats = await Promise.all(
          membersData.map(async (member) => {
            const memberAttendance = attendanceData.filter(a => a.memberId === member.id);
            const memberContributions = contributionsData.filter(c => c.memberId === member.id);
            
            // Get events the member attended
            const attendedEventIds = memberAttendance.map(a => a.eventId);
            const attendedEvents = eventsData.filter(e => attendedEventIds.includes(e.id));
            
            // Attendance statistics
            const totalSessions = memberAttendance.length;
            const attended = memberAttendance.filter(a => a.status === 'present').length;
            const missed = memberAttendance.filter(a => a.status === 'absent').length;
            const late = memberAttendance.filter(a => a.status === 'late').length;
            const excused = memberAttendance.filter(a => a.status === 'excused').length;
            const attendanceRate = totalSessions > 0 ? Math.round((attended / totalSessions) * 100) : 0;
            
            // Recent attendance (last 10 sessions)
            const recentAttendance = memberAttendance
              .map(attendance => {
                const event = eventsData.find(e => e.id === attendance.eventId);
                return event ? { event, attendance } : null;
              })
              .filter((item): item is { event: Event; attendance: Attendance } => item !== null)
              .sort((a, b) => new Date(b.event.date).getTime() - new Date(a.event.date).getTime())
              .slice(0, 10);

            // Friendly match statistics
            const friendlyMatches = eventsData.filter(e => 
              e.type === 'friendly' && 
              e.isCompleted && 
              e.matchDetails
            );
            
            let goals = 0;
            let assists = 0;
            let yellowCards = 0;
            let redCards = 0;
            let manOfTheMatchCount = 0;
            const recentMatches: Event[] = [];

            friendlyMatches.forEach(match => {
              if (match.matchDetails) {
                // Count goals
                if (match.matchDetails.goalScorers?.includes(member.id)) {
                  goals += match.matchDetails.goalScorers.filter(id => id === member.id).length;
                }
                
                // Count assists
                if (match.matchDetails.assists?.includes(member.id)) {
                  assists += match.matchDetails.assists.filter(id => id === member.id).length;
                }
                
                // Count yellow cards
                if (match.matchDetails.yellowCards?.includes(member.id)) {
                  yellowCards += match.matchDetails.yellowCards.filter(id => id === member.id).length;
                }
                
                // Count red cards
                if (match.matchDetails.redCards?.includes(member.id)) {
                  redCards += match.matchDetails.redCards.filter(id => id === member.id).length;
                }
                
                // Count man of the match awards
                if (match.matchDetails.manOfTheMatch === member.id) {
                  manOfTheMatchCount++;
                }
                
                // Add to recent matches if player was involved
                const wasInvolved = 
                  match.matchDetails.goalScorers?.includes(member.id) ||
                  match.matchDetails.assists?.includes(member.id) ||
                  match.matchDetails.yellowCards?.includes(member.id) ||
                  match.matchDetails.redCards?.includes(member.id) ||
                  match.matchDetails.manOfTheMatch === member.id;
                
                if (wasInvolved) {
                  recentMatches.push(match);
                }
              }
            });

            // Sort recent matches by date (latest first) and limit to 5
            recentMatches.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            const limitedRecentMatches = recentMatches.slice(0, 5);

            // Contribution statistics
            const monetaryContributions = memberContributions.filter(c => c.type === 'monetary' && c.amount);
            const monetaryAmount = monetaryContributions.reduce((sum, c) => sum + (c.amount || 0), 0);
            const inKindCount = memberContributions.filter(c => c.type === 'in-kind').length;
            
            const recentContributions = memberContributions
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .slice(0, 5);

            // Calculate overall rating (0-100)
            let rating = 0;
            let factors = 0;
            
            // Attendance factor (40% weight)
            if (totalSessions > 0) {
              rating += attendanceRate * 0.4;
              factors += 40;
            }
            
            // Performance factor (35% weight)
            if (friendlyMatches.length > 0) {
              const performanceScore = Math.min(100, 
                (goals * 10) + 
                (assists * 8) + 
                (manOfTheMatchCount * 15) - 
                (yellowCards * 3) - 
                (redCards * 10)
              );
              rating += Math.max(0, performanceScore) * 0.35;
              factors += 35;
            }
            
            // Contribution factor (25% weight)
            if (memberContributions.length > 0) {
              const contributionScore = Math.min(100, 
                (monetaryContributions.length * 20) + 
                (inKindCount * 15)
              );
              rating += contributionScore * 0.25;
              factors += 25;
            }
            
            const overallRating = factors > 0 ? Math.round(rating * (100 / factors)) : 0;

            return {
              member,
              attendance: {
                totalSessions,
                attended,
                missed,
                late,
                excused,
                attendanceRate,
                recentAttendance,
              },
              friendlies: {
                totalMatches: friendlyMatches.length,
                goals,
                assists,
                yellowCards,
                redCards,
                manOfTheMatchCount,
                recentMatches: limitedRecentMatches,
              },
              contributions: {
                totalContributions: memberContributions.length,
                monetaryAmount,
                inKindCount,
                recentContributions,
              },
              overallRating,
            };
          })
        );

        // Sort by overall rating (highest first)
        stats.sort((a, b) => b.overallRating - a.overallRating);
        setPlayerStats(stats);
      } catch (error) {
        console.error('Error loading player performance data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPlayerPerformanceData();

    // Set up real-time listeners
    const unsubscribeMembers = MemberService.subscribeToMembers(() => {
      loadPlayerPerformanceData();
    });
    
    const unsubscribeAttendance = AttendanceService.subscribeToAttendance(() => {
      loadPlayerPerformanceData();
    });
    
    const unsubscribeEvents = EventService.subscribeToEvents(() => {
      loadPlayerPerformanceData();
    });
    
    const unsubscribeContributions = ContributionService.subscribeToContributions(() => {
      loadPlayerPerformanceData();
    });

    return () => {
      unsubscribeMembers();
      unsubscribeAttendance();
      unsubscribeEvents();
      unsubscribeContributions();
    };
  }, []);

  // Filter options
  const positionOptions = [
    { value: 'all', label: 'All Positions' },
    ...Array.from(new Set(members.map(m => m.position)))
      .sort()
      .map(position => ({ value: position, label: position }))
  ];

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'injured', label: 'Injured' },
    { value: 'suspended', label: 'Suspended' },
  ];

  // Apply filters
  const filteredStats = playerStats.filter(stat => {
    const positionMatch = filterPosition === 'all' || stat.member.position === filterPosition;
    const statusMatch = filterStatus === 'all' || stat.member.status === filterStatus;
    return positionMatch && statusMatch;
  });

  const getRatingBadgeVariant = (rating: number) => {
    if (rating >= 80) return 'success';
    if (rating >= 60) return 'info';
    if (rating >= 40) return 'warning';
    return 'danger';
  };

  const getRatingLabel = (rating: number) => {
    if (rating >= 80) return 'Excellent';
    if (rating >= 60) return 'Good';
    if (rating >= 40) return 'Average';
    return 'Needs Improvement';
  };

  const columns = [
    {
      key: 'member',
      title: 'Player',
      render: (stat: PlayerStats) => (
        <div className="flex items-center">
          <Avatar size="sm" className="mr-3" />
          <div>
            <div className="font-medium text-gray-900 dark:text-white">
              {stat.member.name}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              #{stat.member.jerseyNumber} • {stat.member.position}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'overallRating',
      title: 'Overall Rating',
      render: (stat: PlayerStats) => (
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
            {stat.overallRating}
          </div>
          <Badge variant={getRatingBadgeVariant(stat.overallRating)} size="sm">
            {getRatingLabel(stat.overallRating)}
          </Badge>
        </div>
      ),
    },
    {
      key: 'attendance',
      title: 'Attendance',
      render: (stat: PlayerStats) => (
        <div className="text-center">
          <div className="text-lg font-semibold text-gray-900 dark:text-white">
            {stat.attendance.attendanceRate}%
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {stat.attendance.attended}/{stat.attendance.totalSessions} sessions
          </div>
        </div>
      ),
    },
    {
      key: 'performance',
      title: 'Match Performance',
      render: (stat: PlayerStats) => (
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <Trophy size={14} className="text-yellow-600" />
            <span className="text-sm">{stat.friendlies.goals} goals</span>
          </div>
          <div className="flex items-center space-x-2">
            <Target size={14} className="text-blue-600" />
            <span className="text-sm">{stat.friendlies.assists} assists</span>
          </div>
          {stat.friendlies.manOfTheMatchCount > 0 && (
            <div className="flex items-center space-x-2">
              <Award size={14} className="text-purple-600" />
              <span className="text-sm">{stat.friendlies.manOfTheMatchCount} MOTM</span>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'contributions',
      title: 'Contributions',
      render: (stat: PlayerStats) => (
        <div className="text-center">
          <div className="text-lg font-semibold text-gray-900 dark:text-white">
            {stat.contributions.totalContributions}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {formatUGX(stat.contributions.monetaryAmount)}
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      render: (stat: PlayerStats) => (
        <Badge
          variant={
            stat.member.status === 'active' ? 'success' :
            stat.member.status === 'inactive' ? 'warning' :
            stat.member.status === 'injured' ? 'danger' : 'default'
          }
          className="capitalize"
        >
          {stat.member.status}
        </Badge>
      ),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (stat: PlayerStats) => (
        <Button
          size="sm"
          variant="outline"
          onClick={(e) => {
            e.stopPropagation();
            handleViewDetails(stat);
          }}
        >
          <Eye size={16} />
        </Button>
      ),
    },
  ];

  const handleViewDetails = (stat: PlayerStats) => {
    setSelectedPlayer(stat);
    setIsDetailModalOpen(true);
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      const exporter = new PlayerPerformancePDFExporter();
      exporter.exportPlayerPerformance({
        playerStats: filteredStats,
        summary: {
          totalPlayers: filteredStats.length,
          averageRating: Math.round(filteredStats.reduce((sum, stat) => sum + stat.overallRating, 0) / filteredStats.length),
          topPerformer: filteredStats[0]?.member.name || 'N/A',
          averageAttendance: Math.round(filteredStats.reduce((sum, stat) => sum + stat.attendance.attendanceRate, 0) / filteredStats.length),
        }
      });
    } catch (error) {
      console.error('Error exporting player performance:', error);
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
        title="Player Performance Analytics"
        description={`Individual player insights across attendance, match performance, and contributions (${filteredStats.length} players)`}
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

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                Total Players
              </p>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                {filteredStats.length}
              </p>
            </div>
            <Users className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
        </div>
        
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600 dark:text-green-400">
                Average Rating
              </p>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                {filteredStats.length > 0 
                  ? Math.round(filteredStats.reduce((sum, stat) => sum + stat.overallRating, 0) / filteredStats.length)
                  : 0
                }
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
        </div>
        
        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                Top Performer
              </p>
              <p className="text-lg font-bold text-yellow-900 dark:text-yellow-100">
                {filteredStats[0]?.member.name.split(' ')[0] || 'N/A'}
              </p>
            </div>
            <Award className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
          </div>
        </div>
        
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600 dark:text-purple-400">
                Avg Attendance
              </p>
              <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                {filteredStats.length > 0 
                  ? Math.round(filteredStats.reduce((sum, stat) => sum + stat.attendance.attendanceRate, 0) / filteredStats.length)
                  : 0
                }%
              </p>
            </div>
            <Calendar className="h-8 w-8 text-purple-600 dark:text-purple-400" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Select
          label="Filter by Position"
          options={positionOptions}
          value={filterPosition}
          onChange={(e) => setFilterPosition(e.target.value)}
        />
        <Select
          label="Filter by Status"
          options={statusOptions}
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        />
      </div>

      <Card>
        {filteredStats.length > 0 ? (
          <Table
            data={filteredStats}
            columns={columns}
            onRowClick={(stat) => handleViewDetails(stat)}
          />
        ) : (
          <EmptyState
            title="No player performance data"
            description="No players match the current filters or no performance data is available."
            icon={<User size={24} />}
          />
        )}
      </Card>

      {/* Player Detail Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title="Player Performance Details"
        size="2xl"
      >
        {selectedPlayer && (
          <div className="space-y-6">
            {/* Player Header */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
              <div className="flex items-center space-x-4">
                <Avatar size="lg" />
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {selectedPlayer.member.name}
                  </h3>
                  <div className="flex items-center space-x-4 mt-2">
                    <span className="text-lg font-medium text-gray-600 dark:text-gray-400">
                      #{selectedPlayer.member.jerseyNumber} • {selectedPlayer.member.position}
                    </span>
                    <Badge
                      variant={
                        selectedPlayer.member.status === 'active' ? 'success' :
                        selectedPlayer.member.status === 'inactive' ? 'warning' :
                        selectedPlayer.member.status === 'injured' ? 'danger' : 'default'
                      }
                      className="capitalize"
                    >
                      {selectedPlayer.member.status}
                    </Badge>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900 dark:text-white">
                    {selectedPlayer.overallRating}
                  </div>
                  <Badge variant={getRatingBadgeVariant(selectedPlayer.overallRating)}>
                    {getRatingLabel(selectedPlayer.overallRating)}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Performance Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Attendance Section */}
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                <div className="flex items-center mb-4">
                  <Calendar className="h-6 w-6 text-green-600 dark:text-green-400 mr-2" />
                  <h4 className="text-lg font-semibold text-green-900 dark:text-green-100">
                    Attendance Record
                  </h4>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-green-700 dark:text-green-300">Attendance Rate:</span>
                    <span className="font-bold text-green-900 dark:text-green-100">
                      {selectedPlayer.attendance.attendanceRate}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-green-700 dark:text-green-300">Sessions Attended:</span>
                    <span className="font-medium text-green-900 dark:text-green-100">
                      {selectedPlayer.attendance.attended}/{selectedPlayer.attendance.totalSessions}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-green-700 dark:text-green-300">Missed:</span>
                    <span className="font-medium text-green-900 dark:text-green-100">
                      {selectedPlayer.attendance.missed}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-green-700 dark:text-green-300">Late:</span>
                    <span className="font-medium text-green-900 dark:text-green-100">
                      {selectedPlayer.attendance.late}
                    </span>
                  </div>
                </div>
              </div>

              {/* Match Performance Section */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center mb-4">
                  <Trophy className="h-6 w-6 text-blue-600 dark:text-blue-400 mr-2" />
                  <h4 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                    Match Statistics
                  </h4>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-blue-700 dark:text-blue-300">Goals Scored:</span>
                    <span className="font-bold text-blue-900 dark:text-blue-100">
                      {selectedPlayer.friendlies.goals}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-blue-700 dark:text-blue-300">Assists:</span>
                    <span className="font-medium text-blue-900 dark:text-blue-100">
                      {selectedPlayer.friendlies.assists}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-blue-700 dark:text-blue-300">Man of the Match:</span>
                    <span className="font-medium text-blue-900 dark:text-blue-100">
                      {selectedPlayer.friendlies.manOfTheMatchCount}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-blue-700 dark:text-blue-300">Cards:</span>
                    <span className="font-medium text-blue-900 dark:text-blue-100">
                      🟨{selectedPlayer.friendlies.yellowCards} 🟥{selectedPlayer.friendlies.redCards}
                    </span>
                  </div>
                </div>
              </div>

              {/* Contributions Section */}
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                <div className="flex items-center mb-4">
                  <CreditCard className="h-6 w-6 text-purple-600 dark:text-purple-400 mr-2" />
                  <h4 className="text-lg font-semibold text-purple-900 dark:text-purple-100">
                    Contributions
                  </h4>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-purple-700 dark:text-purple-300">Total Contributions:</span>
                    <span className="font-bold text-purple-900 dark:text-purple-100">
                      {selectedPlayer.contributions.totalContributions}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-purple-700 dark:text-purple-300">Monetary:</span>
                    <span className="font-medium text-purple-900 dark:text-purple-100">
                      {formatUGX(selectedPlayer.contributions.monetaryAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-purple-700 dark:text-purple-300">In-Kind:</span>
                    <span className="font-medium text-purple-900 dark:text-purple-100">
                      {selectedPlayer.contributions.inKindCount} items
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Attendance */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Recent Attendance
                </h4>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {selectedPlayer.attendance.recentAttendance.length > 0 ? (
                    selectedPlayer.attendance.recentAttendance.map(({ event, attendance }, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-neutral-700/30 rounded-lg">
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {event.type === 'training' ? 'Training' : `vs ${event.opponent}`}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {formatDate(event.date)}
                          </div>
                        </div>
                        <Badge
                          variant={
                            attendance.status === 'present' ? 'success' :
                            attendance.status === 'late' ? 'warning' :
                            attendance.status === 'excused' ? 'info' : 'danger'
                          }
                          size="sm"
                          className="capitalize"
                        >
                          {attendance.status}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                      No recent attendance records
                    </p>
                  )}
                </div>
              </div>

              {/* Recent Match Performance */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Recent Match Involvement
                </h4>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {selectedPlayer.friendlies.recentMatches.length > 0 ? (
                    selectedPlayer.friendlies.recentMatches.map((match, index) => (
                      <div key={index} className="p-3 bg-gray-50 dark:bg-neutral-700/30 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-medium text-gray-900 dark:text-white">
                            FC256 vs {match.opponent}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {formatDate(match.date)}
                          </div>
                        </div>
                        <div className="flex items-center space-x-4 text-sm">
                          {match.matchDetails?.goalScorers?.includes(selectedPlayer.member.id) && (
                            <span className="text-yellow-600 dark:text-yellow-400">⚽ Goal</span>
                          )}
                          {match.matchDetails?.assists?.includes(selectedPlayer.member.id) && (
                            <span className="text-blue-600 dark:text-blue-400">🎯 Assist</span>
                          )}
                          {match.matchDetails?.manOfTheMatch === selectedPlayer.member.id && (
                            <span className="text-purple-600 dark:text-purple-400">🏆 MOTM</span>
                          )}
                          {match.matchDetails?.yellowCards?.includes(selectedPlayer.member.id) && (
                            <span className="text-yellow-600 dark:text-yellow-400">🟨 Card</span>
                          )}
                          {match.matchDetails?.redCards?.includes(selectedPlayer.member.id) && (
                            <span className="text-red-600 dark:text-red-400">🟥 Card</span>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                      No recent match involvement
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="outline"
                onClick={() => setIsDetailModalOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PlayerPerformance;
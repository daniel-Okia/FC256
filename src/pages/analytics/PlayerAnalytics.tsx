import React, { useState, useEffect } from 'react';
import { TrendingUp, Users, Trophy, CreditCard, Download, Filter, Eye, Star, Award, Target, Calendar, AlertCircle, CalendarDays } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { MemberService, AttendanceService, EventService, ContributionService } from '../../services/firestore';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Modal from '../../components/ui/Modal';
import Select from '../../components/ui/Select';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/common/EmptyState';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { Member, Attendance, Event, Contribution, Position, MemberStatus } from '../../types';
import { formatDate } from '../../utils/date-utils';
import { formatUGX } from '../../utils/currency-utils';
import { canUserAccess, Permissions } from '../../utils/permissions';
import { PlayerAnalyticsPDFExporter } from '../../utils/pdf-export';

interface PlayerAnalytics {
  member: Member;
  attendanceRate: number;
  normalizedAttendanceRate: number;
  totalSessions: number;
  attendedSessions: number;
  lateArrivals: number;
  excusedAbsences: number;
  goalsScored: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  manOfTheMatchAwards: number;
  matchesPlayed: number;
  totalContributions: number;
  monetaryContributions: number;
  inKindContributions: number;
  totalContributionAmount: number;
  overallRating: number;
  attendanceScore: number;
  performanceScore: number;
  contributionScore: number;
  recentAttendance: { event: Event; attendance: Attendance }[];
  recentMatches: Event[];
  recentContributions: Contribution[];
}

interface FilterOptions {
  position: string;
  status: string;
  sortBy: 'rating' | 'attendance' | 'performance' | 'contributions' | 'name';
  sortOrder: 'asc' | 'desc';
}

const PlayerAnalytics: React.FC = () => {
  const { user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [playerAnalytics, setPlayerAnalytics] = useState<PlayerAnalytics[]>([]);
  const [filteredAnalytics, setFilteredAnalytics] = useState<PlayerAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerAnalytics | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDateFilterModalOpen, setIsDateFilterModalOpen] = useState(false);
  const [dateRange, setDateRange] = useState<{ startDate: string; endDate: string }>({
    startDate: '',
    endDate: '',
  });
  const [filters, setFilters] = useState<FilterOptions>({
    position: 'all',
    status: 'all',
    sortBy: 'rating',
    sortOrder: 'desc',
  });

  const canExport = user && canUserAccess(user.role, Permissions.EXPORT_REPORTS);

  // Load all data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [membersData, attendanceData, eventsData, contributionsData] = await Promise.all([
          MemberService.getAllMembers(),
          AttendanceService.getAllAttendance(),
          EventService.getAllEvents(),
          ContributionService.getAllContributions(),
        ]);

        setMembers(membersData);
        setAttendance(attendanceData);
        setEvents(eventsData);
        setContributions(contributionsData);
      } catch (error) {
        console.error('Error loading analytics data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();

    // Set up real-time listeners
    const unsubscribeMembers = MemberService.subscribeToMembers(setMembers);
    const unsubscribeAttendance = AttendanceService.subscribeToAttendance(setAttendance);
    const unsubscribeEvents = EventService.subscribeToEvents(setEvents);
    const unsubscribeContributions = ContributionService.subscribeToContributions(setContributions);

    return () => {
      unsubscribeMembers();
      unsubscribeAttendance();
      unsubscribeEvents();
      unsubscribeContributions();
    };
  }, []);

  // Calculate player analytics
  useEffect(() => {
    if (members.length > 0) {
      const analytics = calculatePlayerAnalytics();
      setPlayerAnalytics(analytics);
    }
  }, [members, attendance, events, contributions]);

  // Apply filters and sorting
  useEffect(() => {
    let filtered = [...playerAnalytics];

    // Apply position filter
    if (filters.position !== 'all') {
      filtered = filtered.filter(p => p.member.position === filters.position);
    }

    // Apply status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(p => p.member.status === filters.status);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: number | string;
      let bValue: number | string;

      switch (filters.sortBy) {
        case 'rating':
          aValue = a.overallRating;
          bValue = b.overallRating;
          break;
        case 'attendance':
          aValue = a.attendanceRate;
          bValue = b.attendanceRate;
          break;
        case 'performance':
          aValue = a.performanceScore;
          bValue = b.performanceScore;
          break;
        case 'contributions':
          aValue = a.contributionScore;
          bValue = b.contributionScore;
          break;
        case 'name':
          aValue = a.member.name.toLowerCase();
          bValue = b.member.name.toLowerCase();
          break;
        default:
          aValue = a.overallRating;
          bValue = b.overallRating;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return filters.sortOrder === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return filters.sortOrder === 'asc' 
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    });

    setFilteredAnalytics(filtered);
  }, [playerAnalytics, filters]);

  const calculatePlayerAnalytics = (): PlayerAnalytics[] => {
    return members.map(member => {
      // Attendance calculations with normalization
      const memberAttendance = attendance.filter(a => a.memberId === member.id);
      const totalSessions = new Set(memberAttendance.map(a => a.eventId)).size;
      const attendedSessions = memberAttendance.filter(a => a.status === 'present').length;
      const lateArrivals = memberAttendance.filter(a => a.status === 'late').length;
      const excusedAbsences = memberAttendance.filter(a => a.status === 'excused').length;
      
      // Calculate individual attendance rate (for display)
      const individualAttendanceRate = totalSessions > 0 ? (attendedSessions / totalSessions) * 100 : 0;
      
      // Calculate normalized attendance rate (for overall rating calculation)
      let normalizedAttendanceRate = 0;
      
      if (member.position === 'Coach' || member.position === 'Manager') {
        // Coaches and managers use their own attendance rate
        normalizedAttendanceRate = individualAttendanceRate;
      } else {
        // For players, normalize based on maximum regular player sessions
        const regularPlayers = members.filter(m => 
          m.position !== 'Coach' && 
          m.position !== 'Manager' && 
          m.status === 'active'
        );
        
        // Find the maximum sessions attended by any regular player
        const maxPlayerSessions = Math.max(
          ...regularPlayers.map(player => {
            const playerAttendance = attendance.filter(a => a.memberId === player.id);
            return new Set(playerAttendance.map(a => a.eventId)).size;
          }),
          1 // Minimum of 1 to avoid division by zero
        );
        
        normalizedAttendanceRate = maxPlayerSessions > 0 ? (attendedSessions / maxPlayerSessions) * 100 : 0;
        
        // Cap normalized rate at 100%
        normalizedAttendanceRate = Math.min(100, normalizedAttendanceRate);
      }

      // Match performance calculations
      const friendlyMatches = events.filter(e => e.type === 'friendly' && e.isCompleted && e.matchDetails);
      let goalsScored = 0;
      let assists = 0;
      let yellowCards = 0;
      let redCards = 0;
      let manOfTheMatchAwards = 0;
      let matchesPlayed = 0;
      let goalsConceded = 0;
      let teamGoalsInMatches = 0;
      let teamAssistsInMatches = 0;

      friendlyMatches.forEach(match => {
        if (match.matchDetails) {
          // Check if player was involved in the match
          const wasInvolved = 
            match.matchDetails.goalScorers?.includes(member.id) ||
            match.matchDetails.assists?.includes(member.id) ||
            match.matchDetails.yellowCards?.includes(member.id) ||
            match.matchDetails.redCards?.includes(member.id) ||
            match.matchDetails.manOfTheMatch === member.id;
          
          if (wasInvolved) {
            matchesPlayed++;
            
            // Track goals conceded for defenders and goalkeepers
            if (member.position === 'Goalkeeper' || 
                member.position === 'Centre-back' || 
                member.position === 'Left-back' || 
                member.position === 'Right-back' || 
                member.position === 'Sweeper') {
              goalsConceded += match.matchDetails.opponentScore || 0;
            }
            
            // Track team goals and assists for defenders and goalkeepers
            if (member.position === 'Goalkeeper' || 
                member.position === 'Centre-back' || 
                member.position === 'Left-back' || 
                member.position === 'Right-back' || 
                member.position === 'Sweeper') {
              teamGoalsInMatches += match.matchDetails.fc256Score || 0;
              teamAssistsInMatches += (match.matchDetails.assists?.length || 0);
            }
          }
          
          if (match.matchDetails.goalScorers?.includes(member.id)) {
            goalsScored += match.matchDetails.goalScorers.filter(id => id === member.id).length;
          }
          if (match.matchDetails.assists?.includes(member.id)) {
            assists += match.matchDetails.assists.filter(id => id === member.id).length;
          }
          if (match.matchDetails.yellowCards?.includes(member.id)) {
            yellowCards += match.matchDetails.yellowCards.filter(id => id === member.id).length;
          }
          if (match.matchDetails.redCards?.includes(member.id)) {
            redCards += match.matchDetails.redCards.filter(id => id === member.id).length;
          }
          if (match.matchDetails.manOfTheMatch === member.id) {
            manOfTheMatchAwards++;
          }
        }
      });

      // Contribution calculations
      const memberContributions = contributions.filter(c => c.memberId === member.id);
      const monetaryContributions = memberContributions.filter(c => c.type === 'monetary').length;
      const inKindContributions = memberContributions.filter(c => c.type === 'in-kind').length;
      const totalContributionAmount = memberContributions
        .filter(c => c.type === 'monetary' && c.amount)
        .reduce((sum, c) => sum + (c.amount || 0), 0);

      // Score calculations (0-100 scale) with updated logic
      const attendanceScore = Math.min(100, normalizedAttendanceRate);
      
      // Enhanced performance score with position-specific adjustments
      let positiveActions = goalsScored * 3 + assists * 2 + manOfTheMatchAwards * 5;
      
      // Position-specific bonuses for defenders and goalkeepers
      if (member.position === 'Goalkeeper' || 
          member.position === 'Centre-back' || 
          member.position === 'Left-back' || 
          member.position === 'Right-back' || 
          member.position === 'Sweeper') {
        
        // Bonus for team goals and assists when they played
        const teamGoalBonus = teamGoalsInMatches * 0.5; // 0.5 points per team goal
        const teamAssistBonus = teamAssistsInMatches * 0.3; // 0.3 points per team assist
        positiveActions += teamGoalBonus + teamAssistBonus;
        
        // Deduction for goals conceded
        const goalsConcededPenalty = goalsConceded * 1.5; // 1.5 points deducted per goal conceded
        positiveActions -= goalsConcededPenalty;
      }
      
      const negativeActions = yellowCards * 1 + redCards * 3;
      const netPerformance = positiveActions - negativeActions;
      const performanceScore = Math.max(0, Math.min(100, 50 + (netPerformance * 2)));

      // Contribution score based on total contributions and amounts
      const contributionScore = Math.min(100, 
        (memberContributions.length * 10) + 
        (totalContributionAmount / 10000) // Scale UGX amounts
      );

      // Overall rating calculation with updated weights
      // Only calculate rating if player has some activity (attendance, performance, or contributions)
      let overallRating = 0;
      
      const hasActivity = totalSessions > 0 || matchesPlayed > 0 || memberContributions.length > 0;
      
      if (hasActivity) {
        // Attendance: 50%, Performance: 35%, Contributions: 15%
        overallRating = Math.round(
          (attendanceScore * 0.50) + 
          (performanceScore * 0.35) + 
          (contributionScore * 0.15)
        );
      }

      // Recent data (last 10 records)
      const recentAttendance = memberAttendance
        .map(a => {
          const event = events.find(e => e.id === a.eventId);
          return event ? { event, attendance: a } : null;
        })
        .filter((item): item is { event: Event; attendance: Attendance } => item !== null)
        .sort((a, b) => new Date(b.event.date).getTime() - new Date(a.event.date).getTime())
        .slice(0, 10);

      const recentMatches = friendlyMatches
        .filter(match => {
          if (!match.matchDetails) return false;
          return match.matchDetails.goalScorers?.includes(member.id) ||
                 match.matchDetails.assists?.includes(member.id) ||
                 match.matchDetails.yellowCards?.includes(member.id) ||
                 match.matchDetails.redCards?.includes(member.id) ||
                 match.matchDetails.manOfTheMatch === member.id;
        })
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5);

      const recentContributions = memberContributions
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 10);

      return {
        member,
        attendanceRate: individualAttendanceRate, // Use individual rate for display
        normalizedAttendanceRate, // Keep normalized rate for calculations
        totalSessions,
        attendedSessions,
        lateArrivals,
        excusedAbsences,
        goalsScored,
        assists,
        yellowCards,
        redCards,
        manOfTheMatchAwards,
        matchesPlayed,
        totalContributions: memberContributions.length,
        monetaryContributions,
        inKindContributions,
        totalContributionAmount,
        overallRating,
        attendanceScore,
        performanceScore,
        contributionScore,
        recentAttendance,
        recentMatches,
        recentContributions,
      };
    });
  };

  const getRatingBadge = (rating: number) => {
    if (rating >= 85) return <Badge variant="success" size="lg">Excellent</Badge>;
    if (rating >= 70) return <Badge variant="info" size="lg">Good</Badge>;
    if (rating >= 55) return <Badge variant="warning" size="lg">Average</Badge>;
    return <Badge variant="danger" size="lg">Needs Improvement</Badge>;
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 85) return 'text-green-600 dark:text-green-400';
    if (rating >= 70) return 'text-blue-600 dark:text-blue-400';
    if (rating >= 55) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const positionOptions = [
    { value: 'all', label: 'All Positions' },
    { value: 'Goalkeeper', label: 'Goalkeeper' },
    { value: 'Centre-back', label: 'Centre-back' },
    { value: 'Left-back', label: 'Left-back' },
    { value: 'Right-back', label: 'Right-back' },
    { value: 'Defensive Midfielder', label: 'Defensive Midfielder' },
    { value: 'Central Midfielder', label: 'Central Midfielder' },
    { value: 'Attacking Midfielder', label: 'Attacking Midfielder' },
    { value: 'Left Winger', label: 'Left Winger' },
    { value: 'Right Winger', label: 'Right Winger' },
    { value: 'Centre Forward', label: 'Centre Forward' },
    { value: 'Striker', label: 'Striker' },
  ];

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'injured', label: 'Injured' },
    { value: 'suspended', label: 'Suspended' },
  ];

  const sortOptions = [
    { value: 'rating', label: 'Overall Rating' },
    { value: 'attendance', label: 'Attendance Rate' },
    { value: 'performance', label: 'Match Performance' },
    { value: 'contributions', label: 'Contributions' },
    { value: 'name', label: 'Name' },
  ];

  const columns = [
    {
      key: 'member',
      title: 'Player',
      render: (analytics: PlayerAnalytics) => (
        <div className="flex items-center">
          <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-primary-100 via-yellow-100 to-secondary-100 dark:from-primary-900/30 dark:via-yellow-900/20 dark:to-secondary-900/30 rounded-full flex items-center justify-center border border-yellow-200 dark:border-yellow-800/30 mr-3">
            <span className="text-sm font-bold text-primary-600 dark:text-primary-400">
              #{analytics.member.jerseyNumber}
            </span>
          </div>
          <div>
            <div className="font-medium text-gray-900 dark:text-white">
              {analytics.member.name}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {analytics.member.position}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'rating',
      title: 'Overall Rating',
      render: (analytics: PlayerAnalytics) => (
        <div className="text-center">
          <div className={`text-2xl font-bold ${getRatingColor(analytics.overallRating)}`}>
            {analytics.overallRating}
          </div>
          <div className="mt-1">
            {getRatingBadge(analytics.overallRating)}
          </div>
        </div>
      ),
    },
    {
      key: 'attendance',
      title: 'Attendance',
      render: (analytics: PlayerAnalytics) => (
        <div>
          <div className="font-medium text-gray-900 dark:text-white">
            {Math.round(analytics.attendanceRate)}%
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {analytics.attendedSessions}/{analytics.totalSessions} sessions
          </div>
        </div>
      ),
    },
    {
      key: 'performance',
      title: 'Match Stats',
      render: (analytics: PlayerAnalytics) => (
        <div className="space-y-1">
          <div className="flex items-center space-x-2 text-sm">
            <Trophy size={14} className="text-yellow-600" />
            <span>{analytics.goalsScored} goals</span>
          </div>
          <div className="flex items-center space-x-2 text-sm">
            <Target size={14} className="text-blue-600" />
            <span>{analytics.assists} assists</span>
          </div>
          {analytics.manOfTheMatchAwards > 0 && (
            <div className="flex items-center space-x-2 text-sm">
              <Award size={14} className="text-purple-600" />
              <span>{analytics.manOfTheMatchAwards} MOTM</span>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'contributions',
      title: 'Contributions',
      render: (analytics: PlayerAnalytics) => (
        <div>
          <div className="font-medium text-gray-900 dark:text-white">
            {analytics.totalContributions} total
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {formatUGX(analytics.totalContributionAmount)}
          </div>
        </div>
      ),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (analytics: PlayerAnalytics) => (
        <Button
          size="sm"
          variant="outline"
          onClick={(e) => {
            e.stopPropagation();
            handleViewDetails(analytics);
          }}
        >
          <Eye size={16} />
        </Button>
      ),
    },
  ];

  const handleViewDetails = (analytics: PlayerAnalytics) => {
    setSelectedPlayer(analytics);
    setIsDetailModalOpen(true);
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      await exportAnalytics(filteredAnalytics);
    } catch (error) {
      console.error('Error exporting player analytics:', error);
    } finally {
      setExporting(false);
    }
  };

  const exportAnalytics = async (analyticsData: PlayerAnalytics[]) => {
    const exporter = new PlayerAnalyticsPDFExporter();
    exporter.exportPlayerAnalytics({
      playerAnalytics: analyticsData,
      teamStats: {
        totalPlayers: analyticsData.length,
        averageRating: analyticsData.length > 0 ? Math.round(analyticsData.reduce((sum, p) => sum + p.overallRating, 0) / analyticsData.length) : 0,
        topPerformer: analyticsData.length > 0 ? analyticsData.reduce((top, current) => 
          current.overallRating > top.overallRating ? current : top, analyticsData[0]) : null,
        attendanceLeader: analyticsData.length > 0 ? analyticsData.reduce((top, current) => 
          current.attendanceRate > top.attendanceRate ? current : top, analyticsData[0]) : null,
        topScorer: analyticsData.length > 0 ? analyticsData.reduce((top, current) => 
          current.goalsScored > top.goalsScored ? current : top, analyticsData[0]) : null,
      },
    });
  };

  const handleDateFilteredExport = async () => {
    if (!dateRange.startDate || !dateRange.endDate) {
      alert('Please select both start and end dates');
      return;
    }

    try {
      setExporting(true);
      
      // Filter data by date range
      const startDate = new Date(dateRange.startDate + 'T00:00:00');
      const endDate = new Date(dateRange.endDate + 'T23:59:59');

      // Filter attendance by event date
      const filteredAttendance = attendance.filter(attendanceRecord => {
        const event = events.find(e => e.id === attendanceRecord.eventId);
        if (!event) return false;
        const eventDate = new Date(event.date);
        return eventDate >= startDate && eventDate <= endDate;
      });

      // Filter events by date
      const filteredEvents = events.filter(event => {
        const eventDate = new Date(event.date);
        return eventDate >= startDate && eventDate <= endDate;
      });

      // Filter contributions by date
      const filteredContributions = contributions.filter(contribution => {
        const contributionDate = new Date(contribution.date);
        return contributionDate >= startDate && contributionDate <= endDate;
      });

      // Recalculate analytics with filtered data
      const filteredAnalytics = members.map(member => {
        // Use filtered data for calculations
        const memberAttendance = filteredAttendance.filter(a => a.memberId === member.id);
        const memberContributions = filteredContributions.filter(c => c.memberId === member.id);
        const memberEvents = filteredEvents.filter(e => 
          e.type === 'friendly' && e.isCompleted && e.matchDetails &&
          (e.matchDetails.goalScorers?.includes(member.id) ||
           e.matchDetails.assists?.includes(member.id) ||
           e.matchDetails.yellowCards?.includes(member.id) ||
           e.matchDetails.redCards?.includes(member.id) ||
           e.matchDetails.manOfTheMatch === member.id)
        );

        // Recalculate stats with filtered data
        const totalSessions = new Set(memberAttendance.map(a => a.eventId)).size;
        const attendedSessions = memberAttendance.filter(a => a.status === 'present').length;
        const attendanceRate = totalSessions > 0 ? (attendedSessions / totalSessions) * 100 : 0;

        // Match performance from filtered events
        let goalsScored = 0;
        let assists = 0;
        let yellowCards = 0;
        let redCards = 0;
        let manOfTheMatchAwards = 0;

        memberEvents.forEach(match => {
          if (match.matchDetails) {
            if (match.matchDetails.goalScorers?.includes(member.id)) {
              goalsScored += match.matchDetails.goalScorers.filter(id => id === member.id).length;
            }
            if (match.matchDetails.assists?.includes(member.id)) {
              assists += match.matchDetails.assists.filter(id => id === member.id).length;
            }
            if (match.matchDetails.yellowCards?.includes(member.id)) {
              yellowCards += match.matchDetails.yellowCards.filter(id => id === member.id).length;
            }
            if (match.matchDetails.redCards?.includes(member.id)) {
              redCards += match.matchDetails.redCards.filter(id => id === member.id).length;
            }
            if (match.matchDetails.manOfTheMatch === member.id) {
              manOfTheMatchAwards++;
            }
          }
        });

        // Contribution calculations from filtered data
        const monetaryContributions = memberContributions.filter(c => c.type === 'monetary').length;
        const inKindContributions = memberContributions.filter(c => c.type === 'in-kind').length;
        const totalContributionAmount = memberContributions
          .filter(c => c.type === 'monetary' && c.amount)
          .reduce((sum, c) => sum + (c.amount || 0), 0);

        // Score calculations
        const attendanceScore = Math.min(100, attendanceRate);
        const positiveActions = goalsScored * 3 + assists * 2 + manOfTheMatchAwards * 5;
        const negativeActions = yellowCards * 1 + redCards * 3;
        const performanceScore = Math.max(0, Math.min(100, 50 + ((positiveActions - negativeActions) * 2)));
        const contributionScore = Math.min(100, (memberContributions.length * 10) + (totalContributionAmount / 10000));
        
        const hasActivity = totalSessions > 0 || memberEvents.length > 0 || memberContributions.length > 0;
        const overallRating = hasActivity ? Math.round(
          (attendanceScore * 0.50) + 
          (performanceScore * 0.35) + 
          (contributionScore * 0.15)
        ) : 0;

        return {
          member,
          attendanceRate,
          normalizedAttendanceRate: attendanceRate,
          totalSessions,
          attendedSessions,
          lateArrivals: memberAttendance.filter(a => a.status === 'late').length,
          excusedAbsences: memberAttendance.filter(a => a.status === 'excused').length,
          goalsScored,
          assists,
          yellowCards,
          redCards,
          manOfTheMatchAwards,
          matchesPlayed: memberEvents.length,
          totalContributions: memberContributions.length,
          monetaryContributions,
          inKindContributions,
          totalContributionAmount,
          overallRating,
          attendanceScore,
          performanceScore,
          contributionScore,
          recentAttendance: [],
          recentMatches: [],
          recentContributions: [],
        };
      });

      await exportAnalytics(filteredAnalytics);
      setIsDateFilterModalOpen(false);
    } catch (error) {
      console.error('Error exporting filtered analytics:', error);
    } finally {
      setExporting(false);
    }
  };

  // Calculate team statistics
  const teamStats = {
    totalPlayers: filteredAnalytics.length,
    averageRating: filteredAnalytics.length > 0 
      ? Math.round(filteredAnalytics.reduce((sum, p) => sum + p.overallRating, 0) / filteredAnalytics.length)
      : 0,
    excellentPlayers: filteredAnalytics.filter(p => p.overallRating >= 85).length,
    goodPlayers: filteredAnalytics.filter(p => p.overallRating >= 70 && p.overallRating < 85).length,
    averagePlayers: filteredAnalytics.filter(p => p.overallRating >= 55 && p.overallRating < 70).length,
    needsImprovementPlayers: filteredAnalytics.filter(p => p.overallRating < 55).length,
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
        title="Player Analytics"
        description={`Performance analysis (${teamStats.totalPlayers} players)`}
        actions={
          canExport && (
            <div className="flex space-x-2">
              <Button
                onClick={handleExport}
                leftIcon={<Download size={18} />}
                isLoading={exporting}
                variant="outline"
              >
                Export
              </Button>
              <Button
                onClick={() => setIsDateFilterModalOpen(true)}
                leftIcon={<CalendarDays size={18} />}
                variant="primary"
                className="bg-gradient-to-r from-primary-600 to-yellow-500 hover:from-primary-700 hover:to-yellow-600 text-white"
              >
                Date Filter
              </Button>
            </div>
          )
        }
      />

      {/* Rating System Weights */}
      <Card className="mb-6">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Rating Weights
          </h3>
          <div className="grid grid-cols-3 gap-6">
            <div>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">50%</div>
              <div className="text-sm text-gray-700 dark:text-gray-300">Attendance</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">35%</div>
              <div className="text-sm text-gray-700 dark:text-gray-300">Performance</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">15%</div>
              <div className="text-sm text-gray-700 dark:text-gray-300">Contributions</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Team Overview Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                Team Average
              </p>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                {teamStats.averageRating}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600 dark:text-green-400">
                Excellent
              </p>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                {teamStats.excellentPlayers}
              </p>
            </div>
            <Star className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                Good/Average
              </p>
              <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">
                {teamStats.goodPlayers + teamStats.averagePlayers}
              </p>
            </div>
            <Trophy className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 rounded-lg p-4 border border-red-200 dark:border-red-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-600 dark:text-red-400">
                Needs Focus
              </p>
              <p className="text-2xl font-bold text-red-900 dark:text-red-100">
                {teamStats.needsImprovementPlayers}
              </p>
            </div>
            <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Select
            label="Position"
            options={positionOptions}
            value={filters.position}
            onChange={(e) => setFilters(prev => ({ ...prev, position: e.target.value }))}
          />
          
          <Select
            label="Status"
            options={statusOptions}
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
          />
          
          <Select
            label="Sort By"
            options={sortOptions}
            value={filters.sortBy}
            onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value as any }))}
          />
          
          <Select
            label="Order"
            options={[
              { value: 'desc', label: 'Highest First' },
              { value: 'asc', label: 'Lowest First' },
            ]}
            value={filters.sortOrder}
            onChange={(e) => setFilters(prev => ({ ...prev, sortOrder: e.target.value as any }))}
          />
        </div>
      </Card>

      {/* Player Analytics Table */}
      <Card>
        {filteredAnalytics.length > 0 ? (
          <Table
            data={filteredAnalytics}
            columns={columns}
            onRowClick={(analytics) => handleViewDetails(analytics)}
          />
        ) : (
          <EmptyState
            title="No players found"
            description="No players match the current filter criteria."
            icon={<Users size={24} />}
          />
        )}
      </Card>

      {/* Player Detail Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title={selectedPlayer ? `${selectedPlayer.member.name} - Performance Analytics` : ''}
        size="2xl"
      >
        {selectedPlayer && (
          <div className="space-y-6">
            {/* Player Header */}
            <div className="bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-primary-100 via-yellow-100 to-secondary-100 dark:from-primary-900/30 dark:via-yellow-900/20 dark:to-secondary-900/30 rounded-full flex items-center justify-center border-2 border-yellow-200 dark:border-yellow-800/30">
                    <span className="text-xl font-bold text-primary-600 dark:text-primary-400">
                      #{selectedPlayer.member.jerseyNumber}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {selectedPlayer.member.name}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      {selectedPlayer.member.position} • {selectedPlayer.member.status}
                    </p>
                  </div>
                </div>
                <div className="text-center">
                  <div className={`text-4xl font-bold ${getRatingColor(selectedPlayer.overallRating)}`}>
                    {selectedPlayer.overallRating}
                  </div>
                  <div className="mt-2">
                    {getRatingBadge(selectedPlayer.overallRating)}
                  </div>
                </div>
              </div>
            </div>

            {/* Performance Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Attendance Insights */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-3 flex items-center">
                  <Calendar size={18} className="mr-2" />
                  Attendance (45% weight)
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-blue-700 dark:text-blue-300">Normalized Rate:</span>
                    <span className="font-bold text-blue-900 dark:text-blue-100">
                      {Math.round(selectedPlayer.attendanceRate)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-blue-700 dark:text-blue-300">Sessions:</span>
                    <span className="text-blue-900 dark:text-blue-100">
                      {selectedPlayer.attendedSessions}/{selectedPlayer.totalSessions}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-blue-700 dark:text-blue-300">Late:</span>
                    <span className="text-blue-900 dark:text-blue-100">
                      {selectedPlayer.lateArrivals}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-blue-700 dark:text-blue-300">Excused:</span>
                    <span className="text-blue-900 dark:text-blue-100">
                      {selectedPlayer.excusedAbsences}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-blue-200 dark:border-blue-700">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Score:</span>
                      <span className="font-bold text-blue-900 dark:text-blue-100">
                        {Math.round(selectedPlayer.attendanceScore)}/100
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Match Performance */}
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                <h4 className="font-medium text-green-900 dark:text-green-100 mb-3 flex items-center">
                  <Trophy size={18} className="mr-2" />
                  Performance (35% weight)
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-green-700 dark:text-green-300">Goals:</span>
                    <span className="font-bold text-green-900 dark:text-green-100">
                      {selectedPlayer.goalsScored}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-green-700 dark:text-green-300">Assists:</span>
                    <span className="text-green-900 dark:text-green-100">
                      {selectedPlayer.assists}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-green-700 dark:text-green-300">MOTM:</span>
                    <span className="text-green-900 dark:text-green-100">
                      {selectedPlayer.manOfTheMatchAwards}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-green-700 dark:text-green-300">Matches:</span>
                    <span className="text-green-900 dark:text-green-100">
                      {selectedPlayer.matchesPlayed}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-green-700 dark:text-green-300">Cards:</span>
                    <span className="text-green-900 dark:text-green-100">
                      {selectedPlayer.yellowCards}Y {selectedPlayer.redCards}R
                    </span>
                  </div>
                  <div className="pt-2 border-t border-green-200 dark:border-green-700">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-green-700 dark:text-green-300">Score:</span>
                      <span className="font-bold text-green-900 dark:text-green-100">
                        {Math.round(selectedPlayer.performanceScore)}/100
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contributions */}
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                <h4 className="font-medium text-purple-900 dark:text-purple-100 mb-3 flex items-center">
                  <CreditCard size={18} className="mr-2" />
                  Contributions (15% weight)
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-purple-700 dark:text-purple-300">Total:</span>
                    <span className="font-bold text-purple-900 dark:text-purple-100">
                      {selectedPlayer.totalContributions}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-purple-700 dark:text-purple-300">Monetary:</span>
                    <span className="text-purple-900 dark:text-purple-100">
                      {selectedPlayer.monetaryContributions}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-purple-700 dark:text-purple-300">In-Kind:</span>
                    <span className="text-purple-900 dark:text-purple-100">
                      {selectedPlayer.inKindContributions}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-purple-700 dark:text-purple-300">Amount:</span>
                    <span className="text-purple-900 dark:text-purple-100">
                      {formatUGX(selectedPlayer.totalContributionAmount)}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-purple-200 dark:border-purple-700">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-purple-700 dark:text-purple-300">Score:</span>
                      <span className="font-bold text-purple-900 dark:text-purple-100">
                        {Math.round(selectedPlayer.contributionScore)}/100
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Attendance */}
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                  Recent Attendance
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedPlayer.recentAttendance.length > 0 ? (
                    selectedPlayer.recentAttendance.map(({ event, attendance }, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                        <div>
                          <div className="text-sm font-medium">
                            {event.type === 'training' ? 'Training' : `vs ${event.opponent}`}
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatDate(event.date, 'MMM d')}
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
                    <p className="text-sm text-gray-500 dark:text-gray-400">No attendance records</p>
                  )}
                </div>
              </div>

              {/* Recent Contributions */}
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                  Recent Contributions
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedPlayer.recentContributions.length > 0 ? (
                    selectedPlayer.recentContributions.map((contribution, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                        <div>
                          <div className="text-sm font-medium">
                            {contribution.description}
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatDate(contribution.date, 'MMM d')}
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge
                            variant={contribution.type === 'monetary' ? 'success' : 'info'}
                            size="sm"
                            className="capitalize"
                          >
                            {contribution.type}
                          </Badge>
                          {contribution.amount && (
                            <div className="text-xs text-gray-500 mt-1">
                              {formatUGX(contribution.amount)}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400">No contributions recorded</p>
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

      {/* Date Filter Export Modal */}
      <Modal
        isOpen={isDateFilterModalOpen}
        onClose={() => setIsDateFilterModalOpen(false)}
        title="Export Analytics with Date Filter"
        size="lg"
      >
        <div className="space-y-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-center">
              <CalendarDays size={20} className="text-blue-600 dark:text-blue-400 mr-2" />
              <div>
                <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Date Range Analytics
                </h4>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Filter player performance data by date range for specific period analysis.
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
              max={dateRange.endDate || undefined}
              required
            />
            <Input
              label="End Date"
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
              min={dateRange.startDate || undefined}
              required
            />
          </div>

          {dateRange.startDate && dateRange.endDate && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <h4 className="text-sm font-medium text-green-900 dark:text-green-100 mb-2">
                Selected Period
              </h4>
              <p className="text-sm text-green-700 dark:text-green-300">
                <strong>From:</strong> {formatDate(dateRange.startDate, 'MMM d, yyyy')} <br />
                <strong>To:</strong> {formatDate(dateRange.endDate, 'MMM d, yyyy')} <br />
                <strong>Duration:</strong> {Math.ceil((new Date(dateRange.endDate + 'T00:00:00').getTime() - new Date(dateRange.startDate + 'T00:00:00').getTime()) / (1000 * 60 * 60 * 24)) + 1} days
              </p>
            </div>
          )}

          {/* Quick Date Range Buttons */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">
              Quick Select:
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const today = new Date();
                  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
                  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                  setDateRange({
                    startDate: firstDay.toISOString().split('T')[0],
                    endDate: lastDay.toISOString().split('T')[0],
                  });
                }}
                className="text-xs"
              >
                This Month
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const today = new Date();
                  const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                  const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
                  setDateRange({
                    startDate: firstDay.toISOString().split('T')[0],
                    endDate: lastDay.toISOString().split('T')[0],
                  });
                }}
                className="text-xs"
              >
                Last Month
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const today = new Date();
                  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
                  setDateRange({
                    startDate: thirtyDaysAgo.toISOString().split('T')[0],
                    endDate: today.toISOString().split('T')[0],
                  });
                }}
                className="text-xs"
              >
                Last 30 Days
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const today = new Date();
                  const firstDay = new Date(today.getFullYear(), 0, 1);
                  setDateRange({
                    startDate: firstDay.toISOString().split('T')[0],
                    endDate: today.toISOString().split('T')[0],
                  });
                }}
                className="text-xs"
              >
                This Year
              </Button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
            <Button
              variant="outline"
              onClick={() => setDateRange({ startDate: '', endDate: '' })}
              className="w-full sm:w-auto"
            >
              Clear Dates
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsDateFilterModalOpen(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDateFilteredExport}
              isLoading={exporting}
              className="bg-gradient-to-r from-primary-600 to-yellow-500 hover:from-primary-700 hover:to-yellow-600 text-white w-full sm:w-auto"
              leftIcon={<Download size={18} />}
            >
              Export Filtered
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PlayerAnalytics;
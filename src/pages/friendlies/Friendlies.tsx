import React, { useState, useEffect } from 'react';
import { Trophy, Plus, Edit, Trash2, MapPin, Clock, Download, Users, Target, Calendar, CheckCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { EventService, MemberService } from '../../services/firestore';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Table from '../../components/ui/Table';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/common/EmptyState';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { Event, Member, MatchResult, MatchDetails } from '../../types';
import { formatDate } from '../../utils/date-utils';
import { canUserAccess, Permissions } from '../../utils/permissions';
import { EventsPDFExporter } from '../../utils/pdf-export';
import { useForm } from 'react-hook-form';

interface FriendlyFormData {
  date: string;
  time: string;
  location: string;
  opponent: string;
  description?: string;
}

interface MatchResultFormData {
  fc256Score: number;
  opponentScore: number;
  venue: 'home' | 'away' | 'neutral';
  fc256Players?: number;
  opponentPlayers?: number;
  goalScorers: string[];
  assists: string[];
  yellowCards: string[];
  redCards: string[];
  manOfTheMatch?: string;
  matchReport?: string;
  attendance?: number;
}

const Friendlies: React.FC = () => {
  const { user } = useAuth();
  const [friendlyMatches, setFriendlyMatches] = useState<Event[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [editingMatch, setEditingMatch] = useState<Event | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<Event | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [matchToDelete, setMatchToDelete] = useState<Event | null>(null);
  const [selectedGoalScorers, setSelectedGoalScorers] = useState<string[]>([]);
  const [selectedAssists, setSelectedAssists] = useState<string[]>([]);
  const [selectedYellowCards, setSelectedYellowCards] = useState<string[]>([]);
  const [selectedRedCards, setSelectedRedCards] = useState<string[]>([]);

  const canCreateMatch = user && canUserAccess(user.role, Permissions.CREATE_EVENT);
  const canEditMatch = user && canUserAccess(user.role, Permissions.EDIT_EVENT);
  const canDeleteMatch = user && canUserAccess(user.role, Permissions.DELETE_EVENT);
  const canRecordResults = user && canUserAccess(user.role, Permissions.EDIT_EVENT);
  const canExport = user && canUserAccess(user.role, Permissions.EXPORT_REPORTS);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FriendlyFormData>();

  const {
    register: registerResult,
    handleSubmit: handleSubmitResult,
    reset: resetResult,
    setValue: setValueResult,
    watch: watchResult,
    formState: { errors: errorsResult },
  } = useForm<MatchResultFormData>();

  const watchFC256Score = watchResult('fc256Score');
  const watchOpponentScore = watchResult('opponentScore');

  // Load data from Firestore
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [events, membersData] = await Promise.all([
          EventService.getEventsByType('friendly'),
          MemberService.getAllMembers(),
        ]);
        setFriendlyMatches(events);
        setMembers(membersData);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();

    // Set up real-time listeners
    const unsubscribeEvents = EventService.subscribeToEvents((events) => {
      const friendlyEvents = events
        .filter(event => event.type === 'friendly')
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      setFriendlyMatches(friendlyEvents);
      setLoading(false);
    });

    const unsubscribeMembers = MemberService.subscribeToMembers(setMembers);

    return () => {
      unsubscribeEvents();
      unsubscribeMembers();
    };
  }, []);

  const activeMembers = members.filter(m => m.status === 'active');
  const memberOptions = activeMembers
    .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()))
    .map(member => ({
      value: member.id,
      label: `${member.name} (#${member.jerseyNumber})`,
    }));

  const venueOptions = [
    { value: 'home', label: 'Home (Kiyinda Main Field)' },
    { value: 'away', label: 'Away' },
    { value: 'neutral', label: 'Neutral Venue' },
  ];

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
    if (!match.matchDetails) return 'Not played';
    return `${match.matchDetails.fc256Score || 0} - ${match.matchDetails.opponentScore || 0}`;
  };

  const calculateResult = (fc256Score: number, opponentScore: number): MatchResult => {
    if (fc256Score > opponentScore) return 'win';
    if (fc256Score < opponentScore) return 'loss';
    return 'draw';
  };

  const columns = [
    {
      key: 'date',
      title: 'Date',
      render: (match: Event) => (
        <div>
          <div className="font-medium text-gray-900 dark:text-white">
            {formatDate(match.date)}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {new Date(match.date) > new Date() ? 'Upcoming' : 'Completed'}
          </div>
        </div>
      ),
    },
    {
      key: 'opponent',
      title: 'Opponent',
      render: (match: Event) => (
        <div className="font-medium text-gray-900 dark:text-white">
          FC256 vs {match.opponent || 'TBD'}
        </div>
      ),
    },
    {
      key: 'time',
      title: 'Time',
      render: (match: Event) => (
        <div className="flex items-center">
          <Clock size={16} className="mr-2 text-gray-400" />
          {match.time}
        </div>
      ),
    },
    {
      key: 'location',
      title: 'Location',
      render: (match: Event) => (
        <div className="flex items-center">
          <MapPin size={16} className="mr-2 text-gray-400" />
          <span className="capitalize">
            {match.matchDetails?.venue === 'home' ? 'Home' : 
             match.matchDetails?.venue === 'away' ? 'Away' : 
             match.matchDetails?.venue === 'neutral' ? 'Neutral' : 
             match.location}
          </span>
        </div>
      ),
    },
    {
      key: 'result',
      title: 'Result',
      render: (match: Event) => (
        <div>
          {match.isCompleted && match.matchDetails ? (
            <div className="flex items-center space-x-2">
              <div className="font-bold text-lg text-gray-900 dark:text-white">
                {getScoreDisplay(match)}
              </div>
              {getResultBadge(match.matchDetails.result)}
            </div>
          ) : (
            <span className="text-gray-500 dark:text-gray-400">Not played</span>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (match: Event) => (
        <div className="flex space-x-1">
          {canRecordResults && !match.isCompleted && new Date(match.date) <= new Date() && (
            <Button
              size="sm"
              variant="success"
              onClick={(e) => {
                e.stopPropagation();
                handleRecordResult(match);
              }}
              className="p-1"
            >
              <CheckCircle size={14} />
            </Button>
          )}
          {canEditMatch && (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                handleEdit(match);
              }}
              className="p-1"
            >
              <Edit size={14} />
            </Button>
          )}
          {canDeleteMatch && (
            <Button
              size="sm"
              variant="danger"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteClick(match);
              }}
              className="p-1"
            >
              <Trash2 size={14} />
            </Button>
          )}
        </div>
      ),
    },
  ];

  const handleCreate = () => {
    setEditingMatch(null);
    reset({
      date: '',
      time: '',
      location: 'Kiyinda Main Field',
      opponent: '',
      description: '',
    });
    setIsModalOpen(true);
  };

  const handleEdit = (match: Event) => {
    setEditingMatch(match);
    setValue('date', match.date.split('T')[0]);
    setValue('time', match.time);
    setValue('location', match.location);
    setValue('opponent', match.opponent || '');
    setValue('description', match.description || '');
    setIsModalOpen(true);
  };

  const handleRecordResult = (match: Event) => {
    setSelectedMatch(match);
    setSelectedGoalScorers([]);
    setSelectedAssists([]);
    setSelectedYellowCards([]);
    setSelectedRedCards([]);
    resetResult({
      fc256Score: 0,
      opponentScore: 0,
      venue: 'home',
      fc256Players: 11,
      opponentPlayers: 11,
      goalScorers: [],
      assists: [],
      yellowCards: [],
      redCards: [],
      manOfTheMatch: '',
      matchReport: '',
      attendance: 0,
    });
    setIsResultModalOpen(true);
  };

  const handleDeleteClick = (match: Event) => {
    setMatchToDelete(match);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (matchToDelete) {
      try {
        await EventService.deleteEvent(matchToDelete.id);
        setIsDeleteModalOpen(false);
        setMatchToDelete(null);
      } catch (error) {
        console.error('Error deleting friendly match:', error);
      }
    }
  };

  const handleMemberSelect = (memberId: string, type: 'goalScorers' | 'assists' | 'yellowCards' | 'redCards') => {
    const currentList = type === 'goalScorers' ? selectedGoalScorers :
                       type === 'assists' ? selectedAssists :
                       type === 'yellowCards' ? selectedYellowCards :
                       selectedRedCards;

    if (!currentList.includes(memberId)) {
      const newList = [...currentList, memberId];
      
      if (type === 'goalScorers') {
        setSelectedGoalScorers(newList);
      } else if (type === 'assists') {
        setSelectedAssists(newList);
      } else if (type === 'yellowCards') {
        setSelectedYellowCards(newList);
      } else {
        setSelectedRedCards(newList);
      }
    }
  };

  const handleMemberRemove = (memberId: string, type: 'goalScorers' | 'assists' | 'yellowCards' | 'redCards') => {
    if (type === 'goalScorers') {
      setSelectedGoalScorers(prev => prev.filter(id => id !== memberId));
    } else if (type === 'assists') {
      setSelectedAssists(prev => prev.filter(id => id !== memberId));
    } else if (type === 'yellowCards') {
      setSelectedYellowCards(prev => prev.filter(id => id !== memberId));
    } else {
      setSelectedRedCards(prev => prev.filter(id => id !== memberId));
    }
  };

  const getMemberById = (memberId: string) => {
    return members.find(m => m.id === memberId);
  };

  const onSubmit = async (data: FriendlyFormData) => {
    try {
      setSubmitting(true);
      
      const matchData = {
        type: 'friendly' as const,
        date: new Date(data.date).toISOString(),
        time: data.time,
        location: data.location,
        opponent: data.opponent,
        description: data.description,
        createdBy: user?.id || '',
        isCompleted: false,
      };

      if (editingMatch) {
        await EventService.updateEvent(editingMatch.id, matchData);
      } else {
        await EventService.createEvent(matchData);
      }

      setIsModalOpen(false);
      reset();
    } catch (error) {
      console.error('Error saving friendly match:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const onSubmitResult = async (data: MatchResultFormData) => {
    if (!selectedMatch) return;

    try {
      setSubmitting(true);
      
      const result = calculateResult(data.fc256Score, data.opponentScore);
      
      const matchDetails: MatchDetails = {
        fc256Score: data.fc256Score,
        opponentScore: data.opponentScore,
        result,
        venue: data.venue,
        fc256Players: data.fc256Players,
        opponentPlayers: data.opponentPlayers,
        goalScorers: selectedGoalScorers,
        assists: selectedAssists,
        yellowCards: selectedYellowCards,
        redCards: selectedRedCards,
        manOfTheMatch: data.manOfTheMatch || undefined,
        matchReport: data.matchReport,
        attendance: data.attendance,
      };

      const updateData = {
        isCompleted: true,
        matchDetails,
      };

      await EventService.updateEvent(selectedMatch.id, updateData);
      
      setIsResultModalOpen(false);
      resetResult();
      setSelectedMatch(null);
      setSelectedGoalScorers([]);
      setSelectedAssists([]);
      setSelectedYellowCards([]);
      setSelectedRedCards([]);
    } catch (error) {
      console.error('Error recording match result:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      const exporter = new EventsPDFExporter();
      exporter.exportEvents(friendlyMatches, 'friendly');
    } catch (error) {
      console.error('Error exporting friendly matches:', error);
    } finally {
      setExporting(false);
    }
  };

  // Statistics
  const totalMatches = friendlyMatches.length;
  const completedMatches = friendlyMatches.filter(m => m.isCompleted).length;
  const upcomingMatches = friendlyMatches.filter(m => !m.isCompleted && new Date(m.date) > new Date()).length;
  const wins = friendlyMatches.filter(m => m.matchDetails?.result === 'win').length;
  const draws = friendlyMatches.filter(m => m.matchDetails?.result === 'draw').length;
  const losses = friendlyMatches.filter(m => m.matchDetails?.result === 'loss').length;

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
        title="Friendly Matches"
        description={`Schedule and manage friendly matches with detailed results tracking (${totalMatches} matches)`}
        actions={
          <div className="flex space-x-2">
            {canCreateMatch && (
              <Button 
                onClick={handleCreate} 
                leftIcon={<Plus size={18} />}
                className="bg-primary-600 hover:bg-primary-700 text-white"
              >
                Schedule Match
              </Button>
            )}
            {canExport && (
              <Button
                onClick={handleExport}
                leftIcon={<Download size={18} />}
                isLoading={exporting}
                variant="outline"
              >
                Export PDF
              </Button>
            )}
          </div>
        }
      />

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                Total Matches
              </p>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                {totalMatches}
              </p>
            </div>
            <Trophy className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
        </div>
        
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600 dark:text-green-400">
                Wins
              </p>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                {wins}
              </p>
            </div>
            <Target className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
        </div>
        
        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                Draws
              </p>
              <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">
                {draws}
              </p>
            </div>
            <Users className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
          </div>
        </div>
        
        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border border-red-200 dark:border-red-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-600 dark:text-red-400">
                Losses
              </p>
              <p className="text-2xl font-bold text-red-900 dark:text-red-100">
                {losses}
              </p>
            </div>
            <Calendar className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
        </div>
        
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600 dark:text-purple-400">
                Win Rate
              </p>
              <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                {completedMatches > 0 ? Math.round((wins / completedMatches) * 100) : 0}%
              </p>
            </div>
            <Trophy className="h-8 w-8 text-purple-600 dark:text-purple-400" />
          </div>
        </div>
      </div>

      <Card>
        {friendlyMatches.length > 0 ? (
          <Table
            data={friendlyMatches}
            columns={columns}
            onRowClick={(match) => {
              if (!match.isCompleted && new Date(match.date) <= new Date()) {
                handleRecordResult(match);
              }
            }}
          />
        ) : (
          <EmptyState
            title="No friendly matches scheduled"
            description="There are no friendly matches scheduled at the moment."
            icon={<Trophy size={24} />}
            action={
              canCreateMatch
                ? {
                    label: 'Schedule Match',
                    onClick: handleCreate,
                  }
                : undefined
            }
          />
        )}
      </Card>

      {/* Create/Edit Match Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingMatch ? 'Edit Friendly Match' : 'Schedule Friendly Match'}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Match Date"
              type="date"
              error={errors.date?.message}
              required
              {...register('date', { required: 'Date is required' })}
            />

            <Input
              label="Kick-off Time"
              type="time"
              error={errors.time?.message}
              required
              {...register('time', { required: 'Time is required' })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Opponent Team"
              placeholder="e.g., FC Victory, United FC"
              error={errors.opponent?.message}
              required
              {...register('opponent', { required: 'Opponent is required' })}
            />

            <Input
              label="Venue/Location"
              placeholder="e.g., Kiyinda Main Field, Away Ground"
              error={errors.location?.message}
              required
              {...register('location', { required: 'Location is required' })}
            />
          </div>

          <Input
            label="Match Description (Optional)"
            placeholder="Pre-season friendly, tournament match, etc."
            error={errors.description?.message}
            {...register('description')}
          />

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-center">
              <Trophy size={20} className="text-blue-600 dark:text-blue-400 mr-2" />
              <div>
                <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Match Scheduling
                </h4>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  After the match is played, you can record the detailed results including scores, goal scorers, and match statistics.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              isLoading={submitting}
              className="bg-primary-600 hover:bg-primary-700 text-white"
            >
              {editingMatch ? 'Update Match' : 'Schedule Match'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Record Match Result Modal */}
      <Modal
        isOpen={isResultModalOpen}
        onClose={() => setIsResultModalOpen(false)}
        title="Record Match Result"
        size="2xl"
      >
        {selectedMatch && (
          <form onSubmit={handleSubmitResult(onSubmitResult)} className="space-y-6">
            <div className="bg-gray-50 dark:bg-neutral-700/30 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                FC256 vs {selectedMatch.opponent}
              </h4>
              <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <p><strong>Date:</strong> {formatDate(selectedMatch.date)}</p>
                <p><strong>Time:</strong> {selectedMatch.time}</p>
                <p><strong>Location:</strong> {selectedMatch.location}</p>
              </div>
            </div>

            {/* Score Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Input
                label="FC256 Score"
                type="number"
                min="0"
                placeholder="0"
                error={errorsResult.fc256Score?.message}
                required
                {...registerResult('fc256Score', { 
                  required: 'FC256 score is required',
                  min: { value: 0, message: 'Score cannot be negative' },
                  valueAsNumber: true
                })}
              />

              <Input
                label="Opponent Score"
                type="number"
                min="0"
                placeholder="0"
                error={errorsResult.opponentScore?.message}
                required
                {...registerResult('opponentScore', { 
                  required: 'Opponent score is required',
                  min: { value: 0, message: 'Score cannot be negative' },
                  valueAsNumber: true
                })}
              />

              <Select
                label="Venue"
                options={venueOptions}
                placeholder="Select venue"
                error={errorsResult.venue?.message}
                required
                {...registerResult('venue', { required: 'Venue is required' })}
              />
            </div>

            {/* Result Preview */}
            {(watchFC256Score !== undefined && watchOpponentScore !== undefined) && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-blue-900 dark:text-blue-100">
                    Match Result Preview
                  </h4>
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                      FC256 {watchFC256Score} - {watchOpponentScore} {selectedMatch.opponent}
                    </span>
                    {getResultBadge(calculateResult(watchFC256Score, watchOpponentScore))}
                  </div>
                </div>
              </div>
            )}

            {/* Team Composition */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="FC256 Players"
                type="number"
                min="1"
                max="15"
                placeholder="11"
                error={errorsResult.fc256Players?.message}
                helperText="Number of players FC256 fielded"
                {...registerResult('fc256Players', { 
                  min: { value: 1, message: 'Must have at least 1 player' },
                  max: { value: 15, message: 'Cannot exceed 15 players' },
                  valueAsNumber: true
                })}
              />

              <Input
                label="Opponent Players"
                type="number"
                min="1"
                max="15"
                placeholder="11"
                error={errorsResult.opponentPlayers?.message}
                helperText="Number of players opponent fielded"
                {...registerResult('opponentPlayers', { 
                  min: { value: 1, message: 'Must have at least 1 player' },
                  max: { value: 15, message: 'Cannot exceed 15 players' },
                  valueAsNumber: true
                })}
              />
            </div>

            {/* Player Statistics */}
            <div className="space-y-6">
              {/* Goal Scorers */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Goal Scorers
                </label>
                {selectedGoalScorers.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {selectedGoalScorers.map(memberId => {
                      const member = getMemberById(memberId);
                      return member ? (
                        <div
                          key={memberId}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                        >
                          ⚽ {member.name} (#{member.jerseyNumber})
                          <button
                            type="button"
                            onClick={() => handleMemberRemove(memberId, 'goalScorers')}
                            className="ml-2 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-200"
                          >
                            ×
                          </button>
                        </div>
                      ) : null;
                    })}
                  </div>
                )}
                <select
                  className="block w-full rounded-lg shadow-sm border transition-colors duration-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-sm border-gray-300 dark:border-gray-600 dark:bg-neutral-700 dark:text-white hover:border-gray-400 dark:hover:border-gray-500 px-3 py-2.5"
                  onChange={(e) => {
                    if (e.target.value) {
                      handleMemberSelect(e.target.value, 'goalScorers');
                      e.target.value = '';
                    }
                  }}
                  defaultValue=""
                >
                  <option value="">Select goal scorer...</option>
                  {memberOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Assists */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Assists
                </label>
                {selectedAssists.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {selectedAssists.map(memberId => {
                      const member = getMemberById(memberId);
                      return member ? (
                        <div
                          key={memberId}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                        >
                          🎯 {member.name} (#{member.jerseyNumber})
                          <button
                            type="button"
                            onClick={() => handleMemberRemove(memberId, 'assists')}
                            className="ml-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
                          >
                            ×
                          </button>
                        </div>
                      ) : null;
                    })}
                  </div>
                )}
                <select
                  className="block w-full rounded-lg shadow-sm border transition-colors duration-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-sm border-gray-300 dark:border-gray-600 dark:bg-neutral-700 dark:text-white hover:border-gray-400 dark:hover:border-gray-500 px-3 py-2.5"
                  onChange={(e) => {
                    if (e.target.value) {
                      handleMemberSelect(e.target.value, 'assists');
                      e.target.value = '';
                    }
                  }}
                  defaultValue=""
                >
                  <option value="">Select assist provider...</option>
                  {memberOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Yellow Cards
                  </label>
                  {selectedYellowCards.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-2">
                      {selectedYellowCards.map(memberId => {
                        const member = getMemberById(memberId);
                        return member ? (
                          <div
                            key={memberId}
                            className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
                          >
                            🟨 {member.name} (#{member.jerseyNumber})
                            <button
                              type="button"
                              onClick={() => handleMemberRemove(memberId, 'yellowCards')}
                              className="ml-2 text-yellow-600 hover:text-yellow-800 dark:text-yellow-400 dark:hover:text-yellow-200"
                            >
                              ×
                            </button>
                          </div>
                        ) : null;
                      })}
                    </div>
                  )}
                  <select
                    className="block w-full rounded-lg shadow-sm border transition-colors duration-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-sm border-gray-300 dark:border-gray-600 dark:bg-neutral-700 dark:text-white hover:border-gray-400 dark:hover:border-gray-500 px-3 py-2.5"
                    onChange={(e) => {
                      if (e.target.value) {
                        handleMemberSelect(e.target.value, 'yellowCards');
                        e.target.value = '';
                      }
                    }}
                    defaultValue=""
                  >
                    <option value="">Select player with yellow card...</option>
                    {memberOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Red Cards
                  </label>
                  {selectedRedCards.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-2">
                      {selectedRedCards.map(memberId => {
                        const member = getMemberById(memberId);
                        return member ? (
                          <div
                            key={memberId}
                            className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                          >
                            🟥 {member.name} (#{member.jerseyNumber})
                            <button
                              type="button"
                              onClick={() => handleMemberRemove(memberId, 'redCards')}
                              className="ml-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200"
                            >
                              ×
                            </button>
                          </div>
                        ) : null;
                      })}
                    </div>
                  )}
                  <select
                    className="block w-full rounded-lg shadow-sm border transition-colors duration-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-sm border-gray-300 dark:border-gray-600 dark:bg-neutral-700 dark:text-white hover:border-gray-400 dark:hover:border-gray-500 px-3 py-2.5"
                    onChange={(e) => {
                      if (e.target.value) {
                        handleMemberSelect(e.target.value, 'redCards');
                        e.target.value = '';
                      }
                    }}
                    defaultValue=""
                  >
                    <option value="">Select player with red card...</option>
                    {memberOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Man of the Match */}
              <Select
                label="Man of the Match (Optional)"
                options={[{ value: '', label: 'Select player...' }, ...memberOptions]}
                placeholder="Choose man of the match"
                error={errorsResult.manOfTheMatch?.message}
                {...registerResult('manOfTheMatch')}
              />

              {/* Additional Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Spectator Attendance (Optional)"
                  type="number"
                  min="0"
                  placeholder="0"
                  error={errorsResult.attendance?.message}
                  helperText="Estimated number of spectators"
                  {...registerResult('attendance', { 
                    min: { value: 0, message: 'Attendance cannot be negative' },
                    valueAsNumber: true
                  })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Match Report (Optional)
                </label>
                <textarea
                  className="block w-full rounded-lg shadow-sm border transition-colors duration-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-sm border-gray-300 dark:border-gray-600 dark:bg-neutral-700 dark:text-white hover:border-gray-400 dark:hover:border-gray-500 px-3 py-2.5"
                  rows={4}
                  placeholder="Detailed match analysis, key moments, player performances..."
                  {...registerResult('matchReport')}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsResultModalOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                isLoading={submitting}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Record Result
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Friendly Match"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-300">
            Are you sure you want to delete this friendly match? This action cannot be undone.
          </p>
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              variant="outline"
              onClick={() => setIsDeleteModalOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              Delete Match
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Friendlies;
import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Edit, Trash2, MapPin, Clock, Download, Trophy, Target, Users, TrendingUp, Eye, Award } from 'lucide-react';
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
  description: string;
}

interface MatchResultFormData {
  fc256Score: number;
  opponentScore: number;
  venue: 'home' | 'away' | 'neutral';
  fc256Players: number;
  opponentPlayers: number;
  goalScorers: string[];
  assists: string[];
  yellowCards: string[];
  redCards: string[];
  manOfTheMatch: string;
  matchReport: string;
  attendance: number;
}

const Friendlies: React.FC = () => {
  const { user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [friendlies, setFriendlies] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [isViewResultModalOpen, setIsViewResultModalOpen] = useState(false);
  const [editingFriendly, setEditingFriendly] = useState<Event | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<Event | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [friendlyToDelete, setFriendlyToDelete] = useState<Event | null>(null);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'completed' | 'all'>('all');

  const canCreateFriendly = user && canUserAccess(user.role, Permissions.CREATE_EVENT);
  const canEditFriendly = user && canUserAccess(user.role, Permissions.EDIT_EVENT);
  const canDeleteFriendly = user && canUserAccess(user.role, Permissions.DELETE_EVENT);
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
  const watchVenue = watchResult('venue');

  // Load friendlies and members from Firestore
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [eventsData, membersData] = await Promise.all([
          EventService.getEventsByType('friendly'),
          MemberService.getAllMembers(),
        ]);
        setFriendlies(eventsData);
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
        .sort((a, b) => {
          const dateA = new Date(a.date);
          const dateB = new Date(b.date);
          return dateB.getTime() - dateA.getTime(); // Latest first
        });
      setFriendlies(friendlyEvents);
      setLoading(false);
    });

    const unsubscribeMembers = MemberService.subscribeToMembers(setMembers);

    return () => {
      unsubscribeEvents();
      unsubscribeMembers();
    };
  }, []);

  // Filter friendlies based on active tab
  const filteredFriendlies = friendlies.filter(friendly => {
    const matchDate = new Date(friendly.date);
    const now = new Date();
    
    switch (activeTab) {
      case 'upcoming':
        return matchDate > now;
      case 'completed':
        return matchDate <= now;
      default:
        return true;
    }
  });

  // Calculate statistics
  const completedMatches = friendlies.filter(f => f.isCompleted && f.matchDetails);
  const wins = completedMatches.filter(f => f.matchDetails?.result === 'win').length;
  const draws = completedMatches.filter(f => f.matchDetails?.result === 'draw').length;
  const losses = completedMatches.filter(f => f.matchDetails?.result === 'loss').length;
  const upcomingMatches = friendlies.filter(f => new Date(f.date) > new Date()).length;

  const getResultBadge = (result: MatchResult) => {
    switch (result) {
      case 'win':
        return <Badge variant="success">Win</Badge>;
      case 'draw':
        return <Badge variant="warning">Draw</Badge>;
      case 'loss':
        return <Badge variant="danger">Loss</Badge>;
      default:
        return null;
    }
  };

  const getScoreDisplay = (matchDetails: MatchDetails) => {
    // Always show FC256 score first, then opponent score
    return `${matchDetails.fc256Score || 0} - ${matchDetails.opponentScore || 0}`;
  };

  const memberOptions = members
    .filter(m => m.status === 'active')
    .map(member => ({
      value: member.id,
      label: `${member.name} (#${member.jerseyNumber})`,
    }));

  const venueOptions = [
    { value: 'home', label: 'Home (Kiyinda Main Field)' },
    { value: 'away', label: 'Away' },
    { value: 'neutral', label: 'Neutral Venue' },
  ];

  const columns = [
    {
      key: 'date',
      title: 'Date',
      render: (friendly: Event) => (
        <div>
          <div className="font-medium text-gray-900 dark:text-white">
            {formatDate(friendly.date)}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {new Date(friendly.date) > new Date() ? 'Upcoming' : 'Completed'}
          </div>
        </div>
      ),
    },
    {
      key: 'time',
      title: 'Time',
      render: (friendly: Event) => (
        <div className="flex items-center">
          <Clock size={16} className="mr-2 text-gray-400" />
          {friendly.time}
        </div>
      ),
    },
    {
      key: 'opponent',
      title: 'Opponent',
      render: (friendly: Event) => (
        <span className="font-medium">{friendly.opponent}</span>
      ),
    },
    {
      key: 'location',
      title: 'Location',
      render: (friendly: Event) => (
        <div className="flex items-center">
          <MapPin size={16} className="mr-2 text-gray-400" />
          {friendly.location}
        </div>
      ),
    },
    {
      key: 'result',
      title: 'Result',
      render: (friendly: Event) => {
        if (!friendly.isCompleted || !friendly.matchDetails) {
          return <Badge variant="info">Not Played</Badge>;
        }
        
        return (
          <div className="flex flex-col space-y-1">
            {getResultBadge(friendly.matchDetails.result)}
            <span className="text-sm font-mono">
              FC256 {getScoreDisplay(friendly.matchDetails)} {friendly.opponent}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
              {friendly.matchDetails.venue} • {friendly.matchDetails.fc256Players || 11}v{friendly.matchDetails.opponentPlayers || 11}
            </span>
          </div>
        );
      },
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (friendly: Event) => (
        <div className="flex space-x-1">
          {friendly.isCompleted && friendly.matchDetails && (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                handleViewResult(friendly);
              }}
              className="p-1"
            >
              <Eye size={14} />
            </Button>
          )}
          {new Date(friendly.date) <= new Date() && !friendly.isCompleted && canEditFriendly && (
          {(() => {
            // Create proper datetime by combining date and time
            const eventDateTime = new Date(friendly.date);
            if (friendly.time) {
              const [hours, minutes] = friendly.time.split(':').map(Number);
              eventDateTime.setHours(hours, minutes, 0, 0);
            } else {
              // If no time specified, assume it's at end of day
              eventDateTime.setHours(23, 59, 59, 999);
            }
            
            // Only show "Add Result" button if the match time has passed
            return eventDateTime <= new Date() && !friendly.isCompleted && canEditFriendly;
          })() && (
            <Button
              size="sm"
              variant="success"
              onClick={(e) => {
                e.stopPropagation();
                handleAddResult(friendly);
              }}
              className="p-1"
            >
              <Trophy size={14} />
            </Button>
          )}
          {canEditFriendly && (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                handleEdit(friendly);
              }}
              className="p-1"
            >
              <Edit size={14} />
            </Button>
          )}
          {canDeleteFriendly && (
            <Button
              size="sm"
              variant="danger"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteClick(friendly);
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
    setEditingFriendly(null);
    reset({
      date: '',
      time: '',
      location: '',
      opponent: '',
      description: '',
    });
    setIsModalOpen(true);
  };

  const handleEdit = (friendly: Event) => {
    setEditingFriendly(friendly);
    setValue('date', friendly.date.split('T')[0]);
    setValue('time', friendly.time);
    setValue('location', friendly.location);
    setValue('opponent', friendly.opponent || '');
    setValue('description', friendly.description || '');
    setIsModalOpen(true);
  };

  const handleAddResult = (friendly: Event) => {
    setSelectedMatch(friendly);
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

  const handleViewResult = (friendly: Event) => {
    setSelectedMatch(friendly);
    setIsViewResultModalOpen(true);
  };

  const handleDeleteClick = (friendly: Event) => {
    setFriendlyToDelete(friendly);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (friendlyToDelete) {
      try {
        await EventService.deleteEvent(friendlyToDelete.id);
        setIsDeleteModalOpen(false);
        setFriendlyToDelete(null);
      } catch (error) {
        console.error('Error deleting friendly:', error);
      }
    }
  };

  const onSubmit = async (data: FriendlyFormData) => {
    try {
      setSubmitting(true);
      
      const friendlyData = {
        type: 'friendly' as const,
        date: new Date(data.date).toISOString(),
        time: data.time,
        location: data.location,
        opponent: data.opponent,
        description: data.description,
        createdBy: user?.id || '',
        isCompleted: false,
      };

      if (editingFriendly) {
        await EventService.updateEvent(editingFriendly.id, friendlyData);
      } else {
        await EventService.createEvent(friendlyData);
      }

      setIsModalOpen(false);
      reset();
    } catch (error) {
      console.error('Error saving friendly:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const onSubmitResult = async (data: MatchResultFormData) => {
    if (!selectedMatch) return;

    try {
      setSubmitting(true);

      // Determine result based on FC256 vs opponent scores
      let result: MatchResult;
      if (data.fc256Score > data.opponentScore) {
        result = 'win';
      } else if (data.fc256Score < data.opponentScore) {
        result = 'loss';
      } else {
        result = 'draw';
      }

      const matchDetails: MatchDetails = {
        // Store the actual scores as entered by user
        fc256Score: data.fc256Score,
        opponentScore: data.opponentScore,
        result,
        venue: data.venue,
        fc256Players: data.fc256Players,
        opponentPlayers: data.opponentPlayers,
        goalScorers: data.goalScorers.filter(id => id !== ''),
        assists: data.assists.filter(id => id !== ''),
        yellowCards: data.yellowCards.filter(id => id !== ''),
        redCards: data.redCards.filter(id => id !== ''),
        manOfTheMatch: data.manOfTheMatch || null,
        matchReport: data.matchReport || null,
        attendance: data.attendance || null,
        // Legacy fields for backward compatibility
        homeScore: data.venue === 'home' ? data.fc256Score : data.opponentScore,
        awayScore: data.venue === 'home' ? data.opponentScore : data.fc256Score,
      };

      const updatedEvent = {
        ...selectedMatch,
        isCompleted: true,
        matchDetails,
      };

      await EventService.updateEvent(selectedMatch.id, updatedEvent);
      setIsResultModalOpen(false);
      resetResult();
      setSelectedMatch(null);
    } catch (error) {
      console.error('Error saving match result:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      const exporter = new EventsPDFExporter();
      exporter.exportEvents(friendlies, 'friendly');
    } catch (error) {
      console.error('Error exporting friendlies:', error);
    } finally {
      setExporting(false);
    }
  };

  const getMemberName = (memberId: string) => {
    const member = members.find(m => m.id === memberId);
    return member ? `${member.name} (#${member.jerseyNumber})` : 'Unknown Player';
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
        title="Friendly Matches"
        description={`Schedule and track friendly match results (${friendlies.length} matches)`}
        actions={
          <div className="flex space-x-2">
            {canCreateFriendly && (
              <Button 
                onClick={handleCreate} 
                leftIcon={<Plus size={18} />}
                className="bg-primary-600 hover:bg-primary-700 text-white"
              >
                Add Friendly Match
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
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
            <Trophy className="h-8 w-8 text-green-600 dark:text-green-400" />
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
            <Target className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
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
            <TrendingUp className="h-8 w-8 text-red-600 dark:text-red-400 rotate-180" />
          </div>
        </div>
        
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                Upcoming
              </p>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                {upcomingMatches}
              </p>
            </div>
            <Calendar className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8">
            {[
              { key: 'all', label: 'All Matches', count: friendlies.length },
              { key: 'upcoming', label: 'Upcoming', count: upcomingMatches },
              { key: 'completed', label: 'Completed', count: completedMatches.length },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.key
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </nav>
        </div>
      </div>

      <Card>
        {filteredFriendlies.length > 0 ? (
          <Table
            data={filteredFriendlies}
            columns={columns}
            onRowClick={(friendly) => {
              if (friendly.isCompleted && friendly.matchDetails) {
                handleViewResult(friendly);
              }
            }}
          />
        ) : (
          <EmptyState
            title="No friendly matches found"
            description={
              activeTab === 'all' 
                ? "There are no friendly matches scheduled at the moment."
                : `No ${activeTab} friendly matches found.`
            }
            icon={<Calendar size={24} />}
            action={
              canCreateFriendly && activeTab !== 'completed'
                ? {
                    label: 'Add Friendly Match',
                    onClick: handleCreate,
                  }
                : undefined
            }
          />
        )}
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingFriendly ? 'Edit Friendly Match' : 'Add Friendly Match'}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Date"
              type="date"
              error={errors.date?.message}
              required
              {...register('date', { required: 'Date is required' })}
            />

            <Input
              label="Time"
              type="time"
              error={errors.time?.message}
              required
              {...register('time', { required: 'Time is required' })}
            />
          </div>

          <Input
            label="Opponent Team"
            placeholder="e.g., FC Victory, Lions United"
            error={errors.opponent?.message}
            required
            {...register('opponent', { required: 'Opponent is required' })}
          />

          <Input
            label="Match Location"
            placeholder="e.g., Kiyinda Main Field, Victory Park, Central Stadium"
            error={errors.location?.message}
            helperText="Enter the venue where the match will be played"
            required
            {...register('location', { required: 'Location is required' })}
          />

          <Input
            label="Description"
            placeholder="Match purpose, preparation notes, special arrangements..."
            error={errors.description?.message}
            helperText="Optional: Add details about the friendly match"
            {...register('description')}
          />

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
              {editingFriendly ? 'Update Match' : 'Add Match'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Result Modal */}
      <Modal
        isOpen={isResultModalOpen}
        onClose={() => setIsResultModalOpen(false)}
        title="Add Match Result"
        size="2xl"
      >
        {selectedMatch && (
          <form onSubmit={handleSubmitResult(onSubmitResult)} className="space-y-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                FC256 vs {selectedMatch.opponent}
              </h4>
              <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                <p><strong>Date:</strong> {formatDate(selectedMatch.date)}</p>
                <p><strong>Time:</strong> {selectedMatch.time}</p>
                <p><strong>Location:</strong> {selectedMatch.location}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Select
                label="Venue"
                options={venueOptions}
                error={errorsResult.venue?.message}
                required
                {...registerResult('venue', { required: 'Venue is required' })}
              />

              <Input
                label="FC256 Score"
                type="number"
                min="0"
                error={errorsResult.fc256Score?.message}
                required
                {...registerResult('fc256Score', { 
                  required: 'FC256 score is required',
                  min: { value: 0, message: 'Score cannot be negative' },
                  valueAsNumber: true
                })}
              />

              <Input
                label={`${selectedMatch.opponent} Score`}
                type="number"
                min="0"
                error={errorsResult.opponentScore?.message}
                required
                {...registerResult('opponentScore', { 
                  required: 'Opponent score is required',
                  min: { value: 0, message: 'Score cannot be negative' },
                  valueAsNumber: true
                })}
              />
            </div>

            {/* Team Composition */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="FC256 Players"
                type="number"
                min="1"
                max="15"
                error={errorsResult.fc256Players?.message}
                helperText="Number of players FC256 fielded"
                required
                {...registerResult('fc256Players', { 
                  required: 'Number of FC256 players is required',
                  min: { value: 1, message: 'Must have at least 1 player' },
                  max: { value: 15, message: 'Cannot exceed 15 players' },
                  valueAsNumber: true
                })}
              />

              <Input
                label={`${selectedMatch.opponent} Players`}
                type="number"
                min="1"
                max="15"
                error={errorsResult.opponentPlayers?.message}
                helperText="Number of players opponent fielded"
                required
                {...registerResult('opponentPlayers', { 
                  required: 'Number of opponent players is required',
                  min: { value: 1, message: 'Must have at least 1 player' },
                  max: { value: 15, message: 'Cannot exceed 15 players' },
                  valueAsNumber: true
                })}
              />
            </div>

            {/* Result Preview */}
            {(watchFC256Score !== undefined && watchOpponentScore !== undefined) && (
              <div className="bg-gray-50 dark:bg-neutral-700/30 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Match Result Preview</h4>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    FC256 {watchFC256Score} - {watchOpponentScore} {selectedMatch.opponent}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {watchResult('fc256Players') || 11}v{watchResult('opponentPlayers') || 11} • {watchVenue || 'home'}
                  </div>
                  <div className="mt-2">
                    {(() => {
                      if (watchFC256Score > watchOpponentScore) {
                        return <Badge variant="success" size="lg">Victory!</Badge>;
                      } else if (watchFC256Score < watchOpponentScore) {
                        return <Badge variant="danger" size="lg">Defeat</Badge>;
                      } else {
                        return <Badge variant="warning" size="lg">Draw</Badge>;
                      }
                    })()}
                  </div>
                </div>
              </div>
            )}

            {/* Player Statistics */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900 dark:text-white">Player Statistics (Optional)</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Goal Scorers
                  </label>
                  <div className="space-y-2">
                    {[0, 1, 2, 3, 4].map((index) => (
                      <Select
                        key={`goalScorer-${index}`}
                        options={[
                          { value: '', label: 'Select player...' },
                          ...memberOptions
                        ]}
                        {...registerResult(`goalScorers.${index}` as any)}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Assists
                  </label>
                  <div className="space-y-2">
                    {[0, 1, 2, 3, 4].map((index) => (
                      <Select
                        key={`assist-${index}`}
                        options={[
                          { value: '', label: 'Select player...' },
                          ...memberOptions
                        ]}
                        {...registerResult(`assists.${index}` as any)}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Select
                  label="Man of the Match"
                  options={[
                    { value: '', label: 'Select player...' },
                    ...memberOptions
                  ]}
                  {...registerResult('manOfTheMatch')}
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Yellow Cards
                  </label>
                  <div className="space-y-2">
                    {[0, 1, 2].map((index) => (
                      <Select
                        key={`yellowCard-${index}`}
                        options={[
                          { value: '', label: 'Select player...' },
                          ...memberOptions
                        ]}
                        {...registerResult(`yellowCards.${index}` as any)}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Red Cards
                  </label>
                  <div className="space-y-2">
                    {[0, 1].map((index) => (
                      <Select
                        key={`redCard-${index}`}
                        options={[
                          { value: '', label: 'Select player...' },
                          ...memberOptions
                        ]}
                        {...registerResult(`redCards.${index}` as any)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Attendance (Optional)"
                type="number"
                min="0"
                placeholder="Number of spectators"
                {...registerResult('attendance', { valueAsNumber: true })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Match Report (Optional)
              </label>
              <textarea
                rows={4}
                className="block w-full rounded-lg shadow-sm border transition-colors duration-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-sm border-gray-300 dark:border-gray-600 dark:bg-neutral-700 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 hover:border-gray-400 dark:hover:border-gray-500 px-3 py-2.5"
                placeholder="Describe the match performance, key moments, tactical notes..."
                {...registerResult('matchReport')}
              />
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
                Save Result
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* View Result Modal */}
      <Modal
        isOpen={isViewResultModalOpen}
        onClose={() => setIsViewResultModalOpen(false)}
        title="Match Result Details"
        size="2xl"
      >
        {selectedMatch && selectedMatch.matchDetails && (
          <div className="space-y-6">
            {/* Match Header */}
            <div className="bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  FC256 {getScoreDisplay(selectedMatch.matchDetails)} {selectedMatch.opponent}
                </h3>
                <div className="flex justify-center mb-4">
                  {getResultBadge(selectedMatch.matchDetails.result)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <p><strong>Date:</strong> {formatDate(selectedMatch.date)}</p>
                  <p><strong>Venue:</strong> {selectedMatch.matchDetails.venue === 'home' ? 'Home (Kiyinda Main Field)' : selectedMatch.matchDetails.venue === 'away' ? 'Away' : 'Neutral'}</p>
                  <p><strong>Team Composition:</strong> {selectedMatch.matchDetails.fc256Players || 11}v{selectedMatch.matchDetails.opponentPlayers || 11}</p>
                  {selectedMatch.matchDetails.attendance && (
                    <p><strong>Attendance:</strong> {selectedMatch.matchDetails.attendance} spectators</p>
                  )}
                </div>
              </div>
            </div>

            {/* Player Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Goal Scorers */}
              {selectedMatch.matchDetails.goalScorers && selectedMatch.matchDetails.goalScorers.length > 0 && (
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                  <h4 className="font-medium text-green-900 dark:text-green-100 mb-3 flex items-center">
                    <Trophy size={18} className="mr-2" />
                    Goal Scorers
                  </h4>
                  <div className="space-y-2">
                    {selectedMatch.matchDetails.goalScorers.map((scorerId, index) => (
                      <div key={index} className="text-sm text-green-700 dark:text-green-300">
                        ⚽ {getMemberName(scorerId)}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Assists */}
              {selectedMatch.matchDetails.assists && selectedMatch.matchDetails.assists.length > 0 && (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-3 flex items-center">
                    <Target size={18} className="mr-2" />
                    Assists
                  </h4>
                  <div className="space-y-2">
                    {selectedMatch.matchDetails.assists.map((assistId, index) => (
                      <div key={index} className="text-sm text-blue-700 dark:text-blue-300">
                        🎯 {getMemberName(assistId)}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Man of the Match */}
              {selectedMatch.matchDetails.manOfTheMatch && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
                  <h4 className="font-medium text-yellow-900 dark:text-yellow-100 mb-3 flex items-center">
                    <Award size={18} className="mr-2" />
                    Man of the Match
                  </h4>
                  <div className="text-sm text-yellow-700 dark:text-yellow-300">
                    🏆 {getMemberName(selectedMatch.matchDetails.manOfTheMatch)}
                  </div>
                </div>
              )}

              {/* Cards */}
              {((selectedMatch.matchDetails.yellowCards && selectedMatch.matchDetails.yellowCards.length > 0) ||
                (selectedMatch.matchDetails.redCards && selectedMatch.matchDetails.redCards.length > 0)) && (
                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                  <h4 className="font-medium text-red-900 dark:text-red-100 mb-3">
                    Disciplinary Actions
                  </h4>
                  <div className="space-y-2">
                    {selectedMatch.matchDetails.yellowCards?.map((cardId, index) => (
                      <div key={index} className="text-sm text-yellow-700 dark:text-yellow-300">
                        🟨 {getMemberName(cardId)}
                      </div>
                    ))}
                    {selectedMatch.matchDetails.redCards?.map((cardId, index) => (
                      <div key={index} className="text-sm text-red-700 dark:text-red-300">
                        🟥 {getMemberName(cardId)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Match Report */}
            {selectedMatch.matchDetails.matchReport && (
              <div className="bg-gray-50 dark:bg-neutral-700/30 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                  Match Report
                </h4>
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {selectedMatch.matchDetails.matchReport}
                </p>
              </div>
            )}

            <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="outline"
                onClick={() => setIsViewResultModalOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
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
import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Edit, Trash2, MapPin, Clock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { EventService } from '../../services/firestore';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Table from '../../components/ui/Table';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import EmptyState from '../../components/common/EmptyState';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { Event } from '../../types';
import { formatDate } from '../../utils/date-utils';
import { canUserAccess, Permissions } from '../../utils/permissions';
import { useForm } from 'react-hook-form';

interface FriendlyFormData {
  date: string;
  time: string;
  location: string;
  opponent: string;
  description: string;
}

const Friendlies: React.FC = () => {
  const { user } = useAuth();
  const [friendlies, setFriendlies] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFriendly, setEditingFriendly] = useState<Event | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [friendlyToDelete, setFriendlyToDelete] = useState<Event | null>(null);

  const canCreateFriendly = user && canUserAccess(user.role, Permissions.CREATE_EVENT);
  const canEditFriendly = user && canUserAccess(user.role, Permissions.EDIT_EVENT);
  const canDeleteFriendly = user && canUserAccess(user.role, Permissions.DELETE_EVENT);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FriendlyFormData>();

  // Load friendlies from Firestore
  useEffect(() => {
    const loadFriendlies = async () => {
      try {
        setLoading(true);
        const events = await EventService.getEventsByType('friendly');
        setFriendlies(events);
      } catch (error) {
        console.error('Error loading friendlies:', error);
      } finally {
        setLoading(false);
      }
    };

    loadFriendlies();

    // Set up real-time listener for friendly events
    const unsubscribe = EventService.subscribeToEvents((events) => {
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

    return () => unsubscribe();
  }, []);

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
            {new Date(friendly.date) > new Date() ? 'Upcoming' : 'Past'}
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
      key: 'description',
      title: 'Description',
      render: (friendly: Event) => friendly.description || 'No description',
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (friendly: Event) => (
        <div className="flex space-x-2">
          {canEditFriendly && (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                handleEdit(friendly);
              }}
            >
              <Edit size={16} />
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
            >
              <Trash2 size={16} />
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
        description={`Schedule and manage friendly matches (${friendlies.length} matches)`}
        actions={
          canCreateFriendly && (
            <Button 
              onClick={handleCreate} 
              leftIcon={<Plus size={18} />}
              className="bg-primary-600 hover:bg-primary-700 text-white"
            >
              Add Friendly Match
            </Button>
          )
        }
      />

      <Card>
        {friendlies.length > 0 ? (
          <Table
            data={friendlies}
            columns={columns}
            onRowClick={(friendly) => console.log('Clicked friendly:', friendly)}
          />
        ) : (
          <EmptyState
            title="No friendly matches scheduled"
            description="There are no friendly matches scheduled at the moment."
            icon={<Calendar size={24} />}
            action={
              canCreateFriendly
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
            placeholder="e.g., Victory Park, Central Stadium, Away Ground"
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
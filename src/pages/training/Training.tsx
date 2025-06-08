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

interface TrainingFormData {
  date: string;
  time: string;
  location: string;
  description: string;
}

const Training: React.FC = () => {
  const { user } = useAuth();
  const [trainingSessions, setTrainingSessions] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<Event | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<Event | null>(null);

  const canCreateTraining = user && canUserAccess(user.role, Permissions.CREATE_EVENT);
  const canEditTraining = user && canUserAccess(user.role, Permissions.EDIT_EVENT);
  const canDeleteTraining = user && canUserAccess(user.role, Permissions.DELETE_EVENT);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<TrainingFormData>();

  // Load training sessions from Firestore
  useEffect(() => {
    const loadTrainingSessions = async () => {
      try {
        setLoading(true);
        const events = await EventService.getEventsByType('training');
        setTrainingSessions(events);
      } catch (error) {
        console.error('Error loading training sessions:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTrainingSessions();

    // Set up real-time listener for training events
    const unsubscribe = EventService.subscribeToEvents((events) => {
      const trainingEvents = events
        .filter(event => event.type === 'training')
        .sort((a, b) => {
          const dateA = new Date(a.date);
          const dateB = new Date(b.date);
          return dateA.getTime() - dateB.getTime(); // Past to present (earliest first)
        });
      setTrainingSessions(trainingEvents);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const columns = [
    {
      key: 'date',
      title: 'Date',
      render: (session: Event) => (
        <div>
          <div className="font-medium text-gray-900 dark:text-white">
            {formatDate(session.date)}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {new Date(session.date) > new Date() ? 'Upcoming' : 'Past'}
          </div>
        </div>
      ),
    },
    {
      key: 'time',
      title: 'Time',
      render: (session: Event) => (
        <div className="flex items-center">
          <Clock size={16} className="mr-2 text-gray-400" />
          {session.time}
        </div>
      ),
    },
    {
      key: 'location',
      title: 'Location',
      render: (session: Event) => (
        <div className="flex items-center">
          <MapPin size={16} className="mr-2 text-gray-400" />
          {session.location}
        </div>
      ),
    },
    {
      key: 'description',
      title: 'Description',
      render: (session: Event) => session.description || 'No description',
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (session: Event) => (
        <div className="flex space-x-2">
          {canEditTraining && (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                handleEdit(session);
              }}
            >
              <Edit size={16} />
            </Button>
          )}
          {canDeleteTraining && (
            <Button
              size="sm"
              variant="danger"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteClick(session);
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
    setEditingSession(null);
    reset({
      date: '',
      time: '',
      location: 'Kiyinda Main Field', // Default to the only available location
      description: '',
    });
    setIsModalOpen(true);
  };

  const handleEdit = (session: Event) => {
    setEditingSession(session);
    setValue('date', session.date.split('T')[0]);
    setValue('time', session.time);
    setValue('location', session.location);
    setValue('description', session.description || '');
    setIsModalOpen(true);
  };

  const handleDeleteClick = (session: Event) => {
    setSessionToDelete(session);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (sessionToDelete) {
      try {
        await EventService.deleteEvent(sessionToDelete.id);
        setIsDeleteModalOpen(false);
        setSessionToDelete(null);
      } catch (error) {
        console.error('Error deleting training session:', error);
      }
    }
  };

  const onSubmit = async (data: TrainingFormData) => {
    try {
      setSubmitting(true);
      
      const sessionData = {
        type: 'training' as const,
        date: new Date(data.date).toISOString(),
        time: data.time,
        location: data.location,
        description: data.description,
        createdBy: user?.id || '',
      };

      if (editingSession) {
        await EventService.updateEvent(editingSession.id, sessionData);
      } else {
        await EventService.createEvent(sessionData);
      }

      setIsModalOpen(false);
      reset();
    } catch (error) {
      console.error('Error saving training session:', error);
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
        title="Training Sessions"
        description={`Schedule and manage team training sessions at Kiyinda Main Field (${trainingSessions.length} sessions)`}
        actions={
          canCreateTraining && (
            <Button 
              onClick={handleCreate} 
              leftIcon={<Plus size={18} />}
              className="bg-primary-600 hover:bg-primary-700 text-white"
            >
              Add Training Session
            </Button>
          )
        }
      />

      <Card>
        {trainingSessions.length > 0 ? (
          <Table
            data={trainingSessions}
            columns={columns}
            onRowClick={(session) => console.log('Clicked session:', session)}
          />
        ) : (
          <EmptyState
            title="No training sessions scheduled"
            description="There are no training sessions scheduled at the moment."
            icon={<Calendar size={24} />}
            action={
              canCreateTraining
                ? {
                    label: 'Add Training Session',
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
        title={editingSession ? 'Edit Training Session' : 'Add Training Session'}
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

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-center">
              <MapPin size={20} className="text-blue-600 dark:text-blue-400 mr-2" />
              <div>
                <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Training Location
                </h4>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  All training sessions are held at Kiyinda Main Field
                </p>
              </div>
            </div>
          </div>

          <Input
            type="hidden"
            value="Kiyinda Main Field"
            {...register('location', { value: 'Kiyinda Main Field' })}
          />

          <Input
            label="Description"
            placeholder="Training focus, objectives, special notes..."
            error={errors.description?.message}
            helperText="Optional: Add details about the training session"
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
              {editingSession ? 'Update Session' : 'Add Session'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Training Session"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-300">
            Are you sure you want to delete this training session? This action cannot be undone.
          </p>
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              variant="outline"
              onClick={() => setIsDeleteModalOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              Delete Session
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Training;
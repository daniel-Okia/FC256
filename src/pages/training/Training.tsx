import React, { useState } from 'react';
import { Calendar, Plus, Edit, Trash2, Users, MapPin, Clock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Table from '../../components/ui/Table';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/common/EmptyState';
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
  const [trainingSessions, setTrainingSessions] = useState<Event[]>([
    {
      id: '1',
      type: 'training',
      date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
      time: '19:00',
      location: 'Main Field',
      description: 'Focus on passing and tactical play',
      createdBy: '1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: '2',
      type: 'training',
      date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      time: '19:00',
      location: 'Main Field',
      description: 'Fitness and conditioning',
      createdBy: '1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ]);

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

  const locationOptions = [
    { value: 'Main Field', label: 'Main Field' },
    { value: 'Training Ground A', label: 'Training Ground A' },
    { value: 'Training Ground B', label: 'Training Ground B' },
    { value: 'Indoor Facility', label: 'Indoor Facility' },
    { value: 'Victory Park', label: 'Victory Park' },
  ];

  const columns = [
    {
      key: 'date',
      title: 'Date',
      render: (session: Event) => formatDate(session.date),
    },
    {
      key: 'time',
      title: 'Time',
      render: (session: Event) => session.time,
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
    reset();
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

  const handleDelete = () => {
    if (sessionToDelete) {
      setTrainingSessions(prev => prev.filter(s => s.id !== sessionToDelete.id));
      setIsDeleteModalOpen(false);
      setSessionToDelete(null);
    }
  };

  const onSubmit = (data: TrainingFormData) => {
    const sessionData: Event = {
      id: editingSession?.id || Date.now().toString(),
      type: 'training',
      date: new Date(data.date).toISOString(),
      time: data.time,
      location: data.location,
      description: data.description,
      createdBy: user?.id || '1',
      createdAt: editingSession?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (editingSession) {
      setTrainingSessions(prev => 
        prev.map(s => s.id === editingSession.id ? sessionData : s)
      );
    } else {
      setTrainingSessions(prev => [...prev, sessionData]);
    }

    setIsModalOpen(false);
    reset();
  };

  return (
    <div>
      <PageHeader
        title="Training Sessions"
        description="Schedule and manage team training sessions"
        actions={
          canCreateTraining && (
            <Button onClick={handleCreate} leftIcon={<Plus size={18} />}>
              Schedule Training
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
            description="There are no upcoming training sessions scheduled at the moment."
            icon={<Calendar size={24} />}
            action={
              canCreateTraining
                ? {
                    label: 'Schedule Training',
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
        title={editingSession ? 'Edit Training Session' : 'Schedule Training Session'}
        size="md"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Date"
            type="date"
            error={errors.date?.message}
            {...register('date', { required: 'Date is required' })}
          />

          <Input
            label="Time"
            type="time"
            error={errors.time?.message}
            {...register('time', { required: 'Time is required' })}
          />

          <Select
            label="Location"
            options={locationOptions}
            error={errors.location?.message}
            {...register('location', { required: 'Location is required' })}
          />

          <Input
            label="Description"
            placeholder="Training focus, objectives, etc."
            error={errors.description?.message}
            {...register('description')}
          />

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">
              {editingSession ? 'Update Session' : 'Schedule Session'}
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
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => setIsDeleteModalOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Training;
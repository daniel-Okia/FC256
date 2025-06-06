import React, { useState } from 'react';
import { Calendar, Plus, Edit, Trash2, MapPin, Clock } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Table from '../../components/ui/Table';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import EmptyState from '../../components/common/EmptyState';
import { useAuth } from '../../context/AuthContext';
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
  const [friendlies, setFriendlies] = useState<Event[]>([
    {
      id: '1',
      type: 'friendly',
      date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      time: '15:00',
      location: 'Victory Park',
      description: 'Preparation match',
      opponent: 'FC Victory',
      createdBy: '1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: '2',
      type: 'friendly',
      date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
      time: '16:30',
      location: 'Central Stadium',
      description: 'Tactical practice match',
      opponent: 'United FC',
      createdBy: '1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ]);

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

  const locationOptions = [
    { value: 'Victory Park', label: 'Victory Park' },
    { value: 'Central Stadium', label: 'Central Stadium' },
    { value: 'Main Field', label: 'Main Field' },
    { value: 'Sports Complex', label: 'Sports Complex' },
    { value: 'Away Ground', label: 'Away Ground' },
  ];

  const columns = [
    {
      key: 'date',
      title: 'Date',
      render: (friendly: Event) => formatDate(friendly.date),
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
    reset();
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

  const handleDelete = () => {
    if (friendlyToDelete) {
      setFriendlies(prev => prev.filter(f => f.id !== friendlyToDelete.id));
      setIsDeleteModalOpen(false);
      setFriendlyToDelete(null);
    }
  };

  const onSubmit = (data: FriendlyFormData) => {
    const friendlyData: Event = {
      id: editingFriendly?.id || Date.now().toString(),
      type: 'friendly',
      date: new Date(data.date).toISOString(),
      time: data.time,
      location: data.location,
      opponent: data.opponent,
      description: data.description,
      createdBy: user?.id || '1',
      createdAt: editingFriendly?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (editingFriendly) {
      setFriendlies(prev => 
        prev.map(f => f.id === editingFriendly.id ? friendlyData : f)
      );
    } else {
      setFriendlies(prev => [...prev, friendlyData]);
    }

    setIsModalOpen(false);
    reset();
  };

  return (
    <div>
      <PageHeader
        title="Friendly Matches"
        description="Schedule and manage friendly matches"
        actions={
          canCreateFriendly && (
            <Button onClick={handleCreate} leftIcon={<Plus size={18} />}>
              Schedule Friendly
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
            description="There are no upcoming friendly matches scheduled at the moment."
            icon={<Calendar size={24} />}
            action={
              canCreateFriendly
                ? {
                    label: 'Schedule Friendly',
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
        title={editingFriendly ? 'Edit Friendly Match' : 'Schedule Friendly Match'}
        size="md"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </div>

          <Input
            label="Opponent Team"
            placeholder="e.g., FC Victory"
            error={errors.opponent?.message}
            {...register('opponent', { required: 'Opponent is required' })}
          />

          <Select
            label="Location"
            options={locationOptions}
            error={errors.location?.message}
            {...register('location', { required: 'Location is required' })}
          />

          <Input
            label="Description"
            placeholder="Match purpose, preparation notes, etc."
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
              {editingFriendly ? 'Update Match' : 'Schedule Match'}
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

export default Friendlies;
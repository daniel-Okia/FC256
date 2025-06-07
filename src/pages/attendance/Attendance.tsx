import React, { useState, useEffect } from 'react';
import { Users, Plus, CheckCircle, XCircle, Clock, AlertCircle, Edit, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AttendanceService, MemberService, EventService } from '../../services/firestore';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Modal from '../../components/ui/Modal';
import Select from '../../components/ui/Select';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import EmptyState from '../../components/common/EmptyState';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { Attendance, Member, Event, AttendanceStatus } from '../../types';
import { formatDate } from '../../utils/date-utils';
import { canUserAccess, Permissions } from '../../utils/permissions';
import { useForm } from 'react-hook-form';

interface AttendanceFormData {
  eventId: string;
}

interface AttendanceRecord {
  id: string;
  member: Member;
  event: Event;
  attendance: Attendance;
}

const AttendancePage: React.FC = () => {
  const { user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<AttendanceRecord | null>(null);
  const [memberAttendance, setMemberAttendance] = useState<{ [key: string]: AttendanceStatus }>({});
  const [memberNotes, setMemberNotes] = useState<{ [key: string]: string }>({});
  const [filterEvent, setFilterEvent] = useState<string>('all');

  const canMarkAttendance = user && canUserAccess(user.role, Permissions.MARK_ATTENDANCE);
  const canEditAttendance = user && canUserAccess(user.role, Permissions.MARK_ATTENDANCE);
  const canDeleteAttendance = user && canUserAccess(user.role, Permissions.MARK_ATTENDANCE);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AttendanceFormData>({
    defaultValues: {
      eventId: '',
    }
  });

  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    setValue: setValueEdit,
    formState: { errors: errorsEdit },
  } = useForm<{ status: AttendanceStatus; notes: string }>();

  const watchEventId = watch('eventId');

  // Load data from Firestore
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [membersData, eventsData, attendanceData] = await Promise.all([
          MemberService.getAllMembers(),
          EventService.getAllEvents(),
          AttendanceService.getAllAttendance(),
        ]);

        console.log('Loaded members:', membersData.length);
        console.log('Loaded events:', eventsData.length);
        console.log('Loaded attendance:', attendanceData.length);

        setMembers(membersData);
        setEvents(eventsData);

        // Combine attendance data with member and event info
        const records: AttendanceRecord[] = attendanceData.map(attendance => {
          const member = membersData.find(m => m.id === attendance.memberId);
          const event = eventsData.find(e => e.id === attendance.eventId);
          return {
            id: attendance.id,
            member: member!,
            event: event!,
            attendance,
          };
        }).filter(record => record.member && record.event);

        setAttendanceRecords(records);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();

    // Set up real-time listeners
    const unsubscribeMembers = MemberService.subscribeToMembers((newMembers) => {
      console.log('Members updated:', newMembers.length);
      setMembers(newMembers);
    });
    
    const unsubscribeEvents = EventService.subscribeToEvents((newEvents) => {
      console.log('Events updated:', newEvents.length);
      setEvents(newEvents);
    });
    
    const unsubscribeAttendance = AttendanceService.subscribeToAttendance((attendanceData) => {
      console.log('Attendance updated:', attendanceData.length);
      // Update attendance records when data changes
      setAttendanceRecords(prevRecords => {
        const records: AttendanceRecord[] = attendanceData.map(attendance => {
          const member = members.find(m => m.id === attendance.memberId);
          const event = events.find(e => e.id === attendance.eventId);
          return {
            id: attendance.id,
            member: member!,
            event: event!,
            attendance,
          };
        }).filter(record => record.member && record.event);

        return records;
      });
      setLoading(false);
    });

    return () => {
      unsubscribeMembers();
      unsubscribeEvents();
      unsubscribeAttendance();
    };
  }, []);

  // Update attendance records when members or events change
  useEffect(() => {
    if (members.length > 0 && events.length > 0) {
      setAttendanceRecords(prevRecords => 
        prevRecords.map(record => ({
          ...record,
          member: members.find(m => m.id === record.attendance.memberId) || record.member,
          event: events.find(e => e.id === record.attendance.eventId) || record.event,
        }))
      );
    }
  }, [members, events]);

  // Watch for event selection changes
  useEffect(() => {
    if (watchEventId && events.length > 0) {
      const event = events.find(e => e.id === watchEventId);
      console.log('Event selection changed:', watchEventId, event);
      setSelectedEvent(event || null);
      
      if (event && members.length > 0) {
        // Initialize attendance status for all active members
        const activeMembers = members.filter(m => m.status === 'active');
        console.log('Active members for event:', activeMembers.length);
        
        const initialAttendance: { [key: string]: AttendanceStatus } = {};
        const initialNotes: { [key: string]: string } = {};
        
        activeMembers.forEach(member => {
          // Check if attendance already exists for this member and event
          const existingAttendance = attendanceRecords.find(
            record => record.member.id === member.id && record.event.id === watchEventId
          );
          
          initialAttendance[member.id] = existingAttendance?.attendance.status || 'present';
          initialNotes[member.id] = existingAttendance?.attendance.notes || '';
        });
        
        console.log('Initial attendance state:', initialAttendance);
        setMemberAttendance(initialAttendance);
        setMemberNotes(initialNotes);
      }
    } else {
      setSelectedEvent(null);
      setMemberAttendance({});
      setMemberNotes({});
    }
  }, [watchEventId, events, members, attendanceRecords]);

  const eventOptions = [
    { value: 'all', label: 'All Events' },
    ...events
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .map(event => ({
        value: event.id,
        label: `${event.type === 'training' ? 'Training' : `Friendly vs ${event.opponent}`} - ${formatDate(event.date)}`,
      }))
  ];

  const eventOptionsForModal = [
    { value: '', label: 'Select an event...' },
    ...events
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .map(event => ({
        value: event.id,
        label: `${event.type === 'training' ? 'Training' : `Friendly vs ${event.opponent}`} - ${formatDate(event.date)}`,
      }))
  ];

  const statusOptions = [
    { value: 'present', label: 'Present' },
    { value: 'absent', label: 'Absent' },
    { value: 'late', label: 'Late' },
    { value: 'excused', label: 'Excused' },
  ];

  const getStatusBadgeVariant = (status: AttendanceStatus) => {
    switch (status) {
      case 'present':
        return 'success';
      case 'absent':
        return 'danger';
      case 'late':
        return 'warning';
      case 'excused':
        return 'info';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: AttendanceStatus) => {
    switch (status) {
      case 'present':
        return <CheckCircle size={16} className="text-green-600" />;
      case 'absent':
        return <XCircle size={16} className="text-red-600" />;
      case 'late':
        return <Clock size={16} className="text-yellow-600" />;
      case 'excused':
        return <AlertCircle size={16} className="text-blue-600" />;
      default:
        return null;
    }
  };

  // Filter attendance records based on selected event
  const filteredRecords = filterEvent === 'all' 
    ? attendanceRecords 
    : attendanceRecords.filter(record => record.event.id === filterEvent);

  const columns = [
    {
      key: 'member',
      title: 'Member',
      render: (record: AttendanceRecord) => (
        <div>
          <div className="font-medium text-gray-900 dark:text-white">
            {record.member.name}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            #{record.member.jerseyNumber} • {record.member.position}
          </div>
        </div>
      ),
    },
    {
      key: 'event',
      title: 'Event',
      render: (record: AttendanceRecord) => (
        <div>
          <div className="font-medium text-gray-900 dark:text-white">
            {record.event.type === 'training' ? 'Training Session' : `Friendly vs ${record.event.opponent}`}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {formatDate(record.event.date)} • {record.event.time}
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      render: (record: AttendanceRecord) => (
        <div className="flex items-center space-x-2">
          {getStatusIcon(record.attendance.status)}
          <Badge variant={getStatusBadgeVariant(record.attendance.status)} className="capitalize">
            {record.attendance.status}
          </Badge>
        </div>
      ),
    },
    {
      key: 'notes',
      title: 'Notes',
      render: (record: AttendanceRecord) => record.attendance.notes || 'No notes',
    },
    {
      key: 'recordedAt',
      title: 'Recorded',
      render: (record: AttendanceRecord) => formatDate(record.attendance.recordedAt),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (record: AttendanceRecord) => (
        <div className="flex space-x-2">
          {canEditAttendance && (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                handleEdit(record);
              }}
            >
              <Edit size={16} />
            </Button>
          )}
          {canDeleteAttendance && (
            <Button
              size="sm"
              variant="danger"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteClick(record);
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
    setSelectedEvent(null);
    setMemberAttendance({});
    setMemberNotes({});
    reset({
      eventId: '',
    });
    setIsModalOpen(true);
  };

  const handleEdit = (record: AttendanceRecord) => {
    setEditingRecord(record);
    setValueEdit('status', record.attendance.status);
    setValueEdit('notes', record.attendance.notes || '');
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = (record: AttendanceRecord) => {
    setRecordToDelete(record);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (recordToDelete) {
      try {
        await AttendanceService.deleteAttendance(recordToDelete.id);
        setIsDeleteModalOpen(false);
        setRecordToDelete(null);
      } catch (error) {
        console.error('Error deleting attendance record:', error);
      }
    }
  };

  const updateMemberAttendance = (memberId: string, status: AttendanceStatus) => {
    console.log('Updating attendance for member:', memberId, 'to status:', status);
    setMemberAttendance(prev => ({
      ...prev,
      [memberId]: status,
    }));
  };

  const updateMemberNotes = (memberId: string, notes: string) => {
    console.log('Updating notes for member:', memberId, 'to:', notes);
    setMemberNotes(prev => ({
      ...prev,
      [memberId]: notes,
    }));
  };

  const onSubmit = async (data: AttendanceFormData) => {
    if (!selectedEvent) {
      console.error('No event selected');
      return;
    }

    try {
      setSubmitting(true);
      
      const activeMembers = members.filter(m => m.status === 'active');
      console.log('Saving attendance for', activeMembers.length, 'active members');
      console.log('Current member attendance state:', memberAttendance);
      
      // Create or update attendance records for each member
      for (const member of activeMembers) {
        const status = memberAttendance[member.id] || 'present';
        const notes = memberNotes[member.id] || '';
        
        console.log(`Processing ${member.name}: status=${status}, notes=${notes}`);
        
        // Check if attendance record already exists
        const existingRecord = attendanceRecords.find(
          record => record.member.id === member.id && record.event.id === selectedEvent.id
        );
        
        const attendanceData = {
          eventId: selectedEvent.id,
          memberId: member.id,
          status,
          notes,
          recordedBy: user?.id || '',
          recordedAt: new Date().toISOString(),
        };
        
        if (existingRecord) {
          // Update existing record
          console.log('Updating attendance for', member.name);
          await AttendanceService.updateAttendance(existingRecord.id, attendanceData);
        } else {
          // Create new record
          console.log('Creating attendance for', member.name);
          await AttendanceService.createAttendance(attendanceData);
        }
      }

      setIsModalOpen(false);
      reset();
      setSelectedEvent(null);
      setMemberAttendance({});
      setMemberNotes({});
    } catch (error) {
      console.error('Error saving attendance:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const onEditSubmit = async (data: { status: AttendanceStatus; notes: string }) => {
    if (!editingRecord) return;

    try {
      setSubmitting(true);
      
      const attendanceData = {
        eventId: editingRecord.attendance.eventId,
        memberId: editingRecord.attendance.memberId,
        status: data.status,
        notes: data.notes || '',
        recordedBy: user?.id || '',
        recordedAt: new Date().toISOString(),
      };
      
      await AttendanceService.updateAttendance(editingRecord.id, attendanceData);
      
      setIsEditModalOpen(false);
      setEditingRecord(null);
    } catch (error) {
      console.error('Error updating attendance record:', error);
    } finally {
      setSubmitting(false);
    }
  };

  // Get active members for display
  const activeMembers = members.filter(m => m.status === 'active');

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
        title="Attendance Management"
        description="Record and track member attendance for training sessions and friendly matches"
        actions={
          canMarkAttendance && (
            <Button 
              onClick={handleCreate} 
              leftIcon={<Plus size={18} />}
              className="bg-primary-600 hover:bg-primary-700 text-white"
            >
              Record Attendance
            </Button>
          )
        }
      />

      {/* Filter Section */}
      <div className="mb-6">
        <Select
          label="Filter by Event"
          options={eventOptions}
          value={filterEvent}
          onChange={(e) => setFilterEvent(e.target.value)}
          className="max-w-md"
        />
      </div>

      <Card>
        {filteredRecords.length > 0 ? (
          <Table
            data={filteredRecords}
            columns={columns}
            onRowClick={(record) => console.log('Clicked attendance record:', record)}
          />
        ) : (
          <EmptyState
            title="No attendance records found"
            description={filterEvent === 'all' 
              ? "Start recording attendance for training sessions and friendly matches."
              : "No attendance records found for the selected event."
            }
            icon={<Users size={24} />}
            action={
              canMarkAttendance
                ? {
                    label: 'Record Attendance',
                    onClick: handleCreate,
                  }
                : undefined
            }
          />
        )}
      </Card>

      {/* Record Attendance Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedEvent(null);
          setMemberAttendance({});
          setMemberNotes({});
          reset();
        }}
        title="Record Attendance"
        size="2xl"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Select
            label="Select Event"
            options={eventOptionsForModal}
            placeholder="Choose a training session or friendly match"
            error={errors.eventId?.message}
            required
            {...register('eventId', { required: 'Event is required' })}
          />

          {selectedEvent && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                {selectedEvent.type === 'training' ? 'Training Session' : `Friendly Match vs ${selectedEvent.opponent}`}
              </h4>
              <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                <p><strong>Date:</strong> {formatDate(selectedEvent.date)}</p>
                <p><strong>Time:</strong> {selectedEvent.time}</p>
                <p><strong>Location:</strong> {selectedEvent.location}</p>
                {selectedEvent.description && (
                  <p><strong>Description:</strong> {selectedEvent.description}</p>
                )}
              </div>
            </div>
          )}

          {selectedEvent && activeMembers.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-4">
                Mark Attendance for Active Members ({activeMembers.length} members)
              </h4>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {activeMembers.map(member => (
                  <div key={member.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-neutral-700/30 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h5 className="font-medium text-gray-900 dark:text-white">
                          {member.name}
                        </h5>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          #{member.jerseyNumber} • {member.position}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(memberAttendance[member.id] || 'present')}
                        <Badge variant={getStatusBadgeVariant(memberAttendance[member.id] || 'present')} className="capitalize">
                          {memberAttendance[member.id] || 'present'}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Select
                        label="Attendance Status"
                        options={statusOptions}
                        value={memberAttendance[member.id] || 'present'}
                        onChange={(e) => updateMemberAttendance(member.id, e.target.value as AttendanceStatus)}
                        required
                      />
                      
                      <Input
                        label="Notes (Optional)"
                        placeholder="Add notes if needed..."
                        value={memberNotes[member.id] || ''}
                        onChange={(e) => updateMemberNotes(member.id, e.target.value)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedEvent && activeMembers.length === 0 && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex items-center">
                <AlertCircle size={20} className="text-yellow-600 dark:text-yellow-400 mr-2" />
                <div>
                  <h4 className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                    No Active Members
                  </h4>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    There are no active members to record attendance for. Please add active members first.
                  </p>
                </div>
              </div>
            </div>
          )}

          {!selectedEvent && (
            <div className="bg-gray-50 dark:bg-neutral-700/30 border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center">
              <Users size={48} className="mx-auto text-gray-400 dark:text-gray-500 mb-4" />
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Select an Event
              </h4>
              <p className="text-gray-600 dark:text-gray-400">
                Choose a training session or friendly match to record attendance for team members.
              </p>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsModalOpen(false);
                setSelectedEvent(null);
                setMemberAttendance({});
                setMemberNotes({});
                reset();
              }}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              isLoading={submitting}
              disabled={!selectedEvent || activeMembers.length === 0}
              className="bg-primary-600 hover:bg-primary-700 text-white"
            >
              Save Attendance
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Attendance Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Attendance Record"
        size="md"
      >
        {editingRecord && (
          <form onSubmit={handleSubmitEdit(onEditSubmit)} className="space-y-6">
            <div className="bg-gray-50 dark:bg-neutral-700/30 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                {editingRecord.member.name}
              </h4>
              <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <p><strong>Event:</strong> {editingRecord.event.type === 'training' ? 'Training Session' : `Friendly vs ${editingRecord.event.opponent}`}</p>
                <p><strong>Date:</strong> {formatDate(editingRecord.event.date)}</p>
                <p><strong>Time:</strong> {editingRecord.event.time}</p>
              </div>
            </div>

            <Select
              label="Attendance Status"
              options={statusOptions}
              error={errorsEdit.status?.message}
              required
              {...registerEdit('status', { required: 'Status is required' })}
            />

            <Input
              label="Notes (Optional)"
              placeholder="Add notes if needed..."
              error={errorsEdit.notes?.message}
              {...registerEdit('notes')}
            />

            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditModalOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                isLoading={submitting}
                className="bg-primary-600 hover:bg-primary-700 text-white"
              >
                Update Record
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Attendance Record"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-300">
            Are you sure you want to delete this attendance record for <strong>{recordToDelete?.member.name}</strong>? This action cannot be undone.
          </p>
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              variant="outline"
              onClick={() => setIsDeleteModalOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              Delete Record
            </Button>
            </div>
        </div>
      </Modal>
    </div>
  );
};

export default AttendancePage;
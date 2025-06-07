import React, { useState, useEffect } from 'react';
import { Users, Plus, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
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
  attendanceRecords: {
    memberId: string;
    status: AttendanceStatus;
    notes?: string;
  }[];
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
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [memberAttendance, setMemberAttendance] = useState<{ [key: string]: AttendanceStatus }>({});
  const [memberNotes, setMemberNotes] = useState<{ [key: string]: string }>({});

  const canMarkAttendance = user && canUserAccess(user.role, Permissions.MARK_ATTENDANCE);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AttendanceFormData>();

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
    const unsubscribeMembers = MemberService.subscribeToMembers(setMembers);
    const unsubscribeEvents = EventService.subscribeToEvents(setEvents);
    const unsubscribeAttendance = AttendanceService.subscribeToAttendance((attendanceData) => {
      // Re-combine data when attendance updates
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

      setAttendanceRecords(records);
      setLoading(false);
    });

    return () => {
      unsubscribeMembers();
      unsubscribeEvents();
      unsubscribeAttendance();
    };
  }, [members, events]);

  const eventOptions = events
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .map(event => ({
      value: event.id,
      label: `${event.type === 'training' ? 'Training' : `Friendly vs ${event.opponent}`} - ${formatDate(event.date)}`,
    }));

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
  ];

  const handleCreate = () => {
    setSelectedEvent(null);
    setMemberAttendance({});
    setMemberNotes({});
    reset({
      eventId: '',
      attendanceRecords: [],
    });
    setIsModalOpen(true);
  };

  const handleEventChange = (eventId: string) => {
    const event = events.find(e => e.id === eventId);
    setSelectedEvent(event || null);
    
    // Initialize attendance status for all active members
    const initialAttendance: { [key: string]: AttendanceStatus } = {};
    const initialNotes: { [key: string]: string } = {};
    
    members.filter(m => m.status === 'active').forEach(member => {
      // Check if attendance already exists for this member and event
      const existingAttendance = attendanceRecords.find(
        record => record.member.id === member.id && record.event.id === eventId
      );
      
      initialAttendance[member.id] = existingAttendance?.attendance.status || 'present';
      initialNotes[member.id] = existingAttendance?.attendance.notes || '';
    });
    
    setMemberAttendance(initialAttendance);
    setMemberNotes(initialNotes);
  };

  const updateMemberAttendance = (memberId: string, status: AttendanceStatus) => {
    setMemberAttendance(prev => ({
      ...prev,
      [memberId]: status,
    }));
  };

  const updateMemberNotes = (memberId: string, notes: string) => {
    setMemberNotes(prev => ({
      ...prev,
      [memberId]: notes,
    }));
  };

  const onSubmit = async () => {
    if (!selectedEvent) return;

    try {
      setSubmitting(true);
      
      const activeMembers = members.filter(m => m.status === 'active');
      
      // Create or update attendance records for each member
      for (const member of activeMembers) {
        const status = memberAttendance[member.id] || 'present';
        const notes = memberNotes[member.id] || '';
        
        // Check if attendance record already exists
        const existingRecord = attendanceRecords.find(
          record => record.member.id === member.id && record.event.id === selectedEvent.id
        );
        
        const attendanceData = {
          eventId: selectedEvent.id,
          memberId: member.id,
          status,
          notes: notes || undefined,
          recordedBy: user?.id || '',
          recordedAt: new Date().toISOString(),
        };
        
        if (existingRecord) {
          // Update existing record
          await AttendanceService.updateAttendance(existingRecord.id, attendanceData);
        } else {
          // Create new record
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

      <Card>
        {attendanceRecords.length > 0 ? (
          <Table
            data={attendanceRecords}
            columns={columns}
            onRowClick={(record) => console.log('Clicked attendance record:', record)}
          />
        ) : (
          <EmptyState
            title="No attendance records yet"
            description="Start recording attendance for training sessions and friendly matches."
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
        onClose={() => setIsModalOpen(false)}
        title="Record Attendance"
        size="2xl"
      >
        <div className="space-y-6">
          <Select
            label="Select Event"
            options={eventOptions}
            placeholder="Choose a training session or friendly match"
            value={watchEventId}
            onChange={handleEventChange}
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

          {selectedEvent && (
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-4">
                Mark Attendance for Active Members ({members.filter(m => m.status === 'active').length} members)
              </h4>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {members.filter(m => m.status === 'active').map(member => (
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
                        onChange={(status) => updateMemberAttendance(member.id, status as AttendanceStatus)}
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

          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={onSubmit}
              isLoading={submitting}
              disabled={!selectedEvent}
              className="bg-primary-600 hover:bg-primary-700 text-white"
            >
              Save Attendance
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AttendancePage;
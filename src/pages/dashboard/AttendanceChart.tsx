import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
  Filler,
} from 'chart.js';
import { Calendar, TrendingUp, Users, Activity } from 'lucide-react';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { AttendanceService, EventService, MemberService } from '../../services/firestore';
import { formatDate } from '../../utils/date-utils';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface AttendanceChartProps {
  className?: string;
}

interface DailyAttendanceData {
  date: string;
  formattedDate: string;
  shortDate: string;
  attendeeCount: number;
  totalMembers: number;
  attendanceRate: number;
  eventDescription: string;
  eventId: string;
}

interface AttendanceStats {
  averageAttendance: number;
  highestAttendance: number;
  lowestAttendance: number;
  totalSessions: number;
  attendanceRate: number;
  trend: 'up' | 'down' | 'stable';
  trendPercentage: number;
}

const AttendanceChart: React.FC<AttendanceChartProps> = ({ className }) => {
  const [attendanceData, setAttendanceData] = useState<DailyAttendanceData[]>([]);
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [totalActiveMembers, setTotalActiveMembers] = useState(0);
  const [dataLastUpdated, setDataLastUpdated] = useState<number>(Date.now());

  // Function to combine attendance data with member and event info
  const combineAttendanceData = (attendanceData: any[], membersData: any[], eventsData: any[]): DailyAttendanceData[] => {
    return attendanceData.map(attendance => {
      const member = membersData.find(m => m.id === attendance.memberId);
      const event = eventsData.find(e => e.id === attendance.eventId);
      
      if (!member || !event) {
        console.warn('Missing member or event for attendance record:', attendance.id);
        return null;
      }
      
      return {
        id: attendance.id,
        member,
        event,
        attendance,
      };
    }).filter((record): record is any => record !== null);
  };

  // Load attendance data function
  const loadAttendanceData = async () => {
    try {
      setLoading(true);
      console.log('Loading attendance data...');
      
      // Load all required data
      const [attendance, events, members] = await Promise.all([
        AttendanceService.getAllAttendance(),
        EventService.getAllEvents(),
        MemberService.getAllMembers(),
      ]);

      console.log('Data loaded:', {
        attendance: attendance.length,
        events: events.length,
        members: members.length
      });

      // Get active members count
      const activeMembers = members.filter(m => m.status === 'active');
      setTotalActiveMembers(activeMembers.length);

      // If no data exists, set empty state
      if (attendance.length === 0 || events.length === 0) {
        console.log('No attendance or events data found');
        setAttendanceData([]);
        setStats(null);
        setLoading(false);
        return;
      }

      // Get training sessions from the last 60 days for better trend analysis
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
      
      // Filter training events from the last 60 days that have actually occurred
      const now = new Date();
      const recentTrainingEvents = events.filter(event => {
        const eventDate = new Date(event.date);
        
        // Create a proper datetime by combining date and time
        const eventDateTime = new Date(event.date);
        if (event.time) {
          const [hours, minutes] = event.time.split(':').map(Number);
          eventDateTime.setHours(hours, minutes, 0, 0);
        } else {
          // If no time specified, assume it's at end of day to be safe
          eventDateTime.setHours(23, 59, 59, 999);
        }
        
        // Only include training sessions that:
        // 1. Are training type
        // 2. Are within the last 60 days
        // 3. Have actually occurred (datetime has passed)
        return event.type === 'training' && 
               eventDate >= sixtyDaysAgo && 
               eventDateTime <= now;
      });

      console.log('Recent training events:', recentTrainingEvents.length);

      // If no recent training events, set empty state
      if (recentTrainingEvents.length === 0) {
        console.log('No recent training events found');
        setAttendanceData([]);
        setStats(null);
        setLoading(false);
        return;
      }

      // Sort events by date
      recentTrainingEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Calculate attendance for each training session
      const dailyAttendanceData: DailyAttendanceData[] = recentTrainingEvents.map(event => {
        // Count present attendees for this event
        const eventAttendance = attendance.filter(a => 
          a.eventId === event.id && a.status === 'present'
        );
        
        const attendeeCount = eventAttendance.length;
        const attendanceRate = activeMembers.length > 0 ? (attendeeCount / activeMembers.length) * 100 : 0;
        
        const eventDate = new Date(event.date);
        
        return {
          date: event.date,
          formattedDate: formatDate(event.date, 'MMM d'),
          shortDate: formatDate(event.date, 'M/d'),
          attendeeCount,
          totalMembers: activeMembers.length,
          attendanceRate,
          eventDescription: event.description || 'Training Session',
          eventId: event.id,
        };
      });

      console.log('Daily attendance data:', dailyAttendanceData);

      // Calculate statistics only if we have data
      if (dailyAttendanceData.length > 0) {
        const attendanceCounts = dailyAttendanceData.map(d => d.attendeeCount);
        const attendanceRates = dailyAttendanceData.map(d => d.attendanceRate);
        
        const averageAttendance = attendanceCounts.reduce((sum, count) => sum + count, 0) / attendanceCounts.length;
        const averageRate = attendanceRates.reduce((sum, rate) => sum + rate, 0) / attendanceRates.length;
        
        // Calculate trend (compare first half vs second half)
        const midPoint = Math.floor(dailyAttendanceData.length / 2);
        const firstHalf = attendanceRates.slice(0, midPoint);
        const secondHalf = attendanceRates.slice(midPoint);
        
        const firstHalfAvg = firstHalf.length > 0 ? firstHalf.reduce((sum, rate) => sum + rate, 0) / firstHalf.length : 0;
        const secondHalfAvg = secondHalf.length > 0 ? secondHalf.reduce((sum, rate) => sum + rate, 0) / secondHalf.length : 0;
        
        let trend: 'up' | 'down' | 'stable' = 'stable';
        let trendPercentage = 0;
        
        if (firstHalfAvg > 0) {
          const change = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;
          trendPercentage = Math.abs(change);
          
          if (change > 5) trend = 'up';
          else if (change < -5) trend = 'down';
          else trend = 'stable';
        }
        
        setStats({
          averageAttendance: Math.round(averageAttendance),
          highestAttendance: Math.max(...attendanceCounts),
          lowestAttendance: Math.min(...attendanceCounts),
          totalSessions: dailyAttendanceData.length,
          attendanceRate: Math.round(averageRate),
          trend,
          trendPercentage: Math.round(trendPercentage),
        });
      } else {
        setStats(null);
      }

      setAttendanceData(dailyAttendanceData);
      setDataLastUpdated(Date.now());
    } catch (error) {
      console.error('Error loading attendance data:', error);
      setAttendanceData([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadAttendanceData();
  }, []);

  // Set up real-time listeners with proper cleanup
  useEffect(() => {
    console.log('Setting up real-time listeners...');
    
    const unsubscribeAttendance = AttendanceService.subscribeToAttendance((attendanceData) => {
      console.log('Attendance data updated:', attendanceData.length);
      loadAttendanceData();
    });
    
    const unsubscribeEvents = EventService.subscribeToEvents((eventsData) => {
      console.log('Events data updated:', eventsData.length);
      loadAttendanceData();
    });
    
    const unsubscribeMembers = MemberService.subscribeToMembers((membersData) => {
      console.log('Members data updated:', membersData.length);
      loadAttendanceData();
    });

    return () => {
      console.log('Cleaning up listeners...');
      unsubscribeAttendance();
      unsubscribeEvents();
      unsubscribeMembers();
    };
  }, []);

  // Chart configuration with improved visuals and restored values
  const data = {
    labels: attendanceData.map(d => d.formattedDate),
    datasets: [
      {
        label: 'Members Present',
        data: attendanceData.map(d => d.attendeeCount),
        borderColor: 'rgba(99, 115, 242, 1)',
        backgroundColor: 'rgba(99, 115, 242, 0.1)',
        borderWidth: 3,
        pointBackgroundColor: 'rgba(99, 115, 242, 1)',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 3,
        pointRadius: 7,
        pointHoverRadius: 10,
        pointHoverBackgroundColor: 'rgba(99, 115, 242, 1)',
        pointHoverBorderColor: '#ffffff',
        pointHoverBorderWidth: 4,
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Attendance Rate (%)',
        data: attendanceData.map(d => d.attendanceRate),
        borderColor: 'rgba(34, 197, 94, 1)',
        backgroundColor: 'rgba(34, 197, 94, 0.05)',
        borderWidth: 3,
        pointBackgroundColor: 'rgba(34, 197, 94, 1)',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 3,
        pointRadius: 6,
        pointHoverRadius: 8,
        fill: false,
        tension: 0.4,
        yAxisID: 'y1',
      },
    ],
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: document.documentElement.classList.contains('dark') ? '#D1D5DB' : '#4B5563',
          usePointStyle: true,
          padding: 20,
          font: {
            size: 13,
            weight: '600',
          },
        },
      },
      tooltip: {
        backgroundColor: document.documentElement.classList.contains('dark') ? '#374151' : '#FFFFFF',
        titleColor: document.documentElement.classList.contains('dark') ? '#F9FAFB' : '#111827',
        bodyColor: document.documentElement.classList.contains('dark') ? '#D1D5DB' : '#4B5563',
        borderColor: document.documentElement.classList.contains('dark') ? '#4B5563' : '#E5E7EB',
        borderWidth: 1,
        cornerRadius: 12,
        padding: 16,
        displayColors: true,
        titleFont: {
          size: 14,
          weight: '600',
        },
        bodyFont: {
          size: 13,
        },
        callbacks: {
          title: function(context) {
            const dataIndex = context[0].dataIndex;
            const data = attendanceData[dataIndex];
            return data ? formatDate(data.date, 'EEEE, MMM d, yyyy') : '';
          },
          label: function(context) {
            const dataIndex = context.dataIndex;
            const data = attendanceData[dataIndex];
            const value = context.raw as number;
            
            if (context.datasetIndex === 0) {
              return `${value} members attended (out of ${data?.totalMembers || 0})`;
            } else {
              return `${Math.round(value)}% attendance rate`;
            }
          },
          afterLabel: function(context) {
            const dataIndex = context.dataIndex;
            const data = attendanceData[dataIndex];
            return data?.eventDescription ? `Session: ${data.eventDescription}` : '';
          }
        }
      },
    },
    scales: {
      x: {
        grid: {
          color: document.documentElement.classList.contains('dark') ? '#374151' : '#F3F4F6',
          borderColor: document.documentElement.classList.contains('dark') ? '#4B5563' : '#E5E7EB',
        },
        ticks: {
          color: document.documentElement.classList.contains('dark') ? '#D1D5DB' : '#6B7280',
          maxTicksLimit: 8,
          font: {
            size: 12,
            weight: '500',
          },
        },
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        beginAtZero: true,
        max: Math.max(totalActiveMembers + 2, 10),
        grid: {
          color: document.documentElement.classList.contains('dark') ? '#374151' : '#F3F4F6',
          borderColor: document.documentElement.classList.contains('dark') ? '#4B5563' : '#E5E7EB',
        },
        ticks: {
          color: document.documentElement.classList.contains('dark') ? '#D1D5DB' : '#6B7280',
          stepSize: 1,
          font: {
            size: 11,
          },
        },
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        beginAtZero: true,
        max: 100,
        grid: {
          drawOnChartArea: false,
        },
        ticks: {
          color: document.documentElement.classList.contains('dark') ? '#D1D5DB' : '#6B7280',
          stepSize: 20,
          font: {
            size: 11,
          },
          callback: function(value) {
            return value + '%';
          },
        },
      },
    },
    elements: {
      point: {
        hoverBackgroundColor: 'rgba(99, 115, 242, 1)',
        hoverBorderColor: '#ffffff',
      },
    },
  };

  const getTrendIcon = () => {
    if (!stats) return null;
    
    switch (stats.trend) {
      case 'up':
        return <TrendingUp size={16} className="text-green-600 dark:text-green-400" />;
      case 'down':
        return <TrendingUp size={16} className="text-red-600 dark:text-red-400 rotate-180" />;
      default:
        return <Activity size={16} className="text-gray-600 dark:text-gray-400" />;
    }
  };

  const getTrendColor = () => {
    if (!stats) return 'text-gray-600 dark:text-gray-400';
    
    switch (stats.trend) {
      case 'up':
        return 'text-green-600 dark:text-green-400';
      case 'down':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getTrendText = () => {
    if (!stats) return 'No trend data';
    
    switch (stats.trend) {
      case 'up':
        return `+${stats.trendPercentage}% improvement`;
      case 'down':
        return `-${stats.trendPercentage}% decline`;
      default:
        return 'Stable attendance';
    }
  };

  return (
    <Card
      title="Training Attendance Trends"
      subtitle={`Daily attendance tracking for training sessions${attendanceData.length > 0 ? ' over the last 60 days' : ''}`}
      className={className}
    >
      {loading ? (
        <div className="h-80 flex items-center justify-center">
          <LoadingSpinner size="md" />
        </div>
      ) : attendanceData.length > 0 ? (
        <div>
          {/* Statistics Cards */}
          {stats && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                      Avg Attendance
                    </p>
                    <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                      {stats.averageAttendance}
                    </p>
                  </div>
                  <div className="p-2 bg-blue-200 dark:bg-blue-800 rounded-lg">
                    <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                      Attendance Rate
                    </p>
                    <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                      {stats.attendanceRate}%
                    </p>
                  </div>
                  <div className="p-2 bg-green-200 dark:bg-green-800 rounded-lg">
                    <Activity className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-purple-600 dark:text-purple-400">
                      Best Session
                    </p>
                    <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                      {stats.highestAttendance}
                    </p>
                  </div>
                  <div className="p-2 bg-purple-200 dark:bg-purple-800 rounded-lg">
                    <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                      Total Sessions
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {stats.totalSessions}
                    </p>
                  </div>
                  <div className="p-2 bg-gray-200 dark:bg-gray-600 rounded-lg">
                    <Calendar className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Trend Indicator */}
          {stats && (
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  {getTrendIcon()}
                  <span className={`text-sm font-semibold ${getTrendColor()}`}>
                    {getTrendText()}
                  </span>
                </div>
              </div>
              <Badge variant="info" size="sm" className="px-3 py-1">
                Last 60 days
              </Badge>
            </div>
          )}

          {/* Chart */}
          <div className="h-80 bg-gradient-to-br from-gray-50/50 to-white dark:from-gray-800/50 dark:to-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <Line data={data} options={options} />
          </div>

          {/* Chart Legend */}
          <div className="mt-4 text-center">
            <div className="inline-flex items-center space-x-6 px-4 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Member Count</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Attendance %</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="h-80 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
              <Calendar className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No Training Data Available
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              No training sessions with attendance records found in the last 60 days.
            </p>
            <div className="text-sm text-gray-400 dark:text-gray-500">
              <p>Data last checked: {new Date(dataLastUpdated).toLocaleTimeString()}</p>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

export default AttendanceChart;
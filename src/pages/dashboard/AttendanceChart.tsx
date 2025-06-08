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

  useEffect(() => {
    const loadAttendanceData = async () => {
      try {
        setLoading(true);
        
        // Load all required data
        const [attendance, events, members] = await Promise.all([
          AttendanceService.getAllAttendance(),
          EventService.getAllEvents(),
          MemberService.getAllMembers(),
        ]);

        // Get active members count
        const activeMembers = members.filter(m => m.status === 'active');
        setTotalActiveMembers(activeMembers.length);

        // Get training sessions from the last 60 days for better trend analysis
        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
        
        // Filter training events from the last 60 days
        const recentTrainingEvents = events.filter(event => {
          const eventDate = new Date(event.date);
          return event.type === 'training' && eventDate >= sixtyDaysAgo && eventDate <= new Date();
        });

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

        // Calculate statistics
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
        }

        setAttendanceData(dailyAttendanceData);
      } catch (error) {
        console.error('Error loading attendance data:', error);
        setAttendanceData([]);
        setStats(null);
      } finally {
        setLoading(false);
      }
    };

    loadAttendanceData();
  }, []);

  // Chart configuration
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
        pointBorderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 8,
        pointHoverBackgroundColor: 'rgba(99, 115, 242, 1)',
        pointHoverBorderColor: '#ffffff',
        pointHoverBorderWidth: 3,
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Attendance Rate (%)',
        data: attendanceData.map(d => d.attendanceRate),
        borderColor: 'rgba(34, 197, 94, 1)',
        backgroundColor: 'rgba(34, 197, 94, 0.05)',
        borderWidth: 2,
        pointBackgroundColor: 'rgba(34, 197, 94, 1)',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
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
            size: 12,
            weight: '500',
          },
        },
      },
      tooltip: {
        backgroundColor: document.documentElement.classList.contains('dark') ? '#374151' : '#FFFFFF',
        titleColor: document.documentElement.classList.contains('dark') ? '#F9FAFB' : '#111827',
        bodyColor: document.documentElement.classList.contains('dark') ? '#D1D5DB' : '#4B5563',
        borderColor: document.documentElement.classList.contains('dark') ? '#4B5563' : '#E5E7EB',
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12,
        displayColors: true,
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
            size: 11,
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
        title: {
          display: true,
          text: 'Number of Members',
          color: document.documentElement.classList.contains('dark') ? '#D1D5DB' : '#6B7280',
          font: {
            size: 12,
            weight: '500',
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
        title: {
          display: true,
          text: 'Attendance Rate (%)',
          color: document.documentElement.classList.contains('dark') ? '#D1D5DB' : '#6B7280',
          font: {
            size: 12,
            weight: '500',
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
      subtitle="Daily attendance tracking for training sessions over the last 60 days"
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
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                      Avg Attendance
                    </p>
                    <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                      {stats.averageAttendance}
                    </p>
                  </div>
                  <Users className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-600 dark:text-green-400">
                      Attendance Rate
                    </p>
                    <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                      {stats.attendanceRate}%
                    </p>
                  </div>
                  <Activity className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
              </div>
              
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-600 dark:text-purple-400">
                      Best Session
                    </p>
                    <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                      {stats.highestAttendance}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Total Sessions
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {stats.totalSessions}
                    </p>
                  </div>
                  <Calendar className="h-8 w-8 text-gray-600 dark:text-gray-400" />
                </div>
              </div>
            </div>
          )}

          {/* Trend Indicator */}
          {stats && (
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {getTrendIcon()}
                <span className={`text-sm font-medium ${getTrendColor()}`}>
                  {getTrendText()}
                </span>
              </div>
              <Badge variant="info" size="sm">
                Last 60 days
              </Badge>
            </div>
          )}

          {/* Chart */}
          <div className="h-80">
            <Line data={data} options={options} />
          </div>

          {/* Chart Legend */}
          <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
            <p>Blue line shows member count • Green line shows attendance percentage</p>
          </div>
        </div>
      ) : (
        <div className="h-80 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
              <Calendar className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No Training Data
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              No training sessions with attendance records found in the last 60 days
            </p>
          </div>
        </div>
      )}
    </Card>
  );
};

export default AttendanceChart;
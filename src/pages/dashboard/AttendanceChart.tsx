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
} from 'chart.js';
import Card from '../../components/ui/Card';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { AttendanceService, EventService } from '../../services/firestore';
import { formatDate } from '../../utils/date-utils';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface AttendanceChartProps {
  className?: string;
}

interface DailyAttendanceData {
  date: string;
  formattedDate: string;
  attendeeCount: number;
  eventType: string;
  eventDescription: string;
}

const AttendanceChart: React.FC<AttendanceChartProps> = ({ className }) => {
  const [attendanceData, setAttendanceData] = useState<DailyAttendanceData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAttendanceData = async () => {
      try {
        setLoading(true);
        
        // Load all required data
        const [attendance, events] = await Promise.all([
          AttendanceService.getAllAttendance(),
          EventService.getAllEvents(),
        ]);

        // Get training sessions from the last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        // Filter training events from the last 30 days
        const recentTrainingEvents = events.filter(event => {
          const eventDate = new Date(event.date);
          return event.type === 'training' && eventDate >= thirtyDaysAgo && eventDate <= new Date();
        });

        // Sort events by date
        recentTrainingEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // Calculate attendance for each training session
        const dailyAttendanceData: DailyAttendanceData[] = recentTrainingEvents.map(event => {
          // Count present attendees for this event
          const eventAttendance = attendance.filter(a => 
            a.eventId === event.id && a.status === 'present'
          );
          
          return {
            date: event.date,
            formattedDate: formatDate(event.date),
            attendeeCount: eventAttendance.length,
            eventType: 'Training',
            eventDescription: event.description || 'Training Session',
          };
        });

        setAttendanceData(dailyAttendanceData);
      } catch (error) {
        console.error('Error loading attendance data:', error);
        // Set default empty data on error
        setAttendanceData([]);
      } finally {
        setLoading(false);
      }
    };

    loadAttendanceData();
  }, []);

  const data = {
    labels: attendanceData.map(d => d.formattedDate),
    datasets: [
      {
        label: 'Members Present',
        data: attendanceData.map(d => d.attendeeCount),
        borderColor: 'rgba(79, 79, 230, 1)',
        backgroundColor: 'rgba(79, 79, 230, 0.1)',
        borderWidth: 3,
        pointBackgroundColor: 'rgba(79, 79, 230, 1)',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 8,
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: document.documentElement.classList.contains('dark') ? '#D1D5DB' : '#4B5563',
          usePointStyle: true,
          padding: 20,
        },
      },
      title: {
        display: false,
      },
      tooltip: {
        backgroundColor: document.documentElement.classList.contains('dark') ? '#374151' : '#FFFFFF',
        titleColor: document.documentElement.classList.contains('dark') ? '#F9FAFB' : '#111827',
        bodyColor: document.documentElement.classList.contains('dark') ? '#D1D5DB' : '#4B5563',
        borderColor: document.documentElement.classList.contains('dark') ? '#4B5563' : '#E5E7EB',
        borderWidth: 1,
        callbacks: {
          title: function(context) {
            const dataIndex = context[0].dataIndex;
            const data = attendanceData[dataIndex];
            return data ? data.formattedDate : '';
          },
          label: function(context) {
            const dataIndex = context.dataIndex;
            const data = attendanceData[dataIndex];
            const value = context.raw as number;
            return `${value} members attended`;
          },
          afterLabel: function(context) {
            const dataIndex = context.dataIndex;
            const data = attendanceData[dataIndex];
            return data?.eventDescription ? `Event: ${data.eventDescription}` : '';
          }
        }
      },
    },
    scales: {
      x: {
        grid: {
          color: document.documentElement.classList.contains('dark') ? '#374151' : '#E5E7EB',
          borderColor: document.documentElement.classList.contains('dark') ? '#4B5563' : '#D1D5DB',
        },
        ticks: {
          color: document.documentElement.classList.contains('dark') ? '#D1D5DB' : '#4B5563',
          maxTicksLimit: 8, // Limit number of x-axis labels for better readability
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: document.documentElement.classList.contains('dark') ? '#374151' : '#E5E7EB',
          borderColor: document.documentElement.classList.contains('dark') ? '#4B5563' : '#D1D5DB',
        },
        ticks: {
          color: document.documentElement.classList.contains('dark') ? '#D1D5DB' : '#4B5563',
          stepSize: 1,
        },
        title: {
          display: true,
          text: 'Number of Members',
          color: document.documentElement.classList.contains('dark') ? '#D1D5DB' : '#4B5563',
        },
      },
    },
    interaction: {
      intersect: false,
      mode: 'index',
    },
    elements: {
      point: {
        hoverBackgroundColor: 'rgba(79, 79, 230, 1)',
        hoverBorderColor: '#ffffff',
      },
    },
  };

  return (
    <Card
      title="Training Attendance Trends"
      subtitle="Daily attendance for training sessions over the last 30 days"
      className={className}
    >
      {loading ? (
        <div className="h-80 flex items-center justify-center">
          <LoadingSpinner size="md" />
        </div>
      ) : attendanceData.length > 0 ? (
        <div className="h-80">
          <Line data={data} options={options} />
        </div>
      ) : (
        <div className="h-80 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No Training Data
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              No training sessions with attendance records found in the last 30 days
            </p>
          </div>
        </div>
      )}
    </Card>
  );
};

export default AttendanceChart;
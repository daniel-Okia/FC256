import React, { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
} from 'chart.js';
import Card from '../../components/ui/Card';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { AttendanceService, EventService, MemberService } from '../../services/firestore';
import { Attendance, Event, Member } from '../../types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface AttendanceChartProps {
  className?: string;
}

interface WeeklyAttendanceData {
  week: string;
  training: number;
  friendlies: number;
}

const AttendanceChart: React.FC<AttendanceChartProps> = ({ className }) => {
  const [attendanceData, setAttendanceData] = useState<WeeklyAttendanceData[]>([]);
  const [loading, setLoading] = useState(true);

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

        // Get the last 4 weeks of data
        const now = new Date();
        const fourWeeksAgo = new Date(now.getTime() - (4 * 7 * 24 * 60 * 60 * 1000));
        
        // Filter events from the last 4 weeks
        const recentEvents = events.filter(event => {
          const eventDate = new Date(event.date);
          return eventDate >= fourWeeksAgo && eventDate <= now;
        });

        // Group events by week
        const weeklyData: { [key: string]: { training: Set<string>; friendlies: Set<string> } } = {};
        
        recentEvents.forEach(event => {
          const eventDate = new Date(event.date);
          const weekStart = new Date(eventDate);
          weekStart.setDate(eventDate.getDate() - eventDate.getDay()); // Start of week (Sunday)
          const weekKey = weekStart.toISOString().split('T')[0];
          
          if (!weeklyData[weekKey]) {
            weeklyData[weekKey] = { training: new Set(), friendlies: new Set() };
          }
          
          // Get attendance for this event
          const eventAttendance = attendance.filter(a => 
            a.eventId === event.id && a.status === 'present'
          );
          
          // Add unique member IDs to the appropriate set
          eventAttendance.forEach(a => {
            if (event.type === 'training') {
              weeklyData[weekKey].training.add(a.memberId);
            } else {
              weeklyData[weekKey].friendlies.add(a.memberId);
            }
          });
        });

        // Convert to chart data format
        const chartData: WeeklyAttendanceData[] = [];
        const sortedWeeks = Object.keys(weeklyData).sort();
        
        sortedWeeks.forEach((weekKey, index) => {
          const weekData = weeklyData[weekKey];
          chartData.push({
            week: `Week ${index + 1}`,
            training: weekData.training.size,
            friendlies: weekData.friendlies.size,
          });
        });

        // If we have less than 4 weeks, fill with empty data
        while (chartData.length < 4) {
          chartData.unshift({
            week: `Week ${chartData.length + 1}`,
            training: 0,
            friendlies: 0,
          });
        }

        // Keep only the last 4 weeks
        setAttendanceData(chartData.slice(-4));
      } catch (error) {
        console.error('Error loading attendance data:', error);
        // Set default empty data on error
        setAttendanceData([
          { week: 'Week 1', training: 0, friendlies: 0 },
          { week: 'Week 2', training: 0, friendlies: 0 },
          { week: 'Week 3', training: 0, friendlies: 0 },
          { week: 'Week 4', training: 0, friendlies: 0 },
        ]);
      } finally {
        setLoading(false);
      }
    };

    loadAttendanceData();
  }, []);

  const data = {
    labels: attendanceData.map(d => d.week),
    datasets: [
      {
        label: 'Training',
        data: attendanceData.map(d => d.training),
        backgroundColor: 'rgba(79, 79, 230, 0.8)',
        borderColor: 'rgba(79, 79, 230, 1)',
        borderWidth: 1,
        borderRadius: 4,
      },
      {
        label: 'Friendlies',
        data: attendanceData.map(d => d.friendlies),
        backgroundColor: 'rgba(225, 29, 42, 0.8)',
        borderColor: 'rgba(225, 29, 42, 1)',
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  };

  const options: ChartOptions<'bar'> = {
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
          label: function(context) {
            const label = context.dataset.label || '';
            const value = context.raw as number;
            return `${label}: ${value} unique attendees`;
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
      },
    },
  };

  return (
    <Card
      title="Attendance Trends"
      subtitle="Unique member attendance over the last 4 weeks"
      className={className}
    >
      {loading ? (
        <div className="h-80 flex items-center justify-center">
          <LoadingSpinner size="md" />
        </div>
      ) : (
        <div className="h-80">
          <Bar data={data} options={options} />
        </div>
      )}
    </Card>
  );
};

export default AttendanceChart;
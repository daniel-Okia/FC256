import React from 'react';
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

const AttendanceChart: React.FC<AttendanceChartProps> = ({ className }) => {
  // Mock data for demonstration
  const data = {
    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
    datasets: [
      {
        label: 'Training',
        data: [15, 17, 14, 18],
        backgroundColor: 'rgba(79, 79, 230, 0.8)',
        borderColor: 'rgba(79, 79, 230, 1)',
        borderWidth: 1,
      },
      {
        label: 'Friendlies',
        data: [12, 14, 11, 16],
        backgroundColor: 'rgba(225, 29, 42, 0.8)',
        borderColor: 'rgba(225, 29, 42, 1)',
        borderWidth: 1,
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
        },
      },
    },
  };

  return (
    <Card
      title="Attendance Trends"
      subtitle="Monthly attendance breakdown for training and friendlies"
      className={className}
    >
      <div className="h-80">
        <Bar data={data} options={options} />
      </div>
    </Card>
  );
};

export default AttendanceChart;
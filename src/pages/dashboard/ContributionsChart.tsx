import React from 'react';
import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  ChartOptions,
} from 'chart.js';
import Card from '../../components/ui/Card';
import { formatUGX } from '../../utils/currency-utils';

ChartJS.register(ArcElement, Tooltip, Legend);

interface ContributionsChartProps {
  className?: string;
}

const ContributionsChart: React.FC<ContributionsChartProps> = ({ className }) => {
  // Mock data for demonstration - amounts in UGX
  const data = {
    labels: ['Monetary', 'Jerseys', 'Equipment', 'Refreshments', 'Other'],
    datasets: [
      {
        data: [4500000, 1200000, 800000, 600000, 300000], // UGX amounts
        backgroundColor: [
          'rgba(79, 79, 230, 0.8)',
          'rgba(225, 29, 42, 0.8)',
          'rgba(34, 197, 94, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(107, 114, 128, 0.8)',
        ],
        borderColor: [
          'rgba(79, 79, 230, 1)',
          'rgba(225, 29, 42, 1)',
          'rgba(34, 197, 94, 1)',
          'rgba(245, 158, 11, 1)',
          'rgba(107, 114, 128, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const options: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          color: document.documentElement.classList.contains('dark') ? '#D1D5DB' : '#4B5563',
          padding: 20,
        },
      },
      tooltip: {
        backgroundColor: document.documentElement.classList.contains('dark') ? '#374151' : '#FFFFFF',
        titleColor: document.documentElement.classList.contains('dark') ? '#F9FAFB' : '#111827',
        bodyColor: document.documentElement.classList.contains('dark') ? '#D1D5DB' : '#4B5563',
        borderColor: document.documentElement.classList.contains('dark') ? '#4B5563' : '#E5E7EB',
        borderWidth: 1,
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.raw as number;
            return `${label}: ${formatUGX(value)}`;
          }
        }
      },
    },
    cutout: '70%',
  };

  const totalContributions = data.datasets[0].data.reduce((sum, val) => sum + val, 0);

  return (
    <Card
      title="Contribution Breakdown"
      subtitle="Total contributions by category (UGX)"
      className={className}
    >
      <div className="h-80 relative">
        <Doughnut data={data} options={options} />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total</p>
            <p className="text-xl font-semibold text-gray-900 dark:text-white">
              {formatUGX(totalContributions)}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default ContributionsChart;
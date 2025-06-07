import React, { useState, useEffect } from 'react';
import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  ChartOptions,
} from 'chart.js';
import Card from '../../components/ui/Card';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { ContributionService } from '../../services/firestore';
import { Contribution } from '../../types';
import { formatUGX } from '../../utils/currency-utils';

ChartJS.register(ArcElement, Tooltip, Legend);

interface ContributionsChartProps {
  className?: string;
}

interface ContributionBreakdown {
  monetary: number;
  equipment: number;
  jerseys: number;
  refreshments: number;
  other: number;
}

const ContributionsChart: React.FC<ContributionsChartProps> = ({ className }) => {
  const [contributionData, setContributionData] = useState<ContributionBreakdown>({
    monetary: 0,
    equipment: 0,
    jerseys: 0,
    refreshments: 0,
    other: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadContributionData = async () => {
      try {
        setLoading(true);
        
        // Load all contributions
        const contributions = await ContributionService.getAllContributions();
        
        // Get current month contributions
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        const currentMonthContributions = contributions.filter(contribution => {
          const contributionDate = new Date(contribution.date);
          return contributionDate.getMonth() === currentMonth && contributionDate.getFullYear() === currentYear;
        });

        // Categorize contributions
        const breakdown: ContributionBreakdown = {
          monetary: 0,
          equipment: 0,
          jerseys: 0,
          refreshments: 0,
          other: 0,
        };

        currentMonthContributions.forEach(contribution => {
          if (contribution.type === 'monetary' && contribution.amount) {
            breakdown.monetary += contribution.amount;
          } else if (contribution.type === 'in-kind') {
            // Categorize in-kind contributions based on description
            const description = contribution.description.toLowerCase();
            
            if (description.includes('equipment') || description.includes('ball') || description.includes('cone') || description.includes('training')) {
              // Assign a monetary value for visualization (you can adjust these values)
              breakdown.equipment += 50000; // 50,000 UGX equivalent
            } else if (description.includes('jersey') || description.includes('uniform') || description.includes('kit')) {
              breakdown.jerseys += 75000; // 75,000 UGX equivalent
            } else if (description.includes('refreshment') || description.includes('water') || description.includes('drink') || description.includes('snack')) {
              breakdown.refreshments += 25000; // 25,000 UGX equivalent
            } else {
              breakdown.other += 30000; // 30,000 UGX equivalent
            }
          }
        });

        setContributionData(breakdown);
      } catch (error) {
        console.error('Error loading contribution data:', error);
        // Set default data on error
        setContributionData({
          monetary: 0,
          equipment: 0,
          jerseys: 0,
          refreshments: 0,
          other: 0,
        });
      } finally {
        setLoading(false);
      }
    };

    loadContributionData();
  }, []);

  // Filter out categories with zero values for better visualization
  const nonZeroData = Object.entries(contributionData).filter(([_, value]) => value > 0);
  
  const data = {
    labels: nonZeroData.map(([key]) => {
      switch (key) {
        case 'monetary': return 'Monetary';
        case 'equipment': return 'Equipment';
        case 'jerseys': return 'Jerseys & Kits';
        case 'refreshments': return 'Refreshments';
        case 'other': return 'Other';
        default: return key;
      }
    }),
    datasets: [
      {
        data: nonZeroData.map(([_, value]) => value),
        backgroundColor: [
          'rgba(79, 79, 230, 0.8)',
          'rgba(225, 29, 42, 0.8)',
          'rgba(34, 197, 94, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(107, 114, 128, 0.8)',
        ].slice(0, nonZeroData.length),
        borderColor: [
          'rgba(79, 79, 230, 1)',
          'rgba(225, 29, 42, 1)',
          'rgba(34, 197, 94, 1)',
          'rgba(245, 158, 11, 1)',
          'rgba(107, 114, 128, 1)',
        ].slice(0, nonZeroData.length),
        borderWidth: 2,
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
          usePointStyle: true,
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
            const total = context.dataset.data.reduce((sum: number, val: any) => sum + val, 0);
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
            return `${label}: ${formatUGX(value)} (${percentage}%)`;
          }
        }
      },
    },
    cutout: '60%',
  };

  const totalContributions = Object.values(contributionData).reduce((sum, val) => sum + val, 0);

  return (
    <Card
      title="Contribution Breakdown"
      subtitle="Current month contributions by category (UGX)"
      className={className}
    >
      {loading ? (
        <div className="h-80 flex items-center justify-center">
          <LoadingSpinner size="md" />
        </div>
      ) : totalContributions > 0 ? (
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
      ) : (
        <div className="h-80 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No Contributions Yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              No contributions recorded for this month
            </p>
          </div>
        </div>
      )}
    </Card>
  );
};

export default ContributionsChart;
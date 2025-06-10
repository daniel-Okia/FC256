import React, { useState, useEffect } from 'react';
import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  ChartOptions,
} from 'chart.js';
import { Users, TrendingUp } from 'lucide-react';
import Card from '../../components/ui/Card';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { MemberService } from '../../services/firestore';
import { Member, PositionDistribution } from '../../types';

ChartJS.register(ArcElement, Tooltip, Legend);

interface PositionChartProps {
  className?: string;
}

const PositionChart: React.FC<PositionChartProps> = ({ className }) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [positionData, setPositionData] = useState<PositionDistribution[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMembersData = async () => {
      try {
        setLoading(true);
        const membersData = await MemberService.getAllMembers();
        
        // Filter out coaches and managers to show only player positions
        const players = membersData.filter(member => 
          member.position !== 'Coach' && 
          member.position !== 'Manager' &&
          member.status === 'active'
        );
        
        setMembers(players);
        
        // Calculate position distribution
        const positionCounts = players.reduce((acc, member) => {
          acc[member.position] = (acc[member.position] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        const distribution = Object.entries(positionCounts).map(([position, count]) => ({
          position,
          count,
          percentage: Math.round((count / players.length) * 100),
        }));
        
        setPositionData(distribution);
      } catch (error) {
        console.error('Error loading members data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadMembersData();

    // Set up real-time listener
    const unsubscribe = MemberService.subscribeToMembers((membersData) => {
      const players = membersData.filter(member => 
        member.position !== 'Coach' && 
        member.position !== 'Manager' &&
        member.status === 'active'
      );
      
      setMembers(players);
      
      const positionCounts = players.reduce((acc, member) => {
        acc[member.position] = (acc[member.position] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const distribution = Object.entries(positionCounts).map(([position, count]) => ({
        position,
        count,
        percentage: Math.round((count / players.length) * 100),
      }));
      
      setPositionData(distribution);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Color palette for different positions
  const colors = [
    '#4f46e5', // Primary blue
    '#eab308', // Yellow
    '#f43f5e', // Secondary red
    '#22c55e', // Green
    '#f59e0b', // Orange
    '#8b5cf6', // Purple
    '#06b6d4', // Cyan
    '#ef4444', // Red
    '#84cc16', // Lime
    '#f97316', // Orange
    '#ec4899', // Pink
    '#6366f1', // Indigo
  ];

  const data = {
    labels: positionData.map(item => item.position),
    datasets: [
      {
        data: positionData.map(item => item.count),
        backgroundColor: colors.slice(0, positionData.length),
        borderColor: colors.slice(0, positionData.length).map(color => color),
        borderWidth: 2,
        hoverBorderWidth: 3,
      },
    ],
  };

  const options: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 20,
          usePointStyle: true,
          font: {
            size: 12,
          },
          color: document.documentElement.classList.contains('dark') ? '#D1D5DB' : '#4B5563',
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
        callbacks: {
          label: function(context) {
            const position = positionData[context.dataIndex];
            return `${position.position}: ${position.count} players (${position.percentage}%)`;
          },
        },
      },
    },
    cutout: '60%',
  };

  if (loading) {
    return (
      <Card
        title="Squad Position Distribution"
        subtitle="Active player positions breakdown"
        className={className}
      >
        <div className="h-80 flex items-center justify-center">
          <LoadingSpinner size="md" />
        </div>
      </Card>
    );
  }

  return (
    <Card
      title="Squad Position Distribution"
      subtitle={`Active players by position (${members.length} players)`}
      className={className}
    >
      {positionData.length > 0 ? (
        <div>
          {/* Summary Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                    Total Players
                  </p>
                  <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                    {members.length}
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
                    Positions
                  </p>
                  <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                    {positionData.length}
                  </p>
                </div>
                <div className="p-2 bg-green-200 dark:bg-green-800 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl p-4 border border-purple-200 dark:border-purple-800 col-span-2 lg:col-span-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-purple-600 dark:text-purple-400">
                    Most Common
                  </p>
                  <p className="text-lg font-bold text-purple-900 dark:text-purple-100">
                    {positionData.length > 0 ? positionData.reduce((prev, current) => 
                      prev.count > current.count ? prev : current
                    ).position : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className="h-80 bg-gradient-to-br from-gray-50/50 to-white dark:from-gray-800/50 dark:to-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <Doughnut data={data} options={options} />
          </div>

          {/* Position Details */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {positionData
              .sort((a, b) => b.count - a.count)
              .map((position, index) => (
                <div
                  key={position.position}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: colors[index] }}
                    />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {position.position}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                      {position.count}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                      ({position.percentage}%)
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      ) : (
        <div className="h-80 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
              <Users className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No Player Data Available
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              No active players found to display position distribution.
            </p>
          </div>
        </div>
      )}
    </Card>
  );
};

export default PositionChart;
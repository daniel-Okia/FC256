import React from 'react';
import { Calendar, MapPin, Clock } from 'lucide-react';
import { Event } from '../../types';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { formatDate } from '../../utils/date-utils';

interface UpcomingEventsProps {
  className?: string;
}

const UpcomingEvents: React.FC<UpcomingEventsProps> = ({ className }) => {
  // Mock data for demonstration
  const events: Event[] = [
    {
      id: '1',
      type: 'training',
      date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
      time: '19:00',
      location: 'Main Field',
      description: 'Focus on passing and tactical play',
      createdBy: '1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: '2',
      type: 'friendly',
      date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
      time: '15:00',
      location: 'Victory Park',
      description: 'Preparation for the tournament',
      opponent: 'FC Victory',
      createdBy: '1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: '3',
      type: 'training',
      date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days from now
      time: '19:00',
      location: 'Main Field',
      description: 'Fitness and conditioning',
      createdBy: '1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  return (
    <Card
      title="Upcoming Events"
      subtitle="Next scheduled training sessions and friendlies"
      className={className}
    >
      <div className="space-y-4">
        {events.map((event) => (
          <div
            key={event.id}
            className="p-4 bg-gray-50 dark:bg-neutral-700/30 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-700/50 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <Badge
                variant={event.type === 'training' ? 'primary' : 'secondary'}
              >
                {event.type === 'training' ? 'Training' : `Friendly vs ${event.opponent}`}
              </Badge>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {formatDate(event.date)}
              </span>
            </div>
            <p className="font-medium text-gray-900 dark:text-white mb-2">
              {event.description || (event.type === 'training' ? 'Regular Training Session' : `Match against ${event.opponent}`)}
            </p>
            <div className="flex flex-col space-y-1">
              <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                <Clock size={16} className="mr-2" />
                {event.time}
              </div>
              <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                <MapPin size={16} className="mr-2" />
                {event.location}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default UpcomingEvents;
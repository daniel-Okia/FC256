import React, { useState, useEffect } from 'react';
import { Calendar, MapPin, Clock } from 'lucide-react';
import { Event } from '../../types';
import { EventService } from '../../services/firestore';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatDate } from '../../utils/date-utils';

interface UpcomingEventsProps {
  className?: string;
}

const UpcomingEvents: React.FC<UpcomingEventsProps> = ({ className }) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUpcomingEvents = async () => {
      try {
        setLoading(true);
        const upcomingEvents = await EventService.getUpcomingEvents();
        // Limit to next 5 events
        setEvents(upcomingEvents.slice(0, 5));
      } catch (error) {
        console.error('Error loading upcoming events:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUpcomingEvents();

    // Set up real-time listener
    const unsubscribe = EventService.subscribeToEvents((allEvents) => {
      const now = new Date();
      const upcoming = allEvents
        .filter(event => new Date(event.date) >= now)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(0, 5);
      setEvents(upcoming);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <Card
        title="Upcoming Events"
        subtitle="Next scheduled training sessions and friendlies"
        className={className}
      >
        <div className="flex justify-center py-8">
          <LoadingSpinner size="md" />
        </div>
      </Card>
    );
  }

  return (
    <Card
      title="Upcoming Events"
      subtitle="Next scheduled training sessions and friendlies"
      className={className}
    >
      <div className="space-y-4">
        {events.length > 0 ? (
          events.map((event) => (
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
          ))
        ) : (
          <div className="text-center py-8">
            <Calendar size={48} className="mx-auto text-gray-400 dark:text-gray-500 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No upcoming events scheduled</p>
          </div>
        )}
      </div>
    </Card>
  );
};

export default UpcomingEvents;
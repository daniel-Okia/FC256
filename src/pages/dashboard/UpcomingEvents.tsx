import React, { useState, useEffect } from 'react';
import { Calendar, MapPin, Clock, Trophy, Users } from 'lucide-react';
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
        
        // Get all events first
        const allEvents = await EventService.getAllEvents();
        
        // Filter for upcoming events (today and future)
        const now = new Date();
        now.setHours(0, 0, 0, 0); // Set to start of today
        
        const upcomingEvents = allEvents
          .filter(event => {
            const eventDate = new Date(event.date);
            eventDate.setHours(0, 0, 0, 0); // Set to start of event day
            return eventDate >= now;
          })
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()) // Earliest first for upcoming
          .slice(0, 5); // Limit to next 5 events
        
        console.log('All events:', allEvents.length);
        console.log('Upcoming events:', upcomingEvents.length);
        console.log('Upcoming events data:', upcomingEvents);
        
        setEvents(upcomingEvents);
      } catch (error) {
        console.error('Error loading upcoming events:', error);
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };

    loadUpcomingEvents();

    // Set up real-time listener
    const unsubscribe = EventService.subscribeToEvents((allEvents) => {
      try {
        const now = new Date();
        now.setHours(0, 0, 0, 0); // Set to start of today
        
        const upcoming = allEvents
          .filter(event => {
            const eventDate = new Date(event.date);
            eventDate.setHours(0, 0, 0, 0); // Set to start of event day
            return eventDate >= now;
          })
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()) // Earliest first for upcoming
          .slice(0, 5);
        
        console.log('Real-time update - upcoming events:', upcoming.length);
        setEvents(upcoming);
        setLoading(false);
      } catch (error) {
        console.error('Error processing real-time events:', error);
        setEvents([]);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const getEventIcon = (event: Event) => {
    return event.type === 'training' ? (
      <Users size={20} className="text-primary-600 dark:text-primary-400" />
    ) : (
      <Trophy size={20} className="text-secondary-600 dark:text-secondary-400" />
    );
  };

  const getEventBadgeVariant = (event: Event) => {
    return event.type === 'training' ? 'primary' : 'secondary';
  };

  const getEventTitle = (event: Event) => {
    if (event.type === 'training') {
      return event.description || 'Training Session';
    } else {
      return `Friendly vs ${event.opponent || 'TBD'}`;
    }
  };

  const isToday = (dateString: string) => {
    const today = new Date();
    const eventDate = new Date(dateString);
    return today.toDateString() === eventDate.toDateString();
  };

  const isTomorrow = (dateString: string) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const eventDate = new Date(dateString);
    return tomorrow.toDateString() === eventDate.toDateString();
  };

  const getRelativeDate = (dateString: string) => {
    if (isToday(dateString)) {
      return 'Today';
    } else if (isTomorrow(dateString)) {
      return 'Tomorrow';
    } else {
      return formatDate(dateString);
    }
  };

  if (loading) {
    return (
      <Card
        title="Upcoming Events"
        subtitle="Next scheduled training sessions and friendly matches"
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
      subtitle="Next scheduled training sessions and friendly matches"
      className={className}
    >
      <div className="space-y-4">
        {events.length > 0 ? (
          events.map((event) => (
            <div
              key={event.id}
              className="group p-4 bg-gray-50 dark:bg-neutral-700/30 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-700/50 transition-all duration-200 border border-transparent hover:border-gray-200 dark:hover:border-gray-600 cursor-pointer"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    {getEventIcon(event)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Badge
                      variant={getEventBadgeVariant(event)}
                      className="mb-2"
                    >
                      {event.type === 'training' ? 'Training' : 'Friendly Match'}
                    </Badge>
                    <h4 className="font-medium text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                      {getEventTitle(event)}
                    </h4>
                  </div>
                </div>
                <div className="flex-shrink-0 text-right">
                  <span className={`text-sm font-medium ${
                    isToday(event.date) 
                      ? 'text-green-600 dark:text-green-400' 
                      : isTomorrow(event.date)
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    {getRelativeDate(event.date)}
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="flex items-center text-gray-600 dark:text-gray-400">
                  <Clock size={16} className="mr-2 flex-shrink-0" />
                  <span>{event.time}</span>
                </div>
                <div className="flex items-center text-gray-600 dark:text-gray-400">
                  <MapPin size={16} className="mr-2 flex-shrink-0" />
                  <span className="truncate">{event.location}</span>
                </div>
              </div>

              {event.description && event.type === 'training' && (
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                    {event.description}
                  </p>
                </div>
              )}

              {event.type === 'friendly' && event.description && (
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                    {event.description}
                  </p>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
              <Calendar size={32} className="text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No Upcoming Events
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              No training sessions or friendly matches are scheduled for the coming days.
            </p>
            <div className="flex justify-center space-x-3">
              <a
                href="/training"
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
              >
                <Users size={16} className="mr-1" />
                Schedule Training
              </a>
              <a
                href="/friendlies"
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-secondary-600 dark:text-secondary-400 hover:text-secondary-700 dark:hover:text-secondary-300 transition-colors"
              >
                <Trophy size={16} className="mr-1" />
                Schedule Friendly
              </a>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default UpcomingEvents;
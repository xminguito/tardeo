import { Calendar as BigCalendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/es';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import type { Activity } from '../types/activity.types';

moment.locale('es');
const localizer = momentLocalizer(moment);

interface ActivityCalendarProps {
  activities: Activity[];
  onSelectActivity: (activity: Activity) => void;
}

export function ActivityCalendar({ activities, onSelectActivity }: ActivityCalendarProps) {
  const events = activities.map((activity) => ({
    id: activity.id,
    title: activity.title,
    start: new Date(activity.date),
    end: new Date(activity.date),
    resource: activity,
  }));

  return (
    <div className="h-[600px] bg-card rounded-lg p-4">
      <BigCalendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        onSelectEvent={(event) => onSelectActivity(event.resource)}
        views={['month', 'week', 'day']}
        messages={{
          next: 'Siguiente',
          previous: 'Anterior',
          today: 'Hoy',
          month: 'Mes',
          week: 'Semana',
          day: 'Día',
        }}
      />
    </div>
  );
}

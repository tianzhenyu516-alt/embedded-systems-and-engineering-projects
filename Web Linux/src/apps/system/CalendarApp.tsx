import { useState } from 'react';
import { ChevronLeft, ChevronRight, Clock, MapPin } from 'lucide-react';

const events = [
  { id: 1, day: 5, title: 'Team Meeting', time: '10:00 AM', location: 'Room 302', color: 'bg-blue-500' },
  { id: 2, day: 12, title: 'Project Deadline', time: '5:00 PM', location: 'Office', color: 'bg-red-500' },
  { id: 3, day: 15, title: 'Dentist Appt', time: '2:30 PM', location: 'Dental Clinic', color: 'bg-green-500' },
  { id: 4, day: 20, title: 'Birthday Party', time: '7:00 PM', location: 'Home', color: 'bg-purple-500' },
  { id: 5, day: 25, title: 'Conference', time: '9:00 AM', location: 'Convention Center', color: 'bg-orange-500' },
];

export default function CalendarApp() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(currentDate.getDate());
  const [view, setView] = useState<'month' | 'week'>('month');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = currentDate.toLocaleString('en', { month: 'long' });

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const today = new Date().getDate();
  const isToday = (d: number) => d === today && month === new Date().getMonth() && year === new Date().getFullYear();

  const dayEvents = events.filter((e) => e.day === selectedDay);

  return (
    <div className="flex h-full">
      <div className="flex-1 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{monthName} {year}</h2>
          <div className="flex items-center gap-2">
            <button onClick={() => setView(view === 'month' ? 'week' : 'month')} className="text-xs px-3 py-1 rounded-full bg-black/5 dark:bg-white/5 hover:bg-black/10">
              {view === 'month' ? 'Week' : 'Month'}
            </button>
            <button onClick={prevMonth} className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"><ChevronLeft size={18} /></button>
            <button onClick={nextMonth} className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"><ChevronRight size={18} /></button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} className="text-center text-xs font-medium text-gray-500 py-1">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dayEvts = events.filter((e) => e.day === day);
            return (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`aspect-square rounded-lg flex flex-col items-center justify-start pt-1 text-sm transition-all ${
                  selectedDay === day ? 'bg-blue-500 text-white' : isToday(day) ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300' : 'hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                {day}
                <div className="flex gap-0.5 mt-0.5">
                  {dayEvts.slice(0, 3).map((e) => (
                    <div key={e.id} className={`w-1 h-1 rounded-full ${selectedDay === day ? 'bg-white' : e.color}`} />
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>
      <div className="w-56 border-l border-gray-200/30 dark:border-gray-700/30 p-4">
        <h3 className="text-sm font-semibold mb-3">{monthName} {selectedDay}</h3>
        {dayEvents.length === 0 ? (
          <p className="text-xs text-gray-500">No events</p>
        ) : (
          <div className="space-y-2">
            {dayEvents.map((e) => (
              <div key={e.id} className={`p-2 rounded-lg ${e.color} bg-opacity-20 dark:bg-opacity-20 bg-current`}>
                <div className="text-xs font-medium">{e.title}</div>
                <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                  <Clock size={10} /> {e.time}
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <MapPin size={10} /> {e.location}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

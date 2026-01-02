import React, { useState, memo, useMemo, useCallback } from 'react';
import { TimelineEvent } from '../types';
import { Card, Button, Modal, Input, Spinner } from './ui';
import { suggestTimeline } from '../services/geminiService';
import { CalendarIcon, PlusIcon, SparklesIcon, MapPinIcon } from './icons';

interface TimelineProps {
  initialEvents: TimelineEvent[];
  tripDuration: number;
  tripDestination: string;
  tripStartDate: string; // YYYY-MM-DD
  isAdmin: boolean;
  onUpdateEvents: (updatedEvents: TimelineEvent[]) => void;
}

const Timeline: React.FC<TimelineProps> = memo(({ initialEvents, tripDuration, tripDestination, tripStartDate, isAdmin, onUpdateEvents }) => {
  const [events, setEvents] = useState<TimelineEvent[]>(initialEvents);
  
  const [isAISuggestModalOpen, setIsAISuggestModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isEditDayTitleModalOpen, setIsEditDayTitleModalOpen] = useState(false);
  const [isAddEventModalOpen, setIsAddEventModalOpen] = useState(false);

  const [isAISuggesting, setIsAISuggesting] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<Omit<TimelineEvent, 'id'>[]>([]);
  const [interests, setInterests] = useState('');
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  
  const [editingEvent, setEditingEvent] = useState<TimelineEvent | null>(null);
  const [editingDayNumber, setEditingDayNumber] = useState<number | null>(null);
  const [editingDayTitleValue, setEditingDayTitleValue] = useState('');
  const [newEvent, setNewEvent] = useState<Partial<TimelineEvent>>({ day: 1, time: '09:00', activity: '', description: '', location: '', locationUrl: '' });
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set());
  const activeEventRef = React.useRef<HTMLDivElement>(null);
  const [liveTime, setLiveTime] = useState(new Date());
  
  // Tính ngày hiện tại của chuyến đi
  const getCurrentTripDay = () => {
    const now = new Date();
    const start = new Date(tripStartDate);
    start.setHours(0, 0, 0, 0); // Reset về đầu ngày
    const diffTime = now.getTime() - start.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays >= 1 && diffDays <= tripDuration ? diffDays : null;
  };
  
  const getCurrentTime = () => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  };
  
  const isEventActive = (event: TimelineEvent, allDayEvents: TimelineEvent[]) => {
    const currentDay = getCurrentTripDay();
    if (!currentDay || event.day !== currentDay) return false;
    
    const currentTime = getCurrentTime();
    const [currentHour, currentMin] = currentTime.split(':').map(Number);
    const currentMinutes = currentHour * 60 + currentMin;
    
    const [eventHour, eventMin] = event.time.split(':').map(Number);
    const eventStartMinutes = eventHour * 60 + eventMin;
    
    // Tìm event tiếp theo để xác định khoảng thời gian
    const sortedEvents = [...allDayEvents].sort((a, b) => a.time.localeCompare(b.time));
    const currentIndex = sortedEvents.findIndex(e => e.id === event.id);
    const nextEvent = sortedEvents[currentIndex + 1];
    
    let eventEndMinutes: number;
    if (nextEvent) {
      const [nextHour, nextMin] = nextEvent.time.split(':').map(Number);
      eventEndMinutes = nextHour * 60 + nextMin;
    } else {
      // Nếu là event cuối cùng, giả sử kéo dài 2 tiếng
      eventEndMinutes = eventStartMinutes + 120;
    }
    
    // Active nếu thời gian hiện tại nằm TRONG khoảng
    return currentMinutes >= eventStartMinutes && currentMinutes < eventEndMinutes;
  };
  
  const currentDay = getCurrentTripDay();
  const currentTime = getCurrentTime();
  
  // Chỉ expand ngày hiện tại, các ngày khác thu gọn
  React.useEffect(() => {
    const today = getCurrentTripDay();
    if (today) {
      setExpandedDays(new Set([today]));
    } else {
      // Nếu không trong thời gian chuyến đi, mở tất cả
      const allDays = new Set(events.map(e => e.day));
      setExpandedDays(allDays);
    }
  }, [tripStartDate]);
  
  // Auto-scroll đến event đang active
  React.useEffect(() => {
    if (activeEventRef.current) {
      setTimeout(() => {
        activeEventRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300); // Đợi expand animation hoàn tất
    }
  }, [expandedDays, currentDay]);
  
  // Cập nhật đồng hồ mỗi giây
  React.useEffect(() => {
    const timer = setInterval(() => {
      setLiveTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleGetAISuggestions = useCallback(async () => {
    if (!interests) return;
    setIsAISuggesting(true);
    setAiSuggestions([]);
    const suggestions = await suggestTimeline(tripDestination, selectedDay || tripDuration, interests, selectedDay);
    setAiSuggestions(suggestions);
    setIsAISuggesting(false);
  }, [interests, tripDestination, selectedDay, tripDuration]);
  
  const handleOpenDayTitleEdit = useCallback((dayNumber: number) => {
    const dayEvent = events.find(e => e.day === dayNumber);
    setEditingDayNumber(dayNumber);
    setEditingDayTitleValue(dayEvent?.dayTitle || `Ngày ${dayNumber}`);
    setIsEditDayTitleModalOpen(true);
  }, [events]);
  
  const handleSaveDayTitle = useCallback(() => {
    if (editingDayNumber === null) return;
    const updatedEvents = events.map(e => 
      e.day === editingDayNumber ? { ...e, dayTitle: editingDayTitleValue } : e
    );
    setEvents(updatedEvents);
    onUpdateEvents(updatedEvents);
    setIsEditDayTitleModalOpen(false);
    setEditingDayNumber(null);
  }, [editingDayNumber, editingDayTitleValue, events, onUpdateEvents]);
  
  const handleOpenAddEventModal = useCallback(() => {
    setNewEvent({ day: 1, time: '09:00', activity: '', description: '', location: '', locationUrl: '' });
    setIsAddEventModalOpen(true);
  }, []);
  
  const handleAddEvent = useCallback(() => {
    if (!newEvent.activity || !newEvent.description) {
      alert('Vui lòng nhập tên hoạt động và mô tả');
      return;
    }
    
    const eventToAdd: TimelineEvent = {
      id: `event-${Date.now()}`,
      day: newEvent.day || 1,
      time: newEvent.time || '09:00',
      activity: newEvent.activity,
      description: newEvent.description,
      location: newEvent.location || '',
      locationUrl: newEvent.locationUrl || '',
      dayTitle: newEvent.dayTitle
    };
    
    const updatedEvents = [...events, eventToAdd].sort((a,b) => a.day - b.day || a.time.localeCompare(b.time));
    setEvents(updatedEvents);
    onUpdateEvents(updatedEvents);
    setIsAddEventModalOpen(false);
  }, [newEvent, events, onUpdateEvents]);
  
  const toggleDayExpanded = useCallback((day: number) => {
    setExpandedDays(prev => {
      const newSet = new Set(prev);
      if (newSet.has(day)) {
        newSet.delete(day);
      } else {
        newSet.add(day);
      }
      return newSet;
    });
  }, []);

  const addSuggestionToTimeline = useCallback((suggestion: Omit<TimelineEvent, 'id'>) => {
    const newEvent = { ...suggestion, id: Date.now().toString() };
    const updatedEvents = [...events, newEvent].sort((a,b) => a.day - b.day || a.time.localeCompare(b.time));
    setEvents(updatedEvents);
    onUpdateEvents(updatedEvents);
    setAiSuggestions(prev => prev.filter(s => s !== suggestion));
  }, [events, onUpdateEvents]);

  const handleOpenEditModal = useCallback((event: TimelineEvent) => {
    setEditingEvent(event);
    setIsEditModalOpen(true);
  }, []);

  const handleUpdateEvent = useCallback(() => {
    if (!editingEvent) return;
    const updatedEvents = events.map(e => e.id === editingEvent.id ? editingEvent : e);
    setEvents(updatedEvents);
    onUpdateEvents(updatedEvents);
    setIsEditModalOpen(false);
    setEditingEvent(null);
  }, [editingEvent, events, onUpdateEvents]);

  const handleDeleteEvent = useCallback((eventId: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa sự kiện này không?')) {
        const updatedEvents = events.filter(e => e.id !== eventId);
        setEvents(updatedEvents);
        onUpdateEvents(updatedEvents);
    }
  }, [events, onUpdateEvents]);
  
  const eventsByDay = useMemo(() => {
    const grouped = events.reduce((acc, event) => {
      (acc[event.day] = acc[event.day] || []).push(event);
      return acc;
    }, {} as Record<number, TimelineEvent[]>);

    Object.entries(grouped).forEach(([, dayEvents]) => {
      dayEvents.sort((a, b) => a.time.localeCompare(b.time));
    });
    return grouped;
  }, [events]);

  const getNextEvent = () => {
    if (!currentDay) return null;
    const todayEvents = Object.entries(eventsByDay)
      .filter(([day]) => parseInt(day) === currentDay)
      .flatMap(([_, events]) => events)
      .sort((a, b) => a.time.localeCompare(b.time));
    
    const currentMinutes = liveTime.getHours() * 60 + liveTime.getMinutes();
    return todayEvents.find(event => {
      const [hour, min] = event.time.split(':').map(Number);
      const eventMinutes = hour * 60 + min;
      return eventMinutes > currentMinutes;
    });
  };
  
  const getTimeUntilNextEvent = () => {
    const nextEvent = getNextEvent();
    if (!nextEvent) return null;
    
    const [hour, min] = nextEvent.time.split(':').map(Number);
    const eventTime = new Date(liveTime);
    eventTime.setHours(hour, min, 0, 0);
    
    const diff = eventTime.getTime() - liveTime.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    return { hours, minutes, seconds, event: nextEvent };
  };
  
  const timeUntilNext = getTimeUntilNextEvent();

  return (
    <Card>
      {currentDay && timeUntilNext && (
        <div className="mb-4 p-4 bg-gradient-to-r from-indigo-600/20 to-purple-600/20 border border-indigo-500/30 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs text-gray-400 mb-1">Hoạt động tiếp theo</p>
              <p className="text-lg font-bold text-white mb-1">{timeUntilNext.event.activity}</p>
              <p className="text-sm text-gray-300">📍 {timeUntilNext.event.time}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400 mb-1">Còn lại</p>
              <div className="flex gap-2">
                {timeUntilNext.hours > 0 && (
                  <div className="text-center">
                    <div className="text-2xl font-bold text-indigo-300">{String(timeUntilNext.hours).padStart(2, '0')}</div>
                    <div className="text-xs text-gray-400">giờ</div>
                  </div>
                )}
                <div className="text-center">
                  <div className="text-2xl font-bold text-indigo-300">{String(timeUntilNext.minutes).padStart(2, '0')}</div>
                  <div className="text-xs text-gray-400">phút</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400 animate-pulse">{String(timeUntilNext.seconds).padStart(2, '0')}</div>
                  <div className="text-xs text-gray-400">giây</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3 whitespace-nowrap">
          <CalendarIcon className="w-6 h-6 text-indigo-300" />
          <h3 className="text-xl font-bold text-white">Lịch trình</h3>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Button onClick={handleOpenAddEventModal} variant="secondary" className="flex items-center gap-2">
              <PlusIcon className="w-5 h-5"/>
              <span className="hidden sm:inline">Thêm hoạt động</span>
            </Button>
            <Button onClick={() => setIsAISuggestModalOpen(true)} variant="secondary" className="flex items-center gap-2">
              <SparklesIcon className="w-5 h-5"/>
              <span className="hidden sm:inline">Gợi ý từ AI</span>
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-4">
        {Object.keys(eventsByDay).length > 0 ? Object.entries(eventsByDay).map(([day, dayEvents]) => {
          const dayTitle = dayEvents[0]?.dayTitle || `Ngày ${day}`;
          const dayNum = parseInt(day);
          const isExpanded = expandedDays.has(dayNum);
          return (
          <div key={day} className="border border-gray-700 rounded-lg p-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggleDayExpanded(dayNum)}
                  className={`text-indigo-400 hover:text-indigo-300 transform transition-transform ${isExpanded ? 'rotate-90' : 'rotate-0'}`}
                  aria-label={isExpanded ? 'Thu gọn' : 'Mở rộng'}
                  title={isExpanded ? 'Thu gọn' : 'Mở rộng'}
                >
                  ▶
                </button>
                <h4 className="font-bold text-lg text-indigo-300">{dayTitle}</h4>
                <span className="text-xs text-gray-500">({dayEvents.length} hoạt động)</span>
              </div>
              {isAdmin && (
                <button
                  onClick={() => handleOpenDayTitleEdit(dayNum)}
                  className="text-xs text-blue-400 hover:text-blue-300 px-2 py-1 rounded bg-blue-500/10 hover:bg-blue-500/20"
                  title="Sửa tiêu đề ngày"
                >
                  ✏️ Sửa tiêu đề
                </button>
              )}
            </div>
            {isExpanded && (
            <div className="relative border-l-2 border-gray-700 space-y-6 ml-4">
              {dayEvents.map(event => {
                const isActive = isEventActive(event, dayEvents);
                return (
                <div 
                  key={event.id} 
                  ref={isActive ? activeEventRef : null}
                  className={`relative pl-8 group ${
                  isActive ? 'bg-indigo-500/10 border border-indigo-500/30 rounded-lg p-3 -ml-3' : ''
                }`}>
                  <div className={`absolute ${isActive ? '-left-[8px]' : '-left-[11px]'} top-1 h-5 w-5 rounded-full border-4 border-gray-800 ${
                    isActive ? 'bg-green-500 animate-pulse' : 'bg-indigo-500'
                  }`}></div>
                  {isActive && (
                    <div className="absolute -top-2 right-2 px-2 py-1 bg-green-500 text-white text-xs font-bold rounded-full animate-pulse">
                      Đang diễn ra
                    </div>
                  )}
                  <p className="font-semibold text-gray-400">{event.time}</p>
                  <p className="font-bold text-white">{event.activity}</p>
                  <p className="text-sm text-gray-300">{event.description}</p>
                  {(event.location || event.locationUrl) && (
                    <button
                        onClick={() => {
                          const url = event.locationUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location || 'Địa điểm')}`;
                          window.open(url, '_blank');
                        }}
                        className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors mt-1 inline-flex items-center gap-1 bg-indigo-500/10 px-2 py-1 rounded"
                        title="Mở trong Google Maps"
                    >
                        <MapPinIcon className="w-3 h-3"/> {event.location || 'Địa điểm'}
                    </button>
                  )}
                  
                  {isAdmin && (
                    <div className="absolute top-0 right-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleOpenEditModal(event)} className="p-1 rounded-full bg-gray-600/50 hover:bg-gray-500/50 text-white">&#9998;</button>
                        <button onClick={() => handleDeleteEvent(event.id)} className="p-1 rounded-full bg-gray-600/50 hover:bg-red-500/50 text-white">&times;</button>
                    </div>
                  )}
                </div>
              )})}
            </div>
            )}
          </div>
        )}) : (
            <div className="text-center py-10 text-gray-500">
                <CalendarIcon className="w-16 h-16 mx-auto mb-3 opacity-50" />
                <p className="font-medium">Lịch trình trống</p>
                <p className="text-sm">Hãy bắt đầu bằng cách sử dụng gợi ý từ AI!</p>
            </div>
        )}
      </div>

      <Modal isOpen={isAISuggestModalOpen} onClose={() => { setIsAISuggestModalOpen(false); setSelectedDay(null); }} title="Trợ lý lịch trình AI">
        <div className="space-y-4">
          <div>
            <label htmlFor="ai-day-select" className="block text-sm font-medium text-gray-300 mb-2">Tạo lịch trình cho:</label>
            <select 
              id="ai-day-select"
              value={selectedDay || 'all'}
              onChange={(e) => setSelectedDay(e.target.value === 'all' ? null : parseInt(e.target.value))}
              className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white"
              aria-label="Chọn ngày để tạo lịch trình"
            >
              <option value="all">Tất cả các ngày</option>
              {Array.from({ length: tripDuration }, (_, i) => {
                const dayNum = i + 1;
                const dayEvent = initialEvents.find(e => e.day === dayNum);
                const dayTitle = dayEvent?.dayTitle || `Ngày ${dayNum}`;
                return <option key={dayNum} value={dayNum}>{dayTitle}</option>;
              })}
            </select>
          </div>
          <Input 
            label="Sở thích của bạn là gì?"
            placeholder="v.d., ẩm thực, lịch sử, đi bộ đường dài"
            value={interests}
            onChange={(e) => setInterests(e.target.value)}
          />
          <Button onClick={handleGetAISuggestions} className="w-full" disabled={isAISuggesting || !interests}>
            {isAISuggesting ? <Spinner /> : <><SparklesIcon className="w-5 h-5"/> Tạo ý tưởng</>}
          </Button>
          {aiSuggestions.length > 0 && (
            <div className="space-y-2 max-h-60 overflow-y-auto pt-4 mt-4 border-t border-gray-700">
              <h4 className="font-semibold text-gray-200">Gợi ý:</h4>
              {aiSuggestions.map((s, i) => (
                <div key={i} className="bg-gray-700/50 p-3 rounded-lg flex justify-between items-start">
                  <div>
                    <p className="font-bold text-white">Ngày {s.day} @ {s.time}: {s.activity}</p>
                    <p className="text-sm text-gray-300">{s.description}</p>
                  </div>
                  <Button variant="ghost" onClick={() => addSuggestionToTimeline(s)} title="Thêm vào dòng thời gian">
                    <PlusIcon className="w-5 h-5"/>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {editingEvent && (
        <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Chỉnh sửa sự kiện">
            <div className="space-y-4">
                <Input label="Hoạt động" value={editingEvent.activity} onChange={e => setEditingEvent({...editingEvent, activity: e.target.value})} />
                <Input label="Mô tả" value={editingEvent.description} onChange={e => setEditingEvent({...editingEvent, description: e.target.value})} />
                <div className="grid grid-cols-2 gap-4">
                    <Input label="Ngày" type="number" min="1" value={editingEvent.day} onChange={e => setEditingEvent({...editingEvent, day: parseInt(e.target.value) || 1})} />
                    <Input label="Thời gian" value={editingEvent.time} onChange={e => setEditingEvent({...editingEvent, time: e.target.value})} />
                </div>
                <Input 
                  label="Tên địa điểm" 
                  value={editingEvent.location || ''} 
                  onChange={e => setEditingEvent({...editingEvent, location: e.target.value})} 
                  placeholder="VD: Bảo tàng Lịch sử"
                />
                <Input 
                  label="Link Google Maps (tuỳ chọn)" 
                  value={editingEvent.locationUrl || ''} 
                  onChange={e => setEditingEvent({...editingEvent, locationUrl: e.target.value})} 
                  placeholder="VD: https://maps.app.goo.gl/..."
                />
                <Button onClick={handleUpdateEvent} className="w-full">Lưu thay đổi</Button>
            </div>
        </Modal>
      )}
      
      <Modal isOpen={isEditDayTitleModalOpen} onClose={() => setIsEditDayTitleModalOpen(false)} title="Sửa tiêu đề ngày">
        <div className="space-y-4">
          <Input 
            label="Tiêu đề ngày"
            placeholder="v.d., Ngày khám phá, Ngày nghỉ ngơi"
            value={editingDayTitleValue}
            onChange={(e) => setEditingDayTitleValue(e.target.value)}
          />
          <Button onClick={handleSaveDayTitle} className="w-full">Lưu</Button>
        </div>
      </Modal>
      
      <Modal isOpen={isAddEventModalOpen} onClose={() => setIsAddEventModalOpen(false)} title="Thêm hoạt động mới">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Ngày" 
              type="number" 
              min="1" 
              max={tripDuration}
              value={newEvent.day} 
              onChange={e => setNewEvent({...newEvent, day: parseInt(e.target.value) || 1})} 
            />
            <Input 
              label="Thời gian" 
              value={newEvent.time} 
              onChange={e => setNewEvent({...newEvent, time: e.target.value})} 
              placeholder="HH:MM"
            />
          </div>
          <Input 
            label="Tên hoạt động" 
            value={newEvent.activity} 
            onChange={e => setNewEvent({...newEvent, activity: e.target.value})} 
            placeholder="v.d., Thăm quan bảo tàng"
          />
          <Input 
            label="Mô tả" 
            value={newEvent.description} 
            onChange={e => setNewEvent({...newEvent, description: e.target.value})} 
            placeholder="Mô tả chi tiết hoạt động"
          />
          <Input 
            label="Tên địa điểm (tuỳ chọn)" 
            value={newEvent.location || ''} 
            onChange={e => setNewEvent({...newEvent, location: e.target.value})} 
            placeholder="VD: Bảo tàng Lịch sử"
          />
          <Input 
            label="Link Google Maps (tuỳ chọn)" 
            value={newEvent.locationUrl || ''} 
            onChange={e => setNewEvent({...newEvent, locationUrl: e.target.value})} 
            placeholder="VD: https://maps.app.goo.gl/..."
          />
          <Button onClick={handleAddEvent} className="w-full">
            <PlusIcon className="w-5 h-5"/> Thêm vào lịch trình
          </Button>
        </div>
      </Modal>
    </Card>
  );
});

Timeline.displayName = 'Timeline';

export default Timeline;

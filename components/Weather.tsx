import React, { useState, useEffect } from 'react';
import { WeatherInfo } from '../types';
import { Card } from './ui';
import { SunIcon, MapPinIcon } from './icons';
// Mocked weather (local) — reverted to previous simple implementation.

interface WeatherProps {
  destination: string;
}

interface HourlyForecast {
  time: string;
  temp: number;
  condition: string;
  icon: string;
}

interface DailyForecast {
  date: string;
  dayName: string;
  high: number;
  low: number;
  condition: string;
  icon: string;
}

// Mock weather data. Replace with a real API call (e.g., OpenWeatherMap) if desired.
const fetchWeather = async (destination: string): Promise<WeatherInfo> => {
  console.log(`Fetching weather for ${destination} (mock)...`);
  await new Promise(res => setTimeout(res, 500)); // Simulate API delay
  
  const temps: { [key: string]: number } = {
    "paris": 22,
    "tokyo": 28,
    "new york": 19,
    "hanoi": 32,
    "đà lạt": 18,
  };
  
  return {
    location: destination,
    temperature: temps[destination.toLowerCase()] || 25,
    condition: 'Nắng, có mây rải rác',
    icon: '☀️',
  };
};

const fetchHourlyForecast = async (destination: string): Promise<HourlyForecast[]> => {
  await new Promise(res => setTimeout(res, 300));
  const baseTemp = 25;
  const currentHour = new Date().getHours();
  
  return Array.from({ length: 12 }, (_, i) => {
    const hour = (currentHour + i) % 24;
    const temp = baseTemp + Math.sin(hour / 24 * Math.PI * 2) * 5;
    return {
      time: `${String(hour).padStart(2, '0')}:00`,
      temp: Math.round(temp),
      condition: hour >= 6 && hour <= 18 ? 'Nắng' : 'Ít mây',
      icon: hour >= 6 && hour <= 18 ? '☀️' : '🌙'
    };
  });
};

const fetchDailyForecast = async (destination: string): Promise<DailyForecast[]> => {
  await new Promise(res => setTimeout(res, 300));
  const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  const today = new Date();
  
  return [1, 2].map(offset => {
    const date = new Date(today);
    date.setDate(date.getDate() + offset);
    const dayName = days[date.getDay()];
    
    return {
      date: date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
      dayName,
      high: 28 + offset * 2,
      low: 18 + offset,
      condition: offset === 1 ? 'Nắng' : 'Mưa nhẹ',
      icon: offset === 1 ? '☀️' : '🌧️'
    };
  });
};

const Weather: React.FC<WeatherProps> = ({ destination }) => {
  const [weather, setWeather] = useState<WeatherInfo | null>(null);
  const [hourlyForecast, setHourlyForecast] = useState<HourlyForecast[]>([]);
  const [dailyForecast, setDailyForecast] = useState<DailyForecast[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadWeather = async () => {
      setLoading(true);
      const [weatherData, hourlyData, dailyData] = await Promise.all([
        fetchWeather(destination),
        fetchHourlyForecast(destination),
        fetchDailyForecast(destination)
      ]);
      setWeather(weatherData);
      setHourlyForecast(hourlyData);
      setDailyForecast(dailyData);
      setLoading(false);
    };
    loadWeather();
  }, [destination]);

  return (
    <Card className="flex flex-col">
        <h3 className="text-lg font-bold text-white mb-4">Thời tiết</h3>
        
        {loading ? (
             <div className="flex flex-col items-center gap-2 text-gray-400">
                <SunIcon className="w-10 h-10 animate-pulse" />
                <span>Đang tải thời tiết...</span>
            </div>
        ) : weather ? (
            <>
              {/* Thời tiết hiện tại */}
              <div className='flex items-center justify-between'>
                <div>
                  <div className="flex items-center gap-2 text-gray-300 mb-1">
                      <MapPinIcon className="w-4 h-4" />
                      <p className="font-semibold capitalize text-sm">{weather.location}</p>
                  </div>
                  <p className="text-3xl font-extrabold text-white">{weather.temperature}°C</p>
                  <p className="text-xs text-indigo-300">{weather.condition}</p>
                </div>
                <div className="text-5xl">{weather.icon}</div>
              </div>
              
              <div className="mt-4 space-y-4">
                  {/* Dự báo 2 ngày tới */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-400 mb-2">Dự báo 2 ngày tới</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {dailyForecast.map((day, i) => (
                        <div key={i} className="bg-gray-700/30 rounded-lg p-3 text-center">
                          <p className="text-xs text-gray-400">{day.dayName}, {day.date}</p>
                          <p className="text-2xl my-1">{day.icon}</p>
                          <p className="text-sm text-white">
                            <span className="text-red-400">{day.high}°</span> / 
                            <span className="text-blue-400">{day.low}°</span>
                          </p>
                          <p className="text-xs text-gray-300">{day.condition}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Dự báo từng giờ */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-400 mb-2">Dự báo theo giờ</h4>
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {hourlyForecast.slice(0, 8).map((hour, i) => (
                        <div key={i} className="bg-gray-700/30 rounded-lg p-2 text-center min-w-[60px]">
                          <p className="text-xs text-gray-400">{hour.time}</p>
                          <p className="text-xl my-1">{hour.icon}</p>
                          <p className="text-sm font-bold text-white">{hour.temp}°</p>
                        </div>
                      ))}
                    </div>
                  </div>
              </div>
            </>
        ) : (
            <p className="text-gray-400">Không thể tải dữ liệu thời tiết.</p>
        )}
    </Card>
  );
};

export default Weather;
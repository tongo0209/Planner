import React, { useState, useEffect, memo } from 'react';
import { WeatherInfo } from '../types';
import { Card } from './ui';
import { SunIcon, MapPinIcon } from './icons';
import { getWeatherInfo } from '../services/geminiService';

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

const Weather: React.FC<WeatherProps> = memo(({ destination }) => {
  const [weather, setWeather] = useState<WeatherInfo | null>(null);
  const [hourlyForecast, setHourlyForecast] = useState<HourlyForecast[]>([]);
  const [dailyForecast, setDailyForecast] = useState<DailyForecast[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadWeather = async () => {
      setLoading(true);
      try {
        const data = await getWeatherInfo(destination);
        setWeather({
          location: destination,
          temperature: data.current.temperature,
          condition: data.current.condition,
          icon: data.current.icon
        });
        setHourlyForecast(data.hourly.slice(0, 8));
        setDailyForecast(data.daily);
      } catch (error) {
        console.error('Error loading weather:', error);
      } finally {
        setLoading(false);
      }
    };
    
    // Load ngay lập tức
    loadWeather();
    
    // Tự động refresh mỗi 5 phút (300000ms)
    const refreshInterval = setInterval(() => {
      loadWeather();
    }, 5 * 60 * 1000);
    
    // Cleanup interval khi component unmount hoặc destination thay đổi
    return () => clearInterval(refreshInterval);
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
});

Weather.displayName = 'Weather';

export default Weather;
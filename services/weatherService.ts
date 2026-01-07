import { WeatherInfo } from '../types';

const OPENWEATHER_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY;

if (!OPENWEATHER_KEY) {
  console.warn('⚠️ VITE_OPENWEATHER_API_KEY không được set. Vui lòng thêm API key vào .env file');
}

const getWeatherEmoji = (weatherCode: number): string => {
  if (weatherCode >= 200 && weatherCode < 300) return '⛈️';
  if (weatherCode >= 300 && weatherCode < 400) return '🌧️';
  if (weatherCode >= 500 && weatherCode < 600) return '🌧️';
  if (weatherCode >= 600 && weatherCode < 700) return '❄️';
  if (weatherCode >= 700 && weatherCode < 800) return '🌫️';
  if (weatherCode === 800) return '☀️';
  if (weatherCode === 801 || weatherCode === 802) return '⛅';
  if (weatherCode === 803 || weatherCode === 804) return '☁️';
  return '🌤️';
};

const translateWeather = (description: string): string => {
  const translations: { [key: string]: string } = {
    'clear sky': 'Trời quang',
    'few clouds': 'Mây thưa',
    'scattered clouds': 'Mây rải rác',
    'broken clouds': 'Mây dày',
    'overcast clouds': 'Mây dày',
    'light rain': 'Mưa nhẹ',
    'moderate rain': 'Mưa vừa',
    'heavy rain': 'Mưa nặng',
    'freezing rain': 'Mưa đóng băng',
    'light snow': 'Tuyết nhẹ',
    'heavy snow': 'Tuyết nặng',
    'sleet': 'Mưa tuyết',
    'mist': 'Sương mù',
    'fog': 'Sương mù',
    'thunderstorm': 'Giông bão',
    'drizzle': 'Mưa phùn',
  };
  const lower = description.toLowerCase();
  return translations[lower] || description;
};

export interface WeatherResult {
  current: {
    temperature: number;
    condition: string;
    icon: string;
  };
  hourly: Array<{
    time: string;
    temp: number;
    condition: string;
    icon: string;
  }>;
  daily: Array<{
    date: string;
    dayName: string;
    high: number;
    low: number;
    condition: string;
    icon: string;
  }>;
}

async function geocode(destination: string) {
  const url = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(destination)}&limit=1&appid=${OPENWEATHER_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Không thể geocode địa điểm');
  const data = await res.json();
  if (!data || data.length === 0) throw new Error('Không tìm thấy địa điểm');
  return data[0];
}

export async function getWeather(destination: string): Promise<WeatherResult> {
  if (!OPENWEATHER_KEY) {
    throw new Error('OpenWeather API key chưa được cấu hình');
  }

  try {
    const geo = await geocode(destination);
    const lat = geo.lat;
    const lon = geo.lon;
    const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${OPENWEATHER_KEY}`;
    
    const res = await fetch(url);
    if (!res.ok) throw new Error('Lỗi lấy dữ liệu thời tiết');
    const data = await res.json();

    const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

    // Thời tiết hiện tại
    const currentData = data.list[0];
    const currentWeather = {
      temperature: Math.round(currentData.main.temp),
      condition: translateWeather(currentData.weather[0].description),
      icon: getWeatherEmoji(currentData.weather[0].id)
    };

    // Dự báo theo giờ (12 giờ tới)
    const hourly = data.list.slice(0, 12).map((forecast: any) => {
      const date = new Date(forecast.dt * 1000);
      return {
        time: date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        temp: Math.round(forecast.main.temp),
        condition: translateWeather(forecast.weather[0].description),
        icon: getWeatherEmoji(forecast.weather[0].id)
      };
    });

    // Dự báo hàng ngày
    const dailyMap = new Map<string, { temps: number[], descriptions: string[], codes: number[], date: Date }>();
    
    data.list.forEach((forecast: any) => {
      const date = new Date(forecast.dt * 1000);
      const dateStr = date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
      
      if (!dailyMap.has(dateStr)) {
        dailyMap.set(dateStr, {
          temps: [],
          descriptions: [],
          codes: [],
          date: date
        });
      }
      
      const dayData = dailyMap.get(dateStr)!;
      dayData.temps.push(forecast.main.temp_max, forecast.main.temp_min);
      dayData.descriptions.push(forecast.weather[0].description);
      dayData.codes.push(forecast.weather[0].id);
    });

    // Chuyển Map thành Array và xử lý
    const daily = Array.from(dailyMap.entries())
      .slice(1, 3) // Skip hôm nay, lấy 2 ngày tiếp theo
      .map(([dateStr, data]) => {
        const high = Math.round(Math.max(...data.temps));
        const low = Math.round(Math.min(...data.temps));
        // Lấy condition phổ biến nhất (giữa lưng của mảng)
        const midIdx = Math.floor(data.descriptions.length / 2);
        const condition = translateWeather(data.descriptions[midIdx]);
        const icon = getWeatherEmoji(data.codes[midIdx]);
        
        const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
        return {
          date: dateStr,
          dayName: dayNames[data.date.getDay()],
          high,
          low,
          condition,
          icon
        };
      });

    return { current: currentWeather, hourly, daily };
  } catch (error) {
    console.error('Lỗi khi lấy dữ liệu thời tiết từ OpenWeather:', error);
    throw error;
  }
}

export interface OneCallResult {
  current: any;
  hourly: any[];
  daily: any[];
  timezone_offset: number;
  timezone: string;
}

export async function fetchWeatherRealtime(destination: string): Promise<{
  weather: WeatherInfo | null;
  hourly: Array<{ dt: number; temp: number; weather: any }>;
  daily: Array<{ dt: number; high: number; low: number; weather: any }>;
  timezone_offset: number;
  timezone: string;
}> {
  try {
    const weatherResult = await getWeather(destination);
    return {
      weather: {
        location: destination,
        temperature: weatherResult.current.temperature,
        condition: weatherResult.current.condition,
        icon: weatherResult.current.icon
      },
      hourly: weatherResult.hourly.map((h, i) => ({ dt: i, temp: h.temp, weather: { main: h.condition } })),
      daily: weatherResult.daily.map((d, i) => ({ dt: i, high: d.high, low: d.low, weather: { main: d.condition } })),
      timezone_offset: 0,
      timezone: 'UTC'
    };
  } catch (error) {
    console.error('Lỗi khi lấy dữ liệu thời tiết real-time:', error);
    return {
      weather: null,
      hourly: [],
      daily: [],
      timezone_offset: 0,
      timezone: 'UTC'
    };
  }
}

export default {
  fetchWeatherRealtime,
  getWeather
};

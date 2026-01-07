import { WeatherInfo } from '../types';

const WEATHERAPI_KEY = import.meta.env.VITE_WEATHERAPI_KEY;

if (!WEATHERAPI_KEY) {
  console.warn('⚠️ VITE_WEATHERAPI_KEY không được set. Vui lòng thêm API key vào .env file');
}

// Dịch mô tả thời tiết sang Tiếng Việt
const translateWeather = (condition: string): string => {
  const translations: { [key: string]: string } = {
    'Sunny': 'Nắng',
    'Clear': 'Trời quang',
    'Partly cloudy': 'Mây thưa',
    'Cloudy': 'Có mây',
    'Overcast': 'Mây dày',
    'Mist': 'Sương mù',
    'Patchy rain nearby': 'Mưa rải rác',
    'Patchy snow nearby': 'Tuyết rải rác',
    'Patchy sleet nearby': 'Mưa tuyết rải rác',
    'Patchy freezing drizzle nearby': 'Mưa phùn rải rác',
    'Thundery outbreaks in nearby': 'Giông bão gần đó',
    'Blowing snow': 'Tuyết bay',
    'Blizzard': 'Bão tuyết',
    'Fog': 'Sương mù',
    'Freezing fog': 'Sương mù đóng băng',
    'Patchy light drizzle': 'Mưa phùn nhẹ',
    'Light drizzle': 'Mưa phùn',
    'Freezing drizzle': 'Mưa phùn đóng băng',
    'Heavy freezing drizzle': 'Mưa phùn đóng băng nặng',
    'Patchy light rain': 'Mưa nhẹ rải rác',
    'Light rain': 'Mưa nhẹ',
    'Moderate rain at times': 'Mưa vừa',
    'Moderate rain': 'Mưa vừa',
    'Heavy rain at times': 'Mưa nặng',
    'Heavy rain': 'Mưa nặng',
    'Light freezing rain': 'Mưa đóng băng nhẹ',
    'Moderate or heavy freezing rain': 'Mưa đóng băng',
    'Light sleet': 'Mưa tuyết nhẹ',
    'Moderate or heavy sleet': 'Mưa tuyết',
    'Patchy light snow': 'Tuyết nhẹ rải rác',
    'Light snow': 'Tuyết nhẹ',
    'Patchy moderate snow': 'Tuyết rải rác',
    'Moderate snow': 'Tuyết',
    'Patchy heavy snow': 'Tuyết nặng rải rác',
    'Heavy snow': 'Tuyết nặng',
    'Sleet': 'Mưa tuyết',
    'Freezing rain': 'Mưa đóng băng',
    'Thundery outbreaks possible': 'Có thể có giông bão',
    'Patchy light rain with thunder': 'Mưa nhẹ và giông',
    'Moderate or heavy rain with thunder': 'Mưa và giông',
    'Patchy light snow with thunder': 'Tuyết nhẹ và giông',
    'Moderate or heavy snow with thunder': 'Tuyết và giông',
  };
  
  return translations[condition] || condition;
};

const getWeatherEmoji = (condition: string): string => {
  const desc = condition.toLowerCase();
  if (desc.includes('sunny') || desc.includes('clear')) return '☀️';
  if (desc.includes('cloud') || desc.includes('overcast')) return '☁️';
  if (desc.includes('rain') || desc.includes('drizzle')) return '🌧️';
  if (desc.includes('snow')) return '❄️';
  if (desc.includes('thunder') || desc.includes('storm')) return '⛈️';
  if (desc.includes('fog') || desc.includes('mist')) return '🌫️';
  if (desc.includes('partly')) return '⛅';
  return '⛅';
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

export async function getWeather(destination: string): Promise<WeatherResult> {
  if (!WEATHERAPI_KEY) {
    throw new Error('WeatherAPI key not configured');
  }

  try {
    const url = `https://api.weatherapi.com/v1/forecast.json?key=${WEATHERAPI_KEY}&q=${encodeURIComponent(destination)}&days=3&aqi=no`;
    
    const res = await fetch(url);
    if (!res.ok) {
      const error = await res.json();
      throw new Error(`WeatherAPI error: ${error.error.message}`);
    }
    
    const data = await res.json();
    
    const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

    // Thời tiết hiện tại
    const current = data.current;
    const currentWeather = {
      temperature: Math.round(current.temp_c),
      condition: translateWeather(current.condition.text),
      icon: getWeatherEmoji(current.condition.text)
    };

    // Dự báo theo giờ (12 giờ tới)
    const hourly: Array<{
      time: string;
      temp: number;
      condition: string;
      icon: string;
    }> = [];
    
    // Lấy dữ liệu ngày hôm nay
    const todayForecast = data.forecast.forecastday[0].hour;
    const currentTime = new Date(current.last_updated);
    const currentHour = currentTime.getHours();
    
    // Lấy 12 giờ tiếp theo từ giờ hiện tại
    for (let i = 0; i < 12; i++) {
      const hourIndex = currentHour + i;
      let hourData;
      let forecastDate = 0;
      
      if (hourIndex < 24) {
        // Cùng ngày
        hourData = todayForecast[hourIndex];
      } else {
        // Ngày hôm sau
        const nextDayForecast = data.forecast.forecastday[1].hour;
        hourData = nextDayForecast[hourIndex - 24];
      }
      
      hourly.push({
        time: hourData.time.split(' ')[1], // Lấy phần HH:MM
        temp: Math.round(hourData.temp_c),
        condition: translateWeather(hourData.condition.text),
        icon: getWeatherEmoji(hourData.condition.text)
      });
    }

    // Dự báo hàng ngày (2 ngày tới, bỏ qua hôm nay)
    const daily: Array<{
      date: string;
      dayName: string;
      high: number;
      low: number;
      condition: string;
      icon: string;
    }> = [];

    for (let i = 1; i < 3; i++) {
      const dayData = data.forecast.forecastday[i];
      const date = new Date(dayData.date);
      const dateStr = date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
      
      daily.push({
        date: dateStr,
        dayName: dayNames[date.getDay()],
        high: Math.round(dayData.day.maxtemp_c),
        low: Math.round(dayData.day.mintemp_c),
        condition: translateWeather(dayData.day.condition.text),
        icon: getWeatherEmoji(dayData.day.condition.text)
      });
    }

    return {
      current: currentWeather,
      hourly,
      daily
    };
  } catch (error) {
    console.error('Lỗi khi lấy dữ liệu thời tiết từ WeatherAPI:', error);
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
    console.error('Error fetching weather realtime:', error);
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

import { WeatherInfo } from '../types';

const OPENWEATHER_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY;

if (!OPENWEATHER_KEY) {
  console.warn('VITE_OPENWEATHER_API_KEY is not set. Weather will not fetch real data.');
}

async function geocode(destination: string) {
  const url = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(
    destination
  )}&limit=1&appid=${OPENWEATHER_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Geocoding failed');
  const data = await res.json();
  if (!data || data.length === 0) throw new Error('Location not found');
  return data[0]; 
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
  if (!OPENWEATHER_KEY) {
    return {
      weather: null,
      hourly: [],
      daily: [],
      timezone_offset: 0,
      timezone: 'UTC'
    };
  }

  const g = await geocode(destination);
  const lat = g.lat;
  const lon = g.lon;
  const placeName = g.name || destination;

  const oneCallUrl = `https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lon}&exclude=minutely,alerts&units=metric&appid=${OPENWEATHER_KEY}`;
  const oneRes = await fetch(oneCallUrl);
  if (!oneRes.ok) throw new Error('OneCall fetch failed');
  const data: OneCallResult = await oneRes.json();

  const weather: WeatherInfo = {
    location: placeName,
    temperature: Math.round(data.current.temp),
    condition: data.current.weather && data.current.weather[0] ? data.current.weather[0].description : '',
    icon: data.current.weather && data.current.weather[0] ? data.current.weather[0].icon : ''
  };

  const hourly = (data.hourly || []).slice(0, 24).map(h => ({ dt: h.dt, temp: Math.round(h.temp), weather: h.weather && h.weather[0] }));
  const daily = (data.daily || []).slice(1, 3).map(d => ({ dt: d.dt, high: Math.round(d.temp.max), low: Math.round(d.temp.min), weather: d.weather && d.weather[0] }));

  return {
    weather,
    hourly,
    daily,
    timezone_offset: data.timezone_offset || 0,
    timezone: data.timezone || 'UTC'
  };
}

export default {
  fetchWeatherRealtime
};

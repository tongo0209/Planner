import { GoogleGenAI, Type } from "@google/genai";
import { TimelineEvent } from '../types';
import { getWeather } from './weatherService';

// Lấy API Key từ environment variable
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
  console.warn('⚠️ VITE_GEMINI_API_KEY không được set. Vui lòng thêm API key vào .env file');
}

const ai = new GoogleGenAI({ apiKey: apiKey || '' });

// Simple in-memory cache với TTL (Time To Live)
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // milliseconds
}

class SimpleCache {
  private cache = new Map<string, CacheEntry<any>>();
  
  set<T>(key: string, data: T, ttlMinutes: number = 30) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMinutes * 60 * 1000
    });
  }
  
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }
  
  clear() {
    this.cache.clear();
  }
}

const geminiCache = new SimpleCache();

const timelineSchema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            day: {
                type: Type.INTEGER,
                description: 'Số thứ tự ngày của sự kiện trong chuyến đi (ví dụ: 1, 2, 3).',
            },
            time: {
                type: Type.STRING,
                description: 'Thời gian diễn ra sự kiện (ví dụ: "09:00 SA").',
            },
            activity: {
                type: Type.STRING,
                description: 'Tiêu đề ngắn cho hoạt động (ví dụ: "Thăm tháp Eiffel").',
            },
            description: {
                type: Type.STRING,
                description: 'Mô tả ngắn về hoạt động.',
            },
            location: {
                type: Type.STRING,
                description: 'Địa điểm hoặc địa chỉ của hoạt động.',
            },
        },
        required: ["day", "time", "activity", "description"],
    },
};

const packingListSchema = {
    type: Type.ARRAY,
    description: "Một danh sách các đồ vật cần mang theo.",
    items: {
        type: Type.OBJECT,
        properties: {
            item: {
                type: Type.STRING,
                description: "Tên của một món đồ cần đóng gói.",
            },
        },
        required: ["item"],
    },
};

const weatherSchema = {
    type: Type.OBJECT,
    properties: {
        current: {
            type: Type.OBJECT,
            properties: {
                temperature: {
                    type: Type.INTEGER,
                    description: "Nhiệt độ hiện tại tính bằng độ C.",
                },
                condition: {
                    type: Type.STRING,
                    description: "Điều kiện thời tiết hiện tại (ví dụ: 'Nắng', 'Mưa', 'Có mây').",
                },
                icon: {
                    type: Type.STRING,
                    description: "Emoji biểu tượng thời tiết (ví dụ: '☀️', '🌧️', '☁️').",
                },
            },
            required: ["temperature", "condition", "icon"],
        },
        hourly: {
            type: Type.ARRAY,
            description: "Dự báo theo giờ cho 12 giờ tới.",
            items: {
                type: Type.OBJECT,
                properties: {
                    time: {
                        type: Type.STRING,
                        description: "Thời gian (ví dụ: '14:00', '15:00').",
                    },
                    temp: {
                        type: Type.INTEGER,
                        description: "Nhiệt độ tính bằng độ C.",
                    },
                    condition: {
                        type: Type.STRING,
                        description: "Điều kiện thời tiết.",
                    },
                    icon: {
                        type: Type.STRING,
                        description: "Emoji biểu tượng.",
                    },
                },
                required: ["time", "temp", "condition", "icon"],
            },
        },
        daily: {
            type: Type.ARRAY,
            description: "Dự báo 2 ngày tới.",
            items: {
                type: Type.OBJECT,
                properties: {
                    date: {
                        type: Type.STRING,
                        description: "Ngày dưới dạng dd/mm (ví dụ: '03/01').",
                    },
                    dayName: {
                        type: Type.STRING,
                        description: "Tên ngày (ví dụ: 'T4', 'T5', 'CN').",
                    },
                    high: {
                        type: Type.INTEGER,
                        description: "Nhiệt độ cao nhất.",
                    },
                    low: {
                        type: Type.INTEGER,
                        description: "Nhiệt độ thấp nhất.",
                    },
                    condition: {
                        type: Type.STRING,
                        description: "Điều kiện thời tiết.",
                    },
                    icon: {
                        type: Type.STRING,
                        description: "Emoji biểu tượng.",
                    },
                },
                required: ["date", "dayName", "high", "low", "condition", "icon"],
            },
        },
    },
    required: ["current", "hourly", "daily"],
};

export const suggestTimeline = async (destination: string, duration: number, interests: string, specificDay?: number | null): Promise<Omit<TimelineEvent, 'id'>[]> => {
    // Create cache key
    const cacheKey = `timeline_${destination}_${duration}_${interests}_${specificDay || 'all'}`;
    
    // Check cache first
    const cached = geminiCache.get<Omit<TimelineEvent, 'id'>[]>(cacheKey);
    if (cached) {
      if (import.meta.env.DEV) console.log('📦 Using cached timeline');
      return cached;
    }
    
    const prompt = specificDay 
        ? `Tạo lịch trình chi tiết cho NGÀY ${specificDay} của chuyến đi ${duration} ngày đến ${destination}. Sở thích của du khách là: ${interests}. Tạo 3-5 hoạt động cho ngày này, bao gồm địa điểm cụ thể và thời gian hợp lý trong ngày.`
        : `Tạo một lịch trình du lịch chi tiết cho chuyến đi ${duration} ngày đến ${destination}. Sở thích của du khách là: ${interests}. Đảm bảo lịch trình hợp lý và thú vị. Bao gồm các địa điểm và hoạt động cụ thể.`;
    
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: timelineSchema,
            },
        });

        const jsonText = (response.text ?? '').trim();
        const suggestedEvents = JSON.parse(jsonText);

        // Basic validation
        if (Array.isArray(suggestedEvents)) {
            // Cache successful result for 30 minutes
            geminiCache.set(cacheKey, suggestedEvents, 30);
            return suggestedEvents;
        }
        return [];

    } catch (error) {
        console.error("Error generating timeline with Gemini:", error);
        // Fallback to mock data on error
        return [
            { day: 1, time: "10:00 SA", activity: "Mock: Đến và nhận phòng", description: "Ổn định tại khách sạn của bạn.", location: "Khách sạn" },
            { day: 1, time: "01:00 CH", activity: "Mock: Ăn trưa tại quán cà phê địa phương", description: "Thưởng thức ẩm thực địa phương.", location: "Trung tâm thành phố" },
        ];
    }
};


export const suggestPackingItems = async (destination: string, duration: number, activities: string): Promise<{ item: string }[]> => {
    // Check cache first
    const cacheKey = `packing_${destination}_${duration}_${activities}`;
    const cached = geminiCache.get<{ item: string }[]>(cacheKey);
    if (cached) {
        return cached;
    }

    const prompt = `Tạo danh sách các vật dụng cần thiết cần đóng gói cho chuyến đi ${duration} ngày đến ${destination}. Các hoạt động dự kiến bao gồm: ${activities}. Chỉ trả về danh sách các mục.`;
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: packingListSchema,
            },
        });
        const jsonText = (response.text ?? '').trim();
        const suggestions = JSON.parse(jsonText);
        if (Array.isArray(suggestions)) {
            // Cache for 1 hour - packing lists don't change often
            geminiCache.set(cacheKey, suggestions, 60);
            return suggestions;
        }
        return [];
    } catch (error) {
        console.error("Error generating packing list with Gemini:", error);
        return [
            { item: "Mock: Kem chống nắng" },
            { item: "Mock: Kính râm" },
            { item: "Mock: Sạc dự phòng" },
        ];
    }
};
export const getWeatherInfo = async (destination: string) => {
    try {
        const weatherData = await getWeather(destination);
        return weatherData;
    } catch (error) {
        console.error("Lỗi khi lấy thời tiết:", error);
        // Dữ liệu fallback
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dayAfter = new Date(now);
        dayAfter.setDate(dayAfter.getDate() + 2);

        const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
        
        const formatDate = (date: Date) => {
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            return `${day}/${month}`;
        };

        return {
            current: {
                temperature: 25,
                condition: "Mây thưa",
                icon: "⛅"
            },
            hourly: Array.from({ length: 12 }, (_, i) => ({
                time: `${String((new Date().getHours() + i) % 24).padStart(2, '0')}:00`,
                temp: 23 + Math.floor(Math.random() * 5),
                condition: "Mây thưa",
                icon: "⛅"
            })),
            daily: [
                { 
                    date: formatDate(tomorrow), 
                    dayName: dayNames[tomorrow.getDay()], 
                    high: 28, 
                    low: 20, 
                    condition: "Nắng", 
                    icon: "☀️" 
                },
                { 
                    date: formatDate(dayAfter), 
                    dayName: dayNames[dayAfter.getDay()], 
                    high: 27, 
                    low: 19, 
                    condition: "Mưa nhẹ", 
                    icon: "🌧️" 
                }
            ]
        };
    }
};
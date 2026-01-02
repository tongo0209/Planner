import { GoogleGenAI, Type } from "@google/genai";
import { TimelineEvent } from '../types';

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
      console.log('📦 Using cached timeline');
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

        const jsonText = response.text.trim();
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
        const jsonText = response.text.trim();
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
    // Check cache first - weather changes frequently so use short TTL
    const cacheKey = `weather_${destination}`;
    const cached = geminiCache.get<any>(cacheKey);
    if (cached) {
        return cached;
    }

    // Lấy thời gian hiện tại theo GMT+7 (Việt Nam)
    const now = new Date();
    const vietnamTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
    
    const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    const dayNamesFull = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    
    // Hôm nay (GMT+7)
    const todayDay = vietnamTime.getDate();
    const todayMonth = vietnamTime.getMonth() + 1;
    const todayYear = vietnamTime.getFullYear();
    const todayDayOfWeek = vietnamTime.getDay();
    const todayStr = `${String(todayDay).padStart(2, '0')}/${String(todayMonth).padStart(2, '0')}/${todayYear}`;
    const todayDayName = dayNames[todayDayOfWeek];
    const todayDayNameFull = dayNamesFull[todayDayOfWeek];
    
    // Ngày mai (GMT+7)
    const tomorrow = new Date(vietnamTime);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDay = tomorrow.getDate();
    const tomorrowMonth = tomorrow.getMonth() + 1;
    const tomorrowDayOfWeek = tomorrow.getDay();
    const tomorrowStr = `${String(tomorrowDay).padStart(2, '0')}/${String(tomorrowMonth).padStart(2, '0')}`;
    const tomorrowDayName = dayNames[tomorrowDayOfWeek];
    const tomorrowDayNameFull = dayNamesFull[tomorrowDayOfWeek];
    
    // Ngày kia (GMT+7)
    const dayAfter = new Date(vietnamTime);
    dayAfter.setDate(dayAfter.getDate() + 2);
    const dayAfterDay = dayAfter.getDate();
    const dayAfterMonth = dayAfter.getMonth() + 1;
    const dayAfterDayOfWeek = dayAfter.getDay();
    const dayAfterStr = `${String(dayAfterDay).padStart(2, '0')}/${String(dayAfterMonth).padStart(2, '0')}`;
    const dayAfterDayName = dayNames[dayAfterDayOfWeek];
    const dayAfterDayNameFull = dayNamesFull[dayAfterDayOfWeek];
    
    const prompt = `HÔM NAY (theo giờ Việt Nam GMT+7): ${todayDayNameFull} (${todayDayName}), ngày ${todayStr}

Cho tôi thông tin thời tiết THỜI GIAN THỰC cho địa điểm: ${destination}

Bao gồm:
1. Thời tiết HIỆN TẠI tại ${destination}: nhiệt độ (°C), điều kiện, emoji icon
2. Dự báo theo giờ: 12 giờ tiếp theo từ bây giờ
3. Dự báo 2 ngày TỚI (không tính hôm nay):
   - Ngày thứ 1: ${tomorrowDayNameFull} (${tomorrowDayName}), ${tomorrowStr}
   - Ngày thứ 2: ${dayAfterDayNameFull} (${dayAfterDayName}), ${dayAfterStr}

QUAN TRỌNG:
- Lấy thời tiết thực tế hiện tại của ${destination}
- "date" trong daily phải là: "${tomorrowStr}" và "${dayAfterStr}"
- "dayName" trong daily phải là: "${tomorrowDayName}" và "${dayAfterDayName}"
- Emoji: ☀️ (nắng), ☁️ (mây), 🌧️ (mưa), 🌙 (đêm), ⛅ (mây ít), 🌦️ (mưa rào)`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: weatherSchema,
            },
        });
        const jsonText = response.text.trim();
        const weatherData = JSON.parse(jsonText);
        
        // Cache for 5 minutes - weather changes frequently
        geminiCache.set(cacheKey, weatherData, 5);
        
        return weatherData;
    } catch (error) {
        console.error("Error getting weather from Gemini:", error);
        // Fallback to mock data
        return {
            current: {
                temperature: 25,
                condition: "Nắng, có mây rải rác",
                icon: "☀️"
            },
            hourly: Array.from({ length: 12 }, (_, i) => ({
                time: `${String((new Date().getHours() + i) % 24).padStart(2, '0')}:00`,
                temp: 25 + Math.floor(Math.random() * 5),
                condition: "Nắng",
                icon: "☀️"
            })),
            daily: [
                { date: "03/01", dayName: "T5", high: 28, low: 20, condition: "Nắng", icon: "☀️" },
                { date: "04/01", dayName: "T6", high: 27, low: 19, condition: "Mưa nhẹ", icon: "🌧️" }
            ]
        };
    }
};
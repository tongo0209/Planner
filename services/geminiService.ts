import { GoogleGenAI, Type } from "@google/genai";
import { TimelineEvent } from '../types';

// Lấy API Key từ environment variable
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
  console.warn('⚠️ VITE_GEMINI_API_KEY không được set. Vui lòng thêm API key vào .env file');
}

const ai = new GoogleGenAI({ apiKey: apiKey || '' });

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

export const suggestTimeline = async (destination: string, duration: number, interests: string, specificDay?: number | null): Promise<Omit<TimelineEvent, 'id'>[]> => {
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

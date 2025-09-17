import { GoogleGenAI, Modality } from "@google/genai";
import { EditMode } from '../types';

// WARNING: Hardcoding API keys in client-side code is a security risk.
// Anyone can view this key and use it, potentially incurring costs on your account.
// This is done as per user request.
const API_KEY = 'AIzaSyD8jA6OfSLkJV0VAqFIQ7Bam28zgBUhI2s';

const getPromptForMode = (mode: EditMode, quality: string, customPrompt?: string): string => {
    const qualityPrompt = `The output quality should be ${quality}.`;
    let basePrompt = '';
    switch (mode) {
        case EditMode.RESTORE:
            basePrompt = 'Restore and colorize this old black and white (or sepia-toned) photograph in ultra-high detail. Remove visible scratches, dust, stains, creases, and faded areas while preserving the original facial structure, skin texture, eye shape, hairline, clothing patterns, and background. Do not beautify the subject or apply modern retouching filters. Maintain the historical integrity and realistic appearance of the era. Skin tones, hair, eyes, and clothes should be colorized based on natural, historically accurate tones. No AI facial enhancement or identity alteration. The result should look like the original photo brought back to life with subtle, respectful improvements only.';
            break;
        case EditMode.SHARPEN:
            basePrompt = 'Enhance the sharpness and clarity of this image. Bring out fine details and textures without creating artifacts or an unnatural look. Focus on improving the overall definition and crispness.';
            break;
        case EditMode.ID_PHOTO:
            basePrompt = "A realistic, high-resolution vertical ID photo in Vietnamese style, showing a young Vietnamese person, wearing a clean white collared shirt, fully buttoned. The person is facing straight toward the camera with a neutral facial expression, mouth closed, eyes open, ears fully visible, hair neatly combed (natural black hair), no bangs covering the face, no glasses, no earrings or accessories. Skin tone is natural and not overly smoothed. Studio lighting is soft, evenly distributed with no harsh shadows or reflections. The background is a plain solid blue, consistent and clean. Cropping from mid-chest up, centered, in 3:4 aspect ratio. The image must follow Vietnam's official passport or ID photo style: natural, formal, respectful, no digital beauty filters, no expression, no stylization. Looks like a real studio photo taken for a passport or school ID.";
            break;
        case EditMode.REMOVE_BACKGROUND:
            basePrompt = 'Remove the background from this image, leaving only the main subject with clean and precise edges. The output should have a transparent background.';
            break;
        case EditMode.COUPLE_PHOTO:
            basePrompt = 'Make this photo of two people look as if it was taken with a Polaroid camera. There should be no obvious props or staged elements — it must feel like a spontaneous, candid snapshot. Add a slight motion blur and flash lighting in a dark setting, with the light spreading softly across the image. Do not distort the faces. Change the background behind them into a white curtain. The boy should have his arm around the girl’s shoulder, and they should appear friendly, like two close friends.';
            break;
        case EditMode.CUSTOM:
            basePrompt = customPrompt || 'Edit this image as instructed.';
            break;
        default:
            basePrompt = 'Edit this image.';
    }
    return `${basePrompt} ${qualityPrompt}`;
};

export const editImage = async (
    base64ImageData: string,
    mimeType: string,
    mode: EditMode,
    quality: string,
    customPrompt?: string,
): Promise<string> => {
    if (!API_KEY) {
        throw new Error("API Key của Gemini không được cấu hình.");
    }
    try {
        const ai = new GoogleGenAI({ apiKey: API_KEY });
        const prompt = getPromptForMode(mode, quality, customPrompt);

        const imagePart = {
            inlineData: {
                data: base64ImageData,
                mimeType: mimeType,
            },
        };

        const textPart = { text: prompt };
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: {
                parts: [imagePart, textPart],
            },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });

        if (response.candidates && response.candidates.length > 0 && response.candidates[0].content.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    return part.inlineData.data;
                }
            }
        }
        
        throw new Error("Không có hình ảnh nào được tạo. Mô hình có thể đã từ chối yêu cầu.");
    } catch(e) {
        console.error("Lỗi khi chỉnh sửa ảnh bằng Gemini API:", e);
        if (e instanceof Error) {
            // Check for specific API key related errors if possible
            if (e.message.includes('API key not valid')) {
                 throw new Error(`API Key không hợp lệ. Vui lòng kiểm tra lại.`);
            }
            throw new Error(`Lỗi API Gemini: ${e.message}`);
        }
        throw new Error("Đã xảy ra lỗi không xác định khi chỉnh sửa ảnh.");
    }
};
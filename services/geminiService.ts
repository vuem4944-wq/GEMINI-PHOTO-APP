import { GoogleGenAI, Modality } from "@google/genai";
import { EditMode } from '../types';

const getPromptForMode = (mode: EditMode, quality: string, customPrompt?: string): string => {
    const qualityPrompt = `The output quality should be ${quality}.`;
    let basePrompt = '';

    // A strong directive to encourage the model to always return an image.
    const finalInstruction = "CRITICAL INSTRUCTION: Your final output must ONLY be the edited image. Do not reply with text, questions, or explanations. Generate the image directly based on the prompt.";

    switch (mode) {
        case EditMode.RESTORE:
            basePrompt = 'Restore this photograph. If it is black and white or sepia-toned, colorize it realistically. If it is already in color, enhance its colors and clarity. For all images, remove visible scratches, dust, stains, and creases. CRUCIAL: The original facial features and identity of any person in the photo must be perfectly preserved without any changes. Maintain a natural, realistic appearance without over-processing.';
            break;
        case EditMode.SHARPEN:
            basePrompt = 'Enhance the sharpness and clarity of this image. Bring out fine details and textures without creating artifacts or an unnatural look. Focus on improving the overall definition and crispness. CRUCIAL: Do not alter the original facial features of any person in the image.';
            break;
        case EditMode.ID_PHOTO:
            basePrompt = "Transform the person in this image into a professional, high-resolution Vietnamese-style ID photo. CRUCIAL: The person's original facial identity—their unique facial structure, eyes, nose, and mouth—must be kept exactly the same and not be altered or beautified. Only change their attire to a clean, fully-buttoned white collared shirt. Ensure they face the camera directly with a neutral expression, open eyes, and visible ears. Hair should be neat and black, not covering the face. Remove glasses and accessories. The background must be a solid, plain blue. The final image should be cropped from the mid-chest up in a 3:4 aspect ratio and look like an official studio photograph.";
            break;
        case EditMode.REMOVE_BACKGROUND:
            basePrompt = 'Remove the background from this image, leaving only the main subject with clean and precise edges. The subject, especially their original facial features, must be preserved perfectly without any changes. The output should have a transparent background.';
            break;
        case EditMode.COUPLE_PHOTO:
            basePrompt = 'Take the person from the first image and the person from the second image and combine them into a single, new photograph. The final image should make it look like they were photographed together in the same place at the same time. Style it as a candid Polaroid snapshot taken in a dark indoor setting, with strong flash lighting. The flash should create soft light spread across the scene and slight motion blur, giving it a spontaneous, nostalgic feel. The background should be a simple white curtain. One person should have an arm around the other\'s shoulder, and both should look relaxed and friendly, like close friends. CRUCIAL: The faces from the original photos must be kept natural and unchanged — do not distort, beautify, or alter their identity in any way. No added props, no stylized elements. Keep everything casual and realistic.';
            break;
        case EditMode.CUSTOM:
            basePrompt = (customPrompt || 'Edit this image as instructed.') + " CRUCIAL: Regardless of the request, the original facial features and identity of any person in the photo must be perfectly preserved without any changes.";
            break;
        default:
            basePrompt = 'Edit this image. CRUCIAL: The original facial features and identity of any person in the photo must be perfectly preserved without any changes.';
    }
    return `${basePrompt} ${qualityPrompt} ${finalInstruction}`;
};

export const checkApiKey = async (apiKey: string): Promise<boolean> => {
    if (!apiKey.trim()) {
        return false;
    }
    try {
        const ai = new GoogleGenAI({ apiKey });
        // A lightweight, fast call to verify the key.
        await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: 'hi',
            config: {
                thinkingConfig: { thinkingBudget: 0 } // Disable thinking for speed and low cost
            }
        });
        return true; // Success
    } catch (e) {
        console.error("API Key check failed:", e);
        return false; // Failure (invalid key, network error, etc.)
    }
};


export const editImage = async (
    apiKey: string,
    base64ImageDatas: string[],
    mimeTypes: string[],
    mode: EditMode,
    quality: string,
    customPrompt?: string,
): Promise<string> => {
    if (!apiKey) {
        throw new Error("API Key is missing.");
    }
    try {
        const ai = new GoogleGenAI({ apiKey });
        const prompt = getPromptForMode(mode, quality, customPrompt);

        const imageParts = base64ImageDatas.map((data, index) => ({
            inlineData: {
                data,
                mimeType: mimeTypes[index] || 'image/jpeg',
            },
        }));

        const textPart = { text: prompt };
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: {
                parts: [...imageParts, textPart],
            },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });

        if (!response.candidates || response.candidates.length === 0) {
            throw new Error("Phản hồi từ API không hợp lệ hoặc trống.");
        }

        const candidate = response.candidates[0];

        if (candidate.finishReason === 'SAFETY') {
            throw new Error("Yêu cầu đã bị chặn vì lý do an toàn. Vui lòng thử một ảnh hoặc lời nhắc khác.");
        }

        // Tìm kiếm phần hình ảnh trong phản hồi
        if (candidate.content && candidate.content.parts) {
            for (const part of candidate.content.parts) {
                if (part.inlineData) {
                    return part.inlineData.data; // Trường hợp thành công
                }
            }
        }

        // Nếu không tìm thấy phần hình ảnh, có thể mô hình chỉ trả lời bằng văn bản.
        const textResponse = response.text;
        if (textResponse) {
            throw new Error(`Mô hình không tạo ra ảnh. Phản hồi: "${textResponse}"`);
        }
        
        // Lỗi dự phòng cuối cùng nếu cấu trúc không mong đợi
        throw new Error("Không có hình ảnh nào được tạo. Mô hình có thể đã từ chối yêu cầu hoặc phản hồi không chứa ảnh.");

    } catch(e) {
        console.error("Lỗi khi chỉnh sửa ảnh bằng Gemini API:", e);
        if (e instanceof Error) {
            if (e.message.includes('API key not valid')) {
                 throw new Error(`API Key không hợp lệ. Vui lòng kiểm tra lại.`);
            }
            throw new Error(`Lỗi API Gemini: ${e.message}`);
        }
        throw new Error("Đã xảy ra lỗi không xác định khi chỉnh sửa ảnh.");
    }
};
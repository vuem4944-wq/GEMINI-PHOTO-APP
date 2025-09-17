import React, { useState, useEffect } from 'react';
import { EditMode } from './types';
import { editImage, checkApiKey } from './services/geminiService';

const MAX_FILES = 5;

type UploadedFile = {
  file: File;
  preview: string;
};

// --- Hướng dẫn Modal Component ---
const ApiKeyGuideModal = ({ onClose }: { onClose: () => void }) => (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-xl shadow-lg max-w-2xl w-full border border-gray-700 animate-fade-in-up">
            <div className="p-6 border-b border-gray-700">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-blue-400" viewBox="0 0 24 24" fill="currentColor"><path d="M15,12a1,1,0,0,0-1-1H10a1,1,0,0,0,0,2h4A1,1,0,0,0,15,12Zm-1-4H10a3,3,0,0,0-3,3v2a3,3,0,0,0,3,3h4a3,3,0,0,0,3-3V11A3,3,0,0,0,14,8Zm5,2.18V11a5,5,0,0,1-5,5H10a5,5,0,0,1-5-5V11A5,5,0,0,1,10,6h4a5,5,0,0,1,2.83,1H19a1,1,0,0,1,0,2Z"/></svg>
                    Hướng dẫn lấy Gemini API Key
                </h2>
                <p className="text-sm text-gray-400 mt-1">Làm theo các bước sau để có API Key và sử dụng ứng dụng.</p>
            </div>
            <div className="p-6 space-y-4 text-gray-300">
                <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center">1</div>
                    <p>Truy cập vào trang <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-400 font-medium hover:underline">Google AI Studio</a> và đăng nhập bằng tài khoản Google của bạn.</p>
                </div>
                <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center">2</div>
                    <p>Nhấn vào nút <span className="font-semibold bg-gray-700 px-1.5 py-0.5 rounded">"Get API key"</span> ở góc trên bên trái.</p>
                </div>
                 <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center">3</div>
                    <p>Trong menu hiện ra, chọn <span className="font-semibold bg-gray-700 px-1.5 py-0.5 rounded">"Create API key in new project"</span>.</p>
                </div>
                 <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center">4</div>
                    <p>API Key của bạn sẽ hiện ra. Nhấn vào biểu tượng sao chép để copy key.</p>
                </div>
                 <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center">5</div>
                    <p>Quay lại trang này và dán API Key vừa sao chép vào ô "Gemini API Key".</p>
                </div>
            </div>
             <div className="p-6 bg-gray-900/50 rounded-b-xl flex justify-end">
                <button
                    onClick={onClose}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors"
                >
                    Đã hiểu
                </button>
            </div>
        </div>
    </div>
);


const ModeButton = ({ mode, currentMode, setMode, children }: { mode: EditMode, currentMode: EditMode, setMode: (mode: EditMode) => void, children: React.ReactNode }) => (
  <button
    onClick={() => setMode(mode)}
    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors w-full text-left flex items-center gap-3 ${currentMode === mode ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}
  >
    {children}
  </button>
);

const QualityButton = ({ quality, currentQuality, setQuality, children }: { quality: string, currentQuality: string, setQuality: (q: string) => void, children: React.ReactNode }) => (
    <button
        onClick={() => setQuality(quality)}
        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex-1 ${currentQuality === quality ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}
    >
        {children}
    </button>
);

function App() {
  const [apiKey, setApiKey] = useState<string>('');
  const [apiKeyStatus, setApiKeyStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [editedImages, setEditedImages] = useState<string[]>([]);
  const [editMode, setEditMode] = useState<EditMode>(EditMode.RESTORE);
  const [outputQuality, setOutputQuality] = useState<string>('HD');
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showApiKeyGuide, setShowApiKeyGuide] = useState(false);

  useEffect(() => {
    const storedApiKey = localStorage.getItem('geminiApiKey');
    if (storedApiKey) {
      setApiKey(storedApiKey);
    }
    
    // Hiển thị hướng dẫn nếu người dùng chưa từng thấy
    const hasSeenGuide = localStorage.getItem('hasSeenApiKeyGuide');
    if (hasSeenGuide !== 'true') {
        setShowApiKeyGuide(true);
    }
  }, []);
  
  const handleCloseGuide = () => {
    setShowApiKeyGuide(false);
    localStorage.setItem('hasSeenApiKeyGuide', 'true');
  };

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newApiKey = e.target.value;
    setApiKey(newApiKey);
    localStorage.setItem('geminiApiKey', newApiKey);
    setApiKeyStatus('idle');
  }
  
  const handleCheckApiKey = async () => {
    if (!apiKey.trim()) {
      setApiKeyStatus('invalid');
      return;
    }
    setError(null); // Clear main error display
    setApiKeyStatus('checking');
    const isValid = await checkApiKey(apiKey);
    setApiKeyStatus(isValid ? 'valid' : 'invalid');
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newFiles = Array.from(files).slice(0, MAX_FILES - uploadedFiles.length);
      const newUploadedFiles = newFiles.map(file => ({
        file,
        preview: URL.createObjectURL(file),
      }));
      setUploadedFiles(prev => [...prev, ...newUploadedFiles]);
      setEditedImages([]);
      setError(null);
    }
    event.target.value = '';
  };

  const removeImage = (index: number) => {
    setUploadedFiles(prev => {
      const newFiles = [...prev];
      URL.revokeObjectURL(newFiles[index].preview);
      newFiles.splice(index, 1);
      return newFiles;
    });
  };
  
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = error => reject(error);
    });
  };

  const handleEdit = async () => {
    if (!apiKey.trim()) {
      setError('Vui lòng nhập Gemini API Key của bạn để tiếp tục.');
      return;
    }
    if (uploadedFiles.length === 0) {
      setError('Vui lòng tải lên ít nhất một ảnh.');
      return;
    }
    if (editMode === EditMode.CUSTOM && !customPrompt.trim()) {
        setError('Vui lòng nhập lời nhắc cho chế độ tùy chỉnh.');
        return;
    }
     if (editMode === EditMode.COUPLE_PHOTO && uploadedFiles.length !== 2) {
      setError('Vui lòng tải lên chính xác 2 ảnh cho chế độ "Chụp ảnh chung".');
      return;
    }

    setIsLoading(true);
    setError(null);
    setEditedImages([]);

    try {
      if (editMode === EditMode.COUPLE_PHOTO) {
        // Xử lý chế độ chụp ảnh chung như một trường hợp đặc biệt
        const base64Strings = await Promise.all(
          uploadedFiles.map(uf => fileToBase64(uf.file))
        );
        const mimeTypes = uploadedFiles.map(uf => uf.file.type);
        const result = await editImage(
          apiKey,
          base64Strings,
          mimeTypes,
          editMode,
          outputQuality,
          customPrompt
        );
        setEditedImages([result]);
      } else {
        // Xử lý tất cả các chế độ khác bằng cách lặp qua từng ảnh
        const results = await Promise.all(
          uploadedFiles.map(async (uf) => {
            const base64String = await fileToBase64(uf.file);
            const mimeType = uf.file.type;
            return editImage(
              apiKey,
              [base64String],
              [mimeType],
              editMode,
              outputQuality,
              customPrompt
            );
          })
        );
        setEditedImages(results);
      }
    } catch (e: any) {
      setError(`Đã xảy ra lỗi: ${e.message}`);
    } finally {
        setIsLoading(false);
    }
  };
  
  const renderResults = () => {
    if (isLoading) {
        return (
            <div className="text-center">
                <svg className="animate-spin h-10 w-10 text-blue-500 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                <p className="mt-2 text-gray-400">AI đang xử lý, vui lòng chờ...</p>
            </div>
        );
    }

    if (editedImages.length === 0) {
        return (
            <div className="text-center text-gray-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-16 h-16 mx-auto mb-2" viewBox="0 0 24 24" fill="currentColor"><path d="M12,2A10,10,0,1,0,22,12,10,10,0,0,0,12,2Zm0,18a8,8,0,1,1,8-8A8,8,0,0,1,12,20Z"/></svg>
                <p>Kết quả sẽ được hiển thị ở đây</p>
            </div>
        );
    }
    
    // Đặc biệt xử lý cho chế độ Couple Photo
    if (editMode === EditMode.COUPLE_PHOTO) {
        return (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                <div>
                    <h3 className="font-semibold text-center mb-2">Gốc</h3>
                    <div className="grid grid-cols-2 gap-2">
                         {uploadedFiles.map((uf, index) => (
                            <img key={index} src={uf.preview} alt={`original ${index}`} className="w-full h-auto object-contain rounded-lg" />
                        ))}
                    </div>
                </div>
                <div>
                    <h3 className="font-semibold text-center mb-2">Kết quả</h3>
                    <div className="relative group">
                        <img src={`data:image/png;base64,${editedImages[0]}`} alt="edited result couple" className="w-full h-auto object-contain rounded-lg" />
                        <a href={`data:image/png;base64,${editedImages[0]}`} download="couple-photo.png" className="absolute bottom-2 right-2 bg-blue-600 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-all">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12,16a1,1,0,0,1-1-1V5.41l-1.29,1.3a1,1,0,0,1-1.42-1.42l3-3a1,1,0,0,1,1.42,0l3,3a1,1,0,0,1-1.42,1.42L13,5.41V15A1,1,0,0,1,12,16Zm8,1H4a3,3,0,0,0-3,3v1a1,1,0,0,0,1,1H22a1,1,0,0,0,1-1v-1A3,3,0,0,0,20,17Z"/></svg>
                        </a>
                    </div>
                </div>
            </div>
        )
    }

    // Xử lý cho các chế độ khác
    return (
        <div className="space-y-6 w-full max-h-[70vh] overflow-y-auto pr-2">
            {uploadedFiles.map((uf, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-gray-700 pb-4 last:border-b-0">
                    <div>
                        <h3 className="font-semibold text-center mb-2">Gốc</h3>
                        <img src={uf.preview} alt={`original ${index}`} className="w-full h-auto object-contain rounded-lg" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-center mb-2">Kết quả</h3>
                        {editedImages[index] && (
                            <div className="relative group">
                                <img src={`data:image/png;base64,${editedImages[index]}`} alt={`edited result ${index}`} className="w-full h-auto object-contain rounded-lg" />
                                <a href={`data:image/png;base64,${editedImages[index]}`} download={`edited-image-${index}.png`} className="absolute bottom-2 right-2 bg-blue-600 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-all">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12,16a1,1,0,0,1-1-1V5.41l-1.29,1.3a1,1,0,0,1-1.42-1.42l3-3a1,1,0,0,1,1.42,0l3,3a1,1,0,0,1-1.42,1.42L13,5.41V15A1,1,0,0,1,12,16Zm8,1H4a3,3,0,0,0-3,3v1a1,1,0,0,0,1,1H22a1,1,0,0,0,1-1v-1A3,3,0,0,0,20,17Z"/></svg>
                                </a>
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};


  return (
    <>
      {showApiKeyGuide && <ApiKeyGuideModal onClose={handleCloseGuide} />}
      <div className="min-h-screen bg-gray-900 text-white flex flex-col">
        <header className="bg-gray-800/50 backdrop-blur-sm p-4 border-b border-gray-700 flex justify-center items-center sticky top-0 z-10">
          <h1 className="text-xl font-bold flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-blue-400" viewBox="0 0 24 24" fill="currentColor"><path d="M12,2A10,10,0,1,0,22,12,10,10,0,0,0,12,2Zm0,18a8,8,0,1,1,8-8A8,8,0,0,1,12,20Z"/><path d="M12,6a6,6,0,1,0,6,6A6,6,0,0,0,12,6Zm0,10a4,4,0,1,1,4-4A4,4,0,0,1,12,16Z"/></svg>
              Trình chỉnh sửa ảnh Gemini
          </h1>
        </header>
        
        <main className="flex-grow flex flex-col lg:flex-row p-4 gap-4">
          {/* Control Panel */}
          <aside className="w-full lg:w-1/4 lg:max-w-sm bg-gray-800 p-5 rounded-xl flex flex-col gap-6 self-start">
            <div>
              <label htmlFor="apiKey" className="block text-sm font-medium mb-2 text-gray-300">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 inline-block mr-2" viewBox="0 0 24 24" fill="currentColor"><path d="M15,12a1,1,0,0,0-1-1H10a1,1,0,0,0,0,2h4A1,1,0,0,0,15,12Zm-1-4H10a3,3,0,0,0-3,3v2a3,3,0,0,0,3,3h4a3,3,0,0,0,3-3V11A3,3,0,0,0,14,8Zm5,2.18V11a5,5,0,0,1-5,5H10a5,5,0,0,1-5-5V11A5,5,0,0,1,10,6h4a5,5,0,0,1,2.83,1H19a1,1,0,0,1,0,2Z"/></svg>
                Gemini API Key
              </label>
              <div className="flex items-center gap-2">
                  <input
                  id="apiKey"
                  type="password"
                  value={apiKey}
                  onChange={handleApiKeyChange}
                  placeholder="Nhập API Key của bạn tại đây"
                  className="flex-grow bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <button 
                      onClick={handleCheckApiKey}
                      disabled={apiKeyStatus === 'checking'}
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-wait"
                  >
                      Kiểm tra
                  </button>
              </div>
              <div className="mt-2 h-5 flex items-center gap-1.5 text-sm">
                  {apiKeyStatus === 'checking' && (
                  <>
                      <svg className="animate-spin h-4 w-4 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      <span className="text-gray-400">Đang kiểm tra...</span>
                  </>
                  )}
                  {apiKeyStatus === 'valid' && (
                  <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-green-400" viewBox="0 0 24 24" fill="currentColor"><path d="M12,2A10,10,0,1,0,22,12,10,10,0,0,0,12,2Zm5.71,7.29-6,6a1,1,0,0,1-1.42,0l-3-3a1,1,0,0,1,1.42-1.42L11,13.59l5.29-5.3a1,1,0,0,1,1.42,1.42Z"/></svg>
                      <span className="text-green-400 font-medium">API Key hợp lệ!</span>
                  </>
                  )}
                  {apiKeyStatus === 'invalid' && (
                  <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-red-400" viewBox="0 0 24 24" fill="currentColor"><path d="M12,2A10,10,0,1,0,22,12,10,10,0,0,0,12,2Zm3.71,12.29a1,1,0,0,1,0,1.42,1,1,0,0,1-1.42,0L12,13.41l-2.29,2.3a1,1,0,0,1-1.42,0,1,1,0,0,1,0-1.42L10.59,12,8.29,9.71A1,1,0,0,1,9.71,8.29L12,10.59l2.29-2.3a1,1,0,1,1,1.42,1.42L13.41,12Z"/></svg>
                      <span className="text-red-400 font-medium">API Key không hợp lệ.</span>
                  </>
                  )}
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M12,2A10,10,0,1,0,22,12,10,10,0,0,0,12,2Zm5,13H7a1,1,0,0,1,0-2h10a1,1,0,0,1,0,2Zm0-4H7a1,1,0,0,1,0-2h10a1,1,0,0,1,0,2Zm0-4H7A1,1,0,0,1,7,7h10a1,1,0,0,1,0,2Z"/></svg>
                  Chế độ
              </h2>
              <div className="space-y-2">
                <ModeButton mode={EditMode.RESTORE} currentMode={editMode} setMode={setEditMode}>Phục hồi & Tô màu</ModeButton>
                <ModeButton mode={EditMode.SHARPEN} currentMode={editMode} setMode={setEditMode}>Làm nét ảnh</ModeButton>
                <ModeButton mode={EditMode.ID_PHOTO} currentMode={editMode} setMode={setEditMode}>Ảnh thẻ 3x4</ModeButton>
                <ModeButton mode={EditMode.REMOVE_BACKGROUND} currentMode={editMode} setMode={setEditMode}>Xóa nền</ModeButton>
                <ModeButton mode={EditMode.COUPLE_PHOTO} currentMode={editMode} setMode={setEditMode}>Chụp ảnh chung</ModeButton>
                <ModeButton mode={EditMode.CUSTOM} currentMode={editMode} setMode={setEditMode}>Tùy chỉnh</ModeButton>
              </div>
            </div>

            {editMode === EditMode.CUSTOM && (
              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="Ví dụ: Thêm một chiếc mũ cao bồi cho người trong ảnh..."
                className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm h-24 resize-none focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            )}

            <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M21.71,8.71,15.29,2.29a1,1,0,0,0-1.42,0L3.29,12.87a3,3,0,0,0-.87,2.12V19a3,3,0,0,0,3,3H19a1,1,0,0,0,0-2H5.41A1,1,0,0,1,5,19V15a1,1,0,0,1,.29-.71l9.58-9.58,4.29,4.29L13,15.17a1,1,0,0,0,0,1.42,1,1,0,0,0,1.41,0L21.71,10.13A1,1,0,0,0,21.71,8.71Z"/></svg>
                  Chất lượng
                </h3>
                <div className="flex gap-2">
                    <QualityButton quality="Standard" currentQuality={outputQuality} setQuality={setOutputQuality}>Tiêu chuẩn</QualityButton>
                    <QualityButton quality="HD" currentQuality={outputQuality} setQuality={setOutputQuality}>HD</QualityButton>
                    <QualityButton quality="Ultra-HD (4K)" currentQuality={outputQuality} setQuality={setOutputQuality}>4K</QualityButton>
                </div>
            </div>

            <button
              onClick={handleEdit}
              disabled={isLoading || uploadedFiles.length === 0 || !apiKey}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  Đang xử lý...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12.29,8.29,15,5.59V13a1,1,0,0,0,2,0V5.59l2.71,2.7a1,1,0,0,0,1.41-1.41l-4.29-4.3a1,1,0,0,0-1.41,0l-4.29,4.3A1,1,0,1,0,12.29,8.29ZM21,12a1,1,0,0,0-1,1v6a1,1,0,0,1-1,1H5a1,1,0,0,1-1-1V13a1,1,0,0,0-2,0v6a3,3,0,0,0,3,3H19a3,3,0,0,0,3-3V13A1,1,0,0,0,21,12Z"/></svg>
                  Áp dụng
                </>
              )}
            </button>
          </aside>

          {/* Image Display Area */}
          <section className="flex-grow bg-gray-800 rounded-xl p-4 flex flex-col items-center justify-center">
            {error && <div className="bg-red-500/20 border border-red-500 text-red-300 px-4 py-3 rounded-lg mb-4 w-full text-center">{error}</div>}
            
            <div className="flex flex-col gap-4 w-full h-full">
               {/* Upload Area */}
              <div className="relative border-2 border-dashed border-gray-600 rounded-lg p-6 text-center flex-grow flex flex-col items-center justify-center hover:border-blue-500 transition-colors">
                  <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      disabled={uploadedFiles.length >= MAX_FILES}
                  />
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-gray-500 mb-2" viewBox="0 0 24 24" fill="currentColor"><path d="M12,2A10,10,0,1,0,22,12,10,10,0,0,0,12,2Zm0,18a8,8,0,1,1,8-8A8,8,0,0,1,12,20Z"/><path d="M12,6a6,6,0,1,0,6,6A6,6,0,0,0,12,6Zm0,10a4,4,0,1,1,4-4A4,4,0,0,1,12,16Z"/></svg>
                  <p className="text-gray-400">Kéo và thả ảnh vào đây, hoặc nhấn để chọn</p>
                  <p className="text-xs text-gray-500 mt-1">Tối đa {MAX_FILES} ảnh</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                  {uploadedFiles.map((uf, index) => (
                      <div key={index} className="relative group">
                      <img src={uf.preview} alt={`preview ${index}`} className="w-full h-24 object-cover rounded-md" />
                      <button onClick={() => removeImage(index)} className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M13.41,12l4.3-4.29a1,1,0,1,0-1.42-1.42L12,10.59,7.71,6.29A1,1,0,0,0,6.29,7.71L10.59,12l-4.3,4.29a1,1,0,0,0,0,1.42,1,1,0,0,0,1.42,0L12,13.41l4.29,4.3a1,1,0,0,0,1.42,0,1,1,0,0,0,0-1.42Z"/></svg>
                      </button>
                      </div>
                  ))}
              </div>
            </div>
          </section>
        </main>

        {/* Result Section */}
         <section className="bg-gray-800 rounded-xl p-4 m-4 flex flex-col items-center justify-center">
            {renderResults()}
        </section>

        <footer className="text-center py-4 text-sm text-gray-500 border-t border-gray-800">
          <p>tác giả: <a href="https://www.facebook.com/profile.php?id=100022471674400" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Vũ Dũng Anh</a></p>
        </footer>
      </div>
    </>
  );
}

export default App;

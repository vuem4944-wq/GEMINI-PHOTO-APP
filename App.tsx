import React, { useState } from 'react';
import { EditMode } from './types';
import { editImage } from './services/geminiService';

const MAX_FILES = 5;

type UploadedFile = {
  file: File;
  preview: string;
};

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
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [editedImages, setEditedImages] = useState<string[]>([]);
  const [editMode, setEditMode] = useState<EditMode>(EditMode.RESTORE);
  const [outputQuality, setOutputQuality] = useState<string>('HD');
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      const filesToProcess = editMode === EditMode.COUPLE_PHOTO
        ? uploadedFiles
        : [uploadedFiles[0]];

      const base64Strings = await Promise.all(
          filesToProcess.map(uf => fileToBase64(uf.file))
      );
      const mimeTypes = filesToProcess.map(uf => uf.file.type);


      // Create 2 sequential requests to avoid rate limiting.
      const results: string[] = [];
      for (let i = 0; i < 2; i++) {
        const result = await editImage(
            base64Strings,
            mimeTypes,
            editMode, 
            outputQuality, 
            customPrompt
        );
        results.push(result);
        // Update state progressively to show images as they are generated
        setEditedImages([...results]); 
      }

    } catch (e: any) {
      setError(`Đã xảy ra lỗi: ${e.message}`);
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };


  const modeOptions = {
      [EditMode.RESTORE]: 'Phục chế',
      [EditMode.SHARPEN]: 'Làm nét',
      [EditMode.ID_PHOTO]: 'Ảnh thẻ',
      [EditMode.REMOVE_BACKGROUND]: 'Xóa nền',
      [EditMode.COUPLE_PHOTO]: 'Chụp ảnh chung',
      [EditMode.CUSTOM]: 'Tùy chỉnh',
  }
  
  const modeIcons: { [key in EditMode]: React.ReactNode } = {
    [EditMode.RESTORE]: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 110 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" /></svg>,
    [EditMode.SHARPEN]: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.022 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg>,
    [EditMode.ID_PHOTO]: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>,
    [EditMode.REMOVE_BACKGROUND]: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 0L19 19m-9.879-9.879l-2.879 2.879M12 12L9.121 9.121" /></svg>,
    [EditMode.COUPLE_PHOTO]: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zm-1.5 5.5a3 3 0 00-3 0V12a2 2 0 00-2 2v1a2 2 0 002 2h3.5a2 2 0 002-2v-1a2 2 0 00-2-2v-.5zM17 6a3 3 0 11-6 0 3 3 0 016 0zm-1.5 5.5a3 3 0 00-3 0V12a2 2 0 00-2 2v1a2 2 0 002 2H16a2 2 0 002-2v-1a2 2 0 00-2-2v-.5z" /></svg>,
    [EditMode.CUSTOM]: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>,
  };


  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-blue-400 flex items-center justify-center gap-3">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5 2a1 1 0 00-1 1v1H3a1 1 0 00-1 1v12a1 1 0 001 1h14a1 1 0 001-1V5a1 1 0 00-1-1h-1V3a1 1 0 00-1-1H5zM4 6h12v10H4V6zm2-2h8v1H6V4z" clipRule="evenodd" />
                <path d="M8.5 12a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
                <path fillRule="evenodd" d="M10 6a4 4 0 100 8 4 4 0 000-8zM7 10a3 3 0 116 0 3 3 0 01-6 0z" clipRule="evenodd" />
            </svg>
            Trình chỉnh sửa ảnh Gemini AI
          </h1>
          <p className="text-gray-400 mt-2">Nâng cấp ảnh của bạn với sức mạnh của trí tuệ nhân tạo.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-gray-800 p-6 rounded-xl space-y-6">
            
            <div>
              <h2 className="text-lg font-semibold mb-3 border-l-4 border-blue-400 pl-3 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                1. Tải ảnh lên
              </h2>
              <label htmlFor="image-upload" className="block w-full cursor-pointer border-2 border-dashed border-gray-600 hover:border-blue-500 rounded-lg p-8 text-center transition-colors">
                <input id="image-upload" type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" disabled={uploadedFiles.length >= MAX_FILES} />
                <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                <span className="text-gray-400 mt-2 block">Kéo và thả hoặc nhấp để chọn tệp</span>
                <p className="text-xs text-gray-500 mt-1">Tối đa {MAX_FILES} ảnh</p>
              </label>
              {uploadedFiles.length > 0 && (
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {uploadedFiles.map((uf, index) => (
                    <div key={index} className="relative group aspect-square">
                      <img src={uf.preview} alt={`Preview ${index + 1}`} className="w-full h-full object-cover rounded-md" />
                      <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-md">
                        <button onClick={() => removeImage(index)} className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold z-10">&times;</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div>
                <h2 className="text-lg font-semibold mb-3 border-l-4 border-blue-400 pl-3 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 16v-2m0-10v2m0 6v2M6 12H4m16 0h-2m-10 0h2m6 0h2M9 17l-2 2M15 7l2-2m-2 2l2 2m-2-2l-2-2m2 2l-2 2" /></svg>
                    2. Chế độ
                </h2>
                <div className="space-y-2">
                    {Object.entries(modeOptions).map(([key, value]) => (
                        <ModeButton key={key} mode={key as EditMode} currentMode={editMode} setMode={(m) => setEditMode(m)}>
                            {modeIcons[key as EditMode]}
                            <span>{value}</span>
                        </ModeButton>
                    ))}
                </div>
                 {editMode === EditMode.COUPLE_PHOTO && (
                    <p className="text-xs text-yellow-300 bg-yellow-900/40 p-2 rounded-md text-center mt-3">
                        Chế độ này yêu cầu tải lên chính xác 2 ảnh để kết hợp.
                    </p>
                )}
            </div>

             {editMode === EditMode.CUSTOM && (
                <div>
                    <label htmlFor="custom-prompt" className="block text-base font-medium text-gray-300 mb-2">
                        Lời nhắc tùy chỉnh
                    </label>
                    <textarea
                        id="custom-prompt"
                        value={customPrompt}
                        onChange={(e) => setCustomPrompt(e.target.value)}
                        placeholder="Ví dụ: biến ảnh này thành tranh sơn dầu theo phong cách Van Gogh..."
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-white placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        rows={4}
                    />
                </div>
            )}

            <div>
                <h2 className="text-lg font-semibold mb-3 border-l-4 border-blue-400 pl-3 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.293 2.293c.63.63 1.707.63 2.337 0l2.293-2.293m-4.63 16l2.293-2.293c.63-.63 1.707-.63 2.337 0l2.293 2.293M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                    3. Chất lượng đầu ra
                </h2>
                <div className="flex space-x-2">
                    <QualityButton quality="HD" currentQuality={outputQuality} setQuality={setOutputQuality}>HD</QualityButton>
                    <QualityButton quality="2K" currentQuality={outputQuality} setQuality={setOutputQuality}>2K</QualityButton>
                    <QualityButton quality="4K" currentQuality={outputQuality} setQuality={setOutputQuality}>4K</QualityButton>
                </div>
            </div>
            
            <button 
              onClick={handleEdit} 
              disabled={isLoading || uploadedFiles.length === 0 || (editMode === EditMode.CUSTOM && !customPrompt.trim())}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-colors text-lg flex items-center justify-center gap-2"
            >
              {isLoading ? 'Đang xử lý...' : '✨ Áp dụng & Tạo 2 ảnh'}
            </button>
             {error && <div className="text-red-400 bg-red-900/50 p-3 rounded-lg text-center">{error}</div>}

          </div>

          <div className="bg-gray-800 p-6 rounded-xl">
             <h2 className="text-lg font-semibold mb-4 text-center">Ảnh đã chỉnh sửa</h2>
             <div className="relative aspect-square">
                {isLoading && (
                    <div className="absolute inset-0 bg-gray-800/80 flex flex-col items-center justify-center z-10 rounded-lg">
                        <div className="w-16 h-16 border-4 border-dashed border-blue-400 rounded-full animate-spin"></div>
                        <p className="mt-4 text-lg">AI đang sáng tạo...</p>
                    </div>
                )}
                 <div className="grid grid-cols-2 gap-4 h-full">
                    {Array.from({ length: 2 }).map((_, index) => (
                        <div key={index} className="bg-gray-700 rounded-lg flex items-center justify-center overflow-hidden">
                            {editedImages[index] ? (
                                <img src={`data:image/png;base64,${editedImages[index]}`} alt={`Edited ${index + 1}`} className="w-full h-full object-contain" />
                            ) : (
                                <div className="flex flex-col items-center justify-center text-gray-500">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                  <span className="text-sm mt-2">Kết quả {index + 1}</span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
             </div>
          </div>
        </div>

        <footer className="text-center text-gray-500 text-sm mt-8 pb-4">
          <p>
            TÁC GIẢ: <a href="https://www.facebook.com/dunganh.vu2709/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Vũ Dũng Anh</a>
          </p>
        </footer>
      </div>
    </div>
  );
}

export default App;

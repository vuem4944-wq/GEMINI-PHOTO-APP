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
    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors w-full text-left ${currentMode === mode ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}
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


      // Create 4 parallel requests to generate 4 images at once
      const editPromises = Array(4).fill(0).map(() => 
        editImage(
            base64Strings,
            mimeTypes,
            editMode, 
            outputQuality, 
            customPrompt
        )
      );

      const results = await Promise.all(editPromises);
      setEditedImages(results);

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

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-blue-400">Trình chỉnh sửa ảnh Gemini AI</h1>
          <p className="text-gray-400 mt-2">Nâng cấp ảnh của bạn với sức mạnh của trí tuệ nhân tạo.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-gray-800 p-6 rounded-xl space-y-6">
            
            <div>
              <h2 className="text-lg font-semibold mb-3 border-l-4 border-blue-400 pl-3">1. Tải ảnh lên</h2>
              <label htmlFor="image-upload" className="block w-full cursor-pointer border-2 border-dashed border-gray-600 hover:border-blue-500 rounded-lg p-8 text-center transition-colors">
                <input id="image-upload" type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" disabled={uploadedFiles.length >= MAX_FILES} />
                <span className="text-gray-400">Kéo và thả hoặc nhấp để chọn tệp</span>
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
                <h2 className="text-lg font-semibold mb-3 border-l-4 border-blue-400 pl-3">2. Chế độ</h2>
                <div className="space-y-2">
                    {Object.entries(modeOptions).map(([key, value]) => (
                        <ModeButton key={key} mode={key as EditMode} currentMode={editMode} setMode={(m) => setEditMode(m)}>
                            {value}
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
                <h2 className="text-lg font-semibold mb-3 border-l-4 border-blue-400 pl-3">3. Chất lượng đầu ra</h2>
                <div className="flex space-x-2">
                    <QualityButton quality="HD" currentQuality={outputQuality} setQuality={setOutputQuality}>HD</QualityButton>
                    <QualityButton quality="2K" currentQuality={outputQuality} setQuality={setOutputQuality}>2K</QualityButton>
                    <QualityButton quality="4K" currentQuality={outputQuality} setQuality={setOutputQuality}>4K</QualityButton>
                </div>
            </div>
            
            <button 
              onClick={handleEdit} 
              disabled={isLoading || uploadedFiles.length === 0 || (editMode === EditMode.CUSTOM && !customPrompt.trim())}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-colors text-lg"
            >
              {isLoading ? 'Đang xử lý...' : '✨ Áp dụng & Tạo 4 ảnh'}
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
                 <div className="grid grid-cols-2 grid-rows-2 gap-4 h-full">
                    {Array.from({ length: 4 }).map((_, index) => (
                        <div key={index} className="bg-gray-700 rounded-lg flex items-center justify-center overflow-hidden">
                            {editedImages[index] ? (
                                <img src={`data:image/png;base64,${editedImages[index]}`} alt={`Edited ${index + 1}`} className="w-full h-full object-contain" />
                            ) : (
                                <span className="text-gray-500 text-sm">Kết quả {index + 1}</span>
                            )}
                        </div>
                    ))}
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
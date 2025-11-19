
import React, { useState, useEffect } from 'react';
import { 
    isDriveConfigured, initGoogleServices, signInToGoogle, signOutFromGoogle, 
    listSaveFiles, saveGameToDrive, loadGameFromDrive, deleteGameFromDrive, setClientId
} from '../services/googleDriveService';
import { DriveFile } from '../types';
import { Cloud, Download, Upload, Trash2, Loader2, X, Check, LogOut, Key, ExternalLink, Copy, ExternalLink as OpenIcon, HardDrive, FileJson, Save } from 'lucide-react';

interface CloudSavesProps {
  isOpen: boolean;
  onClose: () => void;
  getCurrentGameState: () => any;
  onLoadGame: (data: any) => void;
}

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

const CloudSaves: React.FC<CloudSavesProps> = ({ isOpen, onClose, getCurrentGameState, onLoadGame }) => {
  const [isConfigured, setIsConfigured] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [tempClientId, setTempClientId] = useState("");
  const [currentOrigin, setCurrentOrigin] = useState("");
  const [activeTab, setActiveTab] = useState<'cloud' | 'local'>('cloud');

  useEffect(() => {
    if (isOpen) {
        initialize();
        if (typeof window !== 'undefined') {
            setCurrentOrigin(window.location.origin);
        }
    }
  }, [isOpen]);

  const initialize = async () => {
      setIsLoading(true);
      try {
        await initGoogleServices();
        
        const configured = isDriveConfigured();
        setIsConfigured(configured);
        
        if (configured) {
            // Check if already signed in via gapi
            const token = (window as any).gapi?.client?.getToken();
            if (token) {
                setIsSignedIn(true);
                refreshList();
            }
        }
      } catch (e) {
          console.error("Init error", e);
      } finally {
          setIsLoading(false);
      }
  };

  const handleSaveClientId = () => {
      let cid = tempClientId.trim();
      // Sanitize: Remove surrounding quotes if user copied them by mistake
      if ((cid.startsWith('"') && cid.endsWith('"')) || (cid.startsWith("'") && cid.endsWith("'"))) {
        cid = cid.substring(1, cid.length - 1);
      }

      if (!cid) return;
      setClientId(cid);
      initialize();
  };

  const refreshList = async () => {
    setIsLoading(true);
    try {
      const list = await listSaveFiles();
      setFiles(list);
    } catch (e) {
      console.error(e);
      setStatusMsg("Помилка отримання списку файлів.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async () => {
    try {
      await signInToGoogle();
      setIsSignedIn(true);
      refreshList();
    } catch (e) {
      console.error(e);
      setStatusMsg("Не вдалося авторизуватися. Спробуйте у новому вікні.");
    }
  };

  const handleSignOut = () => {
    signOutFromGoogle();
    setIsSignedIn(false);
    setFiles([]);
  };

  const handleSave = async () => {
    const data = getCurrentGameState();
    setIsLoading(true);
    try {
      await saveGameToDrive(data);
      setStatusMsg("Гра успішно збережена в хмару!");
      await refreshList();
    } catch (e) {
      console.error(e);
      setStatusMsg("Помилка збереження.");
    } finally {
      setIsLoading(false);
      setTimeout(() => setStatusMsg(null), 3000);
    }
  };

  const handleLoad = async (fileId: string) => {
    setIsLoading(true);
    try {
      const data = await loadGameFromDrive(fileId);
      onLoadGame(data);
      setStatusMsg("Гра завантажена!");
      setTimeout(() => {
          onClose();
          setStatusMsg(null);
      }, 1000);
    } catch (e) {
      console.error(e);
      setStatusMsg("Помилка завантаження файлу.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (fileId: string) => {
    if (!window.confirm("Ви впевнені, що хочете видалити це збереження?")) return;
    
    setIsLoading(true);
    try {
      await deleteGameFromDrive(fileId);
      await refreshList();
    } catch (e) {
      console.error(e);
      setStatusMsg("Помилка видалення.");
    } finally {
      setIsLoading(false);
    }
  };

  // --- Local File Handlers ---
  const handleDownloadLocal = () => {
      try {
        const data = getCurrentGameState();
        const fileName = `dnd_save_${data.character?.name?.replace(/\s+/g, '_') || 'hero'}_${new Date().toISOString().slice(0,10)}.json`;
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const href = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = href;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setStatusMsg("Файл збережено на пристрій!");
        setTimeout(() => setStatusMsg(null), 3000);
      } catch (e) {
          console.error(e);
          setStatusMsg("Помилка створення файлу.");
      }
  };

  const handleUploadLocal = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      setIsLoading(true);
      const reader = new FileReader();
      reader.onload = (event) => {
          try {
              const result = event.target?.result;
              if (typeof result === 'string') {
                  const data = JSON.parse(result);
                  onLoadGame(data);
                  setStatusMsg("Файл успішно завантажено!");
                  setTimeout(() => {
                      onClose();
                      setStatusMsg(null);
                  }, 1500);
              }
          } catch (err) {
              console.error(err);
              setStatusMsg("Помилка читання файлу.");
          } finally {
              setIsLoading(false);
          }
      };
      reader.readAsText(file);
  };

  const copyOrigin = () => {
      navigator.clipboard.writeText(currentOrigin);
      setStatusMsg("URL скопійовано!");
      setTimeout(() => setStatusMsg(null), 2000);
  };

  const openInNewWindow = () => {
      window.open(window.location.href, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-stone-900 border-2 border-amber-800 rounded-lg shadow-2xl overflow-hidden flex flex-col relative max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-950 to-stone-900 p-4 border-b border-amber-800 flex justify-between items-center shrink-0">
          <h2 className="text-xl text-amber-500 fantasy-font flex items-center gap-2 tracking-wider">
             <Save className="w-6 h-6" /> Меню Збережень
          </h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-200 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-stone-800 bg-stone-950">
             <button 
                onClick={() => setActiveTab('cloud')}
                className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${activeTab === 'cloud' ? 'bg-stone-900 text-amber-500 border-b-2 border-amber-500' : 'text-stone-500 hover:text-stone-300 hover:bg-stone-900/50'}`}
             >
                 <Cloud className="w-4 h-4" /> Google Drive
             </button>
             <button 
                onClick={() => setActiveTab('local')}
                className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${activeTab === 'local' ? 'bg-stone-900 text-amber-500 border-b-2 border-amber-500' : 'text-stone-500 hover:text-stone-300 hover:bg-stone-900/50'}`}
             >
                 <HardDrive className="w-4 h-4" /> Цей Пристрій
             </button>
        </div>

        {/* Content */}
        <div className="p-6 bg-stone-950 min-h-[350px] flex flex-col relative overflow-y-auto custom-scrollbar">
            
            {isLoading && (
                <div className="absolute inset-0 z-10 bg-black/50 flex items-center justify-center backdrop-blur-[1px]">
                    <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
                </div>
            )}

            {/* Status Bar */}
            {statusMsg && (
                <div className="mb-4 p-2 bg-amber-900/30 border border-amber-800 text-amber-200 text-xs rounded flex items-center gap-2">
                    <Check className="w-4 h-4" /> {statusMsg}
                </div>
            )}

            {/* === LOCAL TAB === */}
            {activeTab === 'local' && (
                <div className="flex flex-col items-center justify-center flex-1 space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                     <div className="p-6 bg-stone-900 rounded-full border border-stone-700 relative shadow-lg">
                        <FileJson className="w-16 h-16 text-stone-400" />
                    </div>

                    <div className="space-y-2 text-center">
                        <h3 className="text-stone-200 font-bold text-lg">Локальний файл (.json)</h3>
                        <p className="text-stone-500 text-xs max-w-xs mx-auto">
                           Збережіть гру у файл на цьому пристрої, щоб перенести її пізніше або зробити резервну копію.
                        </p>
                    </div>

                    <div className="w-full max-w-xs space-y-4">
                         <button 
                            onClick={handleDownloadLocal}
                            className="w-full bg-amber-700 hover:bg-amber-600 text-white font-bold py-3 px-4 rounded shadow flex items-center justify-center gap-3 transition-transform hover:scale-[1.02]"
                         >
                             <Download className="w-5 h-5" />
                             Зберегти у файл
                         </button>

                         <div className="relative group w-full">
                             <input 
                                type="file" 
                                accept=".json"
                                onChange={handleUploadLocal}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                             />
                             <button className="w-full bg-stone-800 group-hover:bg-stone-700 text-stone-300 font-bold py-3 px-4 rounded border border-stone-600 flex items-center justify-center gap-3 transition-colors">
                                 <Upload className="w-5 h-5" />
                                 Завантажити з файлу
                             </button>
                         </div>
                    </div>
                </div>
            )}

            {/* === CLOUD TAB === */}
            {activeTab === 'cloud' && (
                <>
                {!isConfigured ? (
                    <div className="flex flex-col items-center justify-center flex-1 text-center space-y-6 animate-in zoom-in duration-300">
                        <div className="p-4 bg-stone-900 rounded-full border border-stone-700 shadow-lg">
                            <Key className="w-12 h-12 text-amber-600" />
                        </div>
                        
                        <div>
                            <h3 className="text-stone-200 font-bold text-lg">Налаштування Доступу</h3>
                            <p className="text-stone-500 text-sm mt-2 max-w-xs mx-auto leading-relaxed">
                            Для доступу до вашого Google Drive потрібен <b>Client ID</b>.
                            </p>
                        </div>

                        {/* Iframe Warning & Helper */}
                        <div className="w-full bg-amber-900/20 border border-amber-900/50 rounded p-3 text-left space-y-3">
                            <div className="flex items-start gap-2 text-amber-500 text-xs">
                                <OpenIcon className="w-4 h-4 shrink-0 mt-0.5" />
                                <p>Google блокує вхід через iframe. Якщо бачите помилку "OAuth Policy", відкрийте гру в новій вкладці:</p>
                            </div>
                            <button 
                                onClick={openInNewWindow}
                                className="w-full py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold rounded border border-stone-600 transition-colors"
                            >
                                Відкрити у окремому вікні
                            </button>
                        </div>

                        <div className="w-full bg-stone-900/50 border border-stone-800 rounded p-3 text-left">
                            <p className="text-[10px] text-stone-500 uppercase font-bold mb-1">Ваш Authorized Origin (Скопіюйте в Google Console):</p>
                            <div className="flex items-center gap-2">
                                <code className="bg-black px-2 py-1 rounded text-amber-500 text-xs flex-1 truncate select-all">
                                    {currentOrigin}
                                </code>
                                <button 
                                    onClick={copyOrigin}
                                    className="text-stone-400 hover:text-white p-1"
                                    title="Копіювати"
                                >
                                    <Copy className="w-3 h-3" />
                                </button>
                            </div>
                        </div>

                        <div className="w-full max-w-xs space-y-3">
                            <div className="relative">
                                <input 
                                    type="text" 
                                    value={tempClientId}
                                    onChange={(e) => setTempClientId(e.target.value)}
                                    placeholder="Вставте Client ID тут..."
                                    autoComplete="off"
                                    spellCheck="false"
                                    className="w-full bg-stone-800 border border-stone-600 text-stone-200 rounded px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                                />
                            </div>
                            
                            <button 
                                onClick={handleSaveClientId}
                                disabled={!tempClientId}
                                className="w-full bg-amber-700 hover:bg-amber-600 disabled:bg-stone-800 disabled:text-stone-600 text-white font-bold py-2 px-4 rounded shadow transition-colors flex justify-center items-center gap-2"
                            >
                                <Check className="w-4 h-4" /> Зберегти ID
                            </button>
                            
                            <a 
                                href="https://developers.google.com/identity/oauth2/web/guides/get-google-api-clientid" 
                                target="_blank" 
                                rel="noreferrer"
                                className="block text-[10px] text-stone-500 hover:text-amber-500 underline transition-colors mt-2"
                            >
                                <ExternalLink className="w-3 h-3 inline mr-1" />
                                Як отримати Google Client ID?
                            </a>
                        </div>
                    </div>
                ) : !isSignedIn ? (
                    <div className="flex flex-col items-center justify-center flex-1 text-center space-y-8 animate-in zoom-in duration-300">
                        <div className="p-6 bg-stone-900 rounded-full border border-stone-700 relative group shadow-[0_0_30px_rgba(251,191,36,0.1)]">
                            <div className="absolute inset-0 bg-amber-500/10 blur-xl rounded-full animate-pulse"></div>
                            <Cloud className="w-20 h-20 text-stone-300 relative z-10" strokeWidth={1.5} />
                        </div>
                        
                        <div className="space-y-3">
                            <h3 className="text-stone-100 font-bold text-xl fantasy-font tracking-[0.15em]">GOOGLE DRIVE</h3>
                            <p className="text-stone-500 text-sm max-w-xs mx-auto leading-relaxed">
                                Синхронізуйте свої пригоди між світами (пристроями).
                            </p>
                        </div>

                        <button 
                            onClick={handleSignIn}
                            className="bg-white hover:bg-stone-100 text-stone-900 font-bold py-3 px-8 rounded shadow-xl flex items-center gap-3 transition-transform hover:scale-105 border border-stone-300"
                        >
                            <GoogleIcon />
                            <span className="font-sans text-sm">Увійти в Google</span>
                        </button>
                        
                        <button 
                            onClick={() => { setClientId(''); setIsConfigured(false); }}
                            className="text-[10px] text-stone-600 hover:text-red-500 underline"
                        >
                            Змінити Client ID
                        </button>
                        
                        <div className="mt-4 p-2 bg-stone-900 border border-stone-800 rounded text-[10px] text-stone-500 max-w-xs">
                            Якщо вікно входу закривається миттєво або видає помилку — спробуйте відкрити гру у <button onClick={openInNewWindow} className="text-amber-500 underline">новій вкладці</button>.
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col flex-1 animate-in fade-in duration-300">
                        <div className="flex items-center justify-between mb-4 border-b border-stone-800 pb-2">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_5px_#22c55e]"></div>
                                <span className="text-xs text-stone-400 uppercase font-bold">Підключено</span>
                            </div>
                            <div className="flex gap-2">
                                <button 
                                    onClick={handleSave}
                                    disabled={isLoading}
                                    className="bg-amber-700 hover:bg-amber-600 text-white text-xs font-bold py-1.5 px-3 rounded flex items-center gap-2 shadow hover:shadow-amber-900/20 transition-all"
                                >
                                    <Upload className="w-3 h-3" /> Зберегти
                                </button>
                                <button 
                                    onClick={handleSignOut}
                                    className="p-1.5 text-stone-500 hover:text-stone-300 hover:bg-stone-800 rounded transition-colors"
                                    title="Вийти з акаунту"
                                >
                                    <LogOut className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 border border-stone-800 rounded bg-stone-900/30 overflow-y-auto custom-scrollbar max-h-[250px]">
                            {files.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-stone-600 space-y-2">
                                    <Cloud className="w-8 h-8 opacity-20" />
                                    <span className="text-xs italic">Папка збережень порожня.</span>
                                </div>
                            ) : (
                                <ul className="divide-y divide-stone-800/50">
                                    {files.map((file) => (
                                        <li key={file.id} className="p-3 flex items-center justify-between hover:bg-stone-800 transition-colors group">
                                            <div className="flex flex-col overflow-hidden mr-4">
                                                <span className="text-stone-300 text-sm font-bold truncate">
                                                    {file.name.replace('dnd_ai_save_', '').replace('.json', '').replace(/_/g, ' ')}
                                                </span>
                                                <span className="text-[10px] text-stone-500 flex items-center gap-1">
                                                    {file.modifiedTime ? new Date(file.modifiedTime).toLocaleDateString() + ' ' + new Date(file.modifiedTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Unknown date'}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                                                <button 
                                                    onClick={() => handleLoad(file.id)}
                                                    className="p-2 bg-stone-700 hover:bg-amber-600 text-white rounded shadow transition-colors"
                                                    title="Завантажити"
                                                >
                                                    <Download className="w-3.5 h-3.5" />
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(file.id)}
                                                    className="p-2 bg-stone-700 hover:bg-red-900 text-white rounded shadow transition-colors"
                                                    title="Видалити"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                )}
                </>
            )}
        </div>
      </div>
    </div>
  );
};

export default CloudSaves;


import React, { useState, useEffect } from 'react';
import { AppSettings, SUPPORTED_LANGUAGES, ThemeMode, Language } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (settings: Partial<AppSettings>) => void;
  onClearData: () => void;
  onOpenFeedback: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, 
  onClose, 
  settings, 
  onUpdateSettings,
  onClearData,
  onOpenFeedback
}) => {
  const [storageSize, setStorageSize] = useState<string>('0 KB');

  useEffect(() => {
    if (isOpen) {
      calculateStorage();
    }
  }, [isOpen]);

  const calculateStorage = () => {
    let total = 0;
    for (const key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        total += (localStorage[key].length + key.length) * 2;
      }
    }
    setStorageSize((total / 1024).toFixed(2) + ' KB');
  };

  const handleClearCache = () => {
    if (window.confirm('Are you sure you want to delete all saved data? This cannot be undone.')) {
      onClearData();
      calculateStorage();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-[2000] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-bold dark:text-white">Settings</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* Support Section */}
          <section>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Support</h3>
            <button 
              onClick={() => {
                onClose();
                onOpenFeedback();
              }}
              className="w-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
              Feedback & Support
            </button>
          </section>

          {/* Language */}
          <section>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Language</h3>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(SUPPORTED_LANGUAGES) as Language[]).map((lang) => (
                <button
                  key={lang}
                  onClick={() => onUpdateSettings({ language: lang })}
                  className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                    settings.language === lang 
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 ring-2 ring-blue-500/20' 
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100 dark:bg-gray-700/50 dark:text-gray-400 dark:hover:bg-gray-700'
                  }`}
                >
                  {SUPPORTED_LANGUAGES[lang]}
                </button>
              ))}
            </div>
          </section>

          {/* Appearance */}
          <section>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Appearance</h3>
            <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-xl">
              {(['light', 'dark', 'auto'] as ThemeMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => onUpdateSettings({ theme: mode })}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
                    settings.theme === mode
                      ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-600 dark:text-white'
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </section>

          {/* Data Management */}
          <section>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Data Management</h3>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
              <div className="flex justify-between items-center mb-4">
                <span className="text-gray-700 dark:text-gray-300">Used Storage</span>
                <span className="font-mono text-gray-900 dark:text-white font-medium">{storageSize}</span>
              </div>
              <button 
                onClick={handleClearCache}
                className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-medium transition-colors shadow-sm"
              >
                Clear Cache
              </button>
            </div>
          </section>

        </div>

        <div className="p-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 text-center">
          <p className="text-xs text-gray-400 font-mono">Rinkl AI v1.0.42</p>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;

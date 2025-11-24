import React, { useState, useEffect } from 'react';
import InvitationScreen from './components/InvitationScreen';
import ChatScreen from './components/ChatScreen';
import { AppSettings, ThemeMode } from './types';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [settings, setSettings] = useState<AppSettings>({
    theme: 'auto',
    language: 'ru'
  });

  useEffect(() => {
    // Check authentication
    const authStatus = localStorage.getItem('rinkl_auth_completed');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
    }

    // Load settings
    const savedSettings = localStorage.getItem('rinkl_settings');
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch (e) {
        console.error("Failed to parse settings");
      }
    }
    
    setIsLoading(false);
  }, []);

  // Theme application logic
  useEffect(() => {
    const applyTheme = () => {
      const root = window.document.documentElement;
      const isDark = 
        settings.theme === 'dark' || 
        (settings.theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);

      if (isDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    applyTheme();
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      if (settings.theme === 'auto') applyTheme();
    };
    
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [settings.theme]);

  const handleAuthSuccess = () => {
    localStorage.setItem('rinkl_auth_completed', 'true');
    setIsAuthenticated(true);
  };

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    localStorage.setItem('rinkl_settings', JSON.stringify(updated));
  };

  if (isLoading) return null;

  return (
    <div className="h-screen w-screen overflow-hidden">
      {!isAuthenticated ? (
        <InvitationScreen onEnter={handleAuthSuccess} />
      ) : (
        <ChatScreen settings={settings} onUpdateSettings={updateSettings} />
      )}
    </div>
  );
};

export default App;
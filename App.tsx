
import React, { useState, useEffect } from 'react';
import { SUPPORTED_LANGUAGES, Language } from './types';

const FAREWELL_TEXTS: Record<Language, { body: string; signOff: string }> = {
  ru: {
    body: "К сожалению команда Rinkl закрывает проект Rinkl AI, спасибо что остаётесь с нами",
    signOff: "с уважением команда Rinkl"
  },
  en: {
    body: "Unfortunately, the Rinkl team is closing the Rinkl AI project. Thank you for staying with us.",
    signOff: "Sincerely, Rinkl team"
  },
  es: {
    body: "Lamentablemente, el equipo de Rinkl va a cerrar el proyecto Rinkl AI. Gracias por seguir con nosotros.",
    signOff: "Atentamente, el equipo Rinkl"
  },
  cn: {
    body: "很遗憾，Rinkl 团队将关闭 Rinkl AI 项目。感谢您一直以来的陪伴。",
    signOff: "Rinkl 团队敬上"
  },
  de: {
    body: "Leider schließt das Rinkl-Team das Projekt Rinkl AI. Vielen Dank, dass Sie bei uns geblieben sind.",
    signOff: "Mit freundlichen Grüßen, Rinkl-Team"
  }
};

const App: React.FC = () => {
  const [lang, setLang] = useState<Language>('ru');
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Load saved preferences
    const savedLang = localStorage.getItem('rinkl_closure_lang') as Language;
    if (savedLang && SUPPORTED_LANGUAGES[savedLang]) {
      setLang(savedLang);
    }

    const savedTheme = localStorage.getItem('rinkl_theme');
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialDark = savedTheme === 'dark' || (!savedTheme && systemDark);
    
    setIsDark(initialDark);
    document.documentElement.classList.toggle('dark', initialDark);
  }, []);

  const toggleTheme = () => {
    const newDark = !isDark;
    setIsDark(newDark);
    document.documentElement.classList.toggle('dark', newDark);
    localStorage.setItem('rinkl_theme', newDark ? 'dark' : 'light');
  };

  const changeLanguage = (newLang: Language) => {
    setLang(newLang);
    localStorage.setItem('rinkl_closure_lang', newLang);
  };

  const currentText = FAREWELL_TEXTS[lang];

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center relative p-6 bg-[#f8fafc] dark:bg-gray-900 transition-colors duration-500">
      
      {/* Theme Toggle Button */}
      <button 
        onClick={toggleTheme}
        className="absolute top-8 right-8 p-3 rounded-full bg-white dark:bg-gray-800 shadow-lg text-gray-600 dark:text-yellow-400 hover:scale-110 transition-all border border-gray-100 dark:border-gray-700"
        aria-label="Toggle Theme"
      >
        {isDark ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
        )}
      </button>

      <div className="max-w-3xl w-full text-center animate-fade-in">
        {/* Brand Mark: Black R, Blue /////, Black NKL */}
        <div className="mb-12 flex justify-center items-center text-5xl md:text-6xl font-black tracking-tighter transition-all hover:scale-105">
          <span className="text-black dark:text-white">R</span>
          <span className="text-primary px-1">/////</span>
          <span className="text-black dark:text-white">NKL</span>
        </div>

        {/* Message Content */}
        <div className="space-y-6">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-white leading-tight">
            {currentText.body}
          </h1>
          
          <p className="text-xl text-gray-500 dark:text-gray-400 font-medium italic">
            {currentText.signOff}
          </p>
        </div>

        {/* Language Selection */}
        <div className="mt-16 inline-flex flex-wrap justify-center gap-2 p-1.5 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-200 dark:border-gray-700">
          {(Object.keys(SUPPORTED_LANGUAGES) as Language[]).map((l) => (
            <button
              key={l}
              onClick={() => changeLanguage(l)}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${
                lang === l
                  ? 'bg-primary text-white shadow-lg scale-105'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200/50 dark:hover:bg-gray-700/50'
              }`}
            >
              {SUPPORTED_LANGUAGES[l]}
            </button>
          ))}
        </div>
      </div>

      {/* Subtle Bottom Footer */}
      <div className="absolute bottom-10 text-[11px] text-gray-400 font-mono tracking-widest uppercase opacity-40">
        Rinkl AI • 2025-2026 • Project Legacy
      </div>
    </div>
  );
};

export default App;

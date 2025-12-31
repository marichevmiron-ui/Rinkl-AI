
import React, { useState, useEffect } from 'react';
import { SUPPORTED_LANGUAGES, Language } from './types.ts';

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

  useEffect(() => {
    // Load saved language preference
    const savedLang = localStorage.getItem('rinkl_closure_lang') as Language;
    if (savedLang && SUPPORTED_LANGUAGES[savedLang]) {
      setLang(savedLang);
    }

    // Handle system theme automatically
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const applyTheme = (e: MediaQueryList | MediaQueryListEvent) => {
      if (e.matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    // Initial check
    applyTheme(mediaQuery);

    // Listen for system changes
    mediaQuery.addEventListener('change', applyTheme);
    
    return () => mediaQuery.removeEventListener('change', applyTheme);
  }, []);

  const changeLanguage = (newLang: Language) => {
    setLang(newLang);
    localStorage.setItem('rinkl_closure_lang', newLang);
  };

  const currentText = FAREWELL_TEXTS[lang];

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center relative p-6 bg-[#f8fafc] dark:bg-gray-900 transition-colors duration-500">
      
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

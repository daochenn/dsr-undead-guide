import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Lang } from '../../apps/ds1/lib/i18n';

interface LanguageContextType {
  lang: Lang;
  toggleLang: () => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [lang, setLang] = useState<Lang>(() => {
    return (localStorage.getItem('ds1-lang') as Lang) || 'en';
  });

  const toggleLang = () => {
    setLang(prev => {
      const next = prev === 'en' ? 'zh' : 'en';
      localStorage.setItem('ds1-lang', next);
      return next;
    });
  };

  return (
    <LanguageContext.Provider value={{ lang, toggleLang }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLang = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLang must be used within a LanguageProvider');
  }
  return context;
};

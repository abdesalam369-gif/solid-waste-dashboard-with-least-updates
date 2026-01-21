
import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations, Language } from '../translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLangState] = useState<Language>(() => {
    // القراءة من localStorage عند بدء التشغيل
    const saved = localStorage.getItem('app_lang') as Language;
    return saved || 'ar';
  });

  // الوظيفة الرئيسية لتغيير اللغة والاتجاه والسمات
  const setLanguage = (lang: Language) => {
    setLangState(lang);
    localStorage.setItem('app_lang', lang);
  };

  // تحديث سمات المستند عند تغير الحالة
  useEffect(() => {
    document.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  // وظيفة الترجمة
  const t = (key: string) => {
    const dict = translations[language] as any;
    return dict[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

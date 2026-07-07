import { createContext, useState, useContext, useEffect, type ReactNode } from 'react';
import { translations } from '../data/translations';

type Language = 'en' | 'ko';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: typeof translations.en;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Guess the visitor's language from their locale when no preference is saved.
// Korea-based visitors (Asia/Seoul timezone or ko-* browser locale) open in Korean.
const detectLanguage = (): Language => {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz === 'Asia/Seoul') return 'ko';
  } catch {
    // Intl unavailable — fall through to navigator.language
  }
  if (navigator.language?.toLowerCase().startsWith('ko')) return 'ko';
  return 'en';
};

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  // Saved preference wins; otherwise detect from the visitor's country/locale.
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('objktt-language');
    if (saved === 'en' || saved === 'ko') return saved;
    return detectLanguage();
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('objktt-language', lang);
  };

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'ko' : 'en');
  };

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  return (
    <LanguageContext.Provider 
      value={{ 
        language, 
        setLanguage, 
        toggleLanguage, 
        t: translations[language] 
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

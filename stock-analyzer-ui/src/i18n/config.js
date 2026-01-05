import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import zhCN from './locales/zh-CN.json';
import zhTW from './locales/zh-TW.json';
import ko from './locales/ko.json';
import ja from './locales/ja.json';
import fr from './locales/fr.json';
import es from './locales/es.json';
import de from './locales/de.json';

const resources = {
  en: { translation: en },
  'zh-CN': { translation: zhCN },
  'zh-TW': { translation: zhTW },
  ko: { translation: ko },
  ja: { translation: ja },
  fr: { translation: fr },
  es: { translation: es },
  de: { translation: de },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: localStorage.getItem('language') || 'en', // Default language
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already escapes
    },
  });

export default i18n;

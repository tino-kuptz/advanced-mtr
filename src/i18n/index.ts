import { createI18n } from 'vue-i18n'
import en from './locales/en'
import de from './locales/de'

// Create i18n instance
const i18n = createI18n({
  legacy: false,
  locale: 'en',
  fallbackLocale: 'en',
  messages: {
    en,
    de
  }
})

// Set the initial locale from localStorage if available
try {
  const savedLanguage = localStorage.getItem('language')
  if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'de')) {
    i18n.global.locale.value = savedLanguage
  }
} catch (error) {
  console.warn('Could not access localStorage for language preference:', error)
}

export default i18n

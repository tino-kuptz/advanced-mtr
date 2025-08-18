import { createI18n } from 'vue-i18n'
import en from './locales/en.json'
import de from './locales/de.json'

// Get saved language preference or default to German
let defaultLocale = 'en'
try {
  const savedLanguage = localStorage.getItem('language')
  if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'de')) {
    defaultLocale = savedLanguage
  }
} catch (error) {
  // localStorage might not be available in some contexts
  console.warn('Could not access localStorage for language preference:', error)
}

export default createI18n({
  legacy: false, // Use Composition API
  locale: defaultLocale, // Default locale
  fallbackLocale: 'en', // Fallback locale
  allowComposition: true, // Allow composition API
  useScope: 'global', // Use global scope
  messages: {
    en,
    de
  }
})

<template>
  <div class="language-switcher">
    <select v-model="currentLocale" @change="changeLanguage" class="language-select">
      <option value="de">{{ $t('menu.german') }}</option>
      <option value="en">{{ $t('menu.english') }}</option>
    </select>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'

const { locale } = useI18n()
const currentLocale = ref(locale.value)

const changeLanguage = () => {
  locale.value = currentLocale.value
  // Save language preference to localStorage
  try {
    localStorage.setItem('language', currentLocale.value)
  } catch (error) {
    console.warn('Could not save language preference to localStorage:', error)
  }
}

onMounted(() => {
  // Load language preference from localStorage
  try {
    const savedLanguage = localStorage.getItem('language')
    if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'de')) {
      currentLocale.value = savedLanguage
      locale.value = savedLanguage
    }
  } catch (error) {
    console.warn('Could not load language preference from localStorage:', error)
  }
})
</script>

<style scoped>
.language-select {
  padding: 8px 12px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: white;
  font-size: 14px;
  cursor: pointer;
}

.language-select:hover {
  border-color: #999;
}

.language-select:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}
</style>

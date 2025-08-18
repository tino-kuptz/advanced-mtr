<template>
  <div class="footer">
    <div class="copyright">
      {{ $t('app.footer.copyright') }} {{ new Date().getFullYear() != 2025 ? '-' + new Date().getFullYear() : '' }} Tino Kuptz.
      <a href="https://github.com/tino-kuptz/advanced-mtr" target="_blank">{{ $t('app.footer.github') }}</a>
    </div>
    <div class="language-switcher">
      <LanguageSwitcher />
    </div>
  </div>
</template>

<script setup lang="ts">
import LanguageSwitcher from './LanguageSwitcher.vue'

import type { Progress } from '../types'

/**
 * Props für die AppFooter-Komponente
 */
interface Props {
  /** Fortschrittsinformationen des aktuellen MTR */
  progress: Progress
  /** Aktuelle Status-Nachricht */
  statusMessage: string
}

// @ts-ignore
const props = defineProps<Props>()
</script>

<style scoped>
.footer { display: flex; justify-content: center; align-items: center; margin-top: 20px; }
.copyright { flex: 1; }
.language-switcher { flex: 0; text-align: right; }
a { color: black; text-decoration: none; }
</style>

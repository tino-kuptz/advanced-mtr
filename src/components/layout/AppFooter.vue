<template>
  <div class="footer">
    <div class="copyright">
      {{ $t('app.footer.copyright') }} {{ new Date().getFullYear() != 2025 ? '-' + new Date().getFullYear() : '' }} Tino
      Kuptz.
      <a href="https://github.com/tino-kuptz/advanced-mtr" target="_blank">{{ $t('app.footer.github') }}</a>
    </div>
    <div class="language-switcher">
      <LanguageSwitcher />
    </div>
  </div>
</template>

<script setup lang="ts">
import LanguageSwitcher from './LanguageSwitcher.vue'

import type { Progress } from '../../types'

/**
 * Props for the AppFooter component
 */
interface Props {
  /** Progress information for the current MTR */
  progress: Progress
  /** Current status message */
  statusMessage: string
}

// @ts-ignore
const props = defineProps<Props>()
</script>

<style scoped>
.footer {
  display: flex;
  justify-content: center;
  align-items: center;
}

.copyright {
  flex: 1;
}

.language-switcher {
  flex: 0;
  text-align: right;
}

.footer a {
  color: black;
  text-decoration: none;
}
</style>

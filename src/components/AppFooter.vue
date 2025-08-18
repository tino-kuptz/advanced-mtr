<template>
  <div class="footer">
    <div class="copyright">
      © 2025 {{ new Date().getFullYear() != 2025 ? '-' + new Date().getFullYear() : '' }} Tino Kuptz.
      <a href="https://github.com/tino-kuptz/advanced-mtr" target="_blank">GitHub</a>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
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
a { color: black; text-decoration: none; }
</style>

<template>
  <div class="footer">
    <div class="copyright">
      © 2025 {{ new Date().getFullYear() != 2025 ? '-' + new Date().getFullYear() : '' }} Tino Kuptz
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

const props = defineProps<Props>()

/**
 * Berechnet den Fortschritt in Prozent
 * @returns Fortschritt als Prozentwert (0-100)
 */
const progressPercentage = computed(() => {
  if (props.progress.maxHops === 0) return 0
  return Math.round((props.progress.currentHop / props.progress.maxHops) * 100)
})

/**
 * Berechnet den Fortschrittstext
 * @returns Fortschrittstext für die Anzeige
 */
const progressText = computed(() => {
  if (props.progress.phase === 'mtr') {
    return `MTR: ${props.progress.currentHop} / ${props.progress.maxHops} Hops`
  } else {
    return `Ping: Kontinuierlich`
  }
})
</script>

<style scoped>
/* Styles werden von der Haupt-App geerbt */
</style>

export default {
  "app": {
    "title": "Advanced MTR",
    "footer": {
      "copyright": "© 2025 Tino Kuptz.",
      "github": "GitHub"
    }
  },
  "scan": {
    "config": {
      "title": "MTR Konfiguration",
      "target": "Ziel",
      "targetPlaceholder": "IP-Adresse oder Domain eingeben",
      "maxHops": "Max Hops",
      "timeout": "Timeout (ms)",
      "probesPerHop": "Sonden pro Hop",
      "startButton": "MTR starten",
      "stopButton": "Stoppen",
      "loading": "Lädt..."
    },
    "results": {
      "title": "Scan Ergebnisse",
      "noResults": "Keine Scan-Ergebnisse verfügbar",
      "initOneMessage": "Bitte geben Sie oben eine IP-Adresse oder Domain ein und klicken Sie auf MTR starten.",
      "initTwoMessage": "Advanced MTR führt dann eine Traceroute und anschließend einen Ping für jeden Hop durch.",
      "initThreeMessage": "Der erste Scan kann mehrere Sekunden dauern.",
      "target": "Ziel",
      "hopNumber": "Hop",
      "ip": "IP-Adresse",
      "hostname": "Hostname",
      "status": "Status",
      "avgResponse": "Ø Antwortzeit",
      "successfulPings": "Erfolgreich",
      "failedPings": "Fehlgeschlagen",
      "reachable": "Erreichbar",
      "unreachable": "Nicht erreichbar",
      "details": "Details",
      "close": "Schließen"
    }
  },
  "hop": {
    "detail": {
      "title": "Hop Details",
      "hopNumber": "Hop {number}",
      "ip": "IP-Adresse",
      "hostname": "Hostname",
      "status": "Status",
      "statistics": "Statistiken",
      "pingHistory": "Ping-Verlauf",
      "chart": "Antwortzeit-Diagramm",
      "table": "Ping-Tabelle",
      "interval": "Intervall",
      "second": "Sekunde",
      "minute": "Minute",
      "5min": "5 Minuten",
      "15min": "15 Minuten",
      "30min": "30 Minuten",
      "hour": "Stunde",
      "2hour": "2 Stunden"
    }
  },
  "ping": {
    "chart": {
      "title": "Antwortzeit-Diagramm",
      "responseTime": "Antwortzeit (ms)",
      "time": "Zeit",
      "timeouts": "Timeouts"
    },
    "table": {
      "title": "Ping-Tabelle",
      "timestamp": "Zeitstempel",
      "responseTime": "Antwortzeit",
      "status": "Status",
      "successful": "Erfolgreich",
      "timeout": "Timeout",
      "noData": "Keine Ping-Daten verfügbar"
    }
  },
  "status": {
    "ready": "Bereit",
    "scanning": "Scanne...",
    "stopped": "Gestoppt",
    "completed": "Abgeschlossen",
    "error": "Fehler",
    "mtrProgress": "MTR: Hop {current}/{max} - {ip}",
    "pingProgress": "Ping: {ip}",
    "dataImported": "MTR-Daten erfolgreich importiert",
    "noDataToSave": "Keine MTR-Daten zum Speichern verfügbar"
  },
  "menu": {
    "file": "Datei",
    "save": "MTR speichern",
    "load": "MTR laden",
    "quit": "Beenden",
    "edit": "Bearbeiten",
    "view": "Ansicht",
    "language": "Sprache",
    "english": "Englisch",
    "german": "Deutsch"
  },
  "common": {
    "back": "Zurück",
    "close": "Schließen",
    "save": "Speichern",
    "load": "Laden",
    "cancel": "Abbrechen",
    "ok": "OK",
    "error": "Fehler",
    "success": "Erfolg",
    "loading": "Lädt...",
    "noData": "Keine Daten verfügbar"
  }
}

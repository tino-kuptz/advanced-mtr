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
      "title": "MTR Configuration",
      "target": "Target",
      "targetPlaceholder": "Enter IP address or domain",
      "maxHops": "Max Hops",
      "timeout": "Timeout (ms)",
      "probesPerHop": "Probes per Hop",
      "startButton": "Start MTR",
      "stopButton": "Stop",
      "loading": "Loading..."
    },
    "results": {
      "title": "Scan Results",
      "noResults": "No scan results available",
      "initOneMessage": "Please enter an IP address or domain above and click on MTR start.",
      "initTwoMessage": "Advanced MTR will then perform a traceroute and then a ping for each hop.",
      "initThreeMessage": "The first scan may take several seconds.",
      "target": "Target",
      "hopNumber": "Hop",
      "ip": "IP Address",
      "hostname": "Hostname",
      "status": "Status",
      "avgResponse": "Avg Response",
      "successfulPings": "Successful",
      "failedPings": "Failed",
      "reachable": "Reachable",
      "unreachable": "Unreachable",
      "details": "Details",
      "close": "Close"
    }
  },
  "hop": {
    "detail": {
      "title": "Hop Details",
      "hopNumber": "Hop {number}",
      "ip": "IP Address",
      "hostname": "Hostname",
      "status": "Status",
      "statistics": "Statistics",
      "pingHistory": "Ping History",
      "chart": "Response Time Chart",
      "table": "Ping Table",
      "interval": "Interval",
      "second": "Second",
      "minute": "Minute",
      "5min": "5 Minutes",
      "15min": "15 Minutes",
      "30min": "30 Minutes",
      "hour": "Hour",
      "2hour": "2 Hours"
    }
  },
  "ping": {
    "chart": {
      "title": "Response Time Chart",
      "responseTime": "Response Time (ms)",
      "time": "Time",
      "timeouts": "Timeouts"
    },
    "table": {
      "title": "Ping Table",
      "timestamp": "Timestamp",
      "responseTime": "Response Time",
      "status": "Status",
      "successful": "Successful",
      "timeout": "Timeout",
      "noData": "No ping data available"
    }
  },
  "status": {
    "ready": "Ready",
    "scanning": "Scanning...",
    "stopped": "Stopped",
    "completed": "Completed",
    "error": "Error",
    "mtrProgress": "MTR: Hop {current}/{max} - {ip}",
    "pingProgress": "Ping: {ip}",
    "dataImported": "MTR data imported successfully",
    "noDataToSave": "No MTR data available to save"
  },
  "menu": {
    "file": "File",
    "save": "Save MTR",
    "load": "Load MTR",
    "quit": "Quit",
    "edit": "Edit",
    "view": "View",
    "language": "Language",
    "english": "English",
    "german": "German"
  },
  "common": {
    "back": "Back",
    "close": "Close",
    "save": "Save",
    "load": "Load",
    "cancel": "Cancel",
    "ok": "OK",
    "error": "Error",
    "success": "Success",
    "loading": "Loading...",
    "noData": "No data available"
  }
}

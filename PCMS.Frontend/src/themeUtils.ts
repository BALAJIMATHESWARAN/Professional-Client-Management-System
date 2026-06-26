export const translations: Record<string, Record<string, string>> = {
  en: {
    morning: "Good Morning",
    afternoon: "Good Afternoon",
    evening: "Good Evening",
    welcome: "Welcome back! Select a feature module below to manage workspace entries.",
    welcomeSuperAdmin: "Welcome back to the system control center.",
    assignedFeatures: "Assigned Features & Modules",
    search: "Search...",
    filter: "Filter",
    sort: "Sort"
  },
  es: {
    morning: "Buenos Días",
    afternoon: "Buenas Tardes",
    evening: "Buenas Noches",
    welcome: "¡Bienvenido de nuevo! Seleccione un módulo de funciones a continuación para administrar las entradas del espacio de trabajo.",
    welcomeSuperAdmin: "Bienvenido de nuevo al centro de control del sistema.",
    assignedFeatures: "Características y Módulos Asignados",
    search: "Buscar...",
    filter: "Filtrar",
    sort: "Ordenar"
  },
  fr: {
    morning: "Bonjour",
    afternoon: "Bon après-midi",
    evening: "Bonsoir",
    welcome: "Bon retour! Sélectionnez un module de fonctionnalités ci-dessous pour gérer les entrées de l'espace de travail.",
    welcomeSuperAdmin: "Bon retour au centre de contrôle du système.",
    assignedFeatures: "Fonctionnalités et Modules Assignés",
    search: "Recherche...",
    filter: "Filtrer",
    sort: "Trier"
  }
};

export const getIANATimeZone = (tz: string) => {
  switch (tz) {
    case 'EST': return 'America/New_York';
    case 'PST': return 'America/Los_Angeles';
    case 'IST': return 'Asia/Kolkata';
    default: return 'UTC';
  }
};

export const formatAppDate = (
  dateInput: Date | string | number | undefined | null,
  lang: string = 'en',
  tz: string = 'UTC',
  format: string = 'YYYY-MM-DD',
  includeTime: boolean = false
) => {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';

  const tzName = getIANATimeZone(tz);
  
  try {
    const formatter = new Intl.DateTimeFormat(lang, {
      timeZone: tzName,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: includeTime ? '2-digit' : undefined,
      minute: includeTime ? '2-digit' : undefined,
      second: includeTime ? '2-digit' : undefined,
      hour12: true
    });

    const parts = formatter.formatToParts(d);
    const partMap = Object.fromEntries(parts.map(p => [p.type, p.value]));

    const yyyy = partMap.year || '';
    const mm = partMap.month || '';
    const dd = partMap.day || '';

    let dateStr = '';
    if (format === 'DD/MM/YYYY') {
      dateStr = `${dd}/${mm}/${yyyy}`;
    } else if (format === 'MM/DD/YYYY') {
      dateStr = `${mm}/${dd}/${yyyy}`;
    } else {
      dateStr = `${yyyy}-${mm}-${dd}`;
    }

    if (includeTime && partMap.hour) {
      const timeStr = `${partMap.hour}:${partMap.minute}:${partMap.second} ${partMap.dayPeriod ? partMap.dayPeriod.toUpperCase() : ''}`;
      const timeConnector = lang === 'es' ? 'a las' : lang === 'fr' ? 'à' : '-';
      return `${dateStr} ${timeConnector} ${timeStr}`;
    }

    return dateStr;
  } catch (e) {
    // Fallback if formatting fails due to runtime support
    return d.toISOString().split('T')[0];
  }
};

export const formatLiveTime = (date: Date, lang: string, tz: string, format: string) => {
  const tzName = getIANATimeZone(tz);
  
  try {
    // Format day name
    const dayNameFormatter = new Intl.DateTimeFormat(lang, { timeZone: tzName, weekday: 'long' });
    const dayName = dayNameFormatter.format(date);
    

    // Format date parts
    const dateFormatter = new Intl.DateTimeFormat(lang, {
      timeZone: tzName,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
    const parts = dateFormatter.formatToParts(date);
    const partMap = Object.fromEntries(parts.map(p => [p.type, p.value]));

    const yyyy = partMap.year || '';
    const mm = partMap.month || '';
    const dd = partMap.day || '';
    const hour = partMap.hour || '';
    const min = partMap.minute || '';
    const sec = partMap.second || '';
    const ampm = partMap.dayPeriod || '';

    let dateStr = '';
    if (format === 'DD/MM/YYYY') {
      dateStr = `${dd}/${mm}/${yyyy}`;
    } else if (format === 'MM/DD/YYYY') {
      dateStr = `${mm}/${dd}/${yyyy}`;
    } else {
      dateStr = `${yyyy}-${mm}-${dd}`;
    }

    const timeConnector = lang === 'es' ? 'a las' : lang === 'fr' ? 'à' : '-';
    const capitalize = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
    
    return `${capitalize(dayName)}, ${dateStr} ${timeConnector} ${hour}:${min}:${sec} ${ampm.toUpperCase()}`;
  } catch (e) {
    return date.toString();
  }
};

export const themePatterns = {
  classic: {
    name: 'Classic Zoho',
    colors: {
      '--zoho-blue': '#226DB4',
      '--zoho-blue-hover': '#1a5892',
      '--zoho-blue-glow': 'rgba(34, 109, 180, 0.15)',
      '--zoho-red': '#E42527',
      '--zoho-red-hover': '#c71b1d',
      '--zoho-red-glow': 'rgba(228, 37, 39, 0.1)',
      '--zoho-green': '#089949',
      '--zoho-green-hover': '#067c3b',
      '--zoho-green-glow': 'rgba(8, 153, 73, 0.1)',
      '--zoho-yellow': '#F9B21D',
      '--zoho-yellow-hover': '#e09f16',
      '--zoho-yellow-glow': 'rgba(249, 178, 29, 0.1)'
    }
  },
  ocean: {
    name: 'Ocean Breeze (Blues & Aquas)',
    colors: {
      '--zoho-blue': '#0284c7',
      '--zoho-blue-hover': '#0369a1',
      '--zoho-blue-glow': 'rgba(2, 132, 199, 0.18)',
      '--zoho-red': '#e11d48',
      '--zoho-red-hover': '#be123c',
      '--zoho-red-glow': 'rgba(225, 29, 72, 0.12)',
      '--zoho-green': '#0f766e',
      '--zoho-green-hover': '#115e59',
      '--zoho-green-glow': 'rgba(15, 118, 110, 0.12)',
      '--zoho-yellow': '#d97706',
      '--zoho-yellow-hover': '#b45309',
      '--zoho-yellow-glow': 'rgba(217, 119, 6, 0.12)'
    }
  },
  forest: {
    name: 'Emerald Forest (Earth & Greens)',
    colors: {
      '--zoho-blue': '#059669',
      '--zoho-blue-hover': '#047857',
      '--zoho-blue-glow': 'rgba(5, 150, 105, 0.18)',
      '--zoho-red': '#e11d48',
      '--zoho-red-hover': '#be123c',
      '--zoho-red-glow': 'rgba(225, 29, 72, 0.12)',
      '--zoho-green': '#15803d',
      '--zoho-green-hover': '#166534',
      '--zoho-green-glow': 'rgba(21, 128, 61, 0.12)',
      '--zoho-yellow': '#ca8a04',
      '--zoho-yellow-hover': '#a16207',
      '--zoho-yellow-glow': 'rgba(202, 138, 4, 0.12)'
    }
  },
  sunset: {
    name: 'Sunset Crimson (Warm & Oranges)',
    colors: {
      '--zoho-blue': '#ea580c',
      '--zoho-blue-hover': '#c2410c',
      '--zoho-blue-glow': 'rgba(234, 88, 12, 0.18)',
      '--zoho-red': '#be123c',
      '--zoho-red-hover': '#9f1239',
      '--zoho-red-glow': 'rgba(190, 18, 60, 0.12)',
      '--zoho-green': '#16a34a',
      '--zoho-green-hover': '#15803d',
      '--zoho-green-glow': 'rgba(22, 163, 74, 0.12)',
      '--zoho-yellow': '#eab308',
      '--zoho-yellow-hover': '#ca8a04',
      '--zoho-yellow-glow': 'rgba(234, 179, 8, 0.12)'
    }
  },
  midnight: {
    name: 'Midnight Lavender (Royal Purples)',
    colors: {
      '--zoho-blue': '#7c3aed',
      '--zoho-blue-hover': '#6d28d9',
      '--zoho-blue-glow': 'rgba(124, 58, 237, 0.18)',
      '--zoho-red': '#db2777',
      '--zoho-red-hover': '#c11574',
      '--zoho-red-glow': 'rgba(219, 39, 119, 0.12)',
      '--zoho-green': '#059669',
      '--zoho-green-hover': '#047857',
      '--zoho-green-glow': 'rgba(5, 150, 105, 0.12)',
      '--zoho-yellow': '#f59e0b',
      '--zoho-yellow-hover': '#d97706',
      '--zoho-yellow-glow': 'rgba(245, 158, 11, 0.12)'
    }
  }
};

export const applyThemePattern = (patternName: keyof typeof themePatterns) => {
  const selected = themePatterns[patternName] || themePatterns.classic;
  const root = document.documentElement;
  Object.entries(selected.colors).forEach(([variable, value]) => {
    root.style.setProperty(variable, value);
  });
};

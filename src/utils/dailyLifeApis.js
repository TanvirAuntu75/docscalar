/**
 * DocScalar Client-Side Daily Life API Engine
 * 100% Free, Keyless, and CORS-Friendly APIs with TTL Caching & Abort Timeout.
 * Complies with DocScalar's 100% client-side privacy-first architecture.
 */

// In-memory cache with 10-minute Time-To-Live (TTL)
const API_CACHE = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000;

/**
 * Robust fetch wrapper with automatic timeout and in-memory TTL caching.
 */
export async function fetchWithTimeout(url, options = {}, timeoutMs = 4500) {
  const cacheKey = url;
  const cached = API_CACHE.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
    return cached.data;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...options,
      credentials: 'omit',
      signal: controller.signal
    });
    clearTimeout(timer);

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    API_CACHE.set(cacheKey, { timestamp: Date.now(), data });
    return data;
  } catch (err) {
    clearTimeout(timer);
    return null;
  }
}

/**
 * Clear the daily API cache (useful for testing or manual reset).
 */
export function clearDailyCache() {
  API_CACHE.clear();
}

/**
 * 1. Live Weather Forecast (Open-Meteo)
 * Resolves city coordinates via Open-Meteo Geocoding then queries live weather.
 */
export async function getLiveWeather(cityName) {
  if (!cityName || typeof cityName !== 'string') return null;
  const cleanCity = cityName.trim();
  if (cleanCity.length < 2) return null;

  const geo = await fetchWithTimeout(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cleanCity)}&count=1&language=en&format=json`
  );

  if (!geo?.results || !geo.results.length) {
    return {
      success: false,
      title: `Weather: ${cleanCity}`,
      text: `Sorry, I couldn't locate weather data for **"${cleanCity}"**. Please verify the city name or spelling and try again.`,
      action: null
    };
  }

  const { latitude, longitude, name, country, admin1 } = geo.results[0];
  const weather = await fetchWithTimeout(
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min&timezone=auto`
  );

  if (!weather?.current) {
    return {
      success: false,
      title: `Weather: ${name}`,
      text: `Weather data is temporarily unavailable for **${name}**. Please try again in a few moments.`,
      action: null
    };
  }

  const wmoCodes = {
    0: { desc: 'Clear sky', icon: '☀️' },
    1: { desc: 'Mainly clear', icon: '🌤️' },
    2: { desc: 'Partly cloudy', icon: '⛅' },
    3: { desc: 'Overcast', icon: '☁️' },
    45: { desc: 'Foggy', icon: '🌫️' },
    48: { desc: 'Depositing rime fog', icon: '🌫️' },
    51: { desc: 'Light drizzle', icon: '🌦️' },
    53: { desc: 'Moderate drizzle', icon: '🌦️' },
    55: { desc: 'Dense drizzle', icon: '🌧️' },
    61: { desc: 'Slight rain', icon: '🌧️' },
    63: { desc: 'Moderate rain', icon: '🌧️' },
    65: { desc: 'Heavy rain', icon: '⛈️' },
    71: { desc: 'Slight snow', icon: '🌨️' },
    73: { desc: 'Moderate snow', icon: '❄️' },
    75: { desc: 'Heavy snow', icon: '❄️' },
    80: { desc: 'Rain showers', icon: '🌦️' },
    95: { desc: 'Thunderstorm', icon: '⛈️' }
  };

  const curr = weather.current;
  const codeInfo = wmoCodes[curr.weather_code] || { desc: 'Fair', icon: '🌤️' };
  const maxTemp = weather.daily?.temperature_2m_max?.[0];
  const minTemp = weather.daily?.temperature_2m_min?.[0];

  const markdownText = 
    `### **${codeInfo.icon} Weather in ${name}, ${country}**\n\n` +
    `• **Condition**: ${codeInfo.desc} ${codeInfo.icon}\n` +
    `• **Temperature**: **${Math.round(curr.temperature_2m)}°C** (Feels like ${Math.round(curr.apparent_temperature)}°C)\n` +
    (maxTemp !== undefined && minTemp !== undefined ? `• **Today's Range**: Low ${Math.round(minTemp)}°C / High ${Math.round(maxTemp)}°C\n` : '') +
    `• **Humidity**: ${curr.relative_humidity_2m}%\n` +
    `• **Wind Speed**: ${curr.wind_speed_10m} km/h`;

  return {
    success: true,
    title: `Weather in ${name}`,
    text: markdownText,
    action: null
  };
}

/**
 * 2. Currency Conversion (Frankfurter / European Central Bank)
 */
export async function getCurrencyConversion(amount, from, to) {
  const numAmount = parseFloat(amount);
  if (isNaN(numAmount) || numAmount <= 0) return null;

  const fromCode = (from || 'USD').toUpperCase().trim();
  const toCode = (to || 'EUR').toUpperCase().trim();

  if (fromCode === toCode) {
    return {
      success: true,
      title: `Currency: ${fromCode} to ${toCode}`,
      text: `**${numAmount.toLocaleString()} ${fromCode}** = **${numAmount.toLocaleString()} ${toCode}** (Same currency).`,
      action: null
    };
  }

  const data = await fetchWithTimeout(
    `https://api.frankfurter.dev/v1/latest?amount=${numAmount}&from=${fromCode}&to=${toCode}`
  );

  if (!data?.rates || data.rates[toCode] === undefined) {
    return {
      success: false,
      title: `Currency: ${fromCode} to ${toCode}`,
      text: `Unable to calculate exchange rate between **${fromCode}** and **${toCode}**. Please ensure both are valid ISO currency codes (e.g., USD, EUR, GBP, JPY, CAD).`,
      action: null
    };
  }

  const converted = data.rates[toCode];
  const unitRate = (converted / numAmount).toFixed(4);

  const markdownText = 
    `**${numAmount.toLocaleString()} ${fromCode}** = **${converted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${toCode}**\n\n` +
    `• **Exchange Rate**: 1 ${fromCode} = **${unitRate} ${toCode}**`;

  return {
    success: true,
    title: `${numAmount} ${fromCode} → ${toCode}`,
    text: markdownText,
    action: null
  };
}

/**
 * 3. English Dictionary & Vocabulary (Free Dictionary API)
 */
export async function getWordDefinition(rawWord) {
  if (!rawWord || typeof rawWord !== 'string') return null;
  const word = rawWord.trim().toLowerCase().replace(/[^a-z-]/g, '');
  if (word.length < 2) return null;

  // 1. Primary: Datamuse API (100,000 req/day free, zero key, instant response)
  const datamuse = await fetchWithTimeout(
    `https://api.datamuse.com/words?sp=${encodeURIComponent(word)}&md=ds&max=1`
  );

  if (Array.isArray(datamuse) && datamuse.length > 0 && datamuse[0].defs?.length) {
    const entry = datamuse[0];
    const rawDef = entry.defs[0];
    const [posCode, ...defParts] = rawDef.split('\t');
    const posMap = { n: 'noun', v: 'verb', adj: 'adjective', adv: 'adverb', u: 'interjection' };
    const partOfSpeech = posMap[posCode] || 'definition';
    const def = defParts.join(' ').trim();
    const cleanWord = entry.word || word;

    const markdownText = 
      `**${cleanWord}** *(${partOfSpeech})*\n\n` +
      `${def}`;

    return {
      success: true,
      title: `Definition: ${cleanWord}`,
      text: markdownText,
      action: null
    };
  }

  // 2. Secondary Fallback: Wiktionary REST API (Official Wikimedia Foundation)
  const wiktionary = await fetchWithTimeout(
    `https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(word)}`
  );

  if (wiktionary?.en?.length) {
    const firstEn = wiktionary.en[0];
    const partOfSpeech = firstEn.partOfSpeech?.toLowerCase() || 'noun';
    const rawDefHtml = firstEn.definitions?.[0]?.definition || '';
    const def = rawDefHtml.replace(/<[^>]+>/g, '').trim();

    if (def) {
      const markdownText = 
        `**${word}** *(${partOfSpeech})*\n\n` +
        `${def}`;

      return {
        success: true,
        title: `Definition: ${word}`,
        text: markdownText,
        action: null
      };
    }
  }

  return {
    success: false,
    title: `Dictionary: "${word}"`,
    text: `No definition found for **"${word}"**. Check the spelling or try a root form of the word.`,
    action: null
  };
}

/**
 * 4. General Knowledge & Biographies (Wikimedia / Wikipedia REST)
 */
export async function getWikiSummary(rawTopic) {
  if (!rawTopic || typeof rawTopic !== 'string') return null;
  const topic = rawTopic.trim().replace(/\s+/g, '_');
  if (topic.length < 2) return null;

  const data = await fetchWithTimeout(
    `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topic)}`
  );

  if (!data || !data.title || data.type === 'disambiguation') {
    return {
      success: false,
      title: `Wikipedia: "${rawTopic}"`,
      text: `Could not retrieve an exact Wikipedia article summary for **"${rawTopic}"**. Try rephrasing with the official person or concept name.`,
      action: null
    };
  }

  const desc = data.description ? `*${data.description}*\n\n` : '';
  const pageUrl = data.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(topic)}`;

  const markdownText = 
    `### **🏛️ ${data.title}**\n\n` +
    desc +
    `${data.extract}\n\n` +
    `[Read complete article on Wikipedia →](${pageUrl})`;

  return {
    success: true,
    title: data.title,
    text: markdownText,
    action: {
      type: 'wiki',
      title: data.title,
      category: 'Wikipedia',
      description: data.description || 'Wikipedia encyclopedic article',
      url: pageUrl,
      thumbnail: data.thumbnail?.source || null
    }
  };
}

/**
 * 5. World Clock & Timezone (Native Intl Browser Engine - 0ms & Offline Capable!)
 */
const CITY_TIMEZONE_MAP = {
  tokyo: 'Asia/Tokyo',
  japan: 'Asia/Tokyo',
  london: 'Europe/London',
  uk: 'Europe/London',
  england: 'Europe/London',
  'new york': 'America/New_York',
  ny: 'America/New_York',
  nyc: 'America/New_York',
  california: 'America/Los_Angeles',
  'los angeles': 'America/Los_Angeles',
  la: 'America/Los_Angeles',
  'san francisco': 'America/Los_Angeles',
  sf: 'America/Los_Angeles',
  paris: 'Europe/Paris',
  france: 'Europe/Paris',
  berlin: 'Europe/Berlin',
  germany: 'Europe/Berlin',
  sydney: 'Australia/Sydney',
  australia: 'Australia/Sydney',
  singapore: 'Asia/Singapore',
  dubai: 'Asia/Dubai',
  uae: 'Asia/Dubai',
  dhaka: 'Asia/Dhaka',
  bangladesh: 'Asia/Dhaka',
  india: 'Asia/Kolkata',
  delhi: 'Asia/Kolkata',
  mumbai: 'Asia/Kolkata',
  toronto: 'America/Toronto',
  canada: 'America/Toronto',
  chicago: 'America/Chicago',
  utc: 'UTC',
  gmt: 'GMT'
};

export function getWorldTime(locationQuery) {
  if (!locationQuery || typeof locationQuery !== 'string') {
    // Current local user time
    const now = new Date();
    const localFormatted = new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    }).format(now);

    return {
      success: true,
      title: 'Current Local Time',
      text: `### **Current Local Time**\n\n**${localFormatted}**`,
      action: null
    };
  }

  const cleanLoc = locationQuery.trim().toLowerCase();
  const timeZone = CITY_TIMEZONE_MAP[cleanLoc] || null;

  if (!timeZone) {
    return {
      success: false,
      title: `Time: ${locationQuery}`,
      text: `I couldn't match a standard timezone for **"${locationQuery}"**. Try major cities like *Tokyo, London, New York, Paris, Dubai, Sydney, or UTC*.`,
      action: null
    };
  }

  try {
    const now = new Date();
    const timeFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
    const formatted = timeFormatter.format(now);

    const prettyCity = locationQuery.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

    const markdownText = 
      `### **Time in ${prettyCity}**\n\n` +
      `**${formatted}** (${timeZone})`;

    return {
      success: true,
      title: `Time in ${prettyCity}`,
      text: markdownText,
      action: null
    };
  } catch (err) {
    return {
      success: false,
      title: `Time Error`,
      text: `Failed to format time for timezone \`${timeZone}\`.`,
      action: null
    };
  }
}

/**
 * 6. Humor & Jokes (Official Joke API with safe fallback)
 */
export async function getRandomJoke() {
  const data = await fetchWithTimeout('https://official-joke-api.appspot.com/random_joke');
  if (!data?.setup || !data?.punchline) {
    // Fallback joke if offline or endpoint is congested
    const fallbackSetup = 'Why do programmers prefer dark mode?';
    const fallbackPunchline = 'Because light attracts bugs! 🐛';
    return {
      success: true,
      title: 'Daily Joke',
      setup: fallbackSetup,
      punchline: fallbackPunchline,
      text: `**${fallbackSetup}**\n\n${fallbackPunchline}`,
      action: null
    };
  }

  return {
    success: true,
    title: 'Daily Joke',
    setup: data.setup,
    punchline: data.punchline,
    text: `**${data.setup}**\n\n${data.punchline}`,
    action: null
  };
}

/**
 * 7. Life Advice & Wisdom (Advice Slip API)
 */
export async function getDailyAdvice() {
  const data = await fetchWithTimeout('https://api.adviceslip.com/advice');
  const advice = data?.slip?.advice || "Always back up your important documents before editing them!";

  return {
    success: true,
    title: 'Daily Advice',
    text: `"${advice}"`,
    action: null
  };
}

/**
 * 8. Country Demographics & Facts (Wikimedia Country Profiles - Keyless & Unlimited)
 */
export async function getCountryInfo(countryName) {
  if (!countryName || typeof countryName !== 'string') return null;
  const cleanCountry = countryName.trim();
  if (cleanCountry.length < 2) return null;

  const data = await fetchWithTimeout(
    `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(cleanCountry.replace(/\s+/g, '_'))}`
  );

  if (!data || !data.title || data.type === 'disambiguation') {
    return {
      success: false,
      title: `Country: ${cleanCountry}`,
      text: `Could not find geographic facts for **"${cleanCountry}"**. Please check the spelling.`,
      action: null
    };
  }

  const desc = data.description || 'Sovereign Nation';
  const pageUrl = data.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(cleanCountry)}`;

  const markdownText = 
    `### **🌍 ${data.title}** *(${desc})*\n\n` +
    `${data.extract}\n\n` +
    `[Explore complete country overview on Wikipedia →](${pageUrl})`;

  return {
    success: true,
    title: `Country: ${data.title}`,
    text: markdownText,
    action: {
      type: 'country',
      title: data.title,
      category: 'Geography',
      description: desc,
      url: pageUrl,
      thumbnail: data.thumbnail?.source || null
    }
  };
}

/**
 * Deterministic Intent Classifier for Daily Life Queries
 * Evaluates the query and returns an intent object or null.
 * Guaranteed zero conflict with DocScalar core PDF tool keywords.
 */
export function classifyDailyIntent(rawQuery) {
  if (!rawQuery || typeof rawQuery !== 'string') return null;
  const q = rawQuery.toLowerCase().trim();

  // Guard: If the query explicitly targets DocScalar PDF/studio tools, do not intercept
  if (
    q.includes('merge') || q.includes('compress') || q.includes('ocr') ||
    q.includes('redact') || q.includes('split') ||
    q.includes('convert to pdf') || q.includes('pdf to') || q.includes('convert pdf') ||
    q.includes('convert docx') || q.includes('convert excel') || q.includes('convert ppt') ||
    q.includes('convert image') || q.includes('convert word') || q.includes('convert html') ||
    q.includes('watermark') || q.includes('bates') || q.includes('unlock') ||
    q.includes('protect') || q.includes('resume') || q.includes('canvas') ||
    q.includes('pipeline') || q.includes('privacy') || q.includes('client-side')
  ) {
    return null;
  }

  // 1. Weather Intent
  const weatherMatch = q.match(/\b(?:weather|temperature|forecast|is it raining|is it hot|is it cold)\s+(?:in|for|at|around)?\s*([a-zA-Z\s]+)/i) ||
                       q.match(/^([a-zA-Z\s]+)\s+weather$/i);
  if (weatherMatch && weatherMatch[1]) {
    const city = weatherMatch[1].trim();
    if (city.length >= 2 && !['today', 'now', 'outside', 'like'].includes(city)) {
      return { type: 'weather', params: { city } };
    }
  }

  // 2. Currency Conversion Intent (e.g., "convert 100 USD to EUR", "50 eur in jpy", "100 gbp to usd")
  const currMatch = q.match(/(?:convert\s+)?(\d+(?:\.\d+)?)\s*([a-zA-Z]{3})\s+(?:to|in|into)\s+([a-zA-Z]{3})/i) ||
                    q.match(/how much is\s+(\d+(?:\.\d+)?)\s*([a-zA-Z]{3})\s+in\s+([a-zA-Z]{3})/i);
  if (currMatch) {
    return {
      type: 'currency',
      params: {
        amount: currMatch[1],
        from: currMatch[2],
        to: currMatch[3]
      }
    };
  }

  // 3. Dictionary Definition Intent (e.g., "define serendipity", "meaning of ubiquitous", "what does ephemeral mean")
  const defMatch = q.match(/\b(?:define|meaning of|definition of)\s+([a-zA-Z]+)/i) ||
                   q.match(/\bwhat does\s+([a-zA-Z]+)\s+mean\b/i);
  if (defMatch && defMatch[1]) {
    const word = defMatch[1].trim();
    if (word.length >= 2) {
      return { type: 'dictionary', params: { word } };
    }
  }

  // 4. World Clock & Timezone Intent (e.g., "what time is it in Tokyo", "current time in London", "time in NY")
  const timeMatch = q.match(/\b(?:what time is it in|current time in|time in|local time in)\s+([a-zA-Z\s]+)/i);
  if (timeMatch && timeMatch[1]) {
    const location = timeMatch[1].trim();
    if (location.length >= 2) {
      return { type: 'time', params: { location } };
    }
  }
  if (q === 'what time is it' || q === 'current time' || q === 'what is the time' || q === 'local time') {
    return { type: 'time', params: { location: null } };
  }

  // 5. Jokes & Humor Intent (e.g., "tell me a joke", "crack a joke", "another joke", "make me laugh")
  if (/\b(?:tell me a joke|give me a joke|make me laugh|joke|jokes|tell a joke|funny joke|programmer joke|crack a joke|another joke|tell another|another one|one more joke)\b/i.test(q)) {
    return { type: 'joke', params: {} };
  }

  // 6. Advice Intent (e.g., "give me advice", "give me some advice", "life advice", "daily advice", "words of wisdom")
  if (/\b(?:give me advice|give me some advice|life advice|daily advice|words of wisdom)\b/i.test(q)) {
    return { type: 'advice', params: {} };
  }

  // 7. Country Info Intent (e.g., "capital of Japan", "population of Germany", "country facts for France")
  const countryMatch = q.match(/\b(?:capital of|population of|currency of|facts about|country)\s+([a-zA-Z\s]+)/i);
  if (countryMatch && countryMatch[1]) {
    const country = countryMatch[1].trim();
    if (country.length >= 2 && !['docscalar', 'pdf', 'this'].includes(country)) {
      return { type: 'country', params: { country } };
    }
  }

  // 8. General Knowledge / Wikipedia (e.g., "who is Albert Einstein", "who was Nikola Tesla", "what is photosynthesis")
  const wikiMatch = rawQuery.match(/\b(?:who is|who was|tell me about|explain the history of)\s+([a-zA-Z0-9\s]+)/i);
  if (wikiMatch && wikiMatch[1]) {
    const topic = wikiMatch[1].trim();
    if (topic.length >= 3 && !q.includes('docscalar') && !q.includes('tool')) {
      return { type: 'wiki', params: { topic } };
    }
  }

  return null;
}

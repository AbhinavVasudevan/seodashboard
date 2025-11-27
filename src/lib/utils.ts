// Favicon URL helper using gstatic
export function getFaviconUrl(domain: string | null | undefined, size: number = 32): string {
  if (!domain) {
    return ''
  }
  // Clean the domain (remove protocol if present)
  const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '')
  return `https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://${cleanDomain}&size=${size}`
}

// Country code to emoji flag converter
export function getCountryFlag(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) {
    return ''
  }

  // Convert country code to regional indicator symbols
  // Each letter is converted to its regional indicator symbol (A = 🇦, B = 🇧, etc.)
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0))

  return String.fromCodePoint(...codePoints)
}

// Country code to full name mapping
export const countryNames: Record<string, string> = {
  US: 'United States',
  GB: 'United Kingdom',
  CA: 'Canada',
  AU: 'Australia',
  IE: 'Ireland',
  DE: 'Germany',
  FR: 'France',
  IT: 'Italy',
  ES: 'Spain',
  NL: 'Netherlands',
  SE: 'Sweden',
  NO: 'Norway',
  FI: 'Finland',
  DK: 'Denmark',
  IN: 'India',
  JP: 'Japan',
  SG: 'Singapore',
  MY: 'Malaysia',
}

// Get country name with flag
export function getCountryWithFlag(countryCode: string): string {
  const flag = getCountryFlag(countryCode)
  const name = countryNames[countryCode] || countryCode
  return `${flag} ${name}`
}

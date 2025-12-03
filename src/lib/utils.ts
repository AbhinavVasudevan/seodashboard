import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Convert country code to flag emoji
export function getCountryFlag(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) return '🌐'
  const code = countryCode.toUpperCase()
  const offset = 127397
  return String.fromCodePoint(
    code.charCodeAt(0) + offset,
    code.charCodeAt(1) + offset
  )
}

// Get favicon URL for a domain
export function getFaviconUrl(domain: string, size: number = 32): string {
  if (!domain) return ''
  const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '')
  return `https://www.google.com/s2/favicons?domain=${cleanDomain}&sz=${size}`
}

export function appUrl(): string {
  const { origin, pathname } = window.location
  const path = pathname.endsWith('/') ? pathname : `${pathname}/`
  return `${origin}${path}`
}

export function nimiqPayDeeplink(): string {
  return `nimiqpay://miniapp?url=${encodeURIComponent(appUrl())}`
}

export function isNimiqPayHost(): boolean {
  return window.nimiqPay !== undefined
}

export function isMobile(): boolean {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
}

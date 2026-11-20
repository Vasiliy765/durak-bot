export type TelegramWebAppUser = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
};

type TelegramWebApp = {
  initData: string;
  initDataUnsafe?: { user?: TelegramWebAppUser; start_param?: string };
  ready?: () => void;
  expand?: () => void;
  close?: () => void;
  openInvoice?: (url: string, callback?: (status: "paid" | "cancelled" | "failed" | "pending") => void) => void;
  setHeaderColor?: (color: string) => void;
  setBackgroundColor?: (color: string) => void;
  enableClosingConfirmation?: () => void;
  disableClosingConfirmation?: () => void;
  BackButton?: {
    show: () => void;
    hide: () => void;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
  };
  HapticFeedback?: { impactOccurred: (style: "light" | "medium" | "heavy") => void; notificationOccurred: (type: "error" | "success" | "warning") => void };
};

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

export function getTelegramWebApp() {
  return typeof window !== "undefined" ? window.Telegram?.WebApp : undefined;
}

export function getTelegramInitData() {
  return getTelegramWebApp()?.initData || "";
}

export function getTelegramStartParameter() {
  return getTelegramWebApp()?.initDataUnsafe?.start_param || new URLSearchParams(window.location.search).get("startapp") || "";
}

export function parseArcadeInviteToken(startParam: string) {
  const prefix = "arcade_";
  const raw = startParam.trim();
  if (raw.slice(0, prefix.length).toLowerCase() !== prefix) return "";
  const token = raw.slice(prefix.length);
  return /^[A-Za-z0-9_-]{16,128}$/.test(token) ? token : "";
}

export function getTelegramLaunchCode() {
  const value = getTelegramStartParameter();
  return /^[A-HJ-NP-Z2-9]{4,8}$/i.test(value) ? value.toUpperCase() : "";
}

export function initializeTelegramWebApp() {
  const webApp = getTelegramWebApp();
  webApp?.ready?.();
  webApp?.expand?.();
  webApp?.setHeaderColor?.("#16181D");
  webApp?.setBackgroundColor?.("#16181D");
  return webApp;
}

export function haptic(style: "light" | "medium" | "heavy" = "light") {
  getTelegramWebApp()?.HapticFeedback?.impactOccurred(style);
}

let soundContext: AudioContext | undefined;
export function playUiSound() {
  if (typeof window === "undefined" || localStorage.getItem("spy-sound") === "off") return;
  try {
    const Context = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Context) return;
    soundContext ??= new Context();
    if (soundContext.state === "suspended") void soundContext.resume();
    const now = soundContext.currentTime;
    const oscillator = soundContext.createOscillator();
    const gain = soundContext.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(520, now);
    oscillator.frequency.exponentialRampToValueAtTime(740, now + 0.07);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.025, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
    oscillator.connect(gain);
    gain.connect(soundContext.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.13);
  } catch {
    // Sound is an enhancement; audio restrictions never block a game action.
  }
}

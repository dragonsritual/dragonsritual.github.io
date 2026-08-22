export type DeviceClass = "mobile" | "tablet" | "desktop";

export interface DeviceCapabilities {
  deviceClass: DeviceClass;
  touch: boolean;
  standalone: boolean;
  reducedMotion: boolean;
  viewportWidth: number;
  viewportHeight: number;
  pixelRatio: number;
}

export function getDeviceCapabilities(): DeviceCapabilities {
  const width = window.innerWidth;
  const touch =
    navigator.maxTouchPoints > 0 ||
    "ontouchstart" in window;

  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);

  const deviceClass: DeviceClass =
    width <= 700 ? "mobile" :
    width <= 1100 ? "tablet" :
    "desktop";

  return {
    deviceClass,
    touch,
    standalone,
    reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    viewportWidth: width,
    viewportHeight: window.innerHeight,
    pixelRatio: window.devicePixelRatio || 1
  };
}
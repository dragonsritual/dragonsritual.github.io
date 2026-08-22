import { getDeviceCapabilities } from "./deviceService";

export interface ContinuityPresence {
  accountId?: string;
  page: string;
  gameId?: string;
  sessionId?: string;
  worldLocationId?: string;
  occurredAt: string;
  device: ReturnType<typeof getDeviceCapabilities>;
}

export function createContinuityPresence(
  context: Omit<ContinuityPresence, "occurredAt" | "device">
): ContinuityPresence {
  return {
    ...context,
    occurredAt: new Date().toISOString(),
    device: getDeviceCapabilities()
  };
}

/*
  v0.7 intentionally does NOT transmit this data.

  Later, authenticated users can opt into continuity so the same account
  can move between desktop, browser, PWA, and official mobile app.

  Examples:
  - resume the same live/game page on a phone
  - follow a realtime market or world event while away from the PC
  - claim mobile-specific rewards after secure server validation
  - hand off a future Realms world location between devices
*/
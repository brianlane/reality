export function trackEvent(
  userId: string,
  event: string,
  properties?: Record<string, unknown>,
) {
  return {
    userId,
    event,
    properties: properties ?? {},
    timestamp: new Date().toISOString(),
  };
}

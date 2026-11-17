/** Fire-and-forget presence ping; the app server forwards it to HQ. */
export function sendHeartbeat(path: string): void {
  void $fetch('/api/_novatron/heartbeat', { method: 'POST', body: { path } }).catch(() => undefined)
}

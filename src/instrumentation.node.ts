export async function init() {
  if (process.env.NEXT_PHASE === 'phase-production-build') return;

  const { startQueueWorker } = await import('./lib/queue');
  startQueueWorker();
}

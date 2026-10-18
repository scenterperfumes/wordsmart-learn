import { ActionLimiter } from './study-rules';
import { toast } from 'sonner';
const limiter = new ActionLimiter();
export function recordAction() {
  const ok = limiter.record(Date.now());
  if (!ok && !document.documentElement.classList.contains('cooling-down')) {
    document.documentElement.classList.add('cooling-down');
    toast.warning('⚠️ Slow down! Too many rapid clicks detected. Cooling down for 10 seconds...');
    setTimeout(() => document.documentElement.classList.remove('cooling-down'), 10000);
  }
  return ok;
}
export function requestAllowed() { return Date.now() >= limiter.blockedUntil; }
export function installRequestGuard() {
  const original = window.fetch;
  const guarded: typeof fetch = (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if ((url.includes('/rest/v1/') || url.includes('/_serverFn/')) && !recordAction()) return Promise.reject(new Error('Cooling down. Please wait.'));
    return original(input, init);
  };
  window.fetch = guarded;
  const listener = (event: MouseEvent) => { if ((event.target as HTMLElement).closest('button,a,[role="button"]') && !recordAction()) { event.preventDefault(); event.stopPropagation(); } };
  document.addEventListener('click', listener, true);
  return () => { if (window.fetch === guarded) window.fetch = original; document.removeEventListener('click',listener,true); };
}
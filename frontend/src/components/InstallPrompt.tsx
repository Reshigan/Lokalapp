import { useEffect, useState } from 'react';
import { X, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/Logo';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const STORAGE_KEY = 'lokal-install-dismissed-at';
const SUPPRESS_HOURS = 24 * 7; // re-show at most weekly

/**
 * "Save as app" banner. Triggers on `beforeinstallprompt` (Android Chrome,
 * desktop) and shows iOS "Add to Home Screen" instructions on Safari.
 *
 * Dismissed banners are suppressed for a week via localStorage.
 */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIos, setShowIos] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Already installed (PWA running standalone)?
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || (navigator as any).standalone === true;
    if (standalone) { setInstalled(true); return; }

    // Suppress for a week after last dismissal
    const dismissed = Number(localStorage.getItem(STORAGE_KEY) || 0);
    if (dismissed && (Date.now() - dismissed) < SUPPRESS_HOURS * 3600 * 1000) {
      return;
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);

    // iOS Safari has no beforeinstallprompt — show instructions instead.
    const ua = navigator.userAgent;
    const isIos = /iPhone|iPad|iPod/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
    if (isIos && !standalone) {
      const t = setTimeout(() => setShowIos(true), 1500);
      return () => { window.removeEventListener('beforeinstallprompt', onPrompt); clearTimeout(t); };
    }

    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
    setDeferred(null);
    setShowIos(false);
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === 'accepted') setInstalled(true);
    setDeferred(null);
  };

  if (installed || (!deferred && !showIos)) return null;

  return (
    <div className="fixed bottom-4 inset-x-4 z-50 max-w-md mx-auto card p-4 shadow-pop animate-slide-up">
      <div className="flex items-start gap-3">
        <Logo size={36} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">Install Lokal</p>
          {deferred ? (
            <p className="text-xs text-ink-muted mt-1">Save Lokal to your home screen for instant access and notifications.</p>
          ) : (
            <p className="text-xs text-ink-muted mt-1">
              Tap the <span className="font-mono px-1 py-0.5 bg-surface-subtle rounded">Share ⬆</span> button below, then "Add to Home Screen".
            </p>
          )}
          <div className="flex gap-2 mt-3">
            {deferred && (
              <Button size="sm" onClick={install}>
                <Download className="w-4 h-4" /> Install
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={dismiss}>Not now</Button>
          </div>
        </div>
        <button onClick={dismiss} className="text-ink-muted hover:text-ink p-1" aria-label="Dismiss">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

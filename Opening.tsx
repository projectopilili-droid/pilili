import { useEffect, useRef, useState } from "react";
import { usePilili } from "@/lib/store";

const REPLAY = "pilili.opening.replay";
const DONE = "pilili.opening.done";
const GATE_STYLE_ID = "pilili-opening-gate";

type OpeningGate = { dismissed?: boolean; settled?: boolean };

/** Survives client navigations and HMR. A full document load starts clean, so the splash returns. */
function gate(): OpeningGate {
  const g = globalThis as typeof globalThis & { __pililiOpening?: OpeningGate };
  g.__pililiOpening ??= {};
  return g.__pililiOpening;
}

function dropGateStyle() {
  if (typeof document === "undefined") return;
  document.getElementById(GATE_STYLE_ID)?.remove();
}

function settle() {
  const g = gate();
  g.dismissed = true;
  g.settled = true;
  dropGateStyle();
  if (typeof window !== "undefined") window.dispatchEvent(new Event(DONE));
}

function reducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function autoOpeningAllowed() {
  const { lowData, openingMotion } = usePilili.getState();
  return openingMotion && !lowData && !reducedMotion();
}

export function replayOpening() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(REPLAY));
}

export function OpeningSplash() {
  const [show, setShow] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const dismissRef = useRef(() => {});

  dismissRef.current = () => {
    videoRef.current?.pause();
    settle();
    setShow(false);
  };

  useEffect(() => {
    if (usePilili.persist.hasHydrated()) {
      setHydrated(true);
      return;
    }
    return usePilili.persist.onFinishHydration(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (!hydrated || gate().dismissed || show) return;
    if (!autoOpeningAllowed()) {
      settle();
      return;
    }
    setShow(true);
  }, [hydrated, show]);

  useEffect(() => {
    if (!show) return;
    // The file is 6s. Do not trim it or change the playback rate. Saltar closes it at once.
    const t = window.setTimeout(() => dismissRef.current(), 7000);
    return () => window.clearTimeout(t);
  }, [show]);

  useEffect(() => {
    const onReplay = () => {
      if (usePilili.getState().lowData || reducedMotion()) return;
      setShow(true);
    };
    window.addEventListener(REPLAY, onReplay);
    return () => window.removeEventListener(REPLAY, onReplay);
  }, []);

  if (!show) return null;

  return (
    <div
      id="pilili-splash"
      className="fixed inset-0 z-[80] flex flex-col overflow-hidden bg-black"
      role="dialog"
      aria-modal="true"
      aria-label="Abertura do PILILÍ"
      onClick={() => dismissRef.current()}
    >
      <div className="flex justify-end px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <button
          type="button"
          className="min-h-11 rounded-full bg-white/10 px-4 text-sm text-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
          onClick={(e) => {
            e.stopPropagation();
            dismissRef.current();
          }}
        >
          Saltar
        </button>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center">
        {/*
          Wordmark is ~61% of this 3:2 frame. 114vw puts it near 70% of the
          screen. The height cap keeps the whole frame between Saltar and the
          caption, so nothing is cropped or stretched.
        */}
        <video
          ref={videoRef}
          className="h-auto w-[min(114vw,calc((100dvh-8rem)*1.5))] max-w-none object-contain"
          autoPlay
          muted
          playsInline
          preload="auto"
          poster="/videos/opening.jpg"
          onEnded={() => dismissRef.current()}
          onError={() => dismissRef.current()}
        >
          <source src="/videos/opening.mp4" type="video/mp4" />
        </video>
      </div>
      <div className="px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2 text-center">
        {import.meta.env.DEV ? (
          <a
            href="/PILILI-vercel.zip"
            download="PILILI-vercel.zip"
            className="pointer-events-auto mb-3 inline-flex min-h-11 items-center justify-center rounded-full bg-gold px-5 text-sm font-medium text-gold-fg"
            onClick={(e) => e.stopPropagation()}
          >
            Descarregar o projecto
          </a>
        ) : null}
        <p className="pointer-events-none text-[11px] uppercase tracking-[0.18em] text-gold">Tudo fica mais fácil</p>
        <p className="pointer-events-none mt-2 text-xs text-white/70">Toca para começar</p>
      </div>
    </div>
  );
}

export function CompactOpeningStrip() {
  const lowData = usePilili((s) => s.lowData);
  const [ready, setReady] = useState(Boolean(gate().settled));

  useEffect(() => {
    const sync = () => setReady(Boolean(gate().settled));
    const onReplay = () => setReady(false);
    sync();
    window.addEventListener(REPLAY, onReplay);
    window.addEventListener(DONE, sync);
    return () => {
      window.removeEventListener(REPLAY, onReplay);
      window.removeEventListener(DONE, sync);
    };
  }, []);

  if (lowData || !ready) return null;

  return (
    <button
      type="button"
      onClick={() => replayOpening()}
      className="relative mt-8 w-full overflow-hidden rounded-2xl text-left"
      aria-label="Ver o vídeo de abertura do PILILÍ"
    >
      <img src="/videos/opening.jpg" alt="" className="h-24 w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-r from-bg via-bg/45 to-transparent" />
      <div className="absolute inset-y-0 left-0 flex flex-col justify-center px-4">
        <p className="text-[11px] uppercase tracking-[0.2em] text-gold">Abertura</p>
        <p className="mt-1 text-sm font-medium">Ver o vídeo do PILILÍ</p>
      </div>
    </button>
  );
}

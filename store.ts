import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AttachmentMeta, Profile } from "./pilili/types";

type Draft = {
  text: string;
  power: string | null;
};

type PililiState = {
  lowData: boolean;
  setLowData: (v: boolean) => void;
  /** Fullscreen logo on each app open. Off skips it; page changes never replay it. */
  openingMotion: boolean;
  setOpeningMotion: (v: boolean) => void;
  draft: Draft;
  setDraft: (d: Partial<Draft>) => void;
  attachments: AttachmentMeta[];
  setAttachments: (a: AttachmentMeta[]) => void;
  credits: number | null;
  /** Bumps on each live credit event so an older bootstrap snapshot cannot overwrite it. */
  creditsSeq: number;
  plan: Profile["plan"] | null;
  setWallet: (credits: number, plan: Profile["plan"]) => void;
  applyCredits: (credits: number) => void;
  queued: { id: string; text: string; at: string }[];
  enqueue: (text: string) => void;
  clearQueue: () => void;
};

export const usePilili = create<PililiState>()(
  persist(
    (set) => ({
      lowData: false,
      setLowData: (lowData) => set({ lowData }),
      openingMotion: true,
      setOpeningMotion: (openingMotion) => set({ openingMotion }),
      draft: { text: "", power: null },
      setDraft: (d) => set((s) => ({ draft: { ...s.draft, ...d } })),
      attachments: [],
      setAttachments: (attachments) => set({ attachments }),
      credits: null,
      creditsSeq: 0,
      plan: null,
      setWallet: (credits, plan) => set({ credits, plan }),
      applyCredits: (credits) => set((s) => ({ credits, creditsSeq: s.creditsSeq + 1 })),
      queued: [],
      enqueue: (text) =>
        set((s) => ({
          queued: [...s.queued, { id: crypto.randomUUID(), text, at: new Date().toISOString() }],
        })),
      clearQueue: () => set({ queued: [] }),
    }),
    { name: "pilili.v1", partialize: (s) => ({ lowData: s.lowData, openingMotion: s.openingMotion, draft: s.draft, queued: s.queued }) },
  ),
);

import type { Profile } from "@/lib/pilili/types";

export type WalletSnap = {
  credits: number | null;
  plan: Profile["plan"] | null;
  creditsSeq: number;
};

export function applyCreditEvent(state: WalletSnap, remaining: number): WalletSnap {
  return { ...state, credits: remaining, creditsSeq: state.creditsSeq + 1 };
}

/** A bootstrap snapshot started before a live credit event must not replace that balance. */
export function applyBootstrapWallet(
  state: WalletSnap,
  snapshot: { credits: number; plan: Profile["plan"] },
  seqAtFetch: number,
): WalletSnap {
  if (state.creditsSeq !== seqAtFetch) {
    return state.plan ? state : { ...state, plan: snapshot.plan };
  }
  return { credits: snapshot.credits, plan: snapshot.plan, creditsSeq: state.creditsSeq };
}
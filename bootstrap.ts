import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { getBootstrap } from "@/lib/server/functions";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { usePilili } from "@/lib/store";
import { applyBootstrapWallet } from "@/lib/client/wallet";
import { isUnauthorized } from "@/lib/utils";

export function useBootstrap() {
  const { user, isPending } = useCurrentUserState();
  const setWallet = usePilili((s) => s.setWallet);
  const setLowData = usePilili((s) => s.setLowData);
  const seqAtFetch = useRef(0);
  const q = useQuery({
    queryKey: ["bootstrap", user?.id],
    queryFn: () => {
      seqAtFetch.current = usePilili.getState().creditsSeq;
      return getBootstrap();
    },
    enabled: Boolean(user) && !isPending,
    retry: (n, err) => !isUnauthorized(err) && n < 2,
  });

  useEffect(() => {
    if (!q.data) return;
    const state = usePilili.getState();
    const next = applyBootstrapWallet(
      { credits: state.credits, plan: state.plan, creditsSeq: state.creditsSeq },
      { credits: q.data.profile.credits, plan: q.data.profile.plan },
      seqAtFetch.current,
    );
    const plan = next.plan;
    if (next.credits != null && plan && (next.credits !== state.credits || plan !== state.plan)) {
      setWallet(next.credits, plan);
    }
    setLowData(q.data.profile.lowData);
  }, [q.data, setWallet, setLowData]);

  return q;
}
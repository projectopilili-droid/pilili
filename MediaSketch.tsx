import { useEffect, useRef } from "react";

/** Moving sketch while an image or short video is still being made. The real file replaces it. */
export function MediaSketch({ kind, step = 1, note }: { kind: "imagem" | "video" | "site"; step?: number; note?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    let raf = 0;
    const start = performance.now();
    const draw = (now: number) => {
      const t = (now - start) / 1000;
      const w = canvas.width;
      const h = canvas.height;
      ctx.fillStyle = "rgba(9,9,11,0.22)";
      ctx.fillRect(0, 0, w, h);
      const strokes = kind === "video" ? 4 : 7;
      for (let i = 0; i < strokes; i += 1) {
        const speed = 0.55 + i * 0.12;
        const travel = (t * speed + i * 0.17) % 1;
        ctx.strokeStyle = i % 2 === 0 ? "rgba(212,175,95,0.85)" : "rgba(150,186,220,0.55)";
        ctx.lineWidth = i === 0 ? 2.2 : 1.1;
        ctx.beginPath();
        const yBase = h * (0.22 + (i / strokes) * 0.56);
        for (let s = 0; s <= 48; s += 1) {
          const u = s / 48;
          const x = u * w * travel;
          const y = yBase + Math.sin(u * 9 + t * (1.4 + i * 0.25)) * (10 + i * 4) + Math.cos(t * 2 + i) * 6;
          if (s === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        const tip = w * travel;
        ctx.fillStyle = "rgba(232,206,140,0.95)";
        ctx.beginPath();
        ctx.arc(tip, yBase + Math.sin(9 + t * (1.4 + i * 0.25)) * (10 + i * 4), 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
      const filled = Math.min(1, Math.max(0.16, (step + 1) / 3));
      ctx.fillStyle = "rgba(212,175,95,0.9)";
      ctx.fillRect(0, h - 5, w * filled, 5);
      raf = window.requestAnimationFrame(draw);
    };
    ctx.fillStyle = "#09090b";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    raf = window.requestAnimationFrame(draw);
    return () => window.cancelAnimationFrame(raf);
  }, [kind, step]);

  return (
    <div className="mt-3">
      <canvas ref={ref} width={640} height={360} className="h-44 w-full rounded-xl bg-black" aria-hidden />
      <p className="mt-2 text-xs text-subtle">{note || (kind === "video" ? "Esboço do vídeo curto, enquanto é gerado." : kind === "site" ? "Esboço do site, enquanto é gerado." : "Esboço da imagem, enquanto é gerada.")}</p>
    </div>
  );
}
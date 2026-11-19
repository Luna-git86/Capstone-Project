// Frontend/src/pages/Penguji/UatSharedBlocks.tsx
import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, ClipboardCheck, Info, Sparkles } from 'lucide-react';

interface UatChartBoxProps {
  heightPx?: number;
  emptyText?: string;
  children: (size: { width: number; height: number }) => React.ReactNode;
}

export const UatChartBox: React.FC<UatChartBoxProps> = ({
  heightPx = 280,
  emptyText = 'Menyiapkan grafik...',
  children,
}) => {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;

    let rafId = 0;
    const measureNow = () => {
      const w = Math.floor(el.clientWidth);
      const h = Math.floor(el.clientHeight);
      if (w > 40 && h > 40) {
        setSize((prev) => (prev.width === w && prev.height === h ? prev : { width: w, height: h }));
      }
    };

    const schedule = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(measureNow);
    };

    measureNow();
    if (typeof ResizeObserver === 'undefined') {
      return () => cancelAnimationFrame(rafId);
    }

    const ro = new ResizeObserver(schedule);
    ro.observe(el);
    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, []);

  const ready = size.width >= 80 && size.height >= 80;

  return (
    <div ref={hostRef} className="w-full" style={{ height: `${heightPx}px` }}>
      {ready ? (
        children(size)
      ) : (
        <div className="w-full h-full flex items-center justify-center rounded-xl bg-[#f6f8f7] text-xs font-medium text-[#6b7770]">
          {emptyText}
        </div>
      )}
    </div>
  );
};

interface StepHeaderBadgeProps {
  stepCode: string;
  title: string;
  subtitle: string;
  done: boolean;
  ranLiveInfo?: string | null;
}

export const StepSectionCard: React.FC<
  StepHeaderBadgeProps & { children: React.ReactNode }
> = ({ stepCode, title, subtitle, done, ranLiveInfo, children }) => (
  <section
    className={`tvlk-card rounded-2xl p-4 sm:p-5 space-y-4 transition-all ${
      done ? 'border-[#93d1ae] bg-white' : 'bg-[#f6f8f7]/60'
    }`}
  >
    <div className="flex flex-wrap items-start justify-between gap-2 border-b border-[#eef1ef] pb-3">
      <div className="space-y-0.5 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-[#0f5c43] text-white">
            {stepCode}
          </span>
          <h3 className="text-sm sm:text-base font-extrabold text-[#18201c]">{title}</h3>
        </div>
        <p className="text-xs text-[#6b7770]">{subtitle}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {ranLiveInfo && (
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#edf8f2] text-[#0f5c43] border border-[#ace2c5]">
            {ranLiveInfo}
          </span>
        )}
        {done && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#edf8f2] text-[#186b46] border border-[#93d1ae]">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Terverifikasi
          </span>
        )}
      </div>
    </div>
    {children}
  </section>
);

interface ApaArtinyaBoxProps {
  title?: string;
  text: string;
  variant?: 'green' | 'orange';
}

export const ApaArtinyaBox: React.FC<ApaArtinyaBoxProps> = ({
  title = 'Apa Artinya Ini bagi Rumah Sakit?',
  text,
  variant = 'green',
}) => (
  <div
    className={`rounded-2xl p-3.5 border flex items-start gap-2.5 ${
      variant === 'orange'
        ? 'bg-[#fff6f1] border-[#ffd0b5] text-[#5e2a14]'
        : 'bg-[#edf8f2] border-[#ace2c5] text-[#11462f]'
    }`}
  >
    <span
      className={`mt-0.5 p-1 rounded-lg shrink-0 ${
        variant === 'orange' ? 'bg-[#ffe3d4] text-[#d95d28]' : 'bg-[#d5f0e1] text-[#0f5c43]'
      }`}
    >
      {variant === 'orange' ? <Sparkles className="w-4 h-4" /> : <Info className="w-4 h-4" />}
    </span>
    <div className="space-y-0.5 text-xs leading-relaxed">
      <p className="font-extrabold">{title}</p>
      <p className="font-medium opacity-95">{text}</p>
    </div>
  </div>
);

interface PanduanPengujiBoxProps {
  whatHappens: string;
  stepsToCheck: string[];
}

export const PanduanPengujiBox: React.FC<PanduanPengujiBoxProps> = ({
  whatHappens,
  stepsToCheck,
}) => (
  <div className="rounded-2xl bg-[#f6f8f7] border border-[#dce7e0] px-4 py-3 space-y-2 text-xs">
    <div className="flex items-start gap-2">
      <span className="mt-0.5 p-1 rounded-lg bg-[#e3f2ea] text-[#0f5c43] shrink-0">
        <ClipboardCheck className="w-3.5 h-3.5" />
      </span>
      <p className="text-[#18201c] leading-relaxed">
        <strong className="text-[#0f5c43]">Fokus:</strong> {whatHappens}
      </p>
    </div>
    <div className="pl-7 space-y-1">
      <p className="font-extrabold text-[#18201c]">Langkah Penguji:</p>
      <ol className="list-decimal pl-4 space-y-1 text-[#3c4641] leading-relaxed">
        {stepsToCheck.map((item, idx) => (
          <li key={idx}>{item}</li>
        ))}
      </ol>
    </div>
  </div>
);

import type { ReactNode } from "react";
import { Reveal } from "./Reveal";

type Props = {
  title: ReactNode;
  intro?: ReactNode;
  align?: "left" | "center";
  id?: string;
  /** Optional small context line, sentence case. Use only when it adds information. */
  kicker?: string;
  tone?: "light" | "dark";
};

export function SectionHeader({ title, intro, align = "left", id, kicker, tone = "light" }: Props) {
  const centered = align === "center";
  const dark = tone === "dark";
  return (
    <Reveal className={centered ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      {kicker ? <p className={`text-[0.9rem] font-semibold ${dark ? "text-[#c4b0f5]" : "text-violet"}`}>{kicker}</p> : null}
      <h2 id={id} className={`${kicker ? "mt-2" : ""} text-[clamp(1.85rem,3.4vw,2.75rem)] leading-[1.08] font-bold ${dark ? "text-white" : "text-ink"}`}>
        {title}
      </h2>
      {intro ? <p className={`mt-3 text-[1.02rem] leading-relaxed ${dark ? "text-white/65" : "text-ink-2"}`}>{intro}</p> : null}
    </Reveal>
  );
}

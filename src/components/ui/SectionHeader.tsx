import type { ReactNode } from "react";
import { Reveal } from "./Reveal";

type Props = {
  eyebrow: string;
  title: ReactNode;
  intro?: ReactNode;
  align?: "left" | "center";
  id?: string;
};

export function SectionHeader({ eyebrow, title, intro, align = "left", id }: Props) {
  const centered = align === "center";
  return (
    <Reveal className={centered ? "mx-auto max-w-3xl text-center" : "max-w-3xl"}>
      <p className="eyebrow">{eyebrow}</p>
      <h2 id={id} className="mt-4 text-[2rem] leading-[1.08] font-bold text-ink sm:text-[2.6rem] lg:text-[3.1rem]">
        {title}
      </h2>
      {intro ? <p className="mt-5 text-lg leading-relaxed text-ink-2">{intro}</p> : null}
    </Reveal>
  );
}

/** Editorial serif accent for one or two words inside a heading. */
export function Accent({ children }: { children: ReactNode }) {
  return <span className="font-serif text-[1.08em] font-normal tracking-normal text-violet italic">{children}</span>;
}

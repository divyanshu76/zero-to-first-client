import { RootShell, rootMetadata, rootViewport } from "@/components/landing/RootShell";
import "../globals.css";

export const metadata = rootMetadata("hi");
export const viewport = rootViewport;

export default function HindiRootLayout({ children }: { children: React.ReactNode }) {
  return <RootShell locale="hi">{children}</RootShell>;
}

import { RootShell, rootMetadata, rootViewport } from "@/components/landing/RootShell";
import "../globals.css";

export const metadata = rootMetadata("en");
export const viewport = rootViewport;

export default function EnglishRootLayout({ children }: { children: React.ReactNode }) {
  return <RootShell locale="en">{children}</RootShell>;
}

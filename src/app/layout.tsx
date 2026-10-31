import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import "./globals.css";

export const metadata: Metadata = {
  title: "Digital Dark Spot | Research with the gaps in view",
  description: "Map a research question to evidence, missing information and the next things to verify.",
};

// Per-request CSP nonces require request-time HTML rather than static script tags.
export const dynamic = "force-dynamic";

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}

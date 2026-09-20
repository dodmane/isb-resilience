import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AURORA — Business Resilience Assessment",
  description: "Adaptive, Uncertainty, Resilience, Opportunity and Risk Assessment",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}

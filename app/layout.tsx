import type { Metadata } from "next";
import "./globals.css";


export const metadata: Metadata = {
  title: "Rainbow Rewri | Good Food. Good Mood.",
  description:
    "Discover Rainbow Rewri — traditional sweets, savory snacks, and delightful food made for sharing.",
};


export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

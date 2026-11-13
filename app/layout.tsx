import type { Metadata } from "next";
import "./globals.css";
import "./extensions.css";
import "maplibre-gl/dist/maplibre-gl.css";
import "@xyflow/react/dist/style.css";
export const metadata: Metadata = {
  icons: { icon: "/favicon.svg" },
  title: "Civic Intelligence — Explore how the world works",
  description:
    "Explore countries, institutions and connected systems through an interactive knowledge canvas. Start with South Africa.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

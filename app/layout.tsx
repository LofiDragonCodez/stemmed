import type { Metadata } from "next";
import {
  Archivo_Black,
  Caveat,
  Cormorant_Garamond,
  DM_Sans,
  Fraunces,
  Manrope,
  Space_Mono,
} from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans" });
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
});
const caveat = Caveat({ subsets: ["latin"], variable: "--font-caveat" });
const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-space-mono",
});
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "600"],
  variable: "--font-cormorant",
});
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope" });
const archivoBlack = Archivo_Black({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-archivo-black",
});

export const metadata: Metadata = {
  title: "STEMMED — the details behind the song",
  description:
    "Look up a song to discover its producer, tempo, key, duration, and artist.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={[
          dmSans.variable,
          fraunces.variable,
          caveat.variable,
          spaceMono.variable,
          cormorant.variable,
          manrope.variable,
          archivoBlack.variable,
        ].join(" ")}
      >
        {children}
      </body>
    </html>
  );
}

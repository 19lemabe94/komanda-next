import "./globals.css";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Komanda",
  description: "Sistema de gestão inteligente para bares e restaurantes.",
  manifest: "/manifest.json", // Isso ajuda o celular a entender que é um App
  themeColor: "#1e293b",      // Cor da barra de status no celular (Cinza Escuro)
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0", // Impede zoom acidental no celular
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}

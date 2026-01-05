import "~/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";

export const metadata: Metadata = {
  title: "Fiets Strooiroutes | Utrecht Winter Fietsroutes",
  description: "Vind veilige fietsroutes in Utrecht met alleen gestrooide wegen. Plan je winterrit met vertrouwen.",
  keywords: ["Utrecht", "fietsen", "winter", "gestrooide wegen", "navigatie", "fietsroutes", "Nederland", "strooiroutes"],
  authors: [{ name: "Fiets Strooiroutes" }],
  openGraph: {
    title: "Fiets Strooiroutes | Utrecht Winter Fietsroutes",
    description: "Vind veilige fietsroutes in Utrecht met alleen gestrooide wegen. Plan je winterrit met vertrouwen.",
    type: "website",
    locale: "nl_NL",
  },
  twitter: {
    card: "summary_large_image",
    title: "Fiets Strooiroutes | Utrecht Winter Fietsroutes",
    description: "Vind veilige fietsroutes in Utrecht met alleen gestrooide wegen.",
  },
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="nl" className={`${geist.variable}`}>
      <body className="m-0 p-0 overflow-hidden">{children}</body>
    </html>
  );
}

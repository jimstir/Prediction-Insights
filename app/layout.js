import { Outfit, Inter } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata = {
  title: "Prediction Market Insights - Polymarket AI Dashboard",
  description: "Find active prediction markets, analyze open positions, and query AI for real-time market insights.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${outfit.className} ${inter.className}`}>
      <body>
        <div className="glow-orb-1"></div>
        <div className="glow-orb-2"></div>
        {children}
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import localFont from "next/font/local";
import Link from "next/link";
import { Providers } from "@/components/Providers";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "XPS Intelligence Dashboard",
  description: "Lead scraping and CRM pipeline management",
};

const navLinks = [
  { href: "/", label: "Overview" },
  { href: "/seeds", label: "Seeds" },
  { href: "/leads", label: "Leads" },
  { href: "/dispatch", label: "Dispatch" },
  { href: "/prompts", label: "Prompts" },
  { href: "/chat", label: "Chat" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50 min-h-screen`}>
        <Providers>
          <div className="flex min-h-screen">
            {/* Sidebar */}
            <aside className="w-56 shrink-0 bg-white border-r border-gray-200 flex flex-col">
              <div className="px-4 py-5 border-b border-gray-200">
                <span className="font-bold text-lg text-blue-600">XPS Intelligence</span>
              </div>
              <nav className="flex-1 py-4 space-y-1 px-2">
                {navLinks.map(({ href, label }) => (
                  <Link
                    key={href}
                    href={href}
                    className="block px-3 py-2 rounded text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                  >
                    {label}
                  </Link>
                ))}
              </nav>
            </aside>

            {/* Main content */}
            <main className="flex-1 overflow-auto p-6">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}


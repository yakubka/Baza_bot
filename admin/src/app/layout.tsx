import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { LayoutDashboard, FolderOpen, FileText } from "lucide-react";

const inter = Inter({ subsets: ["latin", "cyrillic"] });

export const metadata: Metadata = {
  title: "BAZA Bot — Админ-панель",
  description: "Управление базой знаний AI-бота BAZA Development",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body className={inter.className}>
        <div className="flex min-h-screen bg-gray-50">
          {/* Sidebar */}
          <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                  BZ
                </div>
                <div>
                  <div className="font-semibold text-gray-900 text-sm">BAZA Bot</div>
                  <div className="text-xs text-gray-500">Админ-панель</div>
                </div>
              </div>
            </div>
            <nav className="flex-1 p-4 space-y-1">
              <NavLink href="/" icon={<LayoutDashboard size={16} />} label="Дашборд" />
              <NavLink href="/projects" icon={<FolderOpen size={16} />} label="Проекты (ЖК)" />
              <NavLink href="/documents" icon={<FileText size={16} />} label="Документы" />
            </nav>
            <div className="p-4 border-t border-gray-200">
              <p className="text-xs text-gray-400">BAZA Development © 2026</p>
            </div>
          </aside>

          {/* Main content */}
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}

function NavLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
    >
      {icon}
      {label}
    </Link>
  );
}

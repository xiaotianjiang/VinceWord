import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'VinceWord',
  description: 'A full-stack application with authentication and authorization',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-gray-50">
        {children}
      </body>
    </html>
  );
}

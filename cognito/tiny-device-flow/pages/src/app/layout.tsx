'use client';
import { ReactNode } from 'react';
import 'tailwindcss/tailwind.css';
import './globals.css';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html>
      <head />
      <body>
        {children}
      </body>
    </html>
  );
}

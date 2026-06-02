'use client';

import Link from 'next/link';

/**
 * OYE AI - Landing Page
 * Clean, minimal, premium
 */

export default function HomePage() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Simple Header */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-black/80 backdrop-blur-md border-b border-zinc-800">
        <Link href="/" className="text-xl font-semibold">OYE AI</Link>
        <nav className="flex items-center gap-6">
          <Link href="/login" className="text-zinc-400 hover:text-white">Login</Link>
          <Link href="/signup" className="px-4 py-2 bg-white text-black rounded-lg text-sm font-medium">
            Start Free Trial
          </Link>
        </nav>
      </header>

      {/* Simple Hero */}
      <main className="pt-32 pb-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Never miss another WhatsApp customer.
          </h1>
          <p className="text-xl text-zinc-400 mb-10">
            Your AI assistant for WhatsApp. Captures leads, books appointments, and works 24/7.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/signup" className="px-6 py-3 bg-white text-black rounded-lg font-medium">
              Start Free Trial
            </Link>
            <Link href="/login" className="px-6 py-3 border border-zinc-700 text-white rounded-lg font-medium">
              See Demo
            </Link>
          </div>
        </div>
      </main>

      {/* Simple Footer */}
      <footer className="py-8 px-6 border-t border-zinc-800">
        <div className="max-w-3xl mx-auto flex items-center justify-between text-sm text-zinc-500">
          <span>© 2024 OYE AI</span>
          <div className="flex gap-6">
            <Link href="/terms" className="hover:text-zinc-400">Terms</Link>
            <Link href="/privacy" className="hover:text-zinc-400">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
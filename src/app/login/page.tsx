'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useTranslation } from '@/components/LanguageContext';
import { isSandboxEnabled, enableSandboxSession } from '@/lib/auth/sandbox';

export default function LoginPage() {
  const { t } = useTranslation();
  const router = useRouter();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSandboxAllowed, setIsSandboxAllowed] = useState(false);

  useEffect(() => {
    // Safely evaluate environment limits on client side
    setIsSandboxAllowed(isSandboxEnabled());

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const errorParam = params.get('error');
      if (errorParam === 'auth-exchange-failed') {
        setErrorMessage('La autenticación con Google ha fallado. Por favor, inténtalo de nuevo.');
      }
    }
  }, []);

  const handleSandboxBypass = () => {
    if (enableSandboxSession()) {
      router.push('/dashboard');
      router.refresh();
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        const errMsg = error.message || '';
        const isNetworkErr = errMsg.includes('Failed to fetch') || errMsg.includes('fetch') || errMsg.includes('NetworkError');

        // Only allow silent fallback to Sandbox if explicitly allowed in local development
        if (isNetworkErr && isSandboxEnabled()) {
          console.warn('[Auth Login] Network unreachable. Activating local Sandbox Mode fallback.');
          setErrorMessage('Local network error (Failed to fetch). Activating Sandbox fallback...');
          setTimeout(() => {
            handleSandboxBypass();
          }, 1500);
        } else {
          setErrorMessage(error.message);
        }
      } else {
        router.push('/dashboard');
        router.refresh();
      }
    } catch (err: any) {
      const errMsg = err.message || '';
      const isNetworkErr = errMsg.includes('Failed to fetch') || errMsg.includes('fetch') || errMsg.includes('NetworkError');

      if (isNetworkErr && isSandboxEnabled()) {
        console.warn('[Auth Login] Network exception. Activating local Sandbox Mode fallback.');
        setErrorMessage('Local network error (Failed to fetch). Activating Sandbox fallback...');
        setTimeout(() => {
          handleSandboxBypass();
        }, 1500);
      } else {
        setErrorMessage(err.message || 'Critical authentication error occurred.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        const errMsg = error.message || '';
        const isNetworkErr = errMsg.includes('Failed to fetch') || errMsg.includes('fetch') || errMsg.includes('NetworkError');

        if (isNetworkErr && isSandboxEnabled()) {
          console.warn('[Auth Google] Connection error. Activating Sandbox fallback.');
          setErrorMessage('Local network error (Failed to fetch). Activating Sandbox fallback...');
          setTimeout(() => {
            handleSandboxBypass();
          }, 1500);
        } else {
          setErrorMessage(error.message);
        }
      }
    } catch (err: any) {
      const errMsg = err.message || '';
      const isNetworkErr = errMsg.includes('Failed to fetch') || errMsg.includes('fetch') || errMsg.includes('NetworkError');

      if (isNetworkErr && isSandboxEnabled()) {
        console.warn('[Auth Google] Caught connection error. Activating Sandbox fallback.');
        setErrorMessage('Local network error (Failed to fetch). Activating Sandbox fallback...');
        setTimeout(() => {
          handleSandboxBypass();
        }, 1500);
      } else {
        setErrorMessage(err.message || 'Error al iniciar sesión con Google.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#0a0a0c] flex flex-col items-center justify-center px-4 font-sans antialiased">
      {/* Premium Minimalist Background Radial (Linear/Stripe style) */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.025)_0%,_rgba(0,0,0,0)_70%)] pointer-events-none" />

      {/* Main card with high-end dark slate surface and ultra-thin border */}
      <div className="w-full max-w-[420px] bg-[#121215]/80 backdrop-blur-2xl rounded-2xl p-8 border border-white/[0.07] shadow-2xl relative z-10">
        
        {/* Brand Header */}
        <div className="text-center flex flex-col items-center space-y-2 pb-6 mb-6 border-b border-white/[0.04]">
          <Link href="/" className="flex items-center justify-center">
            <img 
              src="/logo.png" 
              alt="Oye AI" 
              className="h-24 w-auto object-contain hover:opacity-90 transition-opacity" 
            />
          </Link>
          <h2 className="text-lg font-semibold text-neutral-100 tracking-tight mt-3">Iniciar sesión</h2>
          <p className="text-xs text-neutral-500">Ingresa para administrar tus empleados de IA</p>
        </div>

        {/* Action Error Banner */}
        {errorMessage && (
          <div className="p-3 mb-4 rounded-lg bg-red-500/5 border border-red-500/15 text-red-400 text-xs font-medium text-center">
            {errorMessage}
          </div>
        )}

        {/* Clean Google Social Login */}
        <button
          onClick={handleGoogleLogin}
          disabled={isLoading}
          type="button"
          className="w-full mb-5 py-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] active:scale-[0.99] transition-all text-neutral-300 hover:text-white font-medium text-xs flex items-center justify-center space-x-2.5 group cursor-pointer"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          <span className="font-medium text-neutral-300 group-hover:text-white">Iniciar sesión con Google</span>
        </button>

        {/* Minimalist Divider */}
        <div className="flex items-center mb-5">
          <div className="flex-grow border-t border-white/[0.04]"></div>
          <span className="px-3 text-[10px] uppercase font-semibold text-neutral-500 tracking-wider">o con tu correo</span>
          <div className="flex-grow border-t border-white/[0.04]"></div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="flex flex-col space-y-1.5 text-left">
            <label className="text-[10px] font-semibold uppercase text-neutral-400 tracking-wider">Correo Electrónico</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="nombre@empresa.com"
              required
              className="w-full bg-[#111318]/50 border border-white/[0.06] rounded-xl px-4 py-2.5 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-500 transition-all font-sans"
            />
          </div>

          <div className="flex flex-col space-y-1.5 text-left">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-semibold uppercase text-neutral-400 tracking-wider">Contraseña</label>
              <a href="#" className="text-[10px] text-neutral-500 hover:text-white transition-colors font-medium">¿Olvidaste tu contraseña?</a>
            </div>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••••••"
              required
              className="w-full bg-[#111318]/50 border border-white/[0.06] rounded-xl px-4 py-2.5 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-500 transition-all font-sans"
            />
          </div>

          {/* Clean SaaS Solid Submission Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 rounded-xl bg-white text-black hover:bg-neutral-200 active:scale-[0.99] font-bold text-xs uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-2 cursor-pointer"
          >
            {isLoading ? (
              <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : (
              <span>Entrar al Panel</span>
            )}
          </button>
        </form>

        {isSandboxAllowed && (
          <div className="mt-4 pt-4 border-t border-white/[0.04]">
            <button
              onClick={handleSandboxBypass}
              type="button"
              className="w-full py-2.5 rounded-xl border border-dashed border-neutral-700 hover:border-neutral-500 bg-neutral-900/40 hover:bg-neutral-900/60 active:scale-[0.99] transition-all text-neutral-300 font-semibold text-xs tracking-wider flex items-center justify-center space-x-2 cursor-pointer animate-none shadow-none"
            >
              <span>Enter Demo Workspace</span>
            </button>
          </div>
        )}

        {/* Redirect Footer */}
        <div className="text-center pt-6 mt-6 border-t border-white/[0.04] text-xs text-neutral-500">
          ¿Aún no tienes cuenta?{' '}
          <Link href="/signup" className="text-neutral-300 hover:text-white font-semibold transition-colors underline decoration-neutral-600 hover:decoration-white">
            Regístrate ahora
          </Link>
        </div>

      </div>
    </div>
  );
}

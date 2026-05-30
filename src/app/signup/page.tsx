'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useTranslation } from '@/components/LanguageContext';
import { isSandboxEnabled, enableSandboxSession } from '@/lib/auth/sandbox';

export default function SignupPage() {
  const { t } = useTranslation();
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSandboxAllowed, setIsSandboxAllowed] = useState(false);

  useEffect(() => {
    // Safely evaluate environment limits on client side
    setIsSandboxAllowed(isSandboxEnabled());
  }, []);

  const handleSandboxBypass = () => {
    if (enableSandboxSession()) {
      setSuccessMessage('Sandbox Workspace enabled. Launching environment...');
      setTimeout(() => {
        router.push('/dashboard');
        router.refresh();
      }, 1500);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password) return;

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const supabase = createClient();
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        const errMsg = error.message || '';
        const isNetworkErr = errMsg.includes('Failed to fetch') || errMsg.includes('fetch') || errMsg.includes('NetworkError');

        if (isNetworkErr && isSandboxEnabled()) {
          console.warn('[Auth Signup] Local Supabase offline. Falling back to Sandbox Mode.');
          setSuccessMessage('Local network error (Failed to fetch). Activating Sandbox fallback...');
          setTimeout(() => {
            handleSandboxBypass();
          }, 1500);
        } else {
          setErrorMessage(error.message);
        }
      } else {
        setSuccessMessage('¡Registro completado! Por favor revisa tu correo electrónico para confirmar tu cuenta.');
      }
    } catch (err: any) {
      console.error('[Auth Signup] Connection/Signup error:', err);
      const errMsg = err.message || '';
      const isNetworkErr = errMsg.includes('Failed to fetch') || errMsg.includes('fetch') || errMsg.includes('NetworkError');

      if (isNetworkErr && isSandboxEnabled()) {
        console.warn('[Auth Signup] Network error caught. Falling back to Sandbox Mode.');
        setSuccessMessage('Local network error (Failed to fetch). Activating Sandbox fallback...');
        setTimeout(() => {
          handleSandboxBypass();
        }, 1500);
      } else {
        setErrorMessage(err.message || 'Critical registration error occurred.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

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
          console.warn('[Auth Google Signup] Connection error. Activating Sandbox fallback.');
          setSuccessMessage('Local network error (Failed to fetch). Activating Sandbox fallback...');
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
        console.warn('[Auth Google Signup] Caught network error. Activating Sandbox fallback.');
        setSuccessMessage('Local network error (Failed to fetch). Activating Sandbox fallback...');
        setTimeout(() => {
          handleSandboxBypass();
        }, 1500);
      } else {
        setErrorMessage(err.message || 'Error al registrarse con Google.');
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
          <h2 className="text-lg font-semibold text-neutral-100 tracking-tight mt-3">Crear cuenta</h2>
          <p className="text-xs text-neutral-500">Regístrate y activa tu empleado digital autónomo</p>
        </div>

        {/* Messaging Banners */}
        {errorMessage && (
          <div className="p-3 mb-4 rounded-lg bg-red-500/5 border border-red-500/15 text-red-400 text-xs font-medium text-center">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="p-4 mb-4 rounded-lg bg-emerald-500/5 border border-emerald-500/15 text-emerald-400 text-xs font-medium text-center space-y-2">
            <div>{successMessage}</div>
            {isSandboxAllowed && successMessage.includes('confirmar') && (
              <div className="mt-3 pt-3 border-t border-emerald-500/10 space-y-2 text-left">
                <p className="text-[10px] text-neutral-400">
                  ℹ️ <strong>Sandbox Mode:</strong> El correo de confirmación ha sido capturado por el entorno local. Puedes ver el buzón en:
                </p>
                <a 
                  href="http://localhost:54324" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="block text-center bg-white/[0.05] hover:bg-white/[0.08] text-neutral-200 py-1.5 rounded-lg text-[10px] font-semibold transition-all border border-white/[0.06]"
                >
                  Abrir Mailpit (http://localhost:54324)
                </a>
                <button
                  onClick={handleSandboxBypass}
                  type="button"
                  className="w-full py-1.5 rounded-lg bg-white text-black hover:bg-neutral-200 font-bold text-[10px] transition-all cursor-pointer shadow-none"
                >
                  Enter Demo Workspace
                </button>
              </div>
            )}
          </div>
        )}

        {!successMessage && (
          <>
            {/* Clean Google Social Sign Up */}
            <button
              onClick={handleGoogleSignup}
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
              <span className="font-medium text-neutral-300 group-hover:text-white">Registrarse con Google</span>
            </button>

            {/* Minimalist Divider */}
            <div className="flex items-center mb-5">
              <div className="flex-grow border-t border-white/[0.04]"></div>
              <span className="px-3 text-[10px] uppercase font-semibold text-neutral-500 tracking-wider">o con tu correo</span>
              <div className="flex-grow border-t border-white/[0.04]"></div>
            </div>

            {/* Signup Form */}
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="flex flex-col space-y-1.5 text-left">
                <label className="text-[10px] font-semibold uppercase text-neutral-400 tracking-wider">Nombre de Contacto / Negocio</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="e.g. Juan Pérez"
                  required
                  className="w-full bg-[#111318]/50 border border-white/[0.06] rounded-xl px-4 py-2.5 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-500 transition-all font-sans"
                />
              </div>

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
                <label className="text-[10px] font-semibold uppercase text-neutral-400 tracking-wider">Contraseña</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                  minLength={6}
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
                  <span>Comenzar Ahora</span>
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
          </>
        )}

        {/* Redirect Footer */}
        <div className="text-center pt-6 mt-6 border-t border-white/[0.04] text-xs text-neutral-500">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="text-neutral-300 hover:text-white font-semibold transition-colors underline decoration-neutral-600 hover:decoration-white">
            Inicia sesión
          </Link>
        </div>

      </div>
    </div>
  );
}

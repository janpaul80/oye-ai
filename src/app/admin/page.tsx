import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AdminDashboardClient from './AdminDashboardClient';

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: authData, error: authErr } = await supabase.auth.getUser();

  if (authErr || !authData.user) {
    redirect('/login?redirectTo=/admin');
  }

  // Query platform admin status securely
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_platform_admin')
    .eq('id', authData.user.id)
    .single();

  if (!profile || !profile.is_platform_admin) {
    return (
      <div className="min-h-screen bg-[#080b11] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-red-950/10 backdrop-blur-md border border-red-500/20 rounded-2xl p-8 text-center shadow-2xl">
          <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/30">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2 font-display">Acceso Restringido</h1>
          <p className="text-gray-400 mb-6 text-sm">
            Tu cuenta no posee los privilegios de Administrador Global requeridos para acceder al Centro de Mando Operacional de Oye AI.
          </p>
          <a href="/dashboard" className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white transition-all text-sm font-semibold">
            Volver al Panel de Control
          </a>
        </div>
      </div>
    );
  }

  return <AdminDashboardClient />;
}

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function supabaseServer() {
  const store = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => { try { list.forEach(({ name, value, options }) => store.set(name, value, options)); } catch {} }
    }
  });
}

// usuário autenticado + cadastro no painel SFA (ou null)
export async function usuarioAtual() {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { sb, user: null, perfil: null };
  const { data: perfil } = await sb.from('usuarios').select('*').eq('id', user.id).maybeSingle();
  return { sb, user, perfil };
}

import { redirect } from 'next/navigation';
import { usuarioAtual } from '@/lib/supabase-server';
import Shell from '@/components/Shell';

export const dynamic = 'force-dynamic';

export default async function PainelLayout({ children }) {
  const { user, perfil } = await usuarioAtual();
  if (!user) redirect('/login');
  if (!perfil || !perfil.ativo) redirect('/sair');
  if (perfil.trocar_senha) redirect('/senha');
  return <Shell eu={{ id: perfil.id, nome: perfil.nome, papel: perfil.papel, email: perfil.email }}>{children}</Shell>;
}

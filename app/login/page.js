'use client';
import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';

export default function Login() {
  const [email, setEmail] = useState(''); const [senha, setSenha] = useState('');
  const [ver, setVer] = useState(false); const [erro, setErro] = useState(''); const [busy, setBusy] = useState(false);
  async function entrar(e) {
    e.preventDefault(); setErro(''); setBusy(true);
    const sb = supabaseBrowser();
    const { data, error } = await sb.auth.signInWithPassword({ email: email.trim().toLowerCase(), password: senha });
    if (error) { setBusy(false); setErro('E-mail ou senha incorretos.'); return; }
    const { data: perfil } = await sb.from('usuarios').select('ativo').eq('id', data.user.id).maybeSingle();
    if (!perfil || !perfil.ativo) { await sb.auth.signOut(); setBusy(false); setErro('Seu acesso não está ativo. Fale com o administrador da D-CAD.'); return; }
    window.location.href = '/';
  }
  return (
    <main className="auth">
      <form className="card" onSubmit={entrar}>
        <div className="brand">D-CAD <span>· SFA</span></div>
        <h1>Entrar</h1>
        <p className="sub">Painel do Sistema de Fatiamento Automático. Acesso restrito à equipe da D-CAD.</p>
        {erro && <div className="err" role="alert">{erro}</div>}
        <div className="f"><label htmlFor="email">E-mail</label><input id="email" type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} /></div>
        <div className="f"><label htmlFor="senha">Senha</label><input id="senha" type={ver ? 'text' : 'password'} autoComplete="current-password" required value={senha} onChange={e => setSenha(e.target.value)} /></div>
        <label className="ver"><input type="checkbox" checked={ver} onChange={e => setVer(e.target.checked)} /> Mostrar senha</label>
        <button className="btn pri wide" disabled={busy}>{busy ? 'Entrando…' : 'Entrar'}</button>
        <p className="foot">Esqueceu a senha? Peça ao administrador para redefinir.</p>
      </form>
    </main>
  );
}

'use client';
import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';

export default function TrocarSenha() {
  const [a, setA] = useState(''); const [b, setB] = useState(''); const [ver, setVer] = useState(false);
  const [erro, setErro] = useState(''); const [busy, setBusy] = useState(false);
  async function salvar(e) {
    e.preventDefault(); setErro('');
    if (a.length < 8) { setErro('A senha precisa de pelo menos 8 caracteres.'); return; }
    if (a !== b) { setErro('As duas senhas não são iguais.'); return; }
    setBusy(true);
    const sb = supabaseBrowser();
    const { error } = await sb.auth.updateUser({ password: a });
    if (error) { setBusy(false); setErro('Não foi possível trocar a senha. ' + (error.message || '')); return; }
    await sb.rpc('senha_trocada');
    window.location.href = '/';
  }
  return (
    <main className="auth">
      <form className="card" onSubmit={salvar}>
        <div className="brand">D-CAD <span>· SFA</span></div>
        <h1>Crie sua senha</h1>
        <p className="sub">Você entrou com uma senha provisória. Escolha uma senha pessoal para continuar.</p>
        {erro && <div className="err" role="alert">{erro}</div>}
        <div className="f"><label htmlFor="a">Nova senha</label><input id="a" type={ver ? 'text' : 'password'} autoComplete="new-password" required value={a} onChange={e => setA(e.target.value)} /></div>
        <div className="f"><label htmlFor="b">Repita a nova senha</label><input id="b" type={ver ? 'text' : 'password'} autoComplete="new-password" required value={b} onChange={e => setB(e.target.value)} /></div>
        <label className="ver"><input type="checkbox" checked={ver} onChange={e => setVer(e.target.checked)} /> Mostrar senha</label>
        <button className="btn pri wide" disabled={busy}>{busy ? 'Salvando…' : 'Salvar e entrar'}</button>
      </form>
    </main>
  );
}

'use client';
import { useCallback, useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { useEu } from '@/components/Shell';
import { dt, PAPEL, pode } from '@/lib/fmt';

// senha provisória legível: sem 0/O/1/l/I
function senhaProvisoria() {
  const a = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789'; const r = new Uint32Array(12); crypto.getRandomValues(r);
  const s = [...r].map(n => a[n % a.length]).join(''); return `${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8)}`;
}

export default function Admin() {
  const sb = supabaseBrowser(); const eu = useEu();
  const [us, setUs] = useState(null); const [chaves, setChaves] = useState([]); const [msg, setMsg] = useState(null);
  const [novo, setNovo] = useState(false); const [senhaMostrada, setSenhaMostrada] = useState(null); const [chave, setChave] = useState(null);
  const carregar = useCallback(async () => {
    const [a, b] = await Promise.all([sb.from('usuarios').select('*').order('nome'), sb.from('chaves_vigia').select('*').order('criada_em', { ascending: false })]);
    setUs(a.data || []); setChaves(b.data || []);
  }, [sb]);
  useEffect(() => { carregar(); }, [carregar]);
  if (!pode(eu.papel, 'admin')) return <div className="empty">Esta área é só do administrador.</div>;

  async function alternar(u) {
    if (u.id === eu.id) return;
    const { error } = await sb.from('usuarios').update({ ativo: !u.ativo }).eq('id', u.id);
    setMsg(error ? { t: 'err', x: error.message } : { t: 'ok', x: `${u.nome} ${u.ativo ? 'desativado: perde o acesso no próximo carregamento.' : 'reativado.'}` }); carregar();
  }
  async function mudarPapel(u, p) {
    const { error } = await sb.from('usuarios').update({ papel: p }).eq('id', u.id);
    setMsg(error ? { t: 'err', x: error.message } : { t: 'ok', x: `${u.nome} agora é ${PAPEL[p]}.` }); carregar();
  }
  async function redefinir(u) {
    if (!window.confirm(`Gerar uma senha provisória nova para ${u.nome}? A senha atual deixa de funcionar.`)) return;
    const s = senhaProvisoria();
    const { error } = await sb.rpc('admin_definir_senha', { p_id: u.id, p_senha: s });
    if (error) { setMsg({ t: 'err', x: error.message }); return; }
    setSenhaMostrada({ nome: u.nome, email: u.email, senha: s }); setMsg(null); carregar();
  }
  async function gerarChave() {
    if (chaves.some(c => c.ativa) && !window.confirm('Gerar uma chave nova desativa a atual. O vigia só volta a registrar depois que a nova chave for salva no PC. Continuar?')) return;
    const { data, error } = await sb.rpc('gerar_chave_vigia');
    if (error) { setMsg({ t: 'err', x: error.message }); return; }
    setChave(data); setMsg(null); carregar();
  }

  return (<>
    <div className="ph"><div><h1>Administração</h1><p>Acesso da equipe e chave que liga o vigia do PC ao painel.</p></div>
      <div className="acts"><button className="btn pri" onClick={() => { setNovo(!novo); setSenhaMostrada(null); }} aria-expanded={novo}>{novo ? 'Cancelar' : 'Novo usuário'}</button></div></div>
    {msg && <div className={msg.t === 'ok' ? 'okm' : 'err'} role="status">{msg.x}</div>}
    {senhaMostrada && <section className="box" style={{ borderColor: '#6b5420' }}>
      <h2>Senha provisória de {senhaMostrada.nome}</h2>
      <p style={{ margin: '0 0 8px' }}>Entregue pessoalmente ou por um canal privado. No primeiro acesso o sistema pede uma senha nova.</p>
      <div className="cred"><span className="muted">E-mail</span><b>{senhaMostrada.email}</b><span className="muted">Senha</span><b className="num" style={{ fontSize: 18, letterSpacing: 1 }}>{senhaMostrada.senha}</b></div>
      <div className="row" style={{ marginTop: 10 }}><button className="btn sm" onClick={() => navigator.clipboard?.writeText(senhaMostrada.senha)}>Copiar senha</button><button className="btn sm ghost" onClick={() => setSenhaMostrada(null)}>Já anotei, fechar</button></div>
    </section>}
    {novo && <NovoUsuario onFeito={(s) => { setNovo(false); setSenhaMostrada(s); carregar(); }} />}

    <section className="box">
      <h2>Equipe ({(us || []).length})</h2>
      {us === null ? <p className="muted">Carregando…</p> :
        <div className="tw"><table className="stack"><thead><tr><th>Nome</th><th>Papel</th><th>Situação</th><th>Desde</th><th></th></tr></thead>
          <tbody>{us.map(u => <tr key={u.id}>
            <td className="t">{u.nome}<div className="muted" style={{ fontSize: 12 }}>{u.email}</div></td>
            <td data-l="Papel">{u.id === eu.id ? PAPEL[u.papel] : <select className="inp" value={u.papel} onChange={e => mudarPapel(u, e.target.value)} aria-label={`Papel de ${u.nome}`}>{Object.entries(PAPEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>}</td>
            <td data-l="Situação">{!u.ativo ? <span className="chip c-err">Desativado</span> : u.trocar_senha ? <span className="chip c-warn">Senha provisória</span> : <span className="chip c-ok">Ativo</span>}</td>
            <td data-l="Desde">{dt(u.criado_em)}</td>
            <td>{u.id !== eu.id && <div className="row" style={{ flexWrap: 'nowrap' }}>
              <button className="btn sm ghost" onClick={() => redefinir(u)}>Nova senha</button>
              <button className={'btn sm' + (u.ativo ? ' danger' : '')} onClick={() => alternar(u)}>{u.ativo ? 'Desativar' : 'Reativar'}</button></div>}</td>
          </tr>)}</tbody></table></div>}
      <p className="muted" style={{ fontSize: 12.5, marginBottom: 0 }}>Operador de impressão: dá baixa e faz a 2ª checagem. Planejamento: só consulta. Ninguém é apagado: desativar mantém o histórico no log.</p>
    </section>

    <section className="box">
      <h2>Chave do vigia</h2>
      <p style={{ marginTop: 0 }}>O vigia do PC usa esta chave para registrar no painel cada plataforma fatiada, enviada e impressa.</p>
      {chave ? <div className="sheet" style={{ borderColor: '#6b5420' }}>
        <p style={{ margin: 0 }}><b>Esta chave aparece uma única vez.</b> Copie e salve no PC da impressão, no arquivo <code>_SISTEMA/sfa_chave.txt</code> do Drive (só a chave, sem espaços). Não envie por chat ou e-mail.</p>
        <code className="num" style={{ display: 'block', padding: 12, background: 'var(--bg)', borderRadius: 8, overflowWrap: 'anywhere', fontSize: 14 }}>{chave}</code>
        <div className="row"><button className="btn sm pri" onClick={() => navigator.clipboard?.writeText(chave)}>Copiar chave</button><button className="btn sm ghost" onClick={() => setChave(null)}>Já salvei, ocultar</button></div>
      </div> : <div className="row"><button className="btn" onClick={gerarChave}>{chaves.some(c => c.ativa) ? 'Gerar chave nova (substitui a atual)' : 'Gerar chave do vigia'}</button></div>}
      {chaves.length > 0 && <ul style={{ listStyle: 'none', padding: 0, margin: '12px 0 0', display: 'grid', gap: 6, fontSize: 13 }}>{chaves.map(c =>
        <li key={c.id} className="row"><span className={'chip ' + (c.ativa ? 'c-ok' : 'c-mut')}>{c.ativa ? 'Ativa' : 'Substituída'}</span><span className="sp">criada {dt(c.criada_em)}</span>
          <span className="muted">{c.ultimo_uso ? `último uso ${dt(c.ultimo_uso)}` : 'ainda não usada'}</span></li>)}</ul>}
    </section>
  </>);
}

function NovoUsuario({ onFeito }) {
  const sb = supabaseBrowser();
  const [nome, setNome] = useState(''); const [email, setEmail] = useState(''); const [papel, setPapel] = useState('operador_impressao');
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  async function criar(e) {
    e.preventDefault(); setErr('');
    if (!nome.trim() || !/^\S+@\S+\.\S+$/.test(email.trim())) { setErr('Preencha o nome e um e-mail válido.'); return; }
    const s = senhaProvisoria(); setBusy(true);
    const { error } = await sb.rpc('admin_criar_usuario', { p_email: email.trim().toLowerCase(), p_nome: nome.trim(), p_papel: papel, p_senha: s });
    setBusy(false); if (error) { setErr(error.message); return; }
    onFeito({ nome: nome.trim(), email: email.trim().toLowerCase(), senha: s });
  }
  return <form className="box" onSubmit={criar}>
    <h2>Novo usuário</h2>
    <div className="grid2" style={{ gap: 12 }}>
      <div className="f" style={{ margin: 0 }}><label htmlFor="nn">Nome</label><input id="nn" value={nome} onChange={e => setNome(e.target.value)} autoComplete="off" /></div>
      <div className="f" style={{ margin: 0 }}><label htmlFor="ne">E-mail</label><input id="ne" type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="off" /></div>
      <div className="f" style={{ margin: 0 }}><label htmlFor="np">Papel</label><select id="np" value={papel} onChange={e => setPapel(e.target.value)}>{Object.entries(PAPEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
    </div>
    <p className="muted" style={{ fontSize: 12.5 }}>O sistema gera uma senha provisória e mostra uma única vez. No primeiro acesso a pessoa cria a própria senha.</p>
    {err && <div className="err">{err}</div>}
    <button className="btn pri" disabled={busy}>{busy ? 'Criando…' : 'Criar e gerar senha'}</button>
  </form>;
}

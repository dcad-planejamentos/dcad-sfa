'use client';
import { Fragment, useCallback, useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { useEu } from '@/components/Shell';
import { dt, STATUS_VAL, ROTULO_PARAM, valorParam, pode } from '@/lib/fmt';

export default function Perfis() {
  const sb = supabaseBrowser(); const eu = useEu();
  const [perfis, setPerfis] = useState(null); const [regras, setRegras] = useState([]); const [versoes, setVersoes] = useState([]); const [us, setUs] = useState([]);
  const [aba, setAba] = useState('perfis'); const [msg, setMsg] = useState(null); const [editando, setEditando] = useState(null);
  const carregar = useCallback(async () => {
    const [a, b, c, d] = await Promise.all([
      sb.from('perfis').select('*, impressoras(codigo,apelido), resinas(nome)').order('nome'),
      sb.from('regras_montagem').select('*, impressoras(codigo,apelido), tipos_trabalho(nome,ordem), perfis(nome)').order('pasta_entrada'),
      sb.from('versoes_config').select('*').order('proposto_em', { ascending: false }),
      sb.from('usuarios').select('id,nome')
    ]);
    setPerfis(a.data || []); setRegras(b.data || []); setVersoes(c.data || []); setUs(d.data || []);
  }, [sb]);
  useEffect(() => { carregar(); }, [carregar]);
  const nome = id => id ? (us.find(u => u.id === id)?.nome || '—') : 'Sistema (migração)';
  const vAtual = id => versoes.find(v => v.id === id);
  const pend = versoes.filter(v => v.status === 'proposta');
  const alvo = v => v.perfil_id ? (perfis || []).find(p => p.id === v.perfil_id) : regras.find(r => r.id === v.regra_id);
  const rotAlvo = v => { const a = alvo(v); if (!a) return '—'; return v.perfil_id ? `Perfil ${a.nome} · ${a.impressoras?.apelido}` : `Regra ${a.tipos_trabalho?.nome} · ${a.impressoras?.apelido}`; };

  async function aprovar(v) {
    const { error } = await sb.rpc('aprovar_versao', { p_versao: v.id });
    setMsg(error ? { t: 'err', x: error.message } : { t: 'ok', x: `${rotAlvo(v)}: ${v.versao} aprovada. O motor passa a usar esta versão.` }); carregar();
  }
  async function recusar(v) {
    const m = window.prompt('Motivo da recusa:'); if (!m) return;
    const { error } = await sb.rpc('recusar_versao', { p_versao: v.id, p_motivo: m });
    setMsg(error ? { t: 'err', x: error.message } : { t: 'ok', x: `${rotAlvo(v)}: ${v.versao} recusada.` }); carregar();
  }

  const grupos = (lista, chave) => { const g = {}; lista.forEach(x => { const k = x.impressoras?.apelido || '—'; (g[k] = g[k] || []).push(x); }); return Object.entries(g); };

  return (<>
    <div className="ph"><div><h1>Perfis e regras</h1><p>Exposição de cada resina e regras de montagem de cada trabalho. Toda alteração passa pela dupla checagem.</p></div></div>
    {msg && <div className={msg.t === 'ok' ? 'okm' : 'err'} role="status">{msg.x}</div>}
    {pend.length > 0 && <section className="box" style={{ borderColor: '#6b5420' }}>
      <h2>Aguardando 2ª checagem ({pend.length})</h2>
      <div style={{ display: 'grid', gap: 12 }}>{pend.map(v => { const a = alvo(v); const atual = a && vAtual(a.versao_atual_id); return (
        <div key={v.id} style={{ borderTop: '1px solid var(--line)', paddingTop: 12 }}>
          <div className="row"><b className="sp">{rotAlvo(v)} · {v.versao}</b><span className="muted" style={{ fontSize: 12.5 }}>proposto por {nome(v.proposto_por)} · {dt(v.proposto_em)}</span></div>
          <p style={{ margin: '6px 0' }}>Motivo: {v.motivo}</p>
          <Diff antes={atual?.parametros} depois={v.parametros} />
          <div className="row" style={{ marginTop: 10 }}>
            {pode(eu.papel, 'aprovar') && v.proposto_por !== eu.id ? <><button className="btn pri sm" onClick={() => aprovar(v)}>Aprovar e aplicar no motor</button><button className="btn sm danger" onClick={() => recusar(v)}>Recusar</button></>
              : <span className="muted" style={{ fontSize: 12.5 }}>{v.proposto_por === eu.id ? 'Você propôs: a aprovação é do operador de impressão.' : 'A 2ª checagem é do operador de impressão.'}</span>}
          </div>
        </div>); })}</div>
    </section>}
    <div className="pills" role="tablist">{[['perfis', `Perfis de exposição (${(perfis || []).length})`], ['regras', `Regras de montagem (${regras.length})`]].map(([k, l]) =>
      <button key={k} role="tab" aria-selected={aba === k} className={'pill' + (aba === k ? ' on' : '')} onClick={() => setAba(k)}>{l}</button>)}</div>
    {perfis === null ? <div className="empty">Carregando…</div> :
      grupos(aba === 'perfis' ? perfis : regras).map(([imp, itens]) => <section key={imp} style={{ display: 'grid', gap: 12 }}>
        <h2 className="sec" style={{ margin: '6px 0 0' }}>{imp}</h2>
        <div className="cards">{itens.map(x => <Item key={x.id} x={x} tipo={aba} atual={vAtual(x.versao_atual_id)} hist={versoes.filter(v => (aba === 'perfis' ? v.perfil_id : v.regra_id) === x.id)}
          nome={nome} eu={eu} editando={editando === x.id} editar={() => setEditando(editando === x.id ? null : x.id)} onFeito={m => { setMsg(m); setEditando(null); carregar(); }} />)}</div>
      </section>)}
  </>);
}

function Params({ p }) {
  if (!p || typeof p !== 'object') return <p className="muted">Sem parâmetros.</p>;
  return <dl className="kv">{Object.entries(p).map(([k, v]) => <Fragment key={k}><dt>{ROTULO_PARAM[k] || k.replace(/_/g, ' ')}</dt><dd>{valorParam(v)}</dd></Fragment>)}</dl>;
}
function Diff({ antes, depois }) {
  const ks = [...new Set([...Object.keys(antes || {}), ...Object.keys(depois || {})])];
  const mud = ks.filter(k => JSON.stringify((antes || {})[k]) !== JSON.stringify((depois || {})[k]));
  if (!mud.length) return <p className="muted">Sem diferença nos parâmetros.</p>;
  return <div className="tw"><table className="stack"><thead><tr><th>Parâmetro</th><th>Atual</th><th>Proposto</th></tr></thead><tbody>{mud.map(k =>
    <tr key={k}><td className="t">{ROTULO_PARAM[k] || k.replace(/_/g, ' ')}</td><td data-l="Atual" className="muted" style={{ textDecoration: 'line-through' }}>{valorParam((antes || {})[k])}</td><td data-l="Proposto"><b>{valorParam((depois || {})[k])}</b></td></tr>)}</tbody></table></div>;
}

function Item({ x, tipo, atual, hist, nome, eu, editando, editar, onFeito }) {
  const sb = supabaseBrowser();
  const [txt, setTxt] = useState(''); const [motivo, setMotivo] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const [l, k] = STATUS_VAL[x.status_validacao];
  useEffect(() => { if (editando) { setTxt(JSON.stringify(atual?.parametros || {}, null, 2)); setMotivo(''); setErr(''); } }, [editando, atual]);
  async function propor() {
    setErr(''); let par;
    try { par = JSON.parse(txt); } catch { setErr('Os parâmetros não estão num formato válido. Confira vírgulas e aspas.'); return; }
    if (!motivo.trim()) { setErr('Informe o motivo da alteração.'); return; }
    setBusy(true);
    const { error } = await sb.rpc('propor_versao', { p_perfil: tipo === 'perfis' ? x.id : null, p_regra: tipo === 'regras' ? x.id : null, p_parametros: par, p_motivo: motivo.trim() });
    setBusy(false); if (error) { setErr(error.message); return; }
    onFeito({ t: 'ok', x: 'Alteração proposta. Ela só vale no motor depois da aprovação do operador de impressão.' });
  }
  return (
    <article className="box">
      <div className="row" style={{ alignItems: 'flex-start' }}><div className="sp"><b style={{ fontSize: 15 }}>{tipo === 'perfis' ? x.nome : x.tipos_trabalho?.nome}</b>
        <div className="muted" style={{ fontSize: 12.5 }}>{tipo === 'perfis' ? `${x.resinas?.nome || 'resina a confirmar'} · camada ${String(x.camada_mm).replace('.', ',')} mm` : `pasta ${x.pasta_entrada} · perfil ${x.perfis?.nome}`}</div></div>
        <span className={'chip ' + k}>{l}</span></div>
      <p className="muted" style={{ fontSize: 12, margin: '8px 0' }}>Em uso: <b style={{ color: 'var(--fg)' }}>{atual?.versao || '—'}</b>{atual?.aprovado_em && ` · ${dt(atual.aprovado_em)}`}</p>
      <Params p={atual?.parametros} />
      <div className="row" style={{ marginTop: 12 }}>
        {pode(eu.papel, 'propor') && <button className="btn sm" onClick={editar} aria-expanded={editando}>{editando ? 'Cancelar' : 'Propor alteração'}</button>}
        {hist.length > 1 && <details className="json"><summary>Histórico ({hist.length} versões)</summary>
          <ul style={{ listStyle: 'none', padding: 0, margin: '6px 0 0', display: 'grid', gap: 6, fontSize: 12.5 }}>{hist.map(v => <li key={v.id}><b>{v.versao}</b> · {v.status} · {v.motivo} · {nome(v.proposto_por)}{v.aprovado_por && ` → ${nome(v.aprovado_por)}`} · {dt(v.aprovado_em || v.proposto_em)}</li>)}</ul></details>}
      </div>
      {editando && <div className="sheet">
        <p className="info" style={{ margin: 0 }}>Edite os valores abaixo. A proposta vai para a 2ª checagem do operador de impressão; até lá o motor continua com {atual?.versao}.</p>
        <div className="f" style={{ margin: 0 }}><label htmlFor={'p' + x.id}>Parâmetros</label><textarea id={'p' + x.id} className="ta" rows={Math.min(18, txt.split('\n').length + 1)} value={txt} onChange={e => setTxt(e.target.value)} spellCheck={false} /></div>
        <div className="f" style={{ margin: 0 }}><label htmlFor={'m' + x.id}>Motivo (obrigatório)</label><input id={'m' + x.id} value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Ex.: calibrador mostrou subexposição" /></div>
        {err && <div className="err" style={{ margin: 0 }}>{err}</div>}
        <div className="row"><button className="btn pri" onClick={propor} disabled={busy}>{busy ? 'Enviando…' : 'Confirmar e enviar para 2ª checagem'}</button></div>
      </div>}
    </article>
  );
}

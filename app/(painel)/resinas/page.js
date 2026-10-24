'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { useEu } from '@/components/Shell';
import { br, brl, dt, pode } from '@/lib/fmt';

const UN = { kg: 'kg', g: 'g', l: 'L', ml: 'ml' };
// preço por grama a partir de um preço por unidade (volume precisa da densidade)
function porGrama(preco, un, dens) {
  if (preco == null) return null;
  if (un === 'kg') return preco / 1000; if (un === 'g') return +preco;
  if (!dens) return null;
  return un === 'l' ? preco / 1000 / dens : preco / dens;
}

export default function Resinas() {
  const sb = supabaseBrowser(); const eu = useEu();
  const [res, setRes] = useState(null); const [precos, setPrecos] = useState([]); const [cat, setCat] = useState([]); const [us, setUs] = useState([]);
  const [aba, setAba] = useState('dcad'); const [msg, setMsg] = useState(null);
  const [marca, setMarca] = useState(''); const [q, setQ] = useState('');
  const carregar = useCallback(async () => {
    const [a, b, c, d] = await Promise.all([
      sb.from('resinas').select('*').order('nome'),
      sb.from('precos_resina').select('*').order('vigente_desde', { ascending: false }),
      sb.from('catalogo_resinas').select('*').order('marca').order('nome'),
      sb.from('usuarios').select('id,nome')
    ]);
    setRes(a.data || []); setPrecos(b.data || []); setCat(c.data || []); setUs(d.data || []);
  }, [sb]);
  useEffect(() => { carregar(); }, [carregar]);
  const nome = id => us.find(u => u.id === id)?.nome || 'Sistema';
  const marcas = useMemo(() => [...new Set(cat.map(c => c.marca))], [cat]);
  const ql = q.trim().toLowerCase();
  const catVis = cat.filter(c => (!marca || c.marca === marca) && (!ql || `${c.marca} ${c.nome} ${c.tipo || ''}`.toLowerCase().includes(ql)));

  return (<>
    <div className="ph"><div><h1>Resinas e preços</h1><p>Resinas em uso na D-CAD, densidade e preço vigente. O custo de cada plataforma usa o preço da data do fatiamento.</p></div></div>
    {msg && <div className={msg.t === 'ok' ? 'okm' : 'err'} role="status">{msg.x}</div>}
    <div className="pills" role="tablist">{[['dcad', `Resinas da D-CAD (${(res || []).length})`], ['cat', `Catálogo Dental Cremer (${cat.length})`]].map(([k, l]) =>
      <button key={k} role="tab" aria-selected={aba === k} className={'pill' + (aba === k ? ' on' : '')} onClick={() => setAba(k)}>{l}</button>)}</div>

    {res === null ? <div className="empty">Carregando…</div> : aba === 'dcad' ?
      <>
        {res.some(r => !r.densidade_g_ml) && <p className="info">Sem a densidade (g/ml) o painel mostra o volume em ml, mas não calcula peso nem custo. A densidade fica na ficha técnica de cada resina.</p>}
        <div className="cards">{res.map(r => <CardResina key={r.id} r={r} hist={precos.filter(p => p.resina_id === r.id)} nome={nome} eu={eu} onFeito={m => { setMsg(m); carregar(); }} />)}</div>
      </> :
      <section className="box">
        <div className="filters" style={{ marginBottom: 12 }}>
          <div className="pills">{['', ...marcas].map(m => <button key={m} className={'pill' + (marca === m ? ' on' : '')} onClick={() => setMarca(m)}>{m || 'Todas'}</button>)}</div>
          <input className="inp" placeholder="Buscar resina" value={q} onChange={e => setQ(e.target.value)} aria-label="Buscar resina" />
        </div>
        <p className="muted" style={{ fontSize: 12.5, marginTop: 0 }}>Preços coletados no site da Dental Cremer. Use "Editar" para registrar o valor negociado; o valor do site continua visível.</p>
        <div className="tw"><table className="stack"><thead><tr><th>Resina</th><th>Tipo</th><th>Embalagem</th><th>Pix (site)</th><th>Por kg</th><th>Valor D-CAD</th><th></th></tr></thead>
          <tbody>{catVis.map(c => <LinhaCat key={c.id} c={c} eu={eu} nome={nome} onFeito={m => { setMsg(m); carregar(); }} />)}</tbody></table></div>
      </section>}
  </>);
}

function CardResina({ r, hist, nome, eu, onFeito }) {
  const sb = supabaseBrowser();
  const [ab, setAb] = useState(''); const [preco, setPreco] = useState(''); const [un, setUn] = useState('kg'); const [fonte, setFonte] = useState('');
  const [dens, setDens] = useState(r.densidade_g_ml ?? ''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const atual = hist[0]; const g = atual ? porGrama(atual.preco, atual.por_unidade, r.densidade_g_ml) : null;
  async function salvarPreco() {
    const v = +String(preco).replace(',', '.'); if (!(v > 0)) { setErr('Informe um valor maior que zero.'); return; }
    setBusy(true); setErr('');
    const { error } = await sb.from('precos_resina').insert({ resina_id: r.id, preco: v, por_unidade: un, fonte: fonte.trim() || null, criado_por: eu.id });
    setBusy(false); if (error) { setErr(error.message); return; }
    setAb(''); setPreco(''); setFonte(''); onFeito({ t: 'ok', x: `${r.nome}: novo preço registrado. Vale a partir de agora; plataformas antigas mantêm o preço da época.` });
  }
  async function salvarDens() {
    const v = dens === '' ? null : +String(dens).replace(',', '.'); if (v !== null && !(v > 0.5 && v < 3)) { setErr('A densidade costuma ficar entre 1,0 e 1,3 g/ml. Confira o valor.'); return; }
    setBusy(true); setErr('');
    const { error } = await sb.from('resinas').update({ densidade_g_ml: v }).eq('id', r.id);
    setBusy(false); if (error) { setErr(error.message); return; }
    setAb(''); onFeito({ t: 'ok', x: `${r.nome}: densidade atualizada.` });
  }
  return (
    <article className="box">
      <div className="row" style={{ alignItems: 'flex-start' }}><div className="sp"><b style={{ fontSize: 15 }}>{r.nome}</b><div className="muted" style={{ fontSize: 12.5 }}>{r.fabricante || '—'}</div></div>
        {!r.ativa && <span className="chip c-mut">Inativa</span>}</div>
      <div className="stats" style={{ margin: '12px 0', gridTemplateColumns: 'repeat(3,minmax(0,1fr))' }}>
        <div><span>Preço vigente</span><b className="num">{atual ? brl(atual.preco) : '—'}</b>{atual && <small>por {UN[atual.por_unidade]}</small>}</div>
        <div><span>Por grama</span><b className="num">{g != null ? brl(g) : '—'}</b></div>
        <div><span>Densidade</span><b className="num">{r.densidade_g_ml ? br(r.densidade_g_ml, 2) : '—'}</b><small>g/ml</small></div>
      </div>
      {r.observacoes && <p className="muted" style={{ fontSize: 12.5, margin: '0 0 10px' }}>{r.observacoes}</p>}
      <div className="row">
        {pode(eu.papel, 'preco') && <button className="btn sm" onClick={() => { setAb(ab === 'p' ? '' : 'p'); setErr(''); }} aria-expanded={ab === 'p'}>{ab === 'p' ? 'Cancelar' : 'Novo preço'}</button>}
        {pode(eu.papel, 'admin') && <button className="btn sm ghost" onClick={() => { setAb(ab === 'd' ? '' : 'd'); setErr(''); }} aria-expanded={ab === 'd'}>{ab === 'd' ? 'Cancelar' : 'Densidade'}</button>}
        {hist.length > 0 && <details className="json"><summary>Histórico de preços ({hist.length})</summary>
          <ul style={{ listStyle: 'none', padding: 0, margin: '6px 0 0', display: 'grid', gap: 6, fontSize: 12.5 }}>{hist.map(p => <li key={p.id}><b className="num">{brl(p.preco)}</b>/{UN[p.por_unidade]} · desde {dt(p.vigente_desde)} · {nome(p.criado_por)}{p.fonte && ` · ${p.fonte}`}</li>)}</ul></details>}
      </div>
      {ab === 'p' && <div className="sheet">
        <div className="row" style={{ alignItems: 'flex-end' }}>
          <div className="f sp" style={{ margin: 0 }}><label htmlFor={'v' + r.id}>Valor (R$)</label><input id={'v' + r.id} inputMode="decimal" value={preco} onChange={e => setPreco(e.target.value)} placeholder="Ex.: 1318,22" /></div>
          <div className="f" style={{ margin: 0 }}><label htmlFor={'u' + r.id}>Por</label><select id={'u' + r.id} value={un} onChange={e => setUn(e.target.value)}>
            <option value="kg">quilograma (kg)</option><option value="g">grama (g)</option><option value="l">litro (L)</option><option value="ml">mililitro (ml)</option></select></div>
        </div>
        <div className="f" style={{ margin: 0 }}><label htmlFor={'f' + r.id}>Origem do valor (opcional)</label><input id={'f' + r.id} value={fonte} onChange={e => setFonte(e.target.value)} placeholder="Ex.: NF 1234, Dental Cremer" /></div>
        {(un === 'l' || un === 'ml') && !r.densidade_g_ml && <p className="info" style={{ margin: 0 }}>Preço por volume precisa da densidade para virar custo por grama.</p>}
        {err && <div className="err" style={{ margin: 0 }}>{err}</div>}
        <div className="row"><button className="btn pri" onClick={salvarPreco} disabled={busy}>{busy ? 'Salvando…' : 'Registrar preço'}</button></div>
      </div>}
      {ab === 'd' && <div className="sheet">
        <div className="f" style={{ margin: 0 }}><label htmlFor={'d' + r.id}>Densidade (g/ml)</label><input id={'d' + r.id} inputMode="decimal" value={dens} onChange={e => setDens(e.target.value)} placeholder="Ex.: 1,12" /></div>
        {err && <div className="err" style={{ margin: 0 }}>{err}</div>}
        <div className="row"><button className="btn pri" onClick={salvarDens} disabled={busy}>{busy ? 'Salvando…' : 'Salvar densidade'}</button></div>
      </div>}
    </article>
  );
}

function LinhaCat({ c, eu, nome, onFeito }) {
  const sb = supabaseBrowser();
  const [ed, setEd] = useState(false); const [v, setV] = useState(c.preco_editado ?? '');
  const base = c.preco_editado ?? c.preco_pix;
  const kg = base == null || !c.quantidade ? null : c.unidade === 'g' ? base / c.quantidade * 1000 : c.unidade === 'kg' ? base / c.quantidade : null;
  async function salvar() {
    const n = v === '' ? null : +String(v).replace(',', '.'); if (n !== null && !(n > 0)) return;
    const { error } = await sb.from('catalogo_resinas').update({ preco_editado: n, editado_por: eu.id, editado_em: new Date().toISOString() }).eq('id', c.id);
    if (error) { onFeito({ t: 'err', x: error.message }); return; }
    setEd(false); onFeito({ t: 'ok', x: `${c.nome}: valor ${n === null ? 'voltou ao do site' : 'atualizado'}.` });
  }
  return <tr>
    <td className="t">{c.url ? <a href={c.url} target="_blank" rel="noreferrer">{c.marca} {c.nome}</a> : `${c.marca} ${c.nome}`}</td>
    <td data-l="Tipo">{c.tipo || '—'}</td>
    <td data-l="Embalagem" className="num">{c.quantidade ? `${br(c.quantidade, 0)} ${c.unidade === 'l' ? 'L' : c.unidade}` : c.embalagem || '—'}{c.varias_opcoes && <span className="muted"> · várias</span>}</td>
    <td data-l="Pix (site)" className="num">{brl(c.preco_pix)}{c.coletado_em && <div className="muted" style={{ fontSize: 11 }}>{new Date(c.coletado_em + 'T12:00').toLocaleDateString('pt-BR')}</div>}</td>
    <td data-l="Por kg" className="num">{kg ? brl(kg) : '—'}</td>
    <td data-l="Valor D-CAD" className="num">{ed ? <input className="inp" style={{ width: 110 }} inputMode="decimal" value={v} onChange={e => setV(e.target.value)} aria-label="Valor D-CAD" autoFocus onKeyDown={e => e.key === 'Enter' && salvar()} />
      : c.preco_editado != null ? <span title={`${nome(c.editado_por)} · ${dt(c.editado_em)}`}><b>{brl(c.preco_editado)}</b></span> : <span className="muted">igual ao site</span>}</td>
    <td>{pode(eu.papel, 'preco') && (ed ? <div className="row" style={{ flexWrap: 'nowrap' }}><button className="btn sm pri" onClick={salvar}>Salvar</button><button className="btn sm ghost" onClick={() => setEd(false)}>Cancelar</button></div>
      : <button className="btn sm ghost" onClick={() => setEd(true)}>Editar</button>)}</td>
  </tr>;
}

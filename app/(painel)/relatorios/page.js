'use client';
import { useEffect, useMemo, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { br, brl, horas, CAUSAS } from '@/lib/fmt';

const MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const chave = d => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}`; };
const rot = k => { const [a, m] = k.split('-'); return `${MES[+m - 1]}/${a.slice(2)}`; };
const IMPRESSAS = ['impressa', 'falhou', 'arquivada'];

function soma(lista, f) { return lista.reduce((a, x) => a + (+f(x) || 0), 0); }
function agrupar(lista, k) { const g = {}; lista.forEach(x => { const c = k(x) || '—'; (g[c] = g[c] || []).push(x); }); return g; }

function Barras({ linhas, fmt = v => br(v, 0), unid = '', cor }) {
  const max = Math.max(1, ...linhas.map(l => l.v));
  if (!linhas.length) return <p className="muted">Sem dados no período.</p>;
  return <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10 }}>{linhas.map(l =>
    <li key={l.k}><div className="row" style={{ fontSize: 13, marginBottom: 4 }}><span className="sp">{l.k}</span><b className="num">{fmt(l.v)}{unid}</b>{l.extra && <span className="muted num" style={{ fontSize: 12 }}>{l.extra}</span>}</div>
      <div className="bar" role="presentation"><i style={{ width: `${(l.v / max) * 100}%`, background: cor }} /></div></li>)}</ul>;
}

export default function Relatorios() {
  const sb = supabaseBrowser();
  const [dados, setDados] = useState(null); const [itens, setItens] = useState([]); const [mes, setMes] = useState(chave(new Date()));
  useEffect(() => { (async () => {
    const desde = new Date(); desde.setMonth(desde.getMonth() - 11, 1); desde.setHours(0, 0, 0, 0);
    const [a, b] = await Promise.all([
      sb.from('v_consumo_plataformas').select('*').gte('fatiada_em', desde.toISOString()),
      sb.from('itens_plataforma').select('plataforma_id, volume_ml, volume_estimado, resultado, tipos_trabalho(nome), plataformas!inner(fatiada_em,status)').gte('plataformas.fatiada_em', desde.toISOString())
    ]);
    setDados(a.data || []); setItens(b.data || []);
  })(); }, [sb]);

  const meses = useMemo(() => { const out = []; const d = new Date(); d.setDate(1); for (let i = 0; i < 12; i++) { out.unshift(chave(d)); d.setMonth(d.getMonth() - 1); } return out; }, []);
  if (dados === null) return <div className="empty">Carregando…</div>;

  const doMes = dados.filter(p => chave(p.fatiada_em) === mes);
  const imp = doMes.filter(p => IMPRESSAS.includes(p.status));
  const falhas = doMes.filter(p => +p.volume_perdido_ml > 0);
  const ml = soma(imp, p => p.volume_ml), perdido = soma(doMes, p => p.volume_perdido_ml);
  const custo = soma(imp, p => p.custo_r), semCusto = imp.filter(p => p.custo_r == null).length;
  const pecas = soma(imp, p => p.pecas), pecasPerd = soma(doMes, p => p.pecas_perdidas);
  const custoPerd = soma(falhas, p => p.custo_r && +p.volume_ml ? p.custo_r * p.volume_perdido_ml / p.volume_ml : 0);

  const porImp = Object.entries(agrupar(imp, p => p.impressora)).map(([k, l]) => ({ k, v: soma(l, p => p.tempo_estimado_s) / 3600, extra: `${l.length} plat. · ${br(soma(l, p => p.volume_ml), 0)} ml` })).sort((a, b) => b.v - a.v);
  const porRes = Object.entries(agrupar(imp, p => p.resina)).map(([k, l]) => ({ k, v: soma(l, p => p.volume_ml), extra: soma(l, p => p.custo_r) ? brl(soma(l, p => p.custo_r)) : '' })).sort((a, b) => b.v - a.v);
  const itMes = itens.filter(i => chave(i.plataformas.fatiada_em) === mes && IMPRESSAS.includes(i.plataformas.status));
  const porTipo = Object.entries(agrupar(itMes, i => i.tipos_trabalho?.nome || 'Sem tipo')).map(([k, l]) => ({ k, v: l.length, extra: `${br(soma(l, i => i.volume_ml), 0)} ml` })).sort((a, b) => b.v - a.v);
  const porCausa = Object.entries(agrupar(falhas, p => CAUSAS[p.causa] || p.causa || 'Sem causa')).map(([k, l]) => ({ k, v: soma(l, p => p.volume_perdido_ml), extra: `${soma(l, p => p.pecas_perdidas)} peças` })).sort((a, b) => b.v - a.v);
  const tendencia = meses.slice(-6).map(m => { const l = dados.filter(p => chave(p.fatiada_em) === m); const usado = soma(l.filter(p => IMPRESSAS.includes(p.status)), p => p.volume_ml);
    return { k: rot(m), v: soma(l, p => p.volume_perdido_ml), extra: usado ? `${br(soma(l, p => p.volume_perdido_ml) / usado * 100, 1)}% do usado` : '' }; });

  return (<>
    <div className="ph"><div><h1>Relatórios</h1><p>Consumo de resina, uso das impressoras e perdas por falha. Uma peça que falha conta todo o seu volume como perdido.</p></div>
      <div className="acts"><label className="muted" htmlFor="mes" style={{ fontSize: 13 }}>Mês</label>
        <select id="mes" className="inp" value={mes} onChange={e => setMes(e.target.value)}>{[...meses].reverse().map(m => <option key={m} value={m}>{rot(m)}</option>)}</select></div></div>

    <div className="stats">
      <div><span>Plataformas impressas</span><b className="num">{imp.length}</b><small>{pecas} peças</small></div>
      <div><span>Resina usada</span><b className="num">{br(ml, 0)}</b><small>ml</small></div>
      <div><span>Custo de resina</span><b className="num">{custo ? brl(custo) : '—'}</b>{semCusto > 0 && <small>{semCusto} sem densidade/preço</small>}</div>
      <div><span>Horas de impressão</span><b className="num">{horas(soma(imp, p => p.tempo_estimado_s))}</b></div>
      <div><span>Resina perdida</span><b className="num" style={{ color: perdido ? 'var(--red2, #FF4A50)' : undefined }}>{br(perdido, 0)}</b><small>ml · {pecasPerd} peças{custoPerd ? ` · ${brl(custoPerd)}` : ''}</small></div>
      <div><span>Taxa de falha</span><b className="num">{pecas ? br(pecasPerd / pecas * 100, 1) + '%' : '—'}</b><small>das peças</small></div>
    </div>
    {imp.length === 0 && <p className="info">Nenhuma plataforma impressa em {rot(mes)}. Os números aparecem conforme o operador dá baixa na fila.</p>}

    <div className="grid2">
      <section className="box"><h2>Uso por impressora</h2><Barras linhas={porImp} fmt={v => horas(v * 3600)} /></section>
      <section className="box"><h2>Consumo por resina</h2><Barras linhas={porRes} unid=" ml" /></section>
      <section className="box"><h2>Peças por tipo de trabalho</h2><Barras linhas={porTipo} /></section>
      <section className="box"><h2>Falhas por causa</h2><p className="muted" style={{ fontSize: 12.5, marginTop: 0 }}>Volume perdido (ml) no mês.</p><Barras linhas={porCausa} unid=" ml" cor="#E52229" /></section>
      <section className="box" style={{ gridColumn: '1 / -1' }}><h2>Resina perdida nos últimos 6 meses</h2><Barras linhas={tendencia} unid=" ml" cor="#E52229" /></section>
    </div>
    {itMes.some(i => i.volume_estimado) ?<p className="muted" style={{ fontSize: 12 }}>Volume por peça estimado pela divisão do volume da plataforma até o motor informar o volume de cada peça.</p> : null}
  </>);
}

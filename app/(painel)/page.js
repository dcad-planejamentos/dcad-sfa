'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { useEu } from '@/components/Shell';
import { br, dt, horas, STATUS_PLAT, CAUSAS, pode } from '@/lib/fmt';

const ABAS = [
  ['fila', 'Na fila', s => ['fatiada', 'enviada', 'imprimindo'].includes(s)],
  ['impressa', 'Impressas', s => s === 'impressa' || s === 'arquivada'],
  ['falhou', 'Falhas', s => s === 'falhou' || s === 'reprovada'],
  ['todas', 'Todas', () => true]
];
const um = x => Array.isArray(x) ? x[0] : x;

export default function Fila() {
  const sb = supabaseBrowser(); const eu = useEu();
  const [lista, setLista] = useState(null); const [erro, setErro] = useState('');
  const [aba, setAba] = useState('fila'); const [q, setQ] = useState(''); const [imp, setImp] = useState('');
  const [aberto, setAberto] = useState(null); const [msg, setMsg] = useState(null);

  const carregar = useCallback(async () => {
    const { data, error } = await sb.from('plataformas')
      .select('*, impressoras(codigo,apelido), itens_plataforma(id,paciente,nome_peca,resultado,volume_ml,tipos_trabalho(nome,abreviacao)), baixas(sucesso,causa,observacao,registrado_em,origem)')
      .order('fatiada_em', { ascending: false }).limit(400);
    if (error) setErro('Não foi possível carregar a fila: ' + error.message); else setLista(data);
  }, [sb]);
  useEffect(() => { carregar(); const t = setInterval(carregar, 60000); return () => clearInterval(t); }, [carregar]);

  const impressoras = useMemo(() => [...new Set((lista || []).map(p => p.impressoras?.apelido).filter(Boolean))].sort(), [lista]);
  const filtro = ABAS.find(a => a[0] === aba)[2];
  const ql = q.trim().toLowerCase();
  const vis = (lista || []).filter(p => filtro(p.status) && (!imp || p.impressoras?.apelido === imp) &&
    (!ql || (p.nome_arquivo + ' ' + (p.itens_plataforma || []).map(i => i.paciente).join(' ')).toLowerCase().includes(ql)));
  const fila = (lista || []).filter(p => ['fatiada', 'enviada', 'imprimindo'].includes(p.status));
  const hoje = new Date().toDateString();
  const impHoje = (lista || []).filter(p => p.status === 'impressa' && p.finalizada_em && new Date(p.finalizada_em).toDateString() === hoje);

  async function iniciar(p) {
    const { error } = await sb.from('plataformas').update({ status: 'imprimindo', iniciada_por: eu.id, iniciada_em: new Date().toISOString() }).eq('id', p.id);
    setMsg(error ? { t: 'err', x: 'Não foi possível iniciar: ' + error.message } : { t: 'ok', x: `${p.nome_arquivo}: impressão iniciada.` }); carregar();
  }

  return (<>
    <div className="ph"><div><h1>Fila e impressões</h1><p>Plataformas fatiadas pelo vigia, impressões e baixas. Atualiza a cada minuto.</p></div></div>
    {erro && <div className="err">{erro}</div>}
    {msg && <div className={msg.t === 'ok' ? 'okm' : 'err'} role="status">{msg.x}</div>}
    <section className="stats" aria-label="Resumo">
      <div><span>Na fila</span><b className="num">{fila.filter(p => p.status !== 'imprimindo').length}</b><small>plataformas</small></div>
      <div><span>Imprimindo</span><b className="num">{fila.filter(p => p.status === 'imprimindo').length}</b><small>agora</small></div>
      <div><span>Impressas hoje</span><b className="num">{impHoje.length}</b><small>{impHoje.reduce((a, p) => a + (p.pecas || 0), 0)} peças</small></div>
      <div><span>Resina na fila</span><b className="num">{br(fila.reduce((a, p) => a + (+p.volume_ml || 0), 0), 0)} ml</b><small>previsto pelo fatiador</small></div>
      <div><span>Tempo na fila</span><b className="num">{horas(fila.reduce((a, p) => a + (p.tempo_estimado_s || 0), 0))}</b><small>somando as plataformas</small></div>
    </section>
    <div className="filters">
      <div className="pills" role="tablist">{ABAS.map(([k, l, f]) => <button key={k} role="tab" aria-selected={aba === k} className={'pill' + (aba === k ? ' on' : '')} onClick={() => setAba(k)}>{l} <span className="num muted">{(lista || []).filter(p => f(p.status)).length}</span></button>)}</div>
      <input className="inp" placeholder="Buscar paciente ou arquivo" value={q} onChange={e => setQ(e.target.value)} aria-label="Buscar" />
      <select className="inp" style={{ maxWidth: 220 }} value={imp} onChange={e => setImp(e.target.value)} aria-label="Impressora"><option value="">Todas as impressoras</option>{impressoras.map(i => <option key={i}>{i}</option>)}</select>
    </div>
    {lista === null ? <div className="empty">Carregando…</div> : vis.length === 0 ? <div className="box empty">{lista.length === 0 ? 'Nenhuma plataforma registrada ainda. Assim que o vigia fatiar, elas aparecem aqui.' : 'Nada nesta aba.'}</div> :
      <div className="cards">{vis.map(p => <Plataforma key={p.id} p={p} eu={eu} aberto={aberto === p.id} abrir={() => setAberto(aberto === p.id ? null : p.id)} iniciar={() => iniciar(p)} onFeito={(m) => { setMsg(m); setAberto(null); carregar(); }} />)}</div>}
  </>);
}

function Plataforma({ p, eu, aberto, abrir, iniciar, onFeito }) {
  const sb = supabaseBrowser();
  const [st, cls] = STATUS_PLAT[p.status] || [p.status, 'c-mut'];
  const itens = p.itens_plataforma || []; const b = um(p.baixas);
  const [modo, setModo] = useState('ok'); const [falhas, setFalhas] = useState([]); const [causa, setCausa] = useState(''); const [obs, setObs] = useState('');
  const [motivo, setMotivo] = useState(''); const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const podeBaixa = pode(eu.papel, 'baixa');
  const aberta = ['fatiada', 'enviada', 'imprimindo'].includes(p.status);
  const perda = itens.filter(i => i.resultado === 'falhou').reduce((a, i) => a + (+i.volume_ml || 0), 0);

  async function confirmar() {
    setErr('');
    if (modo === 'reprovar') {
      if (!motivo.trim()) { setErr('Informe o motivo.'); return; }
      setBusy(true);
      const { error } = await sb.from('plataformas').update({ status: 'reprovada', reprovada_motivo: motivo.trim(), conferida_por: eu.id, conferida_em: new Date().toISOString() }).eq('id', p.id);
      setBusy(false); if (error) { setErr(error.message); return; }
      onFeito({ t: 'ok', x: `${p.nome_arquivo}: reprovada.` }); return;
    }
    const ids = modo === 'ok' ? [] : modo === 'tudo' ? itens.map(i => i.id) : falhas;
    if (modo !== 'ok' && ids.length === 0) { setErr('Marque as peças que falharam.'); return; }
    if (modo !== 'ok' && !causa) { setErr('Escolha a causa da falha.'); return; }
    setBusy(true);
    const { error } = await sb.rpc('dar_baixa', { p_plataforma: p.id, p_itens_falha: ids, p_causa: modo === 'ok' ? null : causa, p_observacao: obs.trim() || null, p_foto: null });
    setBusy(false); if (error) { setErr(error.message); return; }
    onFeito({ t: 'ok', x: modo === 'ok' ? `${p.nome_arquivo}: impressa sem falhas.` : `${p.nome_arquivo}: ${ids.length} peça(s) com falha registradas.` });
  }

  return (
    <article className="box plat">
      <div className="row" style={{ alignItems: 'flex-start' }}><h3 className="sp">{p.nome_arquivo}</h3><span className={'chip ' + cls}>{st}</span></div>
      <div className="meta"><span>{p.impressoras?.apelido}</span><span>{dt(p.fatiada_em)}</span>
        <span className="num">{p.camadas ?? '—'} camadas</span><span className="num">{horas(p.tempo_estimado_s)}</span><span className="num">{br(p.volume_ml)} ml</span>
        {p.ilhas > 0 && <span className="chip c-warn">{p.ilhas} ilha(s) com alerta</span>}
        {p.origem === 'historico_drive' && <span className="chip c-mut">histórico</span>}</div>
      <ul>{itens.map(i => <li key={i.id}><span>{i.paciente || i.nome_peca || 'Peça'} <span className="muted">· {i.tipos_trabalho?.abreviacao || '—'}</span></span>
        <span className={i.resultado === 'falhou' ? 'chip c-err' : i.resultado === 'ok' ? 'muted' : 'muted'}>{i.resultado === 'falhou' ? 'falhou' : i.resultado === 'ok' ? 'ok' : ''}</span></li>)}</ul>
      {b && <p className="muted" style={{ fontSize: 12.5, margin: '0 0 10px' }}>{b.sucesso ? 'Baixa: impressa' : 'Baixa: ' + (CAUSAS[b.causa] || 'falha')}{perda > 0 && ` · ${br(perda)} ml perdidos`} · {dt(b.registrado_em)}{b.origem === 'telegram' && ' · pelo Telegram'}{b.observacao && ` · ${b.observacao}`}</p>}
      {p.status === 'reprovada' && p.reprovada_motivo && <p className="muted" style={{ fontSize: 12.5, margin: '0 0 10px' }}>Reprovada: {p.reprovada_motivo}</p>}
      {podeBaixa && <div className="row">
        {(p.status === 'fatiada' || p.status === 'enviada') && <button className="btn sm" onClick={iniciar}>Iniciar impressão</button>}
        {(aberta || p.status === 'impressa') && <button className={'btn sm' + (aberta ? ' pri' : '')} onClick={abrir} aria-expanded={aberto}>{aberta ? 'Dar baixa' : 'Corrigir baixa'}</button>}
      </div>}
      {aberto && <div className="sheet">
        <div className="pills">
          {[['ok', 'Tudo certo'], ['parcial', 'Algumas peças falharam'], ['tudo', 'Plataforma perdida'], ['reprovar', 'Reprovar sem imprimir']].map(([k, l]) =>
            <button key={k} className={'pill' + (modo === k ? ' on' : '')} onClick={() => setModo(k)}>{l}</button>)}
        </div>
        {modo === 'parcial' && <div>{itens.map(i => <label key={i.id} className="chk"><input type="checkbox" checked={falhas.includes(i.id)}
          onChange={e => setFalhas(e.target.checked ? [...falhas, i.id] : falhas.filter(x => x !== i.id))} />{i.paciente || i.nome_peca} <span className="muted num">· {br(i.volume_ml)} ml</span></label>)}</div>}
        {(modo === 'parcial' || modo === 'tudo') && <>
          <p className="muted" style={{ margin: 0, fontSize: 12.5 }}>Cada peça que falhou conta o volume inteiro como resina perdida.</p>
          <div className="f" style={{ margin: 0 }}><label htmlFor={'c' + p.id}>Causa</label><select id={'c' + p.id} value={causa} onChange={e => setCausa(e.target.value)}><option value="">Escolha</option>{Object.entries(CAUSAS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
        </>}
        {modo === 'reprovar' ? <div className="f" style={{ margin: 0 }}><label htmlFor={'m' + p.id}>Motivo</label><input id={'m' + p.id} value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Ex.: suporte em área de encaixe" /></div>
          : <div className="f" style={{ margin: 0 }}><label htmlFor={'o' + p.id}>Observação (opcional)</label><input id={'o' + p.id} value={obs} onChange={e => setObs(e.target.value)} /></div>}
        {err && <div className="err" style={{ margin: 0 }}>{err}</div>}
        <div className="row"><button className="btn pri" onClick={confirmar} disabled={busy}>{busy ? 'Salvando…' : 'Confirmar'}</button><button className="btn ghost" onClick={abrir}>Cancelar</button>
          <span className="muted" style={{ fontSize: 12 }}>Fica no log com seu nome.</span></div>
      </div>}
    </article>
  );
}

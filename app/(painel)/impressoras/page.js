'use client';
import { useEffect, useMemo, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { br, horas, STATUS_VAL, COMPAT } from '@/lib/fmt';

export default function Impressoras() {
  const sb = supabaseBrowser();
  const [imps, setImps] = useState(null); const [plats, setPlats] = useState([]); const [cat, setCat] = useState([]);
  const [marca, setMarca] = useState(''); const [q, setQ] = useState(''); const [verCat, setVerCat] = useState(false);
  useEffect(() => { (async () => {
    const inicio = new Date(); inicio.setDate(1); inicio.setHours(0, 0, 0, 0);
    const [a, b, c] = await Promise.all([
      sb.from('impressoras').select('*, catalogo_impressoras(marca,modelo,resolucao_x,resolucao_y,pixel_um,area_x_mm,area_y_mm,area_z_mm), perfis(id,nome,camada_mm,status_validacao,resinas(nome)), regras_montagem(id,pasta_entrada,status_validacao,tipos_trabalho(nome))').order('status_validacao').order('codigo'),
      sb.from('plataformas').select('impressora_id,status,tempo_estimado_s,volume_ml,fatiada_em').gte('fatiada_em', inicio.toISOString()),
      sb.from('catalogo_impressoras').select('*').order('marca').order('modelo')
    ]);
    setImps(a.data || []); setPlats(b.data || []); setCat(c.data || []);
  })(); }, [sb]);
  const uso = id => { const ps = plats.filter(p => p.impressora_id === id); const imp = ps.filter(p => ['impressa', 'falhou', 'arquivada'].includes(p.status));
    return { n: ps.length, h: imp.reduce((a, p) => a + (p.tempo_estimado_s || 0), 0), ml: ps.reduce((a, p) => a + (+p.volume_ml || 0), 0), f: ps.filter(p => p.status === 'falhou').length,
      fila: ps.filter(p => ['fatiada', 'enviada', 'imprimindo'].includes(p.status)).length }; };
  const marcas = useMemo(() => [...new Set(cat.map(c => c.marca))], [cat]);
  const ql = q.trim().toLowerCase();
  const catVis = cat.filter(c => (!marca || c.marca === marca) && (!ql || (c.marca + ' ' + c.modelo).toLowerCase().includes(ql)));

  return (<>
    <div className="ph"><div><h1>Impressoras</h1><p>Equipamentos da D-CAD, perfis e regras ligados a cada um, e uso no mês.</p></div>
      <div className="acts"><button className="btn" onClick={() => setVerCat(!verCat)}>{verCat ? 'Fechar catálogo' : `Catálogo de modelos (${cat.length})`}</button></div></div>
    {verCat && <section className="box">
      <h2>Catálogo de impressoras de resina</h2>
      <div className="filters" style={{ marginBottom: 12 }}>
        <div className="pills">{['', ...marcas].map(m => <button key={m} className={'pill' + (marca === m ? ' on' : '')} onClick={() => setMarca(m)}>{m || 'Todas'}</button>)}</div>
        <input className="inp" placeholder="Buscar modelo" value={q} onChange={e => setQ(e.target.value)} aria-label="Buscar modelo" />
      </div>
      <div className="tw"><table className="stack"><thead><tr><th>Modelo</th><th>Tela (px)</th><th>Pixel XY</th><th>Área útil (mm)</th><th>Arquivo</th><th>Motor SFA</th></tr></thead>
        <tbody>{catVis.map(c => { const [l, k] = COMPAT[c.compat_motor] || ['—', 'c-mut']; return <tr key={c.id}>
          <td className="t">{c.marca} {c.modelo}</td>
          <td data-l="Tela" className="num">{c.resolucao_x ? `${c.resolucao_x} × ${c.resolucao_y}` : '—'}</td>
          <td data-l="Pixel" className="num">{c.pixel_um ? br(c.pixel_um) + ' µm' : '—'}</td>
          <td data-l="Área" className="num">{c.area_x_mm ? `${br(c.area_x_mm)} × ${br(c.area_y_mm)} × ${br(c.area_z_mm, 0)}` : '—'}</td>
          <td data-l="Arquivo">{c.formato || '—'}</td><td data-l="Motor"><span className={'chip ' + k}>{l}</span></td></tr>; })}</tbody></table></div>
    </section>}
    {imps === null ? <div className="empty">Carregando…</div> :
      <div className="cards">{imps.map(i => { const [l, k] = STATUS_VAL[i.status_validacao]; const u = uso(i.id); const c = i.catalogo_impressoras; return (
        <article key={i.id} className="box">
          <div className="row" style={{ alignItems: 'flex-start' }}><div className="sp"><h2 style={{ marginBottom: 2 }}>{i.apelido}</h2><div className="muted" style={{ fontSize: 12.5 }}>{i.codigo} · {i.tecnologia} · {i.formato_arquivo}{c?.pixel_um ? ` · ${br(c.pixel_um)} µm` : ''}</div></div><span className={'chip ' + k}>{l}</span></div>
          {c?.area_x_mm && <p className="muted num" style={{ fontSize: 12.5, margin: '8px 0 0' }}>Área útil {br(c.area_x_mm)} × {br(c.area_y_mm)} × {br(c.area_z_mm, 0)} mm</p>}
          {i.ip_rede && <p className="muted" style={{ fontSize: 12.5, margin: '4px 0 0' }}>Rede {i.ip_rede} · {i.protocolo_rede}{i.envio_automatico ? ' · envio automático' : ''}</p>}
          <div className="stats" style={{ margin: '12px 0', gridTemplateColumns: 'repeat(3,minmax(0,1fr))' }}>
            <div><span>Na fila</span><b className="num">{u.fila}</b></div><div><span>Horas no mês</span><b className="num">{horas(u.h)}</b></div><div><span>Resina no mês</span><b className="num">{br(u.ml, 0)}<small style={{ display: 'inline' }}> ml</small></b></div>
          </div>
          {(i.perfis || []).length > 0 && <><div className="lbl" style={{ marginBottom: 6 }}>Perfis</div>
            <div className="pills" style={{ marginBottom: 10 }}>{i.perfis.map(p => <span key={p.id} className={'chip ' + STATUS_VAL[p.status_validacao][1]}>{p.nome} · {p.resinas?.nome?.replace(/^(Makertech|Kulzer|Done3D) /, '') || 'resina a confirmar'}</span>)}</div></>}
          {(i.regras_montagem || []).length > 0 && <><div className="lbl" style={{ marginBottom: 6 }}>Trabalhos (pasta de entrada)</div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 4, fontSize: 13 }}>{i.regras_montagem.map(r => <li key={r.id} className="row"><span className="sp">{r.tipos_trabalho?.nome}</span><span className="muted">{r.pasta_entrada.split('/')[1]}</span><span className={'chip ' + STATUS_VAL[r.status_validacao][1]}>{STATUS_VAL[r.status_validacao][0]}</span></li>)}</ul></>}
          {i.observacoes && <p className="muted" style={{ fontSize: 12.5, margin: '10px 0 0' }}>{i.observacoes}</p>}
        </article>); })}</div>}
  </>);
}

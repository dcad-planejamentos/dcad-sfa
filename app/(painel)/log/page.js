'use client';
import { useCallback, useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { dt } from '@/lib/fmt';

const ORIG = { painel: ['Painel', 'c-info'], vigia: ['Vigia', 'c-ok'], telegram: ['Telegram', 'c-warn'], sistema: ['Sistema', 'c-mut'] };
const ENT = { plataformas: 'Plataforma', baixas: 'Baixa', perfis: 'Perfil', regras_montagem: 'Regra', versoes_config: 'Versão', resinas: 'Resina',
  precos_resina: 'Preço', catalogo_resinas: 'Catálogo', impressoras: 'Impressora', usuarios: 'Usuário', itens_plataforma: 'Peça', config_sistema: 'Configuração', chaves_vigia: 'Chave do vigia',
  convites: 'Convite de acesso', tipos_trabalho: 'Tipo de trabalho', catalogo_impressoras: 'Catálogo de impressoras', casos: 'Caso', arquivos_stl: 'Arquivo STL' };
const ACAO = { insert: 'Criado', update: 'Alterado', delete: 'Removido' };
const acao = a => ACAO[String(a || '').toLowerCase()] || a;
const POR = 50;

function Mudancas({ antes, depois }) {
  if (!antes || !depois) return <pre className="json">{JSON.stringify(depois || antes, null, 2)}</pre>;
  const ks = Object.keys({ ...antes, ...depois }).filter(k => JSON.stringify(antes[k]) !== JSON.stringify(depois[k]));
  if (!ks.length) return <p className="muted">Sem mudança de campos.</p>;
  return <dl className="kv">{ks.map(k => [<dt key={k + 't'}>{k.replace(/_/g, ' ')}</dt>,
    <dd key={k + 'd'}><span className="muted" style={{ textDecoration: 'line-through' }}>{JSON.stringify(antes[k]) ?? '—'}</span> → <b>{JSON.stringify(depois[k]) ?? '—'}</b></dd>])}</dl>;
}

export default function Log() {
  const sb = supabaseBrowser();
  const [linhas, setLinhas] = useState(null); const [us, setUs] = useState([]); const [pag, setPag] = useState(0); const [fim, setFim] = useState(false);
  const [orig, setOrig] = useState(''); const [quem, setQuem] = useState(''); const [ent, setEnt] = useState(''); const [q, setQ] = useState('');
  const carregar = useCallback(async (p) => {
    let qq = sb.from('log_atividades').select('*').order('quando', { ascending: false }).range(p * POR, p * POR + POR - 1);
    if (orig) qq = qq.eq('origem', orig); if (quem) qq = qq.eq('usuario_id', quem); if (ent) qq = qq.eq('entidade', ent);
    if (q.trim()) qq = qq.or(`acao.ilike.%${q.trim().replace(/[%,()]/g, '')}%,detalhe.ilike.%${q.trim().replace(/[%,()]/g, '')}%`);
    const { data } = await qq;
    setLinhas(prev => p === 0 ? (data || []) : [...(prev || []), ...(data || [])]); setFim((data || []).length < POR);
  }, [sb, orig, quem, ent, q]);
  useEffect(() => { sb.from('usuarios').select('id,nome').then(({ data }) => setUs(data || [])); }, [sb]);
  useEffect(() => { setPag(0); const t = setTimeout(() => carregar(0), 250); return () => clearTimeout(t); }, [carregar]);
  const nome = id => id ? (us.find(u => u.id === id)?.nome || '—') : '—';

  return (<>
    <div className="ph"><div><h1>Log de atividades</h1><p>Registro permanente de tudo o que muda no sistema: quem fez, quando e o que mudou. Não pode ser editado nem apagado.</p></div></div>
    <div className="filters">
      <div className="pills">{[['', 'Todas'], ...Object.entries(ORIG).map(([k, [l]]) => [k, l])].map(([k, l]) => <button key={k} className={'pill' + (orig === k ? ' on' : '')} onClick={() => setOrig(k)}>{l}</button>)}</div>
      <select className="inp" value={quem} onChange={e => setQuem(e.target.value)} aria-label="Usuário"><option value="">Todos os usuários</option>{us.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}</select>
      <select className="inp" value={ent} onChange={e => setEnt(e.target.value)} aria-label="Item"><option value="">Todos os itens</option>{Object.entries(ENT).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
      <input className="inp" placeholder="Buscar ação ou detalhe" value={q} onChange={e => setQ(e.target.value)} aria-label="Buscar" />
    </div>
    {linhas === null ? <div className="empty">Carregando…</div> : linhas.length === 0 ? <div className="empty">Nenhum registro com esses filtros.</div> :
      <section className="box" style={{ padding: 0 }}>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>{linhas.map(l => { const [ol, ok] = ORIG[l.origem] || ['—', 'c-mut']; return (
          <li key={l.id} style={{ borderTop: '1px solid var(--line)', padding: '12px 16px' }}>
            <div className="row" style={{ alignItems: 'flex-start' }}>
              <div className="sp" style={{ minWidth: 0 }}>
                <b style={{ fontSize: 13.5 }}>{acao(l.acao)}</b> <span className="muted" style={{ fontSize: 12.5 }}>· {ENT[l.entidade] || l.entidade || ''}</span>
                {l.detalhe && <div style={{ fontSize: 13, overflowWrap: 'anywhere' }}>{l.detalhe}</div>}
                <div className="muted" style={{ fontSize: 12 }}>{dt(l.quando)} · {l.usuario_id ? nome(l.usuario_id) : ol}</div>
              </div>
              <span className={'chip ' + ok}>{ol}</span>
            </div>
            {(l.antes || l.depois) && <details className="json" style={{ marginTop: 6 }}><summary>Ver o que mudou</summary><Mudancas antes={l.antes} depois={l.depois} /></details>}
          </li>); })}</ul>
      </section>}
    {linhas && !fim && <div className="row" style={{ justifyContent: 'center' }}><button className="btn" onClick={() => { const p = pag + 1; setPag(p); carregar(p); }}>Carregar mais</button></div>}
  </>);
}

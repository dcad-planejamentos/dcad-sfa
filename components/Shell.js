'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createContext, useContext, useState } from 'react';
import { PAPEL } from '@/lib/fmt';

const Ctx = createContext(null);
export const useEu = () => useContext(Ctx);

const P = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };
const I = {
  fila: <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" {...P}><path d="M4 19h16M6 15h12M8 11h8M10 7h4" /></svg>,
  imp: <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" {...P}><rect x="5" y="3" width="14" height="11" rx="2" /><path d="M3 21h18M7 14v4h10v-4M12 6v5" /></svg>,
  perfis: <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" {...P}><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" /><circle cx="16" cy="6" r="2" /><circle cx="10" cy="12" r="2" /><circle cx="18" cy="18" r="2" /></svg>,
  resinas: <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" {...P}><path d="M9 3h6M10 3v5l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3" /><path d="M7 15h10" /></svg>,
  rel: <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" {...P}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>,
  log: <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" {...P}><path d="M8 6h12M8 12h12M8 18h12M4 6h0M4 12h0M4 18h0" /></svg>,
  admin: <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" {...P}><circle cx="9" cy="8" r="3.5" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M17 11l2 2 3-4" /></svg>,
  mais: <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" {...P}><circle cx="5" cy="12" r="1.4" /><circle cx="12" cy="12" r="1.4" /><circle cx="19" cy="12" r="1.4" /></svg>,
  sair: <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" {...P}><path d="M14 4h5v16h-5M10 8l-4 4 4 4M6 12h11" /></svg>
};
const ITENS = [
  { href: '/', label: 'Fila e impressões', curto: 'Fila', i: 'fila' },
  { href: '/impressoras', label: 'Impressoras', curto: 'Impressoras', i: 'imp' },
  { href: '/perfis', label: 'Perfis e regras', curto: 'Perfis', i: 'perfis' },
  { href: '/relatorios', label: 'Relatórios', curto: 'Relatórios', i: 'rel' },
  { href: '/resinas', label: 'Resinas e preços', curto: 'Resinas', i: 'resinas' },
  { href: '/log', label: 'Log de atividades', curto: 'Log', i: 'log' },
  { href: '/admin', label: 'Administração', curto: 'Admin', i: 'admin', so: 'administrador' }
];

export default function Shell({ eu, children }) {
  const path = usePathname();
  const [mais, setMais] = useState(false);
  const itens = ITENS.filter(x => !x.so || x.so === eu.papel);
  const ativo = h => h === '/' ? path === '/' : path.startsWith(h);
  const fixos = itens.slice(0, 4), extras = itens.slice(4);
  return (
    <Ctx.Provider value={eu}>
      <div className="shell">
        <aside className="side" aria-label="Menu principal">
          <div className="brand">D-CAD <span>· SFA</span></div>
          <div className="sub">Fatiamento automático</div>
          {itens.map(x => <Link key={x.href} href={x.href} className={'nav' + (ativo(x.href) ? ' on' : '')}>{I[x.i]}{x.label}</Link>)}
          <div className="eu"><b>{eu.nome}</b><span className="muted">{PAPEL[eu.papel]}</span>
            <div style={{ marginTop: 10 }}><a className="nav" href="/sair" style={{ padding: '8px 0' }}>{I.sair}Sair</a></div></div>
        </aside>
        <header className="mtop"><div className="brand">D-CAD <span>· SFA</span></div><span className="sp" /><span className="muted" style={{ fontSize: 12 }}>{eu.nome.split(' ')[0]}</span></header>
        <main className="main">{children}</main>
        <nav className="tabbar" aria-label="Menu">
          {fixos.map(x => <Link key={x.href} href={x.href} className={ativo(x.href) ? 'on' : ''}>{I[x.i]}{x.curto}</Link>)}
          <button type="button" className={extras.some(x => ativo(x.href)) ? 'on' : ''} onClick={() => setMais(true)} aria-haspopup="dialog">{I.mais}Mais</button>
        </nav>
        {mais && <div className="mais" role="dialog" aria-label="Mais opções" onClick={() => setMais(false)}>
          <nav onClick={e => e.stopPropagation()}>
            {extras.map(x => <Link key={x.href} href={x.href} className={'nav' + (ativo(x.href) ? ' on' : '')} onClick={() => setMais(false)}>{I[x.i]}{x.label}</Link>)}
            <a className="nav" href="/sair">{I.sair}Sair ({eu.nome.split(' ')[0]})</a>
            <button className="btn ghost" onClick={() => setMais(false)} style={{ marginTop: 6 }}>Fechar</button>
          </nav>
        </div>}
      </div>
    </Ctx.Provider>
  );
}

// Formatação e rótulos usados em todo o painel
export const br = (v, d = 1) => (v === null || v === undefined || v === '' || isNaN(+v)) ? '—'
  : (+v).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
export const brl = v => (v === null || v === undefined || isNaN(+v)) ? '—' : 'R$ ' + br(v, 2);
export const dt = s => s ? new Date(s).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';
export const dia = s => s ? new Date(s).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '—';
export const horas = s => { if (!s && s !== 0) return '—'; const h = Math.floor(s / 3600), m = Math.round((s % 3600) / 60); return `${h}h${String(m).padStart(2, '0')}`; };

export const STATUS_PLAT = {
  fatiada: ['Na fila', 'c-info'], enviada: ['Enviada', 'c-info'], imprimindo: ['Imprimindo', 'c-warn'],
  impressa: ['Impressa', 'c-ok'], falhou: ['Falhou', 'c-err'], reprovada: ['Reprovada', 'c-err'], arquivada: ['Arquivada', 'c-mut']
};
export const STATUS_VAL = {
  concluido: ['Concluído', 'c-ok'], em_validacao: ['Em validação', 'c-warn'], pausado: ['Pausado', 'c-err'], pendente: ['Pendente', 'c-mut']
};
export const PAPEL = { administrador: 'Administrador', operador_impressao: 'Operador de impressão', planejamento: 'Planejamento' };
export const CAUSAS = {
  descolou_plataforma: 'Descolou da plataforma', suporte_quebrou: 'Suporte quebrou', peca_deformada: 'Peça deformada',
  resina_tanque: 'Resina ou tanque', outro: 'Outro'
};
export const COMPAT = {
  motor_validado: ['Validada no motor', 'c-ok'], familia_anycubic: ['Família Anycubic', 'c-info'], gravador_goo: ['Gravador .goo pronto', 'c-info'],
  novo_gravador: ['Precisa de gravador', 'c-warn'], criptografado: ['Formato criptografado', 'c-err'], a_confirmar: ['A confirmar', 'c-mut']
};
export const ROTULO_PARAM = {
  camadas_base: 'Camadas de base', exposicao_base_s: 'Exposição da base (s)', exposicao_normal_s: 'Exposição normal (s)', transicao: 'Transição',
  elevacao: 'Elevação', retracao: 'Retração', ajustes: 'Ajustes', pwm: 'PWM', anti_aliasing: 'Anti-aliasing',
  compensacao_encolhimento: 'Compensação de encolhimento', compensacao_tolerancia: 'Compensação de tolerância', espera_s: 'Espera (s)',
  retracao_mm_min: 'Retração (mm/min)', uv_off_s: 'UV desligado (s)', historico: 'Histórico', obs: 'Observação'
};
export function valorParam(v) {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'number') return br(v, Number.isInteger(v) ? 0 : (Math.abs(v) < 10 ? 2 : 1));
  if (typeof v === 'boolean') return v ? 'sim' : 'não';
  if (Array.isArray(v)) return v.map(valorParam).join(' · ');
  if (typeof v === 'object') return Object.entries(v).map(([k, x]) => `${k.replace(/_/g, ' ')}: ${valorParam(x)}`).join(' · ');
  return String(v);
}
export const pode = (papel, acao) => ({
  baixa: ['administrador', 'operador_impressao'], propor: ['administrador', 'operador_impressao'], aprovar: ['operador_impressao'],
  preco: ['administrador', 'operador_impressao'], admin: ['administrador']
}[acao] || []).includes(papel);

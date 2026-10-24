# Painel SFA — D-CAD

Painel do Sistema de Fatiamento Automático: fila de impressão, baixas, impressoras, perfis e regras (com dupla checagem),
resinas e preços, relatórios de consumo e falhas, log de atividades e administração.

- Next.js 15 (App Router) + Supabase (projeto `dcad-sfa`, sa-east-1), publicado na Netlify.
- Variáveis: `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` (chave pública).
- Publicação: cada push na `main` dispara `.github/workflows/publicar.yml`
  (secret `NETLIFY_AUTH_TOKEN`, variável `NETLIFY_SITE_ID`).
- O vigia do PC registra as plataformas pela função `vigia_registrar`, com a chave gerada em Administração.

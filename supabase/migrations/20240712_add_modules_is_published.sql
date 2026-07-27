alter table public.modules
  add column if not exists is_published boolean not null default true;

comment on column public.modules.is_published is
  'Contrôle la visibilité du module dans le catalogue public. false = brouillon, visible uniquement dans /admin.';

create index if not exists idx_modules_is_published on public.modules (is_published);
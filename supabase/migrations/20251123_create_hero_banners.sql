-- Migration: Create hero_banners table for managing home slider
-- Description: Stores banner configuration with multi-language support
-- Author: Admin Dashboard Enhancement
-- Date: 2025-11-23

-- Create hero_banners table
create table if not exists hero_banners (
  id uuid default gen_random_uuid() primary key,
  title_es text not null,
  title_en text,
  title_ca text,
  title_fr text,
  title_de text,
  title_it text,
  description_es text not null,
  description_en text,
  description_ca text,
  description_fr text,
  description_de text,
  description_it text,
  image_url text not null,
  cta_text_es text,
  cta_text_en text,
  cta_text_ca text,
  cta_text_fr text,
  cta_text_de text,
  cta_text_it text,
  cta_link text,
  order_index integer default 0,
  is_active boolean default true,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  created_by uuid references auth.users(id)
);

-- Index for ordering and active banners
create index if not exists idx_hero_banners_active_order 
  on hero_banners (is_active, order_index);

-- RLS Policies
alter table hero_banners enable row level security;

-- Policy: Anyone can read active banners
create policy "Anyone can read active banners"
  on hero_banners for select
  using (is_active = true);

-- Policy: Admins can read all banners
create policy "Admins can read all banners"
  on hero_banners for select
  to authenticated
  using (
    exists (
      select 1 from user_roles
      where user_roles.user_id = auth.uid()
      and user_roles.role = 'admin'
    )
  );

-- Policy: Admins can insert banners
create policy "Admins can insert banners"
  on hero_banners for insert
  to authenticated
  with check (
    exists (
      select 1 from user_roles
      where user_roles.user_id = auth.uid()
      and user_roles.role = 'admin'
    )
  );

-- Policy: Admins can update banners
create policy "Admins can update banners"
  on hero_banners for update
  to authenticated
  using (
    exists (
      select 1 from user_roles
      where user_roles.user_id = auth.uid()
      and user_roles.role = 'admin'
    )
  );

-- Policy: Admins can delete banners
create policy "Admins can delete banners"
  on hero_banners for delete
  to authenticated
  using (
    exists (
      select 1 from user_roles
      where user_roles.user_id = auth.uid()
      and user_roles.role = 'admin'
    )
  );

-- Function to update updated_at timestamp
create or replace function update_hero_banners_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Trigger to auto-update updated_at
create trigger update_hero_banners_updated_at_trigger
  before update on hero_banners
  for each row
  execute function update_hero_banners_updated_at();

-- Create storage bucket for banner images (if not exists)
insert into storage.buckets (id, name, public)
values ('hero-banners', 'hero-banners', true)
on conflict (id) do nothing;

-- Storage policies for banner images
create policy "Anyone can view banner images"
  on storage.objects for select
  using (bucket_id = 'hero-banners');

create policy "Admins can upload banner images"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'hero-banners' 
    and exists (
      select 1 from user_roles
      where user_roles.user_id = auth.uid()
      and user_roles.role = 'admin'
    )
  );

create policy "Admins can update banner images"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'hero-banners'
    and exists (
      select 1 from user_roles
      where user_roles.user_id = auth.uid()
      and user_roles.role = 'admin'
    )
  );

create policy "Admins can delete banner images"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'hero-banners'
    and exists (
      select 1 from user_roles
      where user_roles.user_id = auth.uid()
      and user_roles.role = 'admin'
    )
  );

-- Insert default banners (seed data)
insert into hero_banners (
  title_es, title_en, title_ca, title_fr, title_de, title_it,
  description_es, description_en, description_ca, description_fr, description_de, description_it,
  image_url,
  cta_text_es, cta_text_en, cta_text_ca, cta_text_fr, cta_text_de, cta_text_it,
  cta_link,
  order_index,
  is_active
) values
(
  'Descubre actividades increíbles',
  'Discover amazing activities',
  'Descobreix activitats increïbles',
  'Découvrez des activités incroyables',
  'Entdecken Sie erstaunliche Aktivitäten',
  'Scopri attività incredibili',
  'Conecta con personas que comparten tus intereses',
  'Connect with people who share your interests',
  'Connecta amb persones que comparteixen els teus interessos',
  'Connectez-vous avec des personnes qui partagent vos intérêts',
  'Verbinden Sie sich mit Menschen, die Ihre Interessen teilen',
  'Connettiti con persone che condividono i tuoi interessi',
  'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=1600&h=900&fit=crop',
  'Explorar Actividades',
  'Explore Activities',
  'Explorar Activitats',
  'Explorer les Activités',
  'Aktivitäten Erkunden',
  'Esplora Attività',
  '/actividades',
  1,
  true
),
(
  'Únete a la comunidad',
  'Join the community',
  'Uneix-te a la comunitat',
  'Rejoignez la communauté',
  'Treten Sie der Community bei',
  'Unisciti alla comunità',
  'Miles de personas ya disfrutan de nuevas experiencias',
  'Thousands already enjoy new experiences',
  'Milers de persones ja gaudeixen de noves experiències',
  'Des milliers de personnes profitent déjà de nouvelles expériences',
  'Tausende genießen bereits neue Erlebnisse',
  'Migliaia già godono di nuove esperienze',
  'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1600&h=900&fit=crop',
  'Únete Ahora',
  'Join Now',
  'Uneix-te Ara',
  'Rejoindre Maintenant',
  'Jetzt Beitreten',
  'Unisciti Ora',
  '/auth',
  2,
  true
),
(
  'Crea tus propias actividades',
  'Create your own activities',
  'Crea les teves pròpies activitats',
  'Créez vos propres activités',
  'Erstellen Sie Ihre eigenen Aktivitäten',
  'Crea le tue attività',
  'Organiza eventos y conoce gente nueva',
  'Organize events and meet new people',
  'Organitza esdeveniments i coneix gent nova',
  'Organisez des événements et rencontrez de nouvelles personnes',
  'Organisieren Sie Veranstaltungen und lernen Sie neue Leute kennen',
  'Organizza eventi e conosci nuove persone',
  'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=1600&h=900&fit=crop',
  'Crear Actividad',
  'Create Activity',
  'Crear Activitat',
  'Créer une Activité',
  'Aktivität Erstellen',
  'Crea Attività',
  '/actividades',
  3,
  true
);

-- Comment on table
comment on table hero_banners is 
  'Stores hero slider banners with multi-language support. Active banners are displayed on home page in order_index order.';


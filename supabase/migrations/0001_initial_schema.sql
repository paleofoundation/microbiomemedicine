-- Microbiome Signatures — initial schema
-- All article-like content types live in content_items (distinguished by `type`).
-- Research feeds, posts, pages, and the reference types share the same shape.

create table if not exists public.content_items (
  id                 bigint primary key,        -- original WordPress post ID (globally unique in WP)
  type               text not null,             -- microbe|condition|intervention|definition|supplement|metal|mineral|guide|theory|research-feed|post|page
  slug               text not null,
  title              text not null,
  excerpt_html       text,
  content_html       text,
  status             text not null default 'publish',
  featured_media_id  bigint,
  featured_image_url text,
  seo_title          text,
  seo_description    text,
  wp_link            text,                       -- original permalink (for redirects/reference)
  menu_order         int default 0,
  published_at       timestamptz,
  modified_at        timestamptz,
  meta               jsonb not null default '{}'::jsonb,  -- type-specific: tags, rgbc_type, studies, classes, acf
  search_tsv         tsvector,
  created_at         timestamptz not null default now()
);

create unique index if not exists content_items_type_slug_idx on public.content_items (type, slug);
create index if not exists content_items_type_idx on public.content_items (type);
create index if not exists content_items_search_idx on public.content_items using gin (search_tsv);

-- Full-text search vector (title + excerpt + de-tagged body)
create or replace function public.content_items_tsv_update() returns trigger
language plpgsql as $$
begin
  new.search_tsv :=
    setweight(to_tsvector('english', coalesce(new.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(new.excerpt_html, '')), 'B') ||
    setweight(to_tsvector('english',
      left(regexp_replace(coalesce(new.content_html, ''), '<[^>]+>', ' ', 'g'), 200000)), 'C');
  return new;
end $$;

drop trigger if exists content_items_tsv_trg on public.content_items;
create trigger content_items_tsv_trg
  before insert or update on public.content_items
  for each row execute function public.content_items_tsv_update();

-- Media library (images, PDFs, CSVs). storage_path filled when assets are rehosted.
create table if not exists public.media (
  id           bigint primary key,
  slug         text,
  title        text,
  mime_type    text,
  media_type   text,
  source_url   text,
  storage_path text,
  filename     text,
  filesize     bigint,
  alt_text     text,
  caption_html text,
  width        int,
  height       int,
  meta         jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);

-- Public, read-only site: anon may read published content + media.
alter table public.content_items enable row level security;
alter table public.media enable row level security;

drop policy if exists "public read published content" on public.content_items;
create policy "public read published content"
  on public.content_items for select
  using (status = 'publish');

drop policy if exists "public read media" on public.media;
create policy "public read media"
  on public.media for select
  using (true);

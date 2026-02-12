-- Create table for storing carousel styles/templates
create table if not exists public.carousel_styles (
    id uuid not null default gen_random_uuid(),
    brand_id uuid references public.brands(id) on delete cascade,
    user_id uuid references auth.users(id) on delete cascade,
    name text not null,
    style_config jsonb not null default '{}'::jsonb,
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now(),
    
    constraint carousel_styles_pkey primary key (id)
);

-- Add RLS policies
alter table public.carousel_styles enable row level security;

create policy "Users can view their own styles"
    on public.carousel_styles for select
    using (auth.uid() = user_id);

create policy "Users can insert their own styles"
    on public.carousel_styles for insert
    with check (auth.uid() = user_id);

create policy "Users can update their own styles"
    on public.carousel_styles for update
    using (auth.uid() = user_id);

create policy "Users can delete their own styles"
    on public.carousel_styles for delete
    using (auth.uid() = user_id);

-- Add indexes
create index if not exists carousel_styles_user_id_idx on public.carousel_styles(user_id);
create index if not exists carousel_styles_brand_id_idx on public.carousel_styles(brand_id);

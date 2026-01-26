create table if not exists "EventosDoCerebro" (
  id uuid default gen_random_uuid() primary key,
  titulo text not null,
  categoria text,
  tipo text,
  data date,
  hora time,
  recorrencia text,
  criado_em timestamptz default now(),
  user_id uuid references auth.users(id) on delete cascade
);

alter table "EventosDoCerebro" enable row level security;

create policy "Users can view their own events"
  on "EventosDoCerebro" for select
  using (auth.uid() = user_id);

create policy "Users can insert their own events"
  on "EventosDoCerebro" for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own events"
  on "EventosDoCerebro" for update
  using (auth.uid() = user_id);

create policy "Users can delete their own events"
  on "EventosDoCerebro" for delete
  using (auth.uid() = user_id);

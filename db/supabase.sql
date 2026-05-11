-- Run this in the Supabase SQL editor to set up the schema.
-- No seed data — each user starts with a clean slate.

create table attribute_groups (
    id          serial       primary key,
    user_id     uuid         not null references auth.users(id) default auth.uid(),
    name        varchar(100) not null,
    description text         not null default ''
);

create table attributes (
    id           serial       primary key,
    user_id      uuid         not null references auth.users(id) default auth.uid(),
    att_group_id integer      not null references attribute_groups(id),
    name         varchar(200) not null,
    description  text         not null default ''
);

create table ideas (
    id          serial       primary key,
    user_id     uuid         not null references auth.users(id) default auth.uid(),
    name        varchar(200) not null,
    description text         not null default ''
);

create table attribute_ratings (
    id      serial  primary key,
    user_id uuid    not null references auth.users(id) default auth.uid(),
    idea_id integer not null references ideas(id),
    att_id  integer not null references attributes(id),
    score   integer not null default 5,
    unique (user_id, idea_id, att_id)
);

create table criteria (
    id          serial       primary key,
    user_id     uuid         not null references auth.users(id) default auth.uid(),
    name        varchar(200) not null,
    description text         not null default ''
);

create table criteria_ratings (
    id      serial  primary key,
    user_id uuid    not null references auth.users(id) default auth.uid(),
    idea_id integer not null references ideas(id),
    crit_id integer not null references criteria(id),
    score   integer not null default 5,
    unique (user_id, idea_id, crit_id)
);

create type portfolio_item_type as enum ('product', 'service', 'project');

create table portfolio_items (
    id          serial              primary key,
    user_id     uuid                not null references auth.users(id) default auth.uid(),
    type        portfolio_item_type not null,
    name        varchar(200)        not null,
    description text                not null default ''
);

create table portfolio_item_ideas (
    id                serial  primary key,
    user_id           uuid    not null references auth.users(id) default auth.uid(),
    portfolio_item_id integer not null references portfolio_items(id),
    idea_id           integer not null references ideas(id),
    unique (user_id, portfolio_item_id, idea_id)
);

create table milestones (
    id                serial  primary key,
    user_id           uuid    not null references auth.users(id) default auth.uid(),
    portfolio_item_id integer not null references portfolio_items(id),
    goal              text    not null,
    date              date    not null
);

create table milestone_dependencies (
    id            serial  primary key,
    user_id       uuid    not null references auth.users(id) default auth.uid(),
    milestone_id  integer not null references milestones(id),
    depends_on_id integer not null references milestones(id),
    unique (user_id, milestone_id, depends_on_id)
);

create type task_status as enum ('pending', 'busy', 'done');

create table tasks (
    id            serial      primary key,
    user_id       uuid        not null references auth.users(id) default auth.uid(),
    milestone_id  integer     not null references milestones(id),
    description   text        not null,
    depends_on_id integer              references tasks(id),
    status        task_status not null default 'pending',
    created_at    timestamptz not null default now(),
    started_at    timestamptz,
    completed_at  timestamptz
);

create or replace function tasks_set_timestamps()
returns trigger language plpgsql as $$
begin
    if new.status = 'busy' and old.status <> 'busy' and new.started_at is null then
        new.started_at = now();
    end if;
    if new.status = 'done' and old.status <> 'done' and new.completed_at is null then
        new.completed_at = now();
    end if;
    return new;
end;
$$;

create trigger tasks_timestamps
before update on tasks
for each row execute function tasks_set_timestamps();

-- Row Level Security

alter table attribute_groups      enable row level security;
alter table attributes             enable row level security;
alter table ideas                  enable row level security;
alter table attribute_ratings      enable row level security;
alter table criteria               enable row level security;
alter table criteria_ratings       enable row level security;
alter table portfolio_items        enable row level security;
alter table portfolio_item_ideas   enable row level security;
alter table milestones             enable row level security;
alter table milestone_dependencies enable row level security;
alter table tasks                  enable row level security;

create policy "user_rows" on attribute_groups      for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "user_rows" on attributes             for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "user_rows" on ideas                  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "user_rows" on attribute_ratings      for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "user_rows" on criteria               for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "user_rows" on criteria_ratings       for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "user_rows" on portfolio_items        for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "user_rows" on portfolio_item_ideas   for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "user_rows" on milestones             for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "user_rows" on milestone_dependencies for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "user_rows" on tasks                  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

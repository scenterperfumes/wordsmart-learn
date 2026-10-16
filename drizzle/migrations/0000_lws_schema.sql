
create type public.app_role as enum ('admin','user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "own roles readable" on public.user_roles for select to authenticated using (user_id = auth.uid());

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  subscription_status text not null default 'free_trial' check (subscription_status in ('free_trial','active','expired')),
  subscription_expires_at timestamptz,
  target_exam_date date not null default '2026-11-30',
  device_1_id text, device_1_name text,
  device_2_id text, device_2_name text,
  last_device_reset_at timestamptz,
  word_history jsonb not null default '{}'::jsonb,
  daily_log jsonb not null default '{}'::jsonb,
  last_master_id int not null default 1,
  created_at timestamptz not null default now()
);
grant select on public.profiles to authenticated;
grant update (word_history, daily_log, last_master_id, target_exam_date) on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "own profile read" on public.profiles for select to authenticated using (id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "own profile update" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email) on conflict do nothing;
  insert into public.user_roles (user_id, role) values (new.id, 'user') on conflict do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.has_active_pass(_uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = _uid and subscription_status = 'active' and subscription_expires_at > now())
$$;

create table public.words_vault (
  master_id int primary key,
  word text not null unique check (word = upper(word)),
  pos text, meaning_bn text, meaning_en text, syn text, ant text, sentence text,
  is_free_trial boolean not null default false
);
grant select on public.words_vault to authenticated;
grant all on public.words_vault to service_role;
alter table public.words_vault enable row level security;
create policy "free or paid words" on public.words_vault for select to authenticated
  using (is_free_trial = true or public.has_active_pass(auth.uid()) or public.has_role(auth.uid(),'admin'));

create table public.payment_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  email text,
  plan_months int not null check (plan_months in (1,2,3)),
  amount_bdt int not null,
  wallet text not null check (wallet in ('bKash','Nagad','Rocket','Upay')),
  sender_phone text not null check (sender_phone ~ '^01[0-9]{9}$'),
  trx_id text not null unique,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  check ((plan_months=1 and amount_bdt=49) or (plan_months=2 and amount_bdt=79) or (plan_months=3 and amount_bdt=99))
);
grant select, insert on public.payment_requests to authenticated;
grant all on public.payment_requests to service_role;
alter table public.payment_requests enable row level security;
create policy "own payments read" on public.payment_requests for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "own payments insert" on public.payment_requests for insert to authenticated with check (user_id = auth.uid() and status = 'pending');

-- Device lock
create or replace function public.claim_device(_device_id text, _device_name text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare p public.profiles;
begin
  select * into p from public.profiles where id = auth.uid() for update;
  if p.id is null then raise exception 'no profile'; end if;
  if p.device_1_id = _device_id or p.device_2_id = _device_id then return jsonb_build_object('ok', true); end if;
  if p.device_1_id is null then update public.profiles set device_1_id=_device_id, device_1_name=_device_name where id=p.id; return jsonb_build_object('ok', true); end if;
  if p.device_2_id is null then update public.profiles set device_2_id=_device_id, device_2_name=_device_name where id=p.id; return jsonb_build_object('ok', true); end if;
  return jsonb_build_object('ok', false, 'device_1_name', p.device_1_name, 'device_2_name', p.device_2_name,
    'can_reset', p.last_device_reset_at is null or p.last_device_reset_at < now() - interval '30 days',
    'last_reset', p.last_device_reset_at);
end $$;

create or replace function public.reset_my_devices() returns boolean
language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set device_1_id=null, device_1_name=null, device_2_id=null, device_2_name=null, last_device_reset_at=now()
  where id = auth.uid() and (last_device_reset_at is null or last_device_reset_at < now() - interval '30 days');
  return found;
end $$;

-- Admin RPCs
create or replace function public.admin_review_payment(_id uuid, _approve boolean) returns void
language plpgsql security definer set search_path = public as $$
declare r public.payment_requests;
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'forbidden'; end if;
  select * into r from public.payment_requests where id=_id and status='pending' for update;
  if r.id is null then raise exception 'not pending'; end if;
  update public.payment_requests set status = case when _approve then 'approved' else 'rejected' end where id=_id;
  if _approve then
    update public.profiles set subscription_status='active',
      subscription_expires_at = greatest(coalesce(subscription_expires_at, now()), now()) + make_interval(months => r.plan_months)
    where id = r.user_id;
  end if;
end $$;

create or replace function public.admin_extend(_user uuid, _months int) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'forbidden'; end if;
  update public.profiles set subscription_status='active',
    subscription_expires_at = greatest(coalesce(subscription_expires_at, now()), now()) + make_interval(months => _months)
  where id=_user;
end $$;

create or replace function public.admin_clear_devices(_user uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'forbidden'; end if;
  update public.profiles set device_1_id=null, device_1_name=null, device_2_id=null, device_2_name=null where id=_user;
end $$;

create or replace function public.admin_upsert_words(_words jsonb, _mark_free boolean) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'forbidden'; end if;
  insert into public.words_vault (master_id, word, pos, meaning_bn, meaning_en, syn, ant, sentence, is_free_trial)
  select (e.ord)::int, upper(trim(e.w->>'word')), e.w->>'pos', coalesce(e.w->>'meaningBn', e.w->>'meaning_bn'),
         coalesce(e.w->>'meaningEn', e.w->>'meaning_en'), e.w->>'syn', e.w->>'ant', e.w->>'sentence',
         case when _mark_free then e.ord <= 20 else false end
  from jsonb_array_elements(_words) with ordinality as e(w, ord)
  on conflict (master_id) do update set word=excluded.word, pos=excluded.pos, meaning_bn=excluded.meaning_bn,
    meaning_en=excluded.meaning_en, syn=excluded.syn, ant=excluded.ant, sentence=excluded.sentence,
    is_free_trial = case when _mark_free then excluded.is_free_trial else public.words_vault.is_free_trial end;
  get diagnostics n = row_count;
  return n;
end $$;

revoke execute on function public.claim_device, public.reset_my_devices, public.admin_review_payment, public.admin_extend, public.admin_clear_devices, public.admin_upsert_words from anon, public;
grant execute on function public.claim_device, public.reset_my_devices, public.admin_review_payment, public.admin_extend, public.admin_clear_devices, public.admin_upsert_words to authenticated;

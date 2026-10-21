create extension if not exists pgcrypto with schema extensions;

alter table public.profiles
  add column if not exists security_question text,
  add column if not exists security_answer_hash text;

create table if not exists public.security_reset_attempts (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  attempted_at timestamptz not null default now()
);
create index if not exists security_reset_attempts_email_idx on public.security_reset_attempts (email, attempted_at);

create or replace function public.set_security_answer(_question text, _answer text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if _question is null or btrim(_question) = '' then
    raise exception 'Choose a security question.';
  end if;
  if _answer is null or length(regexp_replace(_answer, '\s+', ' ', 'g')) < 2 then
    raise exception 'Answer is too short.';
  end if;
  update public.profiles
     set security_question = btrim(_question),
         security_answer_hash = encode(extensions.digest(lower(btrim(regexp_replace(_answer, '\s+', ' ', 'g'))) || '::' || auth.uid()::text, 'sha256'), 'hex')
   where id = auth.uid();
end;
$$;

create or replace function public.get_security_question(_email text)
returns text
language sql
security definer
set search_path = public
as $$
  select security_question
    from public.profiles
   where lower(email) = lower(btrim(_email))
     and security_question is not null
   limit 1;
$$;

create or replace function public.reset_password_with_answer(_email text, _answer text, _new_password text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_hash text;
begin
  if _new_password is null or length(_new_password) < 6 then
    raise exception 'Password must be at least 6 characters.';
  end if;
  if (select count(*) from public.security_reset_attempts
       where email = lower(btrim(_email)) and attempted_at > now() - interval '15 minutes') >= 5 then
    raise exception 'Too many attempts. Please wait 15 minutes and try again.';
  end if;
  insert into public.security_reset_attempts(email) values (lower(btrim(_email)));

  select id, security_answer_hash into v_id, v_hash
    from public.profiles
   where lower(email) = lower(btrim(_email))
     and security_answer_hash is not null
   limit 1;
  if v_id is null or v_hash is null then
    return false;
  end if;
  if v_hash <> encode(extensions.digest(lower(btrim(regexp_replace(_answer, '\s+', ' ', 'g'))) || '::' || v_id::text, 'sha256'), 'hex') then
    return false;
  end if;

  update auth.users
     set encrypted_password = extensions.crypt(_new_password, extensions.gen_salt('bf'))
   where id = v_id;
  delete from auth.refresh_tokens where user_id = v_id;
  return true;
end;
$$;

revoke execute on function public.set_security_answer(text, text) from public, anon;
revoke execute on function public.reset_password_with_answer(text, text, text) from public;
grant execute on function public.set_security_answer(text, text) to authenticated;
grant execute on function public.get_security_question(text) to anon, authenticated;
grant execute on function public.reset_password_with_answer(text, text, text) to anon, authenticated;
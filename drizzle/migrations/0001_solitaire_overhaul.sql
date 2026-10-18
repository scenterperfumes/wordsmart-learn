alter table public.profiles add column if not exists custom_daily_target integer, add column if not exists study_seconds integer not null default 0, add column if not exists preferences jsonb not null default '{}', add column if not exists mastered_words jsonb not null default '{}', add column if not exists earned_bonus_month boolean not null default false, add column if not exists trial_quiz_score integer;
grant update(custom_daily_target,study_seconds,preferences) on public.profiles to authenticated;
alter table public.payment_requests add column if not exists base_months integer not null default 1, add column if not exists bonus_months integer not null default 0, add column if not exists total_months integer not null default 1;
update public.payment_requests set base_months=plan_months,total_months=plan_months;
create table public.app_settings (key text primary key, value text not null);
grant select on public.app_settings to authenticated; grant all on public.app_settings to service_role;
alter table public.app_settings enable row level security;
create policy settings_read on public.app_settings for select to authenticated using(true);
create table public.quiz_sessions (id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id), word_ids integer[] not null, trial boolean not null, deadline timestamptz not null, completed boolean not null default false);
grant select on public.quiz_sessions to authenticated; grant all on public.quiz_sessions to service_role;
alter table public.quiz_sessions enable row level security;
create policy own_quiz on public.quiz_sessions for select to authenticated using(user_id=auth.uid());
create or replace function public.ensure_owner_access() returns void language plpgsql security definer set search_path=public as $$ begin
 if exists(select 1 from auth.users where id=auth.uid() and id='2ba372d6-9db1-4ac0-91e3-dba9c5e2c0ea'::uuid and lower(email)='tashrikibnezakir@gmail.com' and email_confirmed_at is not null) then
 insert into public.user_roles(user_id,role) values(auth.uid(),'admin') on conflict do nothing;
 update public.profiles set subscription_status='active',subscription_expires_at='9999-12-31' where id=auth.uid(); end if; end $$;
create or replace function public.has_active_pass(_uid uuid) returns boolean language sql stable security definer set search_path=public as $$ select public.has_role(_uid,'admin') or exists(select 1 from profiles where id=_uid and subscription_status='active' and subscription_expires_at>now()) $$;
create or replace function public.claim_device(_device_id text,_device_name text) returns jsonb language plpgsql security definer set search_path=public as $$ declare p public.profiles; begin
 perform public.ensure_owner_access();
 if public.has_role(auth.uid(),'admin') then return jsonb_build_object('ok',true); end if;
 select * into p from profiles where id=auth.uid() for update;
 if p.id is null then raise exception 'no profile'; end if;
 if length(_device_id)>200 or length(_device_name)>200 then raise exception 'invalid device'; end if;
 if p.device_1_id=_device_id or p.device_2_id=_device_id then return jsonb_build_object('ok',true); end if;
 if p.device_1_id is null then update profiles set device_1_id=_device_id,device_1_name=_device_name where id=p.id; return jsonb_build_object('ok',true); end if;
 if p.device_2_id is null then update profiles set device_2_id=_device_id,device_2_name=_device_name where id=p.id; return jsonb_build_object('ok',true); end if;
 return jsonb_build_object('ok',false,'device_1_name',p.device_1_name,'device_2_name',p.device_2_name,'can_reset',p.last_device_reset_at is null or p.last_device_reset_at<=now()-interval '30 days','last_reset',p.last_device_reset_at); end $$;
create or replace function public.start_timed_quiz(_ids integer[],_trial boolean) returns jsonb language plpgsql security definer set search_path=public as $$ declare sid uuid; until_at timestamptz; begin
 if auth.uid() is null then raise exception 'sign in'; end if;
 if cardinality(_ids)<1 or cardinality(_ids)>50 or cardinality(_ids)<>(select count(distinct x) from unnest(_ids) x) then raise exception 'invalid hand'; end if;
 if _trial and cardinality(_ids)<>20 then raise exception 'trial needs 20 words'; end if;
 if not _trial and not has_active_pass(auth.uid()) then raise exception 'pass required'; end if;
 if exists(select 1 from unnest(_ids) x left join words_vault w on w.master_id=x where w.master_id is null or (_trial and not w.is_free_trial)) then raise exception 'invalid words'; end if;
 until_at=now()+make_interval(secs=>case when _trial then 300 else cardinality(_ids)*30 end);
 insert into quiz_sessions(user_id,word_ids,trial,deadline) values(auth.uid(),_ids,_trial,until_at) returning id into sid;
 return jsonb_build_object('id',sid,'deadline',until_at); end $$;
create or replace function public.finish_timed_quiz(_session uuid,_answers jsonb,_progress jsonb) returns jsonb language plpgsql security definer set search_path=public as $$ declare s public.quiz_sessions; p public.profiles; a jsonb; w public.words_vault; expected text; score integer:=0; mastered jsonb; hist jsonb; seen integer[]:='{}'; right_answer boolean; begin
 select * into s from quiz_sessions where id=_session and user_id=auth.uid() for update;
 if s.id is null or s.completed then raise exception 'quiz already completed'; end if;
 select * into p from profiles where id=auth.uid() for update;
 mastered=p.mastered_words; hist=coalesce(_progress->'word_history',p.word_history);
 if jsonb_typeof(_answers)<>'array' or jsonb_array_length(_answers)>cardinality(s.word_ids) then raise exception 'invalid answers'; end if;
 for a in select value from jsonb_array_elements(_answers) loop
 if not (a->>'id')::integer=any(s.word_ids) or (a->>'id')::integer=any(seen) then raise exception 'invalid answer'; end if;
 seen=array_append(seen,(a->>'id')::integer);
 select * into w from words_vault where master_id=(a->>'id')::integer;
 expected=case a->>'format' when 'definition' then w.meaning_en when 'blank' then w.word when 'bangla' then w.word when 'synonym' then trim(split_part(replace(w.syn,';',','),',',1)) when 'antonym' then trim(split_part(replace(w.ant,';',','),',',1)) else null end;
 right_answer=expected is not null and lower(trim(a->>'answer'))=lower(trim(expected)) and (a->>'answered_at')::timestamptz<=s.deadline and (a->>'answered_at')::timestamptz>=s.deadline-make_interval(secs=>case when s.trial then 300 else cardinality(s.word_ids)*30 end) and now()<=s.deadline+interval '30 seconds';
 if right_answer then score=score+1; mastered=mastered||jsonb_build_object(w.word,current_date::text); end if;
 hist=hist||jsonb_build_object(w.word,jsonb_build_object('status',case when mastered ? w.word then 'learned' else 'weak' end,'updatedDate',current_date::text)); end loop;
 update profiles set mastered_words=mastered,word_history=hist,daily_log=coalesce(_progress->'daily_log',daily_log),last_master_id=coalesce((_progress->>'last_master_id')::integer,last_master_id),study_seconds=greatest(study_seconds,coalesce((_progress->>'study_seconds')::integer,0)),trial_quiz_score=case when s.trial then score else trial_quiz_score end,earned_bonus_month=earned_bonus_month or (s.trial and score>=15) where id=auth.uid();
 update quiz_sessions set completed=true where id=s.id;
 return jsonb_build_object('score',score,'bonus',p.earned_bonus_month or (s.trial and score>=15),'mastered',mastered,'history',hist); end $$;
create or replace function public.payment_package_fields() returns trigger language plpgsql security definer set search_path=public as $$ begin
 new.email=(select email from profiles where id=new.user_id); new.base_months=new.plan_months; new.bonus_months=case when (select earned_bonus_month from profiles where id=new.user_id) then 1 else 0 end; new.total_months=new.base_months+new.bonus_months; return new; end $$;
create trigger payment_package_before_insert before insert on public.payment_requests for each row execute function public.payment_package_fields();
create or replace function public.admin_review_payment(_id uuid,_approve boolean) returns void language plpgsql security definer set search_path=public as $$ declare r public.payment_requests; begin
 if not has_role(auth.uid(),'admin') then raise exception 'forbidden'; end if;
 select * into r from payment_requests where id=_id and status='pending' for update; if r.id is null then raise exception 'not pending'; end if;
 update payment_requests set status=case when _approve then 'approved' else 'rejected' end where id=_id;
 if _approve then update profiles set subscription_status='active',subscription_expires_at=greatest(coalesce(subscription_expires_at,now()),now())+make_interval(months=>r.total_months) where id=r.user_id; end if; end $$;
create or replace function public.admin_set_wallet(_number text) returns void language plpgsql security definer set search_path=public as $$ begin if not has_role(auth.uid(),'admin') then raise exception 'forbidden'; end if; if _number !~ '^01[0-9]{9}$' then raise exception 'invalid phone'; end if; insert into app_settings(key,value) values('wallet_number',_number) on conflict(key) do update set value=excluded.value; end $$;
create or replace function public.admin_set_access(_user uuid,_active boolean) returns void language plpgsql security definer set search_path=public as $$ begin if not has_role(auth.uid(),'admin') then raise exception 'forbidden'; end if; if has_role(_user,'admin') then raise exception 'cannot revoke admin'; end if; update profiles set subscription_status=case when _active then 'active' else 'expired' end,subscription_expires_at=case when _active then greatest(coalesce(subscription_expires_at,now()),now())+interval '1 month' else now() end where id=_user; end $$;
create or replace function public.admin_upsert_words(_words jsonb,_mark_free boolean) returns integer language plpgsql security definer set search_path=public as $$ declare n integer; begin
 if not has_role(auth.uid(),'admin') then raise exception 'forbidden'; end if; if jsonb_array_length(_words)>100 then raise exception 'maximum 100 per batch'; end if;
 insert into words_vault(master_id,word,pos,meaning_bn,meaning_en,syn,ant,sentence,is_free_trial)
 select coalesce((e.w->>'master_id')::integer,e.ord::integer),upper(trim(e.w->>'word')),e.w->>'pos',coalesce(e.w->>'meaningBn',e.w->>'meaning_bn'),coalesce(e.w->>'meaningEn',e.w->>'meaning_en'),e.w->>'syn',e.w->>'ant',e.w->>'sentence',case when _mark_free then coalesce((e.w->>'master_id')::integer,e.ord::integer)<=20 else coalesce((e.w->>'is_free_trial')::boolean,false) end from jsonb_array_elements(_words) with ordinality e(w,ord)
 on conflict(master_id) do update set word=excluded.word,pos=excluded.pos,meaning_bn=excluded.meaning_bn,meaning_en=excluded.meaning_en,syn=excluded.syn,ant=excluded.ant,sentence=excluded.sentence,is_free_trial=excluded.is_free_trial;
 get diagnostics n=row_count; return n; end $$;
revoke all on function public.ensure_owner_access(),public.start_timed_quiz(integer[],boolean),public.finish_timed_quiz(uuid,jsonb,jsonb),public.admin_set_wallet(text),public.admin_set_access(uuid,boolean),public.payment_package_fields() from public,anon;
grant execute on function public.ensure_owner_access(),public.start_timed_quiz(integer[],boolean),public.finish_timed_quiz(uuid,jsonb,jsonb),public.admin_set_wallet(text),public.admin_set_access(uuid,boolean) to authenticated;
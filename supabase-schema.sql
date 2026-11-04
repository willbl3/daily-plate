create table public.daily_plate_journals (
 user_id uuid primary key references auth.users(id) on delete cascade,
 payload jsonb not null check (jsonb_typeof(payload)='object' and octet_length(payload::text)<2097152),
 revision bigint not null default 1 check (revision>0),
 updated_at timestamptz not null default now()
);
alter table public.daily_plate_journals enable row level security;
create policy "Read your own journal" on public.daily_plate_journals for select to authenticated using ((select auth.uid())=user_id);
create policy "Create your own journal" on public.daily_plate_journals for insert to authenticated with check ((select auth.uid())=user_id);
create policy "Update your own journal" on public.daily_plate_journals for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
revoke all on public.daily_plate_journals from anon;
grant select,insert,update on public.daily_plate_journals to authenticated;
create function public.save_daily_plate_journal(expected_revision bigint, journal jsonb)
returns bigint language plpgsql security invoker set search_path='' as $$
declare saved bigint;
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 if jsonb_typeof(journal)<>'object' or journal->>'version'<>'1' or jsonb_typeof(journal->'days')<>'object' or jsonb_typeof(journal->'goals')<>'array' or jsonb_typeof(journal->'custom')<>'array' then raise exception 'Invalid journal'; end if;
 if expected_revision=0 then
  insert into public.daily_plate_journals(user_id,payload,revision) values(auth.uid(),journal,1) on conflict(user_id) do nothing returning revision into saved;
 else
  update public.daily_plate_journals set payload=journal,revision=revision+1,updated_at=now() where user_id=auth.uid() and revision=expected_revision returning revision into saved;
 end if;
 return coalesce(saved,-1);
end; $$;
revoke all on function public.save_daily_plate_journal(bigint,jsonb) from public,anon;
grant execute on function public.save_daily_plate_journal(bigint,jsonb) to authenticated;
create table public.daily_plate_recovery (
 user_id uuid primary key references auth.users(id) on delete cascade,
 username text unique not null,
 code_hash text not null
);
alter table public.daily_plate_recovery enable row level security;
revoke all on public.daily_plate_recovery from anon,authenticated;
create table public.daily_plate_signup_limits (
 bucket text primary key,
 hits integer not null,
 expires_at timestamptz not null
);
alter table public.daily_plate_signup_limits enable row level security;
revoke all on public.daily_plate_signup_limits from anon,authenticated;
create function public.daily_plate_rate_limit(bucket_key text,max_hits integer)
returns boolean language plpgsql security invoker set search_path='' as $$
declare n integer;
begin
 insert into public.daily_plate_signup_limits(bucket,hits,expires_at) values(bucket_key,1,now()+interval '1 hour')
 on conflict(bucket) do update set hits=case when daily_plate_signup_limits.expires_at<now() then 1 else daily_plate_signup_limits.hits+1 end,expires_at=case when daily_plate_signup_limits.expires_at<now() then now()+interval '1 hour' else daily_plate_signup_limits.expires_at end
 returning hits into n;
 delete from public.daily_plate_signup_limits where expires_at<now()-interval '1 day';
 return n<=max_hits;
end; $$;
revoke all on function public.daily_plate_rate_limit(text,integer) from public,anon,authenticated;
grant execute on function public.daily_plate_rate_limit(text,integer) to service_role;

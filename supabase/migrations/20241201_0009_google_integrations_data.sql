-- Google Calendar + Gmail (BYOG) – DATA INSERTION
-- Insert default workspace integration records

-- First ensure workspace_settings exists
insert into public.workspace_settings (org_name, pdf_footer)
values ('Your Company', 'Thank you for your business')
on conflict do nothing;

-- Insert Gmail integration record using a simple query
insert into public.workspace_integrations (workspace_id, provider, kind, client_id, client_secret, redirect_uri)
select 
  (select id from public.workspace_settings limit 1),
  'google',
  'gmail',
  'NOT_CONFIGURED',
  'NOT_CONFIGURED', 
  'NOT_CONFIGURED'
where not exists (
  select 1 from public.workspace_integrations 
  where provider = 'google' and kind = 'gmail'
);

-- Insert Calendar integration record using a simple query
insert into public.workspace_integrations (workspace_id, provider, kind, client_id, client_secret, redirect_uri)
select 
  (select id from public.workspace_settings limit 1),
  'google',
  'calendar',
  'NOT_CONFIGURED',
  'NOT_CONFIGURED',
  'NOT_CONFIGURED'
where not exists (
  select 1 from public.workspace_integrations 
  where provider = 'google' and kind = 'calendar'
);


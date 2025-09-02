-- add invoice_email (nullable), use citext for case-insensitive compare if available
create extension if not exists citext;

alter table public.companies
  add column if not exists invoice_email citext;

-- simple check constraint (optional – loosen if needed)
do $$
begin
  if not exists(
    select 1 from information_schema.constraint_column_usage
    where constraint_name = 'companies_invoice_email_chk'
  ) then
    alter table public.companies
      add constraint companies_invoice_email_chk
      check (
        invoice_email is null
        or invoice_email ~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$'
      );
  end if;
end$$;

comment on column public.companies.invoice_email is 'Email used for sending invoices for this company';

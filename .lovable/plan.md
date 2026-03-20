

## Fix: Update Database Check Constraints for Payload Support

The error occurs because `wire_records` has CHECK constraints that restrict allowed values, and "Payload" / "N/A" aren't included.

### Current constraints blocking Payload:
- `wire_records_department_check`: only allows `Transactions`, `Solutions Hub`, `ASC`
- `wire_records_wf_account_check`: only allows `8022`, `3694`

### Migration

Drop and recreate both constraints to include the new values:

```sql
ALTER TABLE public.wire_records DROP CONSTRAINT wire_records_department_check;
ALTER TABLE public.wire_records ADD CONSTRAINT wire_records_department_check
  CHECK (department = ANY (ARRAY['Transactions','Solutions Hub','ASC','Payload']));

ALTER TABLE public.wire_records DROP CONSTRAINT wire_records_wf_account_check;
ALTER TABLE public.wire_records ADD CONSTRAINT wire_records_wf_account_check
  CHECK (wf_account = ANY (ARRAY['8022','3694','N/A']));
```

No code changes needed — only the database constraints need updating.


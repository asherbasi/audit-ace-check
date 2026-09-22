-- Temporary open access while authentication is disabled
ALTER TABLE public.audits ALTER COLUMN created_by DROP NOT NULL;

GRANT SELECT ON public.stores TO anon;
GRANT SELECT ON public.checklist_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.audits TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.audit_answers TO anon;

DROP POLICY IF EXISTS "anon_open_stores" ON public.stores;
CREATE POLICY "anon_open_stores" ON public.stores FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "anon_open_checklist" ON public.checklist_items;
CREATE POLICY "anon_open_checklist" ON public.checklist_items FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "anon_open_audits" ON public.audits;
CREATE POLICY "anon_open_audits" ON public.audits FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_open_audit_answers" ON public.audit_answers;
CREATE POLICY "anon_open_audit_answers" ON public.audit_answers FOR ALL TO anon USING (true) WITH CHECK (true);
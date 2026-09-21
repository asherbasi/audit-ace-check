CREATE TYPE public.app_role AS ENUM ('admin','store');
CREATE TYPE public.audit_status AS ENUM ('draft','completed');
CREATE TYPE public.answer_value AS ENUM ('yes','no','na');

CREATE TABLE public.stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  region text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stores TO authenticated;
GRANT ALL ON public.stores TO service_role;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section text NOT NULL,
  section_order int NOT NULL DEFAULT 1,
  item_order int NOT NULL DEFAULT 1,
  code text NOT NULL UNIQUE,
  text text NOT NULL,
  weight int NOT NULL,
  hint text
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checklist_items TO authenticated;
GRANT ALL ON public.checklist_items TO service_role;
ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  email text,
  full_name text,
  store_id uuid REFERENCES public.stores(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  period text NOT NULL,
  date date NOT NULL DEFAULT current_date,
  rgm text,
  arm text,
  unit_head text,
  conducted_by text,
  status public.audit_status NOT NULL DEFAULT 'draft',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.audits TO authenticated;
GRANT ALL ON public.audits TO service_role;
ALTER TABLE public.audits ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.audit_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id uuid NOT NULL REFERENCES public.audits(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.checklist_items(id) ON DELETE CASCADE,
  answer public.answer_value NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (audit_id, item_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.audit_answers TO authenticated;
GRANT ALL ON public.audit_answers TO service_role;
ALTER TABLE public.audit_answers ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.current_store_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT store_id FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.can_access_store(_store_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'admin') OR public.current_store_id() = _store_id;
$$;

CREATE POLICY "Everyone signed in can read stores" ON public.stores FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage stores" ON public.stores FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "Everyone signed in can read checklist" ON public.checklist_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage checklist" ON public.checklist_items FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "Read own profile or admin" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "Admins manage profiles" ON public.profiles FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "Read own roles or admin" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Read audits for permitted stores" ON public.audits FOR SELECT TO authenticated USING (public.can_access_store(store_id));
CREATE POLICY "Insert audits for permitted stores" ON public.audits FOR INSERT TO authenticated WITH CHECK (public.can_access_store(store_id));
CREATE POLICY "Update audits for permitted stores" ON public.audits FOR UPDATE TO authenticated USING (public.can_access_store(store_id)) WITH CHECK (public.can_access_store(store_id));
CREATE POLICY "Delete audits for permitted stores" ON public.audits FOR DELETE TO authenticated USING (public.can_access_store(store_id));

CREATE POLICY "Read answers for permitted audits" ON public.audit_answers FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.audits a WHERE a.id = audit_id AND public.can_access_store(a.store_id)));
CREATE POLICY "Write answers for permitted audits" ON public.audit_answers FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.audits a WHERE a.id = audit_id AND public.can_access_store(a.store_id)));
CREATE POLICY "Update answers for permitted audits" ON public.audit_answers FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.audits a WHERE a.id = audit_id AND public.can_access_store(a.store_id))) WITH CHECK (EXISTS (SELECT 1 FROM public.audits a WHERE a.id = audit_id AND public.can_access_store(a.store_id)));
CREATE POLICY "Delete answers for permitted audits" ON public.audit_answers FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.audits a WHERE a.id = audit_id AND public.can_access_store(a.store_id)));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data ->> 'full_name')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'store')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER audits_touch BEFORE UPDATE ON public.audits
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.stores (name, code, region) VALUES
('Store 01','PH01','Region A'),
('Store 02','PH02','Region A'),
('Store 03','PH03','Region A'),
('Store 04','PH04','Region A'),
('Store 05','PH05','Region B'),
('Store 06','PH06','Region B'),
('Store 07','PH07','Region B'),
('Store 08','PH08','Region B'),
('Store 09','PH09','Region C'),
('Store 10','PH10','Region C'),
('Store 11','PH11','Region C'),
('Store 12','PH12','Region C'),
('Store 13','PH13','Region C');

INSERT INTO public.checklist_items (section, section_order, item_order, code, text, weight, hint) VALUES
('General',1,1,'G1','Store opening and closing times adhered to',2,'Check opening checklist and time records'),
('General',1,2,'G2','Store licences and statutory certificates displayed and valid',2,NULL),
('General',1,3,'G3','Overall store cleanliness and condition meets brand standard',4,'Dining area, restrooms, exterior'),
('General',1,4,'G4','Equipment fully functional and maintenance log up to date',3,NULL),
('General',1,5,'G5','Signage, lighting and branding in good condition',2,NULL),
('General',1,6,'G6','Daily operational checklists completed and filed',2,NULL),
('General',1,7,'G7','Health and safety notices and first aid kit in place',2,NULL),
('Sales & Customer',2,1,'S1','Customer service standards observed during visit',3,'Greeting, order accuracy, speed'),
('Sales & Customer',2,2,'S2','Speed of service within target times',2,NULL),
('Sales & Customer',2,3,'S3','Customer complaints logged and resolved',3,NULL),
('Sales & Customer',2,4,'S4','Promotions and current offers correctly displayed',2,NULL),
('Sales & Customer',2,5,'S5','Menu boards accurate and up to date',1,NULL),
('Sales & Customer',2,6,'S6','Customer feedback channel visible and in use',1,NULL),
('Product',3,1,'P1','Dough handling and proofing procedures followed',2,NULL),
('Product',3,2,'P2','Portioning per product spec',2,NULL),
('Product',3,3,'P3','Cook times and oven settings correct',2,NULL),
('Product',3,4,'P4','Hold times observed and product discarded when expired',2,NULL),
('Product',3,5,'P5','Product temperatures within range (hot and cold)',2,'Check temperature log'),
('Product',3,6,'P6','Ingredient labelling and date coding correct',2,NULL),
('Product',3,7,'P7','FIFO stock rotation practised',2,NULL),
('Product',3,8,'P8','Storage areas clean, organised and off the floor',2,NULL),
('Product',3,9,'P9','No expired or damaged stock on hand',2,NULL),
('Product',3,10,'P10','Cleaning schedule for food contact surfaces completed',2,NULL),
('Product',3,11,'P11','Packaging quality and presentation to standard',2,NULL),
('Product',3,12,'P12','Condiments and dispensers stocked and clean',1,NULL),
('People',4,1,'PE1','Staffing levels match the labour schedule',3,NULL),
('People',4,2,'PE2','Team grooming and uniform standards met',2,NULL),
('People',4,3,'PE3','Training records current for all team members',2,NULL),
('People',4,4,'PE4','Shift briefings conducted and documented',2,NULL),
('Physical Security',5,1,'SEC1','CCTV operational with recordings retained',2,NULL),
('Physical Security',5,2,'SEC2','Safe secured and access restricted to authorised staff',2,NULL),
('Physical Security',5,3,'SEC3','Keys and access controls logged',1,NULL),
('Physical Security',5,4,'SEC4','Fire extinguishers serviced and accessible',2,NULL),
('Physical Security',5,5,'SEC5','Emergency exits clear and signposted',1,NULL),
('Physical Security',5,6,'SEC6','Back door kept locked and controlled',1,NULL),
('Physical Security',5,7,'SEC7','Incident register maintained',1,NULL),
('Finance / Cash',6,1,'F1','Float verified and correct at start of shift',1,NULL),
('Finance / Cash',6,2,'F2','Cash drops performed per policy',1,NULL),
('Finance / Cash',6,3,'F3','Till overs and shorts recorded and explained',1,NULL),
('Finance / Cash',6,4,'F4','Daily banking completed and receipts filed',2,NULL),
('Finance / Cash',6,5,'F5','Refunds and voids authorised and documented',1,NULL),
('Finance / Cash',6,6,'F6','Petty cash reconciled with supporting receipts',2,NULL),
('Finance / Cash',6,7,'F7','Sales reports reconciled to POS and bank',2,NULL),
('Finance / Cash',6,8,'F8','Supplier invoices and GRNs matched and filed',2,NULL),
('Finance / Cash',6,9,'F9','Stock count completed and variances investigated',2,NULL);
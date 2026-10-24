"""Execute the approved migration in disposable LOCAL PostgreSQL, never Cloud.

Requires initdb, pg_ctl and psql on PATH. Creates a temporary Unix-socket-only
cluster; every psql call has explicit local connection arguments and a clean
environment. No production credentials, accounts or records are accessed.
"""
import os
import pwd
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CLIENT = '00000000-0000-0000-0000-000000000001'
PROVIDER = '00000000-0000-0000-0000-000000000002'
ADMIN = '00000000-0000-0000-0000-000000000003'
PID = '00000000-0000-0000-0000-000000000010'
RID = '00000000-0000-0000-0000-000000000020'

SETUP = """
CREATE ROLE authenticated; CREATE ROLE anon;
CREATE SCHEMA auth; CREATE SCHEMA private;
CREATE TYPE public.app_role AS ENUM ('client','provider','admin');
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
$$ SELECT nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
CREATE TABLE public.user_roles(user_id uuid, role public.app_role);
CREATE FUNCTION private.has_role(_user_id uuid,_role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS
$$ SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role) $$;
CREATE TABLE public.provider_profiles(
 id uuid PRIMARY KEY, user_id uuid, public_name text, is_verified boolean DEFAULT false,
 rating_average numeric DEFAULT 0, review_count integer DEFAULT 0,
 average_rating numeric GENERATED ALWAYS AS (rating_average) STORED,
 verification_status text DEFAULT 'unverified');
CREATE TABLE public.service_requests(
 id uuid PRIMARY KEY, client_id uuid, provider_id uuid, created_at timestamptz DEFAULT now(),
 status text NOT NULL DEFAULT 'pending',title text,details text,location text,
 preferred_date date,preferred_time text,budget numeric,service_id uuid);
CREATE TABLE public.reviews(id integer PRIMARY KEY,request_id uuid UNIQUE,
 provider_id uuid,client_id uuid,rating integer,is_hidden boolean DEFAULT false);
CREATE FUNCTION private.owns_provider(_id uuid) RETURNS boolean LANGUAGE sql
STABLE SECURITY DEFINER SET search_path=public AS
$$ SELECT EXISTS(SELECT 1 FROM provider_profiles WHERE id=_id AND user_id=auth.uid()) $$;
CREATE FUNCTION private.can_review(_id uuid,_pid uuid) RETURNS boolean LANGUAGE sql
STABLE SECURITY DEFINER SET search_path=public AS
$$ SELECT EXISTS(SELECT 1 FROM service_requests WHERE id=_id AND provider_id=_pid
 AND client_id=auth.uid() AND status='completed') $$;
CREATE FUNCTION private.refresh_provider_rating() RETURNS trigger LANGUAGE plpgsql
SECURITY DEFINER SET search_path=public AS $$
DECLARE pid UUID := COALESCE(NEW.provider_id, OLD.provider_id);
BEGIN
 UPDATE public.provider_profiles p SET
 rating_average=COALESCE((SELECT ROUND(AVG(rating)::numeric,2) FROM public.reviews
 WHERE provider_id=pid AND NOT is_hidden),0),
 review_count=(SELECT COUNT(*) FROM public.reviews WHERE provider_id=pid AND NOT is_hidden)
 WHERE p.id=pid; RETURN NULL;
END $$;
CREATE FUNCTION private.guard_provider_verification() RETURNS trigger LANGUAGE plpgsql
SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF auth.uid() IS NULL OR private.has_role(auth.uid(),'admin'::public.app_role) THEN RETURN NEW; END IF;
 IF TG_OP='INSERT' THEN NEW.verification_status:='unverified';
 ELSIF NEW.verification_status IS DISTINCT FROM OLD.verification_status THEN
 IF NOT(OLD.verification_status IN ('unverified','rejected') AND NEW.verification_status='pending')
 THEN RAISE EXCEPTION 'Only administrators can change verification status'; END IF;
 END IF; RETURN NEW; END $$;
GRANT USAGE ON SCHEMA public,auth,private TO authenticated,anon;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.provider_profiles,public.service_requests,public.reviews TO authenticated;
ALTER TABLE public.provider_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_provider ON public.provider_profiles FOR ALL TO authenticated
 USING(user_id=auth.uid() OR private.has_role(auth.uid(),'admin'))
 WITH CHECK(user_id=auth.uid() OR private.has_role(auth.uid(),'admin'));
CREATE POLICY participant_request ON public.service_requests FOR ALL TO authenticated
 USING(client_id=auth.uid() OR private.owns_provider(provider_id))
 WITH CHECK(client_id=auth.uid() OR private.owns_provider(provider_id));
CREATE POLICY review_read ON public.reviews FOR SELECT TO authenticated USING(client_id=auth.uid());
CREATE POLICY review_insert ON public.reviews FOR INSERT TO authenticated
 WITH CHECK(client_id=auth.uid() AND NOT is_hidden AND private.can_review(request_id,provider_id));
CREATE POLICY review_update ON public.reviews FOR UPDATE TO authenticated
 USING(client_id=auth.uid()) WITH CHECK(client_id=auth.uid());
CREATE POLICY review_delete ON public.reviews FOR DELETE TO authenticated USING(client_id=auth.uid());
"""


class TriggerSafeguardExecutionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        for command in ('initdb', 'pg_ctl', 'psql'):
            if not shutil.which(command):
                raise unittest.SkipTest('Local PostgreSQL tools unavailable')
        cls.folder = Path(tempfile.mkdtemp(prefix='serviconnect-local-pg-'))
        cls.env = {'PATH': os.environ.get('PATH', ''), 'HOME': str(cls.folder), 'LC_ALL': 'C'}
        cls.demote = None
        if os.geteuid() == 0:
            local_users = [user for user in pwd.getpwall() if user.pw_uid != 0]
            if not local_users:
                shutil.rmtree(cls.folder)
                raise unittest.SkipTest('No unprivileged local operating-system user')
            local_user = local_users[0]
            os.chown(cls.folder, local_user.pw_uid, local_user.pw_gid)
            def demote():
                os.setgroups([])
                os.setgid(local_user.pw_gid)
                os.setuid(local_user.pw_uid)
            cls.demote = demote
        cls.data = cls.folder / 'data'
        cls.running = False
        cls.addClassCleanup(cls.cleanup)
        cls.run_command(['initdb', '-D', str(cls.data), '-U', 'postgres', '-A', 'trust', '--no-locale'])
        cls.run_command(['pg_ctl', '-D', str(cls.data), '-l', str(cls.folder / 'server.log'),
                         '-o', f"-k {cls.folder} -p 55439 -c listen_addresses=''", '-w', 'start'])
        cls.running = True
        cls.sql(SETUP)
        migrations = sorted((ROOT / 'drizzle/migrations').glob('*repair_trigger_execution_context.sql'))
        if len(migrations) != 1:
            raise AssertionError('Expected exactly one approved safeguard migration')
        cls.sql(migrations[0].read_text())
        cls.sql("""
CREATE TRIGGER guard_request_update BEFORE UPDATE ON public.service_requests
 FOR EACH ROW EXECUTE FUNCTION private.guard_request_update();
CREATE TRIGGER protect_provider_fields BEFORE INSERT OR UPDATE ON public.provider_profiles
 FOR EACH ROW EXECUTE FUNCTION private.protect_provider_fields();
CREATE TRIGGER guard_provider_verification BEFORE INSERT OR UPDATE ON public.provider_profiles
 FOR EACH ROW EXECUTE FUNCTION private.guard_provider_verification();
CREATE TRIGGER refresh_provider_rating AFTER INSERT OR UPDATE OR DELETE ON public.reviews
 FOR EACH ROW EXECUTE FUNCTION private.refresh_provider_rating();
""")

    @classmethod
    def run_command(cls, args, input_text=None):
        result = subprocess.run(args, input=input_text, text=True, capture_output=True,
                                env=cls.env, preexec_fn=cls.demote, timeout=60)
        if result.returncode:
            raise AssertionError(result.stderr)
        return result.stdout.strip()

    @classmethod
    def sql(cls, text):
        return cls.run_command(['psql', '-X', '-h', str(cls.folder), '-p', '55439',
                                '-U', 'postgres', '-d', 'postgres', '-At',
                                '-v', 'ON_ERROR_STOP=1'], text)

    @classmethod
    def cleanup(cls):
        try:
            if cls.running:
                cls.run_command(['pg_ctl', '-D', str(cls.data), '-m', 'immediate', '-w', 'stop'])
        finally:
            shutil.rmtree(cls.folder)

    def setUp(self):
        self.sql(f"""TRUNCATE reviews,service_requests,provider_profiles,user_roles;
INSERT INTO user_roles VALUES('{ADMIN}','admin');
INSERT INTO provider_profiles(id,user_id,public_name) VALUES('{PID}','{PROVIDER}','Original');
INSERT INTO service_requests(id,client_id,provider_id,title,details,preferred_time,budget)
 VALUES('{RID}','{CLIENT}','{PID}','Original','Original details','10:00',100);
""")

    def actor(self, who, body):
        return f"SET ROLE authenticated; SET request.jwt.claim.sub='{who}';\n{body}\nRESET ROLE;"

    def rejected(self, who, update, message):
        self.sql(self.actor(who, f"""DO $$ BEGIN
 BEGIN {update}; EXCEPTION WHEN raise_exception THEN
 IF SQLERRM <> '{message}' THEN RAISE; END IF; RETURN; END;
 RAISE EXCEPTION 'Expected rejection did not occur'; END $$;"""))

    def test_client_can_cancel_pending_and_accepted(self):
        for status in ('pending', 'accepted'):
            self.sql(f"UPDATE service_requests SET status='{status}';")
            self.sql(self.actor(CLIENT, "UPDATE service_requests SET status='cancelled';"))
            self.assertEqual(self.sql('SELECT status FROM service_requests;'), 'cancelled')

    def test_client_cannot_complete_request_for_review(self):
        self.rejected(CLIENT, "UPDATE service_requests SET status='completed'",
                      'Clients can only cancel pending or accepted requests')
        self.assertEqual(self.sql(f"SET request.jwt.claim.sub='{CLIENT}'; SELECT private.can_review('{RID}','{PID}');"), 'SET\nf')

    def test_provider_transitions_in_order(self):
        for status in ('accepted', 'in_progress', 'completed'):
            self.sql(self.actor(PROVIDER, f"UPDATE service_requests SET status='{status}';"))
            self.assertEqual(self.sql('SELECT status FROM service_requests;'), status)

    def test_provider_can_decline_pending(self):
        self.sql(self.actor(PROVIDER, "UPDATE service_requests SET status='declined';"))
        self.assertEqual(self.sql('SELECT status FROM service_requests;'), 'declined')

    def test_provider_cannot_skip_stages(self):
        for status in ('in_progress', 'completed', 'cancelled'):
            self.rejected(PROVIDER, f"UPDATE service_requests SET status='{status}'", 'Invalid status change')

    def test_closed_requests_reject_edits(self):
        for status in ('declined', 'completed', 'cancelled'):
            self.sql(f"UPDATE service_requests SET status='{status}';")
            self.rejected(CLIENT, "UPDATE service_requests SET title='Changed'", 'This request is closed')
            self.rejected(PROVIDER, "UPDATE service_requests SET title='Changed'", 'This request is closed')

    def test_request_identity_preserved_and_pending_client_edit_allowed(self):
        self.sql(self.actor(CLIENT, f"""UPDATE service_requests SET id='{PID}',provider_id='{RID}',
created_at='2000-01-01',title='Edited';"""))
        self.assertEqual(self.sql('SELECT id,provider_id,title FROM service_requests;'), f'{RID}|{PID}|Edited')
        self.assertEqual(self.sql("SELECT created_at::date <> '2000-01-01'::date FROM service_requests;"), 't')

    def test_provider_and_accepted_client_cannot_edit_request_details(self):
        self.sql(self.actor(PROVIDER, "UPDATE service_requests SET title='Bad',details='Bad',preferred_time='Bad',budget=1;"))
        self.sql("UPDATE service_requests SET status='accepted';")
        self.sql(self.actor(CLIENT, "UPDATE service_requests SET title='Bad',details='Bad',preferred_time='Bad',budget=1;"))
        self.assertEqual(self.sql('SELECT title,details,preferred_time,budget FROM service_requests;'), 'Original|Original details|10:00|100')

    def test_provider_badges_totals_preserved_but_profile_edit_allowed(self):
        self.sql(self.actor(PROVIDER, "UPDATE provider_profiles SET public_name='Edited',is_verified=true,rating_average=5,review_count=99;"))
        self.assertEqual(self.sql('SELECT public_name,is_verified,rating_average,review_count FROM provider_profiles;'), 'Edited|f|0|0')

    def test_provider_insert_initializes_protected_fields(self):
        self.sql(self.actor(PROVIDER, f"INSERT INTO provider_profiles(id,user_id,is_verified,rating_average,review_count) VALUES('{RID}','{PROVIDER}',true,5,99);"))
        self.assertEqual(self.sql(f"SELECT is_verified,rating_average,review_count FROM provider_profiles WHERE id='{RID}';"), 'f|0|0')

    def test_admin_verification_and_provider_submission_preserved(self):
        self.sql(self.actor(PROVIDER, "UPDATE provider_profiles SET verification_status='pending';"))
        self.sql(self.actor(ADMIN, "UPDATE provider_profiles SET verification_status='verified',is_verified=true;"))
        self.assertEqual(self.sql('SELECT verification_status,is_verified FROM provider_profiles;'), 'verified|t')

    def test_provider_cannot_self_verify_status(self):
        self.rejected(PROVIDER, "UPDATE provider_profiles SET verification_status='verified'", 'Only administrators can change verification status')

    def test_nested_rating_refresh_insert_update_delete(self):
        self.sql("UPDATE service_requests SET status='completed';")
        self.sql(self.actor(CLIENT, f"INSERT INTO reviews VALUES(1,'{RID}','{PID}','{CLIENT}',4,false);"))
        self.assertEqual(self.sql('SELECT rating_average,review_count,average_rating FROM provider_profiles;'), '4.00|1|4.00')
        self.sql(self.actor(CLIENT, 'UPDATE reviews SET rating=5;'))
        self.assertEqual(self.sql('SELECT rating_average,review_count FROM provider_profiles;'), '5.00|1')
        self.sql(self.actor(CLIENT, 'DELETE FROM reviews;'))
        self.assertEqual(self.sql('SELECT rating_average,review_count FROM provider_profiles;'), '0|0')


if __name__ == '__main__':
    unittest.main()
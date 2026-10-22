"""Offline regression checks for the narrowly scoped account-status migration."""
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SQL = (ROOT / 'drizzle/migrations/0019_complete_account_status_write_guards.sql').read_text()


class AccountStatusMigrationTests(unittest.TestCase):
    def test_missing_profile_fails_closed(self):
        body = SQL.split('$function$')[1]
        self.assertIn('SELECT EXISTS', body)
        self.assertIn("status = 'active'", body)
        self.assertNotIn('COALESCE', body)

    def test_every_user_write_table_is_guarded(self):
        tables = ['profiles', 'client_profiles', 'provider_profiles', 'provider_services',
                  'portfolio_items', 'provider_availability', 'saved_providers',
                  'service_requests', 'bookings', 'reviews', 'verification_documents',
                  'notifications', 'messages', 'conversations']
        for table in tables:
            with self.subTest(table=table):
                self.assertIn("'" + table + "'", SQL.split('LOOP')[0])
        self.assertIn("ARRAY['INSERT','UPDATE','DELETE']", SQL)
        self.assertIn('AS RESTRICTIVE', SQL)
        self.assertNotRegex(SQL, r'GRANT\s+(ALL|INSERT|UPDATE|DELETE)')

    def test_four_buckets_guard_all_mutations_without_changing_reads(self):
        for command in ['INSERT', 'UPDATE', 'DELETE']:
            policy = re.search(r'CREATE POLICY[^;]+ON storage\.objects[^;]+FOR ' + command + r'[^;]+;', SQL)
            self.assertIsNotNone(policy)
            if policy:
                for bucket in ['avatars', 'portfolio', 'request-attachments', 'verification-documents']:
                    self.assertIn("'" + bucket + "'", policy.group())
                self.assertIn('private.account_is_active()', policy.group())
                self.assertIn('AS RESTRICTIVE', policy.group())
        self.assertNotRegex(SQL, r'FOR SELECT|DROP POLICY|DISABLE ROW LEVEL SECURITY')

    def test_conversation_read_guard_precedes_write_and_preserves_participants(self):
        body = SQL.split('FUNCTION public.mark_conversation_read')[1].split('FUNCTION public.start_conversation')[0]
        self.assertLess(body.index('IF NOT private.account_is_active()'), body.index('UPDATE public.conversations'))
        self.assertIn('auth.uid() IN (client_id, provider_user_id)', body)

    def test_conversation_creation_guard_preserves_relationship(self):
        body = SQL.split('FUNCTION public.start_conversation')[1]
        self.assertLess(body.index('IF NOT private.account_is_active()'), body.index('INSERT INTO public.conversations'))
        self.assertIn('auth.uid() NOT IN (_client_id, prov_user)', body)
        self.assertIn('FROM public.service_requests', body)
        self.assertIn('FROM public.bookings', body)


if __name__ == '__main__':
    unittest.main()
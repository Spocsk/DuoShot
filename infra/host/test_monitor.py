"""Behavior tests: no network, SSH, service mutations, or production data."""
import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch
import contextlib
import io

spec = importlib.util.spec_from_file_location('monitor', Path(__file__).with_name('monitor.py'))
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


class MonitorTest(unittest.TestCase):
    def setUp(self):
        self.data = {'incidents': {}, 'outbox': []}

    def test_three_consecutive_failures_and_recovery(self):
        for now in [0, 60]:
            m.incident(self.data, 'web', 'critique', 'web', now, samples=3)
        self.assertFalse(self.data['outbox'])
        m.incident(self.data, 'web', '', 'web', 90)
        for now in [120, 180, 240]:
            m.incident(self.data, 'web', 'critique', 'web', now, samples=3)
        self.assertEqual(len(self.data['outbox']), 1)
        m.incident(self.data, 'web', 'critique', 'web', 300, samples=3)
        self.assertEqual(len(self.data['outbox']), 1)
        m.incident(self.data, 'web', 'critique', 'web', 3840, samples=3)
        self.assertEqual(len(self.data['outbox']), 2)
        m.incident(self.data, 'web', '', 'web', 3900)
        self.assertIn('RÉTABLI', self.data['outbox'][-1]['text'])
        m.incident(self.data, 'web', '', 'web', 3960)
        self.assertEqual(len(self.data['outbox']), 3)

    def test_memory_must_remain_low_five_minutes(self):
        for now in range(0, 300, 60):
            m.incident(self.data, 'memory', 'critique', 'memory', now, delay=300)
        self.assertFalse(self.data['outbox'])
        m.incident(self.data, 'memory', 'critique', 'memory', 300, delay=300)
        self.assertEqual(len(self.data['outbox']), 1)

    def test_threshold_escalation_immediate(self):
        self.assertEqual([m.threshold(n) for n in [79, 80, 89, 90]], ['', 'attention', 'attention', 'critique'])
        m.incident(self.data, 'disk', m.threshold(80), 'disk', 0)
        m.incident(self.data, 'disk', m.threshold(90), 'disk', 1)
        self.assertEqual(len(self.data['outbox']), 2)

    def test_external_real_maintenance_only(self):
        with patch.object(m, 'http_ok', return_value=False), patch.object(m, 'run', return_value='{"active": true, "seconds": 240}'):
            for now in [0, 60, 120]:
                m.external(self.data, {'api_anon_key': 'test'}, now)
        self.assertFalse(self.data['outbox'])
        with patch.object(m, 'http_ok', return_value=False), patch.object(m, 'run', return_value='{"active": true, "seconds": 301}'):
            m.external(self.data, {'api_anon_key': 'test'}, 180)
        self.assertEqual(len(self.data['outbox']), 1)
        self.assertIn('cinq minutes', self.data['outbox'][0]['text'])

    def test_unreachable_status_never_suppresses_outage(self):
        with patch.object(m, 'http_ok', return_value=False), patch.object(m, 'run', side_effect=OSError):
            for now in [0, 60, 120]:
                m.external(self.data, {'api_anon_key': 'test'}, now)
        self.assertEqual(len(self.data['outbox']), 2)

    def test_delivery_failure_keeps_queue_and_never_logs_token(self):
        m.enqueue(self.data, '[TEST] incident', 0)
        @contextlib.contextmanager
        def fake_state():
            yield self.data
        output = io.StringIO()
        with patch.object(m, 'state', fake_state), patch.object(m.urllib.request, 'urlopen', side_effect=OSError('https://api.telegram.org/botSECRET/sendMessage')), contextlib.redirect_stdout(output):
            m.flush({'bot_token': 'SECRET', 'chat_id': '123'})
        self.assertEqual(len(self.data['outbox']), 1)
        self.assertNotIn('SECRET', output.getvalue())
        with patch.object(m, 'state', fake_state), patch.object(m.urllib.request, 'urlopen', return_value=io.BytesIO(b'{"ok":true}')), contextlib.redirect_stdout(output):
            m.flush({'bot_token': 'SECRET', 'chat_id': '123'})
        self.assertEqual(self.data['outbox'], [])


if __name__ == '__main__':
    unittest.main()

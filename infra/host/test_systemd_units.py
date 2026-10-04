"""The systemd units must find the app containers by compose label, never by a pinned name.

Each ExecStart/ExecStop is unescaped the way systemd does ($$ -> $, \\ -> \\, %i -> instance)
and run against a stub `docker` on PATH, so the shell actually executes as on the VPS.
"""
import os
from pathlib import Path
import re
import shlex
import stat
import subprocess
import tempfile
import unittest

UNITS = Path(__file__).resolve().parent.parent / 'systemd'
BACKUP = Path(__file__).resolve().parent.parent / 'supabase' / 'nightly-backup.sh'
PINNED = re.compile(r'(web|render)-[a-z0-9]{24}')
PROJECT = 'i9qtpe5bpyig86s1aljxr5gv'

# Containers exist only in the production project; any other project (staging) matches nothing.
STUB_DOCKER = """#!/bin/sh
echo "docker $*" >> "$STUB_LOG"
case "$*" in
  "ps -q --filter label=com.docker.compose.project=$LIVE_PROJECT --filter label=com.docker.compose.service=web") printf '%s' "$WEB_IDS" ;;
  "ps -q --filter label=com.docker.compose.project=$LIVE_PROJECT --filter label=com.docker.compose.service=render") printf '%s' "$RENDER_IDS" ;;
  "top "*)
    echo "PID COMMAND"
    # Once signalled, the worker drains for DRAIN_POLLS more `docker top` calls, then is gone.
    if [ -e "$STUB_LOG.killed" ]; then
      polls=$(cat "$STUB_LOG.polls" 2>/dev/null || echo 0); echo $((polls + 1)) > "$STUB_LOG.polls"
      [ "$polls" -ge "${DRAIN_POLLS:-0}" ] && exit 0
    fi
    echo "4242 node scripts/run-render-worker.mjs" ;;
esac
"""
STUB_KILL = """#!/bin/sh
echo "kill $*" >> "$STUB_LOG"
touch "$STUB_LOG.killed"
"""
STUB_SLEEP = """#!/bin/sh
echo "sleep $*" >> "$STUB_LOG"
"""


def unit_environment(unit):
    """Environment= defaults of the unit, as systemd passes them to the command."""
    lines = (UNITS / unit).read_text().splitlines()
    return dict(l.split('=', 1)[1].split('=', 1) for l in lines if l.startswith('Environment='))


def command(unit, key, instance='storage'):
    line = next(l for l in (UNITS / unit).read_text().splitlines() if l.startswith(f'{key}='))
    raw = line.split('=', 1)[1]
    # Every literal dollar must be doubled, or systemd may substitute it as a variable.
    assert '$' not in raw.replace('$$', ''), raw
    # systemd also C-unescapes the line (a doubled backslash becomes one) before splitting it.
    return shlex.split(raw.replace('$$', '$').replace('\\\\', '\\').replace('%i', instance))


class SystemdUnits(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        root = Path(self.tmp.name)
        for name, body in [('docker', STUB_DOCKER), ('kill', STUB_KILL), ('sleep', STUB_SLEEP)]:
            path = root / name
            path.write_text(body)
            path.chmod(path.stat().st_mode | stat.S_IEXEC)
        self.log = root / 'log'
        self.log.touch()
        self.env = {**{k: v for k, v in os.environ.items() if k != 'RENDER_WORKER_MODE'}, 'PATH': f'{root}:{os.environ["PATH"]}', 'STUB_LOG': str(self.log)}

    def tearDown(self):
        self.tmp.cleanup()

    def run_unit(self, unit, key, web='', render='', instance='storage', override=None, extra=None):
        args = command(unit, key, instance)
        env = {**self.env, **unit_environment(unit), 'LIVE_PROJECT': PROJECT, 'WEB_IDS': web, 'RENDER_IDS': render, **(extra or {})}
        if override is not None:
            env['DUOSHOT_COMPOSE_PROJECT'] = override
        result = subprocess.run(args, env=env,
                                capture_output=True, text=True, timeout=10)
        return result, self.log.read_text().splitlines()

    def test_no_unit_or_backup_pins_a_container_name(self):
        for path in [*UNITS.glob('*.service'), BACKUP]:
            self.assertIsNone(PINNED.search(path.read_text()), path.name)

    def test_maintenance_execs_into_the_single_web_container(self):
        result, calls = self.run_unit('duoshot-maintenance@.service', 'ExecStart', web='abc123\n', instance='analytics')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(calls[-1], 'docker exec abc123 node scripts/run-maintenance.mjs analytics')

    def test_maintenance_refuses_zero_or_several_web_containers(self):
        for ids in ['', 'abc123\ndef456\n']:
            self.log.write_text('')
            result, calls = self.run_unit('duoshot-maintenance@.service', 'ExecStart', web=ids)
            self.assertEqual(result.returncode, 1)
            self.assertIn('expected one running web container', result.stderr)
            self.assertFalse(any(call.startswith('docker exec') for call in calls))

    def test_units_default_to_the_production_project_and_allow_an_override_file(self):
        for unit in ['duoshot-maintenance@.service', 'duoshot-render-worker.service', 'duoshot-backup.service']:
            text = (UNITS / unit).read_text()
            self.assertEqual(unit_environment(unit), {'DUOSHOT_COMPOSE_PROJECT': PROJECT}, unit)
            self.assertIn('EnvironmentFile=-/etc/duoshot/compose.env', text, unit)

    def test_another_project_never_matches(self):
        # A staging stack (other project) is invisible: with only its containers, the unit refuses.
        result, calls = self.run_unit('duoshot-maintenance@.service', 'ExecStart', web='abc123\n', override='staging')
        self.assertEqual(result.returncode, 1)
        self.assertFalse(any(call.startswith('docker exec') for call in calls))
        self.assertTrue(all('label=com.docker.compose.project=staging' in call for call in calls if call.startswith('docker ps')))

    def test_render_worker_targets_the_render_service(self):
        result, calls = self.run_unit('duoshot-render-worker.service', 'ExecStart', web='web1\n', render='rnd1\n')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(calls[-1], 'docker exec rnd1 node scripts/run-render-worker.mjs')
        result, _ = self.run_unit('duoshot-render-worker.service', 'ExecStart', web='web1\n', render='')
        self.assertEqual(result.returncode, 1)

    def test_render_worker_mode_override_reaches_the_container(self):
        # RENDER_WORKER_MODE=http in /etc/duoshot/compose.env rolls back without recreating render.
        result, calls = self.run_unit('duoshot-render-worker.service', 'ExecStart', render='rnd1\n', extra={'RENDER_WORKER_MODE': 'http'})
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(calls[-1], 'docker exec -e RENDER_WORKER_MODE=http rnd1 node scripts/run-render-worker.mjs')

    def test_render_worker_stop_leaves_room_for_the_drain(self):
        text = (UNITS / 'duoshot-render-worker.service').read_text()
        timeout = int(re.search(r'^TimeoutStopSec=(\d+)$', text, re.M).group(1))
        # 60 s stop grace + 30 s App Store Connect rollback inside the worker.
        self.assertGreaterEqual(timeout, 100)
        self.assertIn('$$i -lt 110', text)
        self.assertLessEqual(110, timeout)

    def test_render_worker_stop_signals_workers_in_render_and_web(self):
        result, calls = self.run_unit('duoshot-render-worker.service', 'ExecStop', web='web1\n', render='rnd1\n')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn('docker top rnd1 -o pid,args', calls)
        self.assertIn('docker top web1 -o pid,args', calls)
        self.assertEqual([call for call in calls if call.startswith('kill')], ['kill -TERM 4242 4242'])
        # The worker exited at once: no wait.
        self.assertFalse(any(call.startswith('sleep') for call in calls))

    def test_render_worker_stop_waits_for_the_worker_to_drain(self):
        result, calls = self.run_unit('duoshot-render-worker.service', 'ExecStop', web='web1\n', render='rnd1\n', extra={'DRAIN_POLLS': '4'})
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual([call for call in calls if call.startswith('kill')], ['kill -TERM 4242 4242'])
        kill = calls.index('kill -TERM 4242 4242')
        # Polled again after the signal, sleeping while the worker still runs, until it is gone.
        self.assertEqual([call for call in calls[kill:] if call.startswith('sleep')], ['sleep 1', 'sleep 1'])
        self.assertEqual(calls[-1], 'docker top web1 -o pid,args')

    def test_backup_resolves_web_by_label_before_stopping_it(self):
        text = BACKUP.read_text()
        self.assertIn(f'DUOSHOT_COMPOSE_PROJECT:-{PROJECT}', text)
        self.assertIn('label=com.docker.compose.project=$project', text)
        lookup = text.index('label=com.docker.compose.service=web')
        self.assertLess(lookup, text.index('docker stop'))
        self.assertIn('docker start "$web_id"', text)


if __name__ == '__main__':
    unittest.main()

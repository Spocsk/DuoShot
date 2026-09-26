import hashlib
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

SCRIPT = Path(__file__).with_name('receive-backup.py')
BLOB = b'age-encryption.org/v1\nsynthetic-test-only'
DIGEST = hashlib.sha256(BLOB).hexdigest()

class ReceiverTests(unittest.TestCase):
    def test_upload_boundaries_and_rotation(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            def send(name, digest=DIGEST, size=len(BLOB), data=BLOB):
                env = {**os.environ, 'SSH_ORIGINAL_COMMAND': f'store {name} {digest} {size}'}
                return subprocess.run(['python3', str(SCRIPT), folder], env=env, input=data, capture_output=True)
            name = '20260926T190000Z.tar.gz.age'
            self.assertEqual(send(name).returncode, 0)
            self.assertEqual(send(name).returncode, 0)
            self.assertEqual((root / name).read_bytes(), BLOB)
            self.assertNotEqual(send('../../escape').returncode, 0)
            self.assertNotEqual(send('20260926T190001Z.tar.gz.age', digest='0'*64).returncode, 0)
            self.assertNotEqual(send('20260926T190001Z.tar.gz.age', size=5*1024**3+1).returncode, 0)
            self.assertNotEqual(send('20260926T190001Z.tar.gz.age', data=b'plaintext').returncode, 0)
            self.assertEqual(len(list(root.iterdir())), 1)
            for i in range(1, 9):
                self.assertEqual(send(f'20260926T19000{i}Z.tar.gz.age').returncode, 0)
            self.assertEqual(len(list(root.iterdir())), 7)
            self.assertFalse((root / name).exists())

if __name__ == '__main__':
    unittest.main()

import importlib.util
from pathlib import Path
import unittest
spec = importlib.util.spec_from_file_location('update', Path(__file__).with_name('verify-android-update.py'))
update = importlib.util.module_from_spec(spec)
spec.loader.exec_module(update)
class UpdateTest(unittest.TestCase):
    def setUp(self):
        self.old = dict(package='com.yasir.nintendo', version=100, signers=['aaa'])
        self.new = dict(self.old, version=101)
    def test_valid_update(self): update.validate_update(self.old, self.new)
    def test_changed_key_rejected(self):
        with self.assertRaisesRegex(ValueError, 'SIGNING_KEY_MISMATCH'): update.validate_update(self.old, dict(self.new, signers=['bbb']))
    def test_equal_or_lower_version_rejected(self):
        for version in (99, 100):
            with self.assertRaisesRegex(ValueError, 'VERSION_NOT_INCREASING'): update.validate_update(self.old, dict(self.new, version=version))
    def test_changed_package_rejected(self):
        with self.assertRaisesRegex(ValueError, 'Application ID'): update.validate_update(self.old, dict(self.new, package='other.app'))
if __name__ == '__main__': unittest.main()

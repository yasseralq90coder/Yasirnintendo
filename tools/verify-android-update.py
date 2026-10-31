"""Refuse APK publication when a normal, data-preserving update is impossible."""
import argparse
import re
import subprocess


def inspect(apk, apksigner, aapt):
    cert = subprocess.check_output([apksigner, 'verify', '--print-certs', apk], text=True)
    signers = sorted(re.findall(r'Signer #\d+ certificate SHA-256 digest: ([a-fA-F0-9]+)', cert))
    if not signers:
        raise ValueError('APK has no verified signing certificate')
    badging = subprocess.check_output([aapt, 'dump', 'badging', apk], text=True)
    package = re.search(r"package: name='([^']+)' versionCode='(\d+)'", badging)
    if not package:
        raise ValueError('APK package/version could not be read')
    return {'package': package[1], 'version': int(package[2]), 'signers': signers}


def validate_update(previous, candidate):
    if candidate['package'] != 'com.yasir.nintendo' or previous['package'] != candidate['package']:
        raise ValueError('Application ID changed; this is not an update')
    if previous['signers'] != candidate['signers']:
        raise ValueError('SIGNING_KEY_MISMATCH: update would require uninstalling. Publication blocked; keep the installed app and recover its signing key.')
    if candidate['version'] <= previous['version']:
        raise ValueError('VERSION_NOT_INCREASING: increase versionCode before publishing')


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('--previous', required=True)
    p.add_argument('--candidate', required=True)
    p.add_argument('--apksigner', required=True)
    p.add_argument('--aapt', required=True)
    args = p.parse_args()
    validate_update(inspect(args.previous, args.apksigner, args.aapt), inspect(args.candidate, args.apksigner, args.aapt))
    print('Verified: same application ID and signing certificate, increasing versionCode.')

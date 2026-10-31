# Persistent Android signing and safe updates

## Incident
The former workflow published `app-debug.apk` and attempted to cache
`~/.android/debug.keystore`. Builds on 2026-10-29 and 2026-10-31 reported
`Cache not found` and `Path Validation Error ... no cache is being saved`.
The generated signing identity was not retained by that cache. A successful
fresh-install smoke test did not establish upgrade compatibility.

Do not uninstall the user's installed app to resolve this. Export its JSON
backup first and keep the installed version. Its Nintendo credentials are not
included in the JSON backup and may require signing in again after reinstall.

## Required secrets
Configure repository Actions secrets using the **original signing keystore**
if it can be recovered, and its matching values:

- `ANDROID_KEYSTORE_BASE64`: base64 of the private keystore
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

Keep an encrypted offline backup. Do not commit the keystore or print it in
logs. GitHub Actions caches and public workflow artifacts are not secret stores.
The current integration cannot manage repository secrets; an owner must add
these through GitHub Settings → Secrets and variables → Actions.

The release signing configuration is explicit. Missing secrets fail the build
without replacing the existing APK. The publication guard compares the prior
published APK's certificate, package and version with the candidate. It also
runs a real `adb install -r` on an emulator before publication. There is no
uninstall fallback and no automatic key-generation fallback.

## If the original private key is lost
An APK contains the public certificate, not its private signing key. A new key
cannot sign an update compatible with the old certificate. A stable new signing
identity needs a deliberate one-time migration after the user has exported and
verified their backup; the current guard intentionally blocks that transition.
Do not remove that guard or replace the published APK as an incidental repair.

After retrieving a candidate old key, verify it against the APK actually
installed on the user's phone (which might not be the latest published APK).
Two historical builds may have different certificates. Compatibility with the
latest release alone cannot prove compatibility with every older install.

## Checks
`python -m unittest discover -s tools -p test_android_update.py`

The workflow downloads only the previous public APK for comparison. Private
signing material is decoded into an owner-only temporary file and removed even
when the job fails. Public release APKs use `debuggable false`.

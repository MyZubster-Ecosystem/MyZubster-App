# SDK 57 security remediation package

This document records the supported framework path selected after npm audit triage for the Android Beta.

Official Expo documentation maps SDK 57 to React Native 0.86, React 19.2.3 and Node.js 22.13.x. The upgrade must be validated as a framework migration, not applied through `npm audit fix --force` or unsupported transitive overrides.

The remediation package must:

1. move the Expo SDK to 57;
2. align React Native to 0.86 and React to 19.2.3;
3. align Expo modules using `npx expo install --fix`;
4. regenerate the npm lockfile deterministically;
5. run `expo-doctor`;
6. run npm audit and preserve the resulting evidence;
7. run application CI;
8. regenerate Android native files;
9. build a debug APK and record SHA-256;
10. keep public Beta promotion blocked until the upgraded APK also passes real-device smoke testing.

This is intentionally separated from the reproducible Beta build PR so the build pipeline remains reviewable independently of the framework-major migration.

# Android Beta dependency security triage

## Status

The Android Beta APK is reproducibly buildable, but **public promotion remains blocked** by dependency findings observed during the build of PR #100.

## Observed audit result

`npm ci` / `npm audit` reports:

- 39 vulnerabilities total
- 1 critical
- 25 high
- 12 moderate
- 1 low

The workflow now preserves the full npm audit JSON and a critical/high summary as a GitHub Actions artifact.

## Critical finding

The critical entry is `tar <= 7.5.20` (transitive). The audit path shows it affecting the Expo CLI / cache toolchain. The current supported npm remediation points to upgrading the Expo stack rather than a same-major patch.

## High-severity cluster

High entries include Expo CLI/config/prebuild/Metro packages, React Native CLI/Metro packages, `@xmldom/xmldom`, `nanoid`, and related transitive packages.

Important: this is dependency audit evidence. It does **not** by itself prove the generated APK is remotely exploitable. Some entries are build-time/tooling dependencies. They nevertheless block a public Beta promotion until the dependency tree is reconciled and rebuilt.

## Why no `npm audit fix --force`

The audit proposes major-version changes, including an Expo 57 / React Native upgrade path. Applying `npm audit fix --force` would silently cross framework-major compatibility boundaries and is not a bounded low-risk fix.

Likewise, forcing transitive package overrides without validating Expo/React Native compatibility could produce a nominally clean audit while creating an unsupported or broken native build.

## Safe remediation gate

Treat the framework upgrade as a separate package:

1. create a dedicated branch stacked from the buildable Beta branch;
2. upgrade Expo and React Native using the framework-supported compatibility matrix;
3. update the lockfile deterministically;
4. run install + audit;
5. run application CI;
6. regenerate the Android project;
7. build a new APK;
8. record APK SHA-256;
9. install and smoke-test on a physical Android device;
10. only then promote the artifact to the public MyZubster Beta download channel.

## Promotion rule

The current archived APK is `BUILDABLE`, not `PUBLIC_BETA_APPROVED`.

Do not publish it from myzubster.com until the critical/high dependency gate has a verified disposition.

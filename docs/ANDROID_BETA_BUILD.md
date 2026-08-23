# MyZubster Android Beta Build

Status: **BETA BUILD PIPELINE / DEBUG APK / DEVICE QA REQUIRED**

This repository now includes a GitHub Actions path for producing an Android beta test APK without relying on a configured EAS project or storing signing secrets in the repository.

## Why this exists

`app.json` currently contains the placeholder EAS project ID `your-project-id-here`. That means EAS should not be presented as configured production infrastructure yet.

The beta pipeline therefore uses:

```text
npm ci
→ Expo prebuild (Android)
→ Gradle assembleDebug
→ SHA-256
→ GitHub Actions artifact
```

No Expo account token, Android signing key or production credential is required for this debug/test build.

## Workflow

`.github/workflows/android-beta-build.yml`

Artifact name:

`myzubster-android-beta-debug`

Expected contents:

- `app-debug.apk`
- `MYZUBSTER-BETA-SHA256.txt`

Artifact retention is 30 days.

## Verification boundary

A successful workflow means the repository can generate an installable debug APK from the referenced commit.

It does **not** mean:

- Google Play approval;
- production signing;
- stable release readiness;
- successful installation on every Android device;
- privacy/permission review completion;
- backend availability;
- beta acceptance by external users.

## Promotion gate

Before linking a beta APK as a public MyZubster download:

- [ ] workflow completed successfully on the intended commit;
- [ ] artifact downloaded and SHA-256 recorded;
- [ ] APK installed on at least one real supported Android device;
- [ ] launch/login/basic navigation smoke test completed;
- [ ] camera/location permission behaviour checked;
- [ ] backend endpoint compatibility checked;
- [ ] artifact archived in the approved MyZubster distribution location;
- [ ] website labels it clearly as Beta, not Stable;
- [ ] no secret or production signing material is exposed.

## Stable/release builds

Production release signing and store distribution are a separate security boundary and must not be added by committing keystores, passwords or service credentials to GitHub.

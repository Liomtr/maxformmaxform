# PR: liomtr_v1

## Title

fix: restore backend smoke path, recover frontend build, and clean temporary test scripts

## Branch

- Source: `liomtr_v1`
- Target: `main`

## Summary

This PR completes three pieces of work:

1. Restores the backend core survey flow and verifies it against MySQL on port `3309`.
2. Fixes the frontend TypeScript and Vite build blockers so production build succeeds again.
3. Removes temporary test scripts that were only used for one-off validation and were no longer aligned with the current API contract.

## Main Changes

### Backend

- Added and completed `backend/src/models/Survey.js`
- Repaired survey access control and manager-only operations
- Repaired answer access control and export/delete authorization
- Repaired file ownership checks and disabled anonymous image upload
- Updated `initAdmin.js` to match the current `Knex + MySQL` stack
- Added compatibility support for user lookup and survey filtering used by the admin frontend
- Enforced survey settings such as:
  - `endTime`
  - duplicate submission blocking
  - single submission behavior

### Frontend

- Fixed TypeScript contract mismatches across `types`, `api`, and `views`
- Fixed Quill-related component typing/runtime compatibility issues
- Reworked several admin pages into minimal implementations compatible with the current backend
- Fixed `SecurityLanding.vue` template/style truncation
- Restored successful `vue-tsc --noEmit` and `vite build`

### Docs

- Updated:
  - `docs/开发日志-2026-03-22.md`
  - `docs/测试报告-2026-03-22.md`
- Added this PR document:
  - `docs/PR-liomtr_v1.md`

### Repository Cleanup

- Removed temporary scripts:
  - `test-submit-answers.js`
  - `test_8digit_code.js`

## Verification

### Backend smoke test

Verified with:

- `DB_HOST=127.0.0.1`
- `DB_PORT=3309`
- `DB_USER=root`
- `DB_PASSWORD=123456`
- `DB_NAME=survey_system`

Passed:

- `/health`
- register
- login
- create survey
- publish survey
- read published survey by share code
- submit responses
- fetch results
- block public access to draft surveys
- block duplicate submission from same IP

### Frontend build

Executed:

```bash
cmd /c npm run build
```

Passed:

- `vue-tsc --noEmit`
- `vite build`

## Risks / Notes

- Build now passes, but Vite still reports large chunk-size warnings.
- Some admin pages were intentionally simplified to match currently implemented backend capability instead of preserving unsupported placeholder behavior.
- Temporary validation scripts were removed on purpose to avoid future misuse.

## Suggested Review Focus

1. Survey/answer/file authorization rules in backend routes
2. Frontend API/type alignment after the compatibility fixes
3. Simplified admin pages and whether any unsupported placeholder behavior should be restored later
4. Whether chunk splitting should be handled in a follow-up PR

## Suggested Follow-ups

1. Add formal integration tests for survey, answer, and file flows
2. Optimize large frontend chunks
3. Continue cleaning legacy admin/API placeholder surfaces

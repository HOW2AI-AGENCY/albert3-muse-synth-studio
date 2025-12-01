# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Project Audit & Planning:**
  - `docs/audit/AUDIT_REPORT.md`: Comprehensive technical audit report.
  - `docs/audit/SECURITY_SCAN.md`: Report on dependency vulnerability scan.
  - `docs/audit/TEST_COVERAGE_REPORT.md`: Analysis of test suite health and coverage.
  - `docs/audit/UNUSED_FILES_REPORT.md`: Report on unused and "- `docs/DB_MIGRATION_PLAN.md`: Best practices for Supabase database migrations.
- **Development Process:**
  - `.github/pull_request_template.md`: Standardized template for Pull Requests.
  - `.github/pr_checklist.md`: Detailed checklist for authors and reviewers.
  - `CHANGELOG.md`: This changelog file to track project evolution.
- **Testing:**
  - Implemented `TEST_MODE` for E2E tests to run without real authentication.
  - Created `src/contexts/MockAuthContext.tsx` to support `TEST_MODE`.
- **Project Navigation:**
  - `NAVIGATION.md`: A navigation map for the repository.
- **Project Management:**
  - Created sprint plans (`sprint_0.md` to `sprint_4.md`) in `project-management/sprints/`.

### Changed
- `src/App.tsx`: Modified to conditionally use `MockAuthProvider` when `VITE_TEST_MODE` is enabled.

### Fixed
- Addressed potential environment instability by running `npm install` to ensure correct dependency installation before running tests.

### Security
- Confirmed via `npm audit` that the project has 0 known vulnerabilities in its dependencies at the time of the audit.

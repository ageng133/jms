# 📌 Format Kilat (⚡) — Git Commit & Push Workflow Standards

This document establishes the official semantic commit standards and push lifecycle for the Format Kilat repository, conforming to international best practices (Conventional Commits + Gitmoji Specification).

---

## 🧭 1. Push Lifecycle Policy

1. **Push Only When Everything Is Done & Verified:**
   - Never push intermediate broken builds or messy bulk dumps.
   - Run compilation checks (`pnpm exec tsc --noEmit`, `go build`, `pytest`) and E2E verification suites before pushing.
   - Pushes to remote (`origin master` / `main`) must represent verified, operational milestones.

2. **Atomic Commits:**
   - Commit logically grouped changes with clear, accurate messages.
   - Do not bundle unrelated features, database migrations, and bug fixes into a single commit.

3. **Privacy Shield Invariant:**
   - Never commit `.env`, `.env.local`, API keys, or raw tokens.
   - Remote origin URLs must remain clean (tokens must not be left in `.git/config`).

---

## 🏷️ 2. Commit Message Format

Each commit message must strictly follow this structure:

```
<icon> [<type>](<scope>): <concise, descriptive subject in imperative mood>
```

### Official Type & Icon Taxonomy:

| Icon | Type | Description | Example |
| :---: | :--- | :--- | :--- |
| ✨ | `[feature]` | New feature or capability | `✨ [feature](layout): implement draft-to-template autonomous reshaping` |
| 🐛 | `[bug]` | Bug fix, regression resolution | `🐛 [bug](auth): fix token expiration handling in GoogleAuthModal` |
| 🗄️ | `[db]` | Database schema, migrations, ORM | `🗄️ [db](audit): add annotated_pdf_s3_key column to pre_submission_audits` |
| 🛠️ | `[support]` | Tooling, build scripts, configs | `🛠️ [support](docker): add root docker-compose and turnkey deploy.sh` |
| 🎨 | `[ui]` | UI/UX, styling, Apple HIG polish | `🎨 [ui](audit): add dynamic template match badge and reshape blueprint card` |
| 📝 | `[docs]` | Documentation, guides, manuals | `📝 [docs](deployment): document cloud deployment targets for VPS and Railway` |
| 🧪 | `[test]` | Tests, E2E suites, verification | `🧪 [test](e2e): add draft-to-template reshaping test suite` |
| ⚡ | `[perf]` | Performance, latency, memory | `⚡ [perf](ipc): eliminate SerDe tax using Apache Arrow zero-copy memory plane` |
| 🔒 | `[security]`| Security patches, auth guards | `🔒 [security](auth): sanitize git remote credentials and enforce author role` |
| ♻️ | `[refactor]`| Refactoring without behavior change | `♻️ [refactor](api): consolidate API client error handling in api.ts` |

---

## 📋 3. Example Commit History Flow

```
✨ [feature](layout): extract user-uploaded template geometry with PyMuPDF
🐛 [bug](git): unignore frontend/src/lib/ and track api.ts and utils.ts
🗄️ [db](schema): add template_specs jsonb column to pre_submission_audits
🎨 [ui](landing): embed 3D isometric autonomous AI virtual office cutaway
🧪 [test](e2e): verify Google SSO author role assignment invariant
🛠️ [support](deploy): provide single-command deploy.sh for Docker and Native modes
```

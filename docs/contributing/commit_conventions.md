# Commit Conventions & Contribution Rules

**Repository:** Sistema de Registro Metodológico de Métricas Lingüísticas
**Status:** Normative — applies to all contributors and AI development agents

---

## 1. Purpose

This document defines the official commit conventions and architectural documentation practices for this repository. All contributors — human and AI — must follow these rules without exception. Consistent commit history is required for traceability, automated changelog generation, and architectural auditing.

---

## 2. Conventional Commits Standard

This repository follows the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) specification.

### Commit structure

```
type(scope): description
```

- **`type`** — the category of change (see §3).
- **`scope`** — the module or area affected (see §4). Required whenever applicable.
- **`description`** — imperative, present tense, lowercase, no trailing period. Maximum 72 characters.

### Examples

```
feat(auth): add password change endpoint with session invalidation
fix(metrics): reject conditional fields incompatible with metric type
docs(srs): update M1 authentication SRS to remove refresh token
test(mock): add mock contract for M3 metric definition module
refactor(registry): extract metric value validation into service layer
chore(docker): update compose file to use Docker Secrets for JWT key
```

---

## 3. Allowed Commit Types

| Type | Use |
|---|---|
| `feat` | Introduces new functionality visible to the system or API consumer. |
| `fix` | Corrects a defect or inconsistency in existing behavior. |
| `docs` | Changes to documentation only: SRS, ADRs, decision logs, READMEs. |
| `test` | Adds or modifies tests, mock contracts, or validation artifacts. |
| `refactor` | Internal restructuring with no behavior change and no bug fix. |
| `chore` | Maintenance tasks: dependency updates, build configuration, tooling. |
| `perf` | Changes that improve performance without altering external behavior. |
| `ci` | Changes to CI/CD pipelines, workflows, or deployment configuration. |

**Rule:** a single commit must not mix types. If a change spans multiple types, split it into separate commits.

---

## 4. Commit Scopes

The scope identifies the bounded context or technical area affected by the commit.

### Module scopes

| Scope | Area |
|---|---|
| `auth` | Module 1 — Authentication & Access Control |
| `instruments` | Module 2 — Instrument Management |
| `metrics` | Module 3 — Structured Metric Definition |
| `registry` | Module 4 — Anonymized Operational Registry |
| `query` | Module 5 — Internal Query |
| `export` | Module 6 — Structured Export |

### Cross-cutting scopes

| Scope | Area |
|---|---|
| `mock` | Mock server contracts (`mock/responses/`) |
| `srs` | Software Requirements Specification documents |
| `architecture` | ADRs, decision logs, system-level design documents |
| `system` | Changes affecting the full stack (e.g., shared middleware, global config) |
| `docker` | Container, Compose, or Swarm configuration |
| `db` | Database schema, migrations (Alembic) |

Scopes must be singular, lowercase, and represent a single bounded context. Do not combine scopes in one commit — split the commit instead.

---

## 5. Architecture Decision Records (ADR)

Architectural decisions that affect system design, security posture, or module interfaces must be documented as **Architecture Decision Records (ADRs)**.

### Storage location

```
docs/architecture/adr/
```

### Naming convention

```
ADR-NNN-short-title.md
```

Example: `ADR-001-single-token-no-refresh.md`

### Required content

Each ADR must document:

| Section | Content |
|---|---|
| **Problem** | The architectural question or inconsistency being addressed. |
| **Decision** | The option chosen and the exact technical specification. |
| **Reasoning** | Justification grounded in standards, policies, or measured trade-offs — not opinions. |
| **Consequences** | Impact on the system: files to update, new constraints, implementation requirements. |

ADRs are immutable once merged. If a decision is reversed, a new ADR supersedes the previous one — the original is never deleted or modified.

---

## 6. Documentation Conventions

Documentation commits cover SRS files, ADRs, decision logs, and any reference material under `docs/`.

### Commit pattern

```
docs(scope): <action> <artifact>
```

### Examples

```
docs(auth): add SRS for authentication and access control module
docs(metrics): update SRS to reject conditional fields with HTTP 400
docs(srs): resolve token TTL inconsistency across M1 and general SRS
docs(architecture): add security decision log v1.0
docs(architecture): add ADR for unified 401 anti-fingerprinting policy
docs(contributing): add commit conventions and contribution rules
```

Documentation commits must not include source code changes. If a decision requires both a doc update and a code change, use two separate commits.

---

## 7. Test and Mock Conventions

Mock contracts and testing artifacts use the `test` type. Mock contracts are the authoritative simulated API behavior used during development and integration validation — they are normative, not illustrative.

### Commit pattern

```
test(mock): <action> <module or artifact>
```

### Examples

```
test(mock): add mock contract for M1 authentication module v2
test(mock): update M3 mock to enforce required instrument_id parameter
test(mock): fix M4 mock — remove inactive instrument from HTTP 400 causes
test(auth): add integration test cases for password change endpoint
```

Changes to mock contracts that resolve a documented inconsistency must reference the decision that motivated the change in the commit body:

```
test(mock): fix M4 mock — remove inactive instrument from HTTP 400 causes

Resolves IC-05. Instrument inactive is exclusively HTTP 422 per AD-05
and RFC 9110 §15.5.21. Removed duplicate entry from 400 block.
```

---

## 8. Guidelines for AI Development Agents

AI coding agents (Claude Code, GitHub Copilot, etc.) operating in this repository must comply with these conventions as strictly as human contributors.

### Required behavior

- Use the exact `type(scope): description` structure. No exceptions.
- Select the most specific scope available. Never use a broader scope when a module scope applies.
- Write descriptions in imperative present tense: `add`, `fix`, `remove`, `update` — not `added`, `fixes`, `removing`.
- Keep the description line under 72 characters.
- If the change resolves a documented inconsistency or ADR, reference it in the commit body.

### Prohibited

| Pattern | Reason |
|---|---|
| `fix: various fixes` | No scope, no specificity. |
| `update files` | No type, no scope, no meaning. |
| `WIP` | Not a valid commit for this repository. |
| `chore: misc` | Generic; provides no traceability. |
| Mixing types in one commit | Breaks atomicity and changelog integrity. |

### Commit body (when required)

When a commit resolves an architectural decision, a documented inconsistency, or a non-obvious trade-off, include a body:

```
feat(auth): add password_changed_at check to middleware

Implements AD-02. All tokens issued before password_changed_at
are rejected with HTTP 401. Eliminates the need to individually
revoke JTIs on password change. Ref: NIST SP 800-63B §5.1.1.2,
OWASP Session Management Cheat Sheet.
```

---

*Commit Conventions & Contribution Rules · methodology-core · 2026-03-13*

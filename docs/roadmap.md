# TicketSense — Roadmap

## MVP (delivered, this repository)

- Full ticket lifecycle with enforced state machine + controlled reopen.
- Deterministic, keyword/rule-based AI classifier (category, subcategory,
  sentiment, priority, confidence, reasoning) with accept/reject/edit
  review workflow and a clean provider seam for a future real LLM.
- Configurable, ordered assignment rules with four working strategies
  (round robin, least-active, category-based, priority escalation with
  senior-agent/escalation-team routing) and a dry-run preview.
- SLA policies per priority, business-hours-aware (9am-6pm Mon-Fri,
  configurable org timezone) and 24x7 due-date calculation, documented
  reopen clock-reset rule, breach detection sweep.
- Dashboard analytics (KPIs + 6 chart types) computed entirely from stored
  data, filterable by date range/team/agent/category/priority.
- Ticket CRUD, messaging (customer reply / agent reply / internal note),
  full activity timeline, bulk status/assignment actions.
- Knowledge base with publish/unpublish and keyword-overlap suggested
  articles per ticket.
- Role-based access control (4 roles) enforced server-side on every
  protected route, not just hidden in the UI.
- Reports (agent productivity, category bottlenecks, SLA compliance) with
  client-side CSV export and drill-down links into filtered ticket lists.
- Team/category/user administration, audit log.
- Light/dark theme, toasts, confirmation on destructive actions, loading
  /empty/error states on every data view.
- 18 passing automated backend tests covering the scenarios in
  `test-plan-and-traceability.md`.
- Seed script producing ~120 tickets across varied lifecycle stages,
  12 agents, 4 teams, 5 categories, mixed AI-recommendation decisions, and
  SLA-compliant/breached tickets spread over ~60 days.

## Explicitly NOT built in this MVP

- **Automation Studio (visual workflow builder).** The spec's drag-and-drop
  automation canvas is out of scope; assignment rules are configured via a
  simple form instead. No "Automation Studio" nav item exists in the
  shipped app — it is not a placeholder pointing at nothing.
- **Real LLM provider integration.** `server/src/ai/provider.ts` is the
  intended integration point (env-var gated via `AI_PROVIDER` /
  `AI_PROVIDER_API_KEY`), but no actual API call is implemented; it always
  resolves to the deterministic classifier.
- **Frontend automated test suite** (Playwright/Cypress/RTL). Correctness
  was verified via TypeScript strict compilation, a production build, and
  manual smoke testing; no CI UI regression suite exists yet.
- **Duplicate ticket detection**, **optimistic locking for concurrent
  edits**, and **persisted round-robin cursor** (currently in-memory,
  resets on restart) — see the exception-handling matrix in
  `business-rules-and-sla.md` for how each is handled today.

## Phase 2 (near-term)

- Real LLM provider integration behind the existing `ai/provider.ts` seam
  (configurable, with the deterministic engine remaining the zero-cost
  default/fallback).
- Duplicate-ticket detection heuristic (same requester + similar subject
  within a time window) surfaced as a warning at creation time.
- Optimistic locking (a `version` column) on `Ticket` to detect concurrent
  edit conflicts instead of silent last-write-wins.
- Persisted round-robin cursor (on `AssignmentRule` or a dedicated table) so
  fairness survives server restarts and horizontal scaling.
- Frontend E2E test suite (Playwright) covering the four core Gherkin flows
  in `prd-and-user-stories.md`.

## Phase 3 (platform maturity)

- Visual Automation Studio: drag-and-drop condition/action builder that
  compiles down to the same `AssignmentRule` model (and extends it with
  additional trigger types beyond ticket creation).
- Advanced routing: skills-based matching, predictive load balancing,
  working-hours-aware agent availability (not just team membership).
- PostgreSQL migration path: swap the Prisma `datasource` provider,
  reinstate native `enum` types (dropped for SQLite compatibility — see
  `architecture.md` ADR-3), add connection pooling; the Prisma schema and
  migration history make this a mechanical, low-risk change, not a rewrite.
- Customer-facing self-service portal (submit/track tickets directly,
  rather than via internal staff).

## Phase 4 (enterprise)

- SSO / enterprise identity (SAML/OIDC) integration, replacing standalone
  JWT login.
- Multi-tenancy (organization-scoped data isolation).
- Native mobile apps (agent and customer).
- SLA policies with pause/resume on customer-waiting states (the schema
  already has an `SLAInstance.pausedMinutes` field reserved for this; it is
  not yet wired into the due-date calculation in this MVP).

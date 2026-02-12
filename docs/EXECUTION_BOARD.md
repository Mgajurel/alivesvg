# AliveSVG Execution Board (Pivot: Agentic SVG Animation at Design-System Scale)

Last updated: February 8, 2026
Planning horizon: 16 weeks
Operating model: Milestone gates (Go/No-Go), weekly demos, KPI-driven releases

## 1) North-Star and Gate KPIs

North-star: Teams can upload a large SVG icon set, get high-quality first-pass animations, refine quickly, and export production-ready React assets.

Launch gate KPIs:
- First-pass acceptance rate (no manual edits required): `>= 60%` on canonical benchmark set.
- Time-to-first-export (single icon): `<= 2 minutes`.
- Time-to-batch-preview (500 icons): `<= 20 minutes`.
- Batch job success rate: `>= 99%` (with retries).
- Export correctness pass rate (CI validator): `100%`.
- P95 Studio interaction latency: `<= 200ms` for preview updates.

## 2) Milestone Board

## M0: Product Spec Lock + Benchmark Harness (Week 1)
Owner: Product Lead
Support owners: Tech Lead, Design Lead, QA Lead

Tasks:
- Freeze v1 scope and non-goals for pivot.
- Define canonical benchmark icon set (200 icons across categories).
- Define animation quality rubric (subtlety, clarity, semantic fit, loop behavior).
- Establish analytics schema and KPI dashboard spec.

Acceptance tests:
- Signed-off spec doc with requirements, non-goals, and KPI targets.
- Benchmark dataset checked into internal storage with version tag.
- Review rubric documented with pass/fail examples.
- Weekly KPI report template approved.

Go/No-Go gate:
- No engineering starts M1 without spec + benchmark lock.

## M1: Ingestion and Data Foundation (Weeks 2-3)
Owner: Backend Lead
Support owners: DevOps, Security, QA

Tasks:
- Add DB schema for icon sets, icons, versions, jobs, and job_items.
- Implement single SVG upload API and ZIP upload API.
- Add storage structure for source files, previews, and exports.
- Add hash-based dedupe and idempotent upload processing.
- Harden SVG sanitization and validation pipeline.

Acceptance tests:
- Upload one SVG and retrieve normalized artifact metadata.
- Upload ZIP with 500 valid SVGs and create one batch job with 500 job_items.
- Duplicate uploads collapse to same hash ID.
- Invalid/malicious payloads are rejected and logged safely.
- API idempotency test passes for repeated identical requests.

Go/No-Go gate:
- M2 starts only if ZIP ingestion and schema are stable in staging.

## M2: Animation Engine V2 (Deterministic Baseline) (Weeks 4-5)
Owner: Frontend Lead
Support owners: Animation Engineer, QA

Tasks:
- Expand motion primitives (timing, stagger, amplitude, easing, transform origin).
- Implement deterministic part-grouping heuristics.
- Add quality scoring function for candidate ranking (non-AI baseline).
- Improve Studio preview performance and render stability.
- Add versioned animation payload format.

Current implementation progress (this repo):
- Deterministic motion planner added in `lib/studioMotionPlanner.ts`.
- Planner auto-suggests preset/trigger/loop and target parts on Studio upload.
- Studio UI now surfaces plan rationale/confidence in the workspace panel.
- Ranked deterministic variants API added at `POST /api/studio/analyze` and surfaced in Studio with one-click apply.
- Chosen deterministic variants are now persisted as new active `icon_versions` for auditable history.
- Version timeline + rollback (activate older version) is now available in Studio and API.

Acceptance tests:
- 200 benchmark icons produce valid animation payloads with no runtime errors.
- Visual regression suite passes against approved snapshots.
- P95 preview update latency <= 200ms for single-icon edits.
- Deterministic outputs are stable across repeated runs.

Go/No-Go gate:
- M3 starts only if baseline engine quality score meets minimum threshold.

## M3: Agentic Generation Pipeline (Weeks 6-8)
Owner: AI Lead
Support owners: Backend Lead, Frontend Lead, QA

Tasks:
- Add model integration with strict JSON schema outputs.
- Implement icon-intent classification and part-level motion planning.
- Generate 3 ranked animation candidates per icon.
- Add fallback path to deterministic engine when confidence is low.
- Add prompt/version tracking, latency tracking, and cost tracking.

Current implementation progress (this repo):
- Agentic planner added at `lib/studioAgenticPlanner.ts` with strict JSON schema output contract.
- `POST /api/studio/analyze` now routes through agentic engine with deterministic fallback.
- Analyze response includes `engine/model/promptVersion/plannerVersion/latency/tokenUsage/classification/fallbackReason`.
- Analysis telemetry persisted in `studio_analysis_events`.
- Studio UI displays engine/model/latency/token/cost + fallback signals, and persisted `icon_versions` carry analysis metadata.

Acceptance tests:
- Structured output contract tests pass (no schema drift).
- Failure-mode tests pass (timeouts, malformed model outputs, empty responses).
- Candidate ranking quality beats deterministic baseline on benchmark set.
- First-pass acceptance rate >= 60% on benchmark set.
- P95 AI generation latency within agreed SLO.

Go/No-Go gate:
- M4 starts only when acceptance KPI and reliability tests pass.

## M4: Batch UX and Workflow Controls (Weeks 9-11)
Owner: Frontend Lead
Support owners: Product Designer, Backend Lead, QA

Tasks:
- Build batch dashboard: queue, progress, status, retries, failures.
- Add bulk actions: accept, reject, regenerate, apply style pack.
- Add side-by-side compare (Original vs AI v1 vs Edited).
- Add history/versioning for icon-level edits.
- Add keyboard-first editing actions for power users.

Current implementation progress (this repo):
- Batch Jobs page supports inspect/retry/process flows with live polling.
- New set-level bulk actions from Batch UI:
  - bulk accept/reject active versions
  - bulk deterministic regenerate
  - bulk style-pack apply (preset/trigger/loop)
- Backend endpoints added:
  - `POST /api/studio/icon-sets/:iconSetId/bulk-evaluate`
  - `POST /api/studio/icon-sets/:iconSetId/bulk-regenerate`
  - `POST /api/studio/icon-sets/:iconSetId/bulk-apply-style`

Acceptance tests:
- End-to-end: upload ZIP(500) -> generate -> review -> bulk accept -> export.
- Retry flows recover from injected worker failures.
- Partial failure handling exposes actionable errors per icon.
- Keyboard accessibility test pass for core edit/review actions.
- Session state survives refresh and reconnect.

Go/No-Go gate:
- M5 starts only if batch workflow works end-to-end in staging.

## M5: Export, Migration, and Competitive Parity+ (Weeks 12-14)
Owner: Developer Experience Lead
Support owners: Frontend Lead, Backend Lead, QA

Tasks:
- Implement batch export ZIP (React components, CSS, metadata manifest).
- Add deterministic naming and folder conventions for design systems.
- Build migration helpers for existing SVGator/Lottie/Rive users.
- Add "Open in Studio" remix path from library items.
- Build parity checklist and migration landing assets.

Current implementation progress (this repo):
- Export bundle API added: `POST /api/studio/icon-sets/:iconSetId/export`.
- Export produces ZIP with `src/icons/*.tsx`, `src/index.ts`, `manifest.json`, and README.
- Active version payload is used for each exported icon.
- Batch Jobs UI now exposes one-click `Export ZIP` for completed sets.

Acceptance tests:
- Export validator passes on 100% of benchmark set outputs.
- Imported customer sample set compiles in Next.js with zero manual path fixes.
- Migration walkthrough can be completed in <= 15 minutes.
- Competitive parity checks pass for agreed must-have features.

Go/No-Go gate:
- M6 starts only with verified migration flow and clean export QA.

## M6: Monetization, Reliability, and Launch Readiness (Weeks 15-16)
Owner: Product Lead
Support owners: Growth Lead, Backend Lead, DevOps, QA

Tasks:
- Add metering for AI generations and batch jobs by plan tier.
- Finalize paywall rules for free/starter/lifetime/team tiers.
- Add operational dashboards, alerts, and incident playbooks.
- Run launch trial with pilot users and collect conversion evidence.
- Finalize pricing and positioning copy (Parity + Plus narrative).

Current implementation progress (this repo):
- Metering events table added: `studio_metering_events`.
- Metering writes added for analyze runs (`ai_generation` / `deterministic_generation`), ZIP ingest jobs, and export bundles.
- `/api/user/plan` now returns 30-day usage snapshot (`usage30d`) for Studio metering visibility.

Acceptance tests:
- Entitlement tests pass for all plan/tier transitions.
- Stripe webhook idempotency and reconciliation tests pass.
- SLO dashboard and alert routing validated in staging drills.
- Pilot cohort achieves target activation and export completion rates.
- Launch checklist signed by Product, Eng, QA, and Growth.

Go/No-Go gate:
- Public launch only after full sign-off and pilot metrics within range.

## 3) Owner-Level Task Breakdown

## Product Lead
- Owns scope lock, milestone gating, KPI governance, and launch readiness.
- Runs weekly decision review and de-scopes low-impact work.
- Owns competitor narrative: "Parity + Plus" messaging.

## Tech Lead
- Owns architecture, risk register, and cross-team dependency resolution.
- Enforces API contracts, versioning, and change control.
- Owns Go/No-Go technical recommendations per milestone.

## Backend Lead
- Owns ingestion APIs, job system, schema, storage, and idempotency.
- Owns usage metering, entitlement checks, and batch export backend.
- Ensures data integrity and rollback-safe migration strategy.

## Frontend Lead
- Owns Studio UX, batch dashboard, compare workflows, and editor performance.
- Owns export UI integration and migration UX.
- Owns accessibility and interaction reliability in production.

## AI Lead
- Owns prompt contracts, model routing, ranking, and fallback logic.
- Owns quality benchmarks, evaluation harness, and acceptance targets.
- Owns latency/cost optimization strategy and guardrails.

## QA Lead
- Owns full test matrix (unit, integration, e2e, visual, performance).
- Owns benchmark validation and release gating evidence.
- Owns regression prevention policy and defect triage.

## DevOps/SRE
- Owns queue/worker deployment, observability, alerting, and SLO enforcement.
- Owns incident response runbooks and reliability drills.
- Owns staging-prod parity and rollback automation.

## Security Lead
- Owns SVG sanitization policy, upload hardening, and abuse controls.
- Owns secrets management and compliance checks for AI and billing flows.
- Owns periodic security test reviews and sign-off.

## Growth/Marketing Lead
- Owns migration funnel, conversion messaging, and competitor comparison pages.
- Owns pilot recruitment and launch campaign sequencing.
- Owns activation and conversion experiment design.

## 4) Competitor Parity+ Scorecard (Must Pass Before Public Launch)

Score each item as `Not started / Partial / Passed`.

Parity requirements:
- Single-SVG upload and animation editing (SVGator parity).
- Trigger/loop controls and customization depth (Lordicon/loading.io parity).
- Reliable exports consumable by frontend apps (Lottie/Rive workflow parity).
- Library-to-editor remix flow (icon library parity).

Plus requirements (moat):
- ZIP upload for large icon sets (500+).
- 3-candidate agentic generation with ranking.
- Bulk review and bulk operations.
- Deterministic, CI-friendly design-system export bundle.
- First-pass acceptance KPI tracking and improvement loop.

## 5) Test Strategy by Layer

Unit tests:
- SVG parsing/sanitization
- animation payload generators
- ranking logic
- entitlement checks

Integration tests:
- upload -> job creation -> processing -> persistence
- webhook + billing reconciliation
- export packaging and manifest correctness

End-to-end tests:
- single icon flow
- 500 icon batch flow
- regenerate/retry/failure recovery
- plan limit and upgrade flows

Non-functional tests:
- performance (P95/P99 latency)
- load tests for concurrent batches
- security tests for malicious SVG inputs
- visual regression for canonical icon set

## 6) Weekly Operating Cadence

- Monday: milestone planning + risk review.
- Wednesday: benchmark delta review (quality/latency/cost).
- Friday: demo + gate check against acceptance tests.
- End of each milestone: Go/No-Go decision with documented evidence.

## 7) Immediate Next 7-Day Sprint (Start Now)

Sprint owner: Tech Lead

Tasks:
- Finalize M0 scope lock and KPI definitions.
- Create benchmark icon set and quality rubric.
- Draft Supabase migration for icon_sets/icons/jobs schema.
- Create API contracts for `/api/studio/upload`, `/api/studio/upload-zip`, `/api/studio/jobs/:id`.
- Build initial test harness scaffold (unit + integration + e2e placeholders).

Acceptance tests:
- M0 sign-off document approved.
- Migration reviewed and ready for apply.
- API contracts reviewed and frozen for M1.
- CI pipeline can run empty test suites and report by category.

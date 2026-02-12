# Studio Pipeline API (M1)

This document describes the initial upload and job APIs for the Studio ingestion pipeline.

Base URL (local): `http://localhost:3000`
Auth: Clerk session cookie (authenticated user required)

## 1) Upload Single SVG

Endpoint: `POST /api/studio/upload`

Form fields:
- `file` (required): SVG file
- `setName` (optional): icon set display name
- `iconName` (optional): icon display name

Behavior:
- Validates SVG markup.
- Deduplicates by `(user_id, source_hash, source_type='single')`.
- Creates:
  - `icon_sets` row
  - `icons` row
  - `icon_versions` initial row (`version_number=1`, `source='system'`)

Sample:

```bash
curl -X POST http://localhost:3000/api/studio/upload \
  -H "Cookie: __session=YOUR_SESSION_COOKIE" \
  -F "file=@./sample.svg" \
  -F "setName=Dashboard Icons"
```

## 2) Upload ZIP (SVG batch ingest)

Endpoint: `POST /api/studio/upload-zip`

Form fields:
- `file` (required): ZIP file
- `setName` (optional): icon set display name
- `idempotencyKey` (optional): key for safe retries

Headers (alternative):
- `Idempotency-Key` (optional): same as form field

Behavior:
- Validates ZIP type and size.
- Deduplicates set by `(user_id, source_hash, source_type='zip')`.
- Stores ZIP source in private storage bucket (`studio-uploads` by default).
- Creates `studio_jobs` row (`job_type='zip_ingest'`, `status='pending'`).
- Returns `202` with queued `job.id`.
- Processes ZIP contents:
  - extracts `.svg` entries
  - validates each file
  - inserts `icons` and `icon_versions`
  - writes per-file results to `studio_job_items`
  - updates `icon_sets` and `studio_jobs` status + ingest summary

Use `POST /api/studio/jobs/process` to claim and execute queued jobs.

Sample:

```bash
curl -X POST http://localhost:3000/api/studio/upload-zip \
  -H "Cookie: __session=YOUR_SESSION_COOKIE" \
  -H "Idempotency-Key: ingest-20260208-001" \
  -F "file=@./icons.zip" \
  -F "setName=Product Icons"
```

## 3) Get Job Status

Endpoint: `GET /api/studio/jobs/:id`

Behavior:
- Returns user-scoped job status.
- Includes icon set data and per-item status summary.
- Supports optional item filters/pagination:
  - `limit` (max 200)
  - `offset`
  - `status` (`pending|processing|completed|failed|canceled`)

Sample:

```bash
curl "http://localhost:3000/api/studio/jobs/<job-id>?status=failed&limit=25&offset=0" \
  -H "Cookie: __session=YOUR_SESSION_COOKIE"
```

## 4) List Recent Jobs

Endpoint: `GET /api/studio/jobs?limit=10&offset=0&status=processing&jobType=zip_ingest`

Behavior:
- Returns user-scoped recent jobs.
- Includes related icon set name/status for each job.
- Supports optional filters:
  - `limit` (max 50)
  - `offset`
  - `status` (`pending|processing|completed|failed|canceled`)
  - `jobType` (`zip_ingest|animation_generate|export_bundle`)

Sample:

```bash
curl "http://localhost:3000/api/studio/jobs?limit=20&offset=0&status=processing&jobType=zip_ingest" \
  -H "Cookie: __session=YOUR_SESSION_COOKIE"
```

## 5) Process Queued ZIP Job

Endpoint: `POST /api/studio/jobs/process`

Behavior:
- Claims a queued `zip_ingest` job (`status=pending`) for current user.
- Downloads ZIP source from storage and runs ingestion.
- If `jobId` is omitted, processes oldest pending ZIP job.

Body:
- `jobId` (optional): specific queued job id.

Sample:

```bash
curl -X POST "http://localhost:3000/api/studio/jobs/process" \
  -H "Content-Type: application/json" \
  -H "Cookie: __session=YOUR_SESSION_COOKIE" \
  -d '{"jobId":"<job-id>"}'
```

## 6) Retry ZIP Job

Endpoint: `POST /api/studio/jobs/:id/retry`

Behavior:
- For terminal `zip_ingest` jobs (`failed|completed|canceled`), resets job state to `pending`.
- Clears previous `studio_job_items` for that job and increments `retry_count` metadata.
- After retry, call `/api/studio/jobs/process` to execute.

Sample:

```bash
curl -X POST "http://localhost:3000/api/studio/jobs/<job-id>/retry" \
  -H "Cookie: __session=YOUR_SESSION_COOKIE"
```

## 7) Process Multiple Pending Jobs (Worker/Cron)

Endpoint: `POST /api/studio/jobs/process-all?limit=5`

Behavior:
- Processes up to `limit` oldest pending `zip_ingest` jobs.
- If `STUDIO_WORKER_SECRET` is configured, requires header:
  - `x-studio-worker-key: <secret>`
- If secret is not configured, processes only current signed-in user's pending jobs.

Sample (worker mode):

```bash
curl -X POST "http://localhost:3000/api/studio/jobs/process-all?limit=10" \
  -H "x-studio-worker-key: $STUDIO_WORKER_SECRET"
```

## 8) Deterministic Analyze (M2)

Endpoint: `POST /api/studio/analyze`

Behavior:
- Accepts annotated SVG markup and returns ranked animation variants.
- Uses agentic analysis when `OPENAI_API_KEY` is configured; falls back to deterministic ranking on failure.
- Persists analysis telemetry (`engine/model/promptVersion/latency/tokens/fallback`) into `studio_analysis_events`.
- Response includes `primary` candidate and full `candidates` list with confidence/score/rationale.

Body:
- `annotatedSvg` (required)
- `sourceName` (optional)
- `fallbackPartIds` (optional string array)
- `iconId` (optional): if provided and owned by current user, linked into analysis telemetry.

Sample:

```bash
curl -X POST "http://localhost:3000/api/studio/analyze" \
  -H "Content-Type: application/json" \
  -d '{
    "annotatedSvg":"<svg ... data-alivesvg-id=\"alivesvg-1\">...</svg>",
    "sourceName":"DashboardIcon",
    "fallbackPartIds":["alivesvg-1"]
  }'
```

## 9) Persist Icon Version

Endpoint: `POST /api/studio/icons/:iconId/versions`

Behavior:
- Creates a new `icon_versions` row for an icon owned by the authenticated user.
- Activates the new version and marks previous versions inactive.
- Intended for persisting deterministic/AI/manual animation decisions.

Body:
- `source` (`system|ai|manual`, optional; defaults to `system`)
- `animationPayload` (object, optional)
- `customCss` (string, optional)

Sample:

```bash
curl -X POST "http://localhost:3000/api/studio/icons/<icon-id>/versions" \
  -H "Content-Type: application/json" \
  -H "Cookie: __session=YOUR_SESSION_COOKIE" \
  -d '{
    "source":"system",
    "animationPayload":{
      "planner":"deterministic",
      "candidateId":"candidate-1",
      "preset":"spin",
      "triggerMode":"always",
      "loopMode":"continuous"
    }
  }'
```

## 10) List Icon Versions (Timeline)

Endpoint: `GET /api/studio/icons/:iconId/versions?limit=20`

Behavior:
- Returns icon version timeline for the authenticated icon owner.
- Includes user-scoped evaluation payload for each version (`accepted|rejected|edited`) when present.

## 11) Activate (Rollback) Icon Version

Endpoint: `POST /api/studio/icons/:iconId/versions/:versionId/activate`

Behavior:
- Sets target version as active.
- Deactivates all other versions for that icon.
- Used for rollback/version timeline workflows.

Sample:

```bash
curl -X POST "http://localhost:3000/api/studio/icons/<icon-id>/versions/<version-id>/activate" \
  -H "Cookie: __session=YOUR_SESSION_COOKIE"
```

## 12) Capture Version Evaluation

Endpoint: `POST /api/studio/icons/:iconId/versions/:versionId/evaluation`

Behavior:
- Upserts per-user evaluation outcome for a version (`accepted|rejected|edited`).
- Captures `benchmarkKey` + optional normalized score for ranking feedback loops.

Body:
- `outcome` (required): `accepted | rejected | edited`
- `benchmarkKey` (optional, defaults to `studio-feedback-v1`)
- `score` (optional, normalized to `0..1`)
- `notes` (optional)

Sample:

```bash
curl -X POST "http://localhost:3000/api/studio/icons/<icon-id>/versions/<version-id>/evaluation" \
  -H "Content-Type: application/json" \
  -H "Cookie: __session=YOUR_SESSION_COOKIE" \
  -d '{
    "outcome":"accepted",
    "benchmarkKey":"studio-feedback-v1",
    "score":0.82
  }'
```

## 13) Export Icon Set Bundle (M5)

Endpoint: `POST /api/studio/icon-sets/:iconSetId/export`

Behavior:
- Generates downloadable ZIP with React components for all exportable SVGs in the icon set.
- Uses each icon's active `icon_versions` payload (preset/trigger/loop/custom_css).
- Writes an `export_bundle` job + item audit rows in `studio_jobs`/`studio_job_items`.
- Records metering events in `studio_metering_events`.

Body:
- `mode` (optional): `package | inline` (default `package`)

ZIP contents:
- `src/icons/*.tsx`
- `src/index.ts`
- `manifest.json`
- `README.md`

Sample:

```bash
curl -X POST "http://localhost:3000/api/studio/icon-sets/<icon-set-id>/export" \
  -H "Content-Type: application/json" \
  -H "Cookie: __session=YOUR_SESSION_COOKIE" \
  -d '{"mode":"package"}' \
  --output icon-set-export.zip
```

## 14) Bulk Evaluate Active Versions (M4)

Endpoint: `POST /api/studio/icon-sets/:iconSetId/bulk-evaluate`

Behavior:
- Applies one outcome (`accepted|rejected|edited`) to all active versions in the set for current user.
- Uses upsert semantics on `(icon_version_id,user_id)` in `icon_version_evaluations`.

Body:
- `outcome` (required): `accepted | rejected | edited`
- `benchmarkKey` (optional, default `studio-feedback-v1`)
- `notes` (optional)

Sample:

```bash
curl -X POST "http://localhost:3000/api/studio/icon-sets/<icon-set-id>/bulk-evaluate" \
  -H "Content-Type: application/json" \
  -H "Cookie: __session=YOUR_SESSION_COOKIE" \
  -d '{"outcome":"accepted","benchmarkKey":"studio-feedback-v1"}'
```

## 15) Bulk Regenerate (M4/M3 bridge)

Endpoint: `POST /api/studio/icon-sets/:iconSetId/bulk-regenerate`

Behavior:
- Regenerates ranked candidate primary for each icon and persists new active versions.
- Creates `animation_generate` job + `studio_job_items` for auditability.
- Supports `engine=deterministic` or `engine=agentic` (agentic may fallback per icon).

Body:
- `engine` (optional): `deterministic | agentic` (default `deterministic`)
- `limit` (optional): max icons to process (1..500, default 200)

## 16) Bulk Apply Style Pack (M4)

Endpoint: `POST /api/studio/icon-sets/:iconSetId/bulk-apply-style`

Behavior:
- Creates new active versions for each icon in set with chosen `preset/trigger/loop`.
- Preserves per-icon selected part ids from previous active payload when available.

Body:
- `preset` (optional, default `scale`)
- `triggerMode` (optional, default `hover`)
- `loopMode` (optional, default `once`)
- `source` (optional, default `manual`)
- `rationale` (optional)

## Error Notes

- `401`: user not authenticated.
- `400`: invalid payload/file type/invalid SVG content.
- `413`: file exceeds configured upload limit.
- `404`: job/icon/version does not exist for current user.
- `500`: backend processing error (response includes `jobId` for ZIP route).

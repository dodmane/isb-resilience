# Cloud Run and Firestore Persistence

Cloud Run's writable filesystem is temporary and private to each instance.
AURORA uses Firestore automatically when the Cloud Run `K_SERVICE` variable
is present. All application instances share the same saved assessment records.
No always-running database server or minimum Cloud Run instance count is needed.

## What Is Saved

- Company profiles, dimension selections, custom sub-dimensions, and evidence plans.
- Scenario context, source links, and derivation notes.
- Evidence claims, excerpts, source metadata, and review status.
- Approvals, subdivision ratings, dimension scores, scenario assessments, and resilience gaps.
- Per-assessment audit history.

Final reports are rebuilt from these records when an assessment is reopened.
This preserves the latest saved report state, not an immutable PDF or a versioned
snapshot of every report previously viewed. Uploaded document binaries are not
saved to Cloud Storage; their evidence metadata is retained for report traceability.

## One-Time GCP Setup

1. In the deployed service's GCP project, open **Firestore** and create a
   **Native mode** database. Use database ID `(default)` unless you intentionally
   choose a named database. Choose a region appropriate for the Cloud Run service.
2. Enable the Firestore API if it is not already enabled.
3. Open the Cloud Run service configuration and identify its **runtime service
   account**. This is the identity running the application, not necessarily the
   account used to build or deploy it.
4. Grant that service account **Cloud Datastore User** (`roles/datastore.user`)
   in the project containing the Firestore database.
5. Deploy the updated application with the environment variables below. Keep
   existing authentication and Anthropic configuration unchanged.

| Variable | Value |
| --- | --- |
| `AURORA_STORAGE_BACKEND` | `firestore` (also selected automatically on Cloud Run) |
| `GOOGLE_CLOUD_PROJECT` | Project ID containing the Firestore database |
| `FIRESTORE_DATABASE_ID` | `(default)`, or your named database ID |
| `AURORA_FIRESTORE_PREFIX` | `aurora`, or another stable application namespace |

The server SDK uses Application Default Credentials supplied by Cloud Run.
Do not download service-account keys, include credentials in the image, or
configure a Firebase browser API key. Server access is controlled through IAM;
this application does not access Firestore directly from the browser.

Keep the project ID, database ID, and collection prefix the same across
revisions. Changing any of them selects a different data store and can make
existing assessments appear missing without deleting them.

Optional CLI setup, after substituting your actual values:

```bash
gcloud services enable firestore.googleapis.com --project=PROJECT_ID
gcloud firestore databases create --project=PROJECT_ID --database='(default)' --location=REGION --type=firestore-native
gcloud projects add-iam-policy-binding PROJECT_ID --member='serviceAccount:RUNTIME_SERVICE_ACCOUNT_EMAIL' --role='roles/datastore.user'
gcloud run services update SERVICE_NAME --project=PROJECT_ID --region=REGION --update-env-vars='AURORA_STORAGE_BACKEND=firestore,GOOGLE_CLOUD_PROJECT=PROJECT_ID,FIRESTORE_DATABASE_ID=(default),AURORA_FIRESTORE_PREFIX=aurora'
```

Skip database creation when the database already exists. These configuration
commands do not build or deploy the new application image; deploy it using
your existing release process as well.

## Storage Layout

Data is saved in separate collections named `aurora_assessments`,
`aurora_evidence`, `aurora_stageApprovals`, `aurora_subdivisionScores`,
`aurora_dimensionScores`, `aurora_scenarioAssessments`, `aurora_resilienceGaps`,
and `aurora_auditTrail`. The `aurora` prefix can be configured.

Related records are queried by `assessmentId`; updates never rewrite the
entire application database. Assessment and evidence updates use transactions,
and rating/scenario upserts use stable document keys. Every API waits for its
database writes before returning success. Firestore errors are surfaced rather
than silently falling back to temporary JSON storage.

The assessment list currently remains shared among signed-in users, as in the
existing application; this change does not introduce per-user tenancy.

## Verify Persistence

1. Create a test assessment and complete enough stages to view its report.
2. Confirm the assessment document and associated records appear in Firestore.
3. Sign out, sign back in, and reopen the assessment.
4. Deploy a new Cloud Run revision using the same project/database/prefix.
5. Confirm that the assessment, evidence, ratings, scenarios, and report remain available.

Instance-local JSON assessments are not automatically imported into Firestore.
Export any still-accessible reports before replacing the old revision. Records
already lost when the old instance stopped cannot be recovered from this change.

## Cost and Operations

For a small capstone workload, Firestore avoids the fixed cost of a dedicated
SQL server. Usage is billed for operations and storage, subject to the applicable
free allowance. This app uses request-driven reads, not background polling or
live listeners. A complex assessment still causes multiple reads and writes;
monitor actual usage and configure a billing budget alert. Alerts are not a cap.

Do not add a time-to-live policy to these collections unless you deliberately
want assessments to expire. Firestore persistence is not a backup: project or
database deletion, manual record deletion, and assessment deletion can still
remove data. For important records, use the existing Audit Export action and
consider Firestore-managed backups separately.

## Troubleshooting

- `PERMISSION_DENIED`: check the runtime service account and its IAM role.
- Missing database: check `GOOGLE_CLOUD_PROJECT`, database ID, and Native mode.
- Empty assessment list after deploying: check that the database and prefix
  match the previous revision, and that the new image contains this repository.
- Storage failures: review Cloud Run logs. AURORA does not switch to JSON when
  Firestore is unavailable.

Runtime LLM settings entered through the UI remain local to the container.
For Cloud Run, supply API keys via Secret Manager/environment configuration and
model/base URL through environment variables so those settings survive restarts.

For local development, omit `AURORA_STORAGE_BACKEND` to use JSON, or explicitly
set it to `json`. `AURORA_DATA_DIR` controls its directory. To test Firestore
locally, select `firestore`, configure the project/database, and use Application
Default Credentials or a Firestore emulator via `FIRESTORE_EMULATOR_HOST`.
#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="timetodie-a52be"
REPO="BeybladeBattleArena/TTDOnline"
POOL_ID="github-actions"
PROVIDER_ID="ttd-online"
SERVICE_ACCOUNT_ID="github-firebase-deployer"
SERVICE_ACCOUNT_EMAIL="${SERVICE_ACCOUNT_ID}@${PROJECT_ID}.iam.gserviceaccount.com"

printf '\nTime to Die — Google Cloud / GitHub deployment bootstrap\n'
printf 'Project: %s\nRepo:    %s\n\n' "$PROJECT_ID" "$REPO"

gcloud config set project "$PROJECT_ID"
PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"

# APIs used by Firebase Hosting, Rules, Firestore and 2nd-gen Functions.
gcloud services enable \
  firebase.googleapis.com \
  firebasehosting.googleapis.com \
  firebaserules.googleapis.com \
  firestore.googleapis.com \
  cloudfunctions.googleapis.com \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  eventarc.googleapis.com \
  iamcredentials.googleapis.com \
  sts.googleapis.com

if ! gcloud iam service-accounts describe "$SERVICE_ACCOUNT_EMAIL" >/dev/null 2>&1; then
  gcloud iam service-accounts create "$SERVICE_ACCOUNT_ID" \
    --display-name="TTD GitHub Firebase deployer"
fi

# Firebase-wide deployment permissions plus the additional roles Firebase
# documents for CLI Hosting and Cloud Functions deployment.
for role in \
  roles/firebase.admin \
  roles/serviceusage.apiKeysViewer \
  roles/cloudfunctions.admin \
  roles/iam.serviceAccountUser; do
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
    --role="$role" \
    --condition=None >/dev/null
done

if ! gcloud iam workload-identity-pools describe "$POOL_ID" --location=global >/dev/null 2>&1; then
  gcloud iam workload-identity-pools create "$POOL_ID" \
    --location=global \
    --display-name="GitHub Actions"
fi

if ! gcloud iam workload-identity-pools providers describe "$PROVIDER_ID" \
  --workload-identity-pool="$POOL_ID" --location=global >/dev/null 2>&1; then
  gcloud iam workload-identity-pools providers create-oidc "$PROVIDER_ID" \
    --location=global \
    --workload-identity-pool="$POOL_ID" \
    --display-name="TTDOnline GitHub" \
    --issuer-uri="https://token.actions.githubusercontent.com/" \
    --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.repository_owner=assertion.repository_owner,attribute.ref=assertion.ref" \
    --attribute-condition="assertion.repository == '${REPO}'"
fi

POOL_NAME="$(gcloud iam workload-identity-pools describe "$POOL_ID" --location=global --format='value(name)')"
PROVIDER_NAME="$(gcloud iam workload-identity-pools providers describe "$PROVIDER_ID" --workload-identity-pool="$POOL_ID" --location=global --format='value(name)')"

# Only GitHub OIDC tokens from this exact repository may impersonate the deployer.
gcloud iam service-accounts add-iam-policy-binding "$SERVICE_ACCOUNT_EMAIL" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/${POOL_NAME}/attribute.repository/${REPO}" >/dev/null

cat <<OUT

Bootstrap complete.

Add these as GitHub repository VARIABLES (not secrets):

GCP_WORKLOAD_IDENTITY_PROVIDER=${PROVIDER_NAME}
GCP_SERVICE_ACCOUNT=${SERVICE_ACCOUNT_EMAIL}

The workload provider is restricted to:
${REPO}

No service-account key was created.
OUT

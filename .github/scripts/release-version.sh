#!/usr/bin/env bash
# Computes VERSION_NAME / VERSION_CODE and R2 paths from APP_RELEASE_CONFIG.
# Writes results to GITHUB_ENV. Never prints secretAccessKey.
set -euo pipefail

if [[ -z "${APP_RELEASE_CONFIG:-}" ]]; then
  echo "APP_RELEASE_CONFIG is not set" >&2
  exit 1
fi

config_file="${RUNNER_TEMP}/app-release-config.json"
printf '%s' "$APP_RELEASE_CONFIG" > "$config_file"

R2_ENDPOINT=$(jq -r '.r2.endpoint' "$config_file")
R2_BUCKET=$(jq -r '.r2.bucket' "$config_file")
R2_ACCESS_KEY=$(jq -r '.r2.accessKeyId' "$config_file")
R2_SECRET_KEY=$(jq -r '.r2.secretAccessKey' "$config_file")
CDN_BASE=$(jq -r '.cdn.baseUrl' "$config_file")
PATH_JSON=$(jq -r '.paths.latestJson' "$config_file")
PATH_APK=$(jq -r '.paths.apk' "$config_file")
MIN_SUPPORT=$(jq -r '.appUpdate.minSupport' "$config_file")

export AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY"
export AWS_SECRET_ACCESS_KEY="$R2_SECRET_KEY"
export AWS_DEFAULT_REGION="auto"

compute_code() {
  local version_name="$1"
  local major minor patch
  IFS='.' read -r major minor patch <<< "$version_name"
  if [[ -z "${major:-}" || -z "${minor:-}" || -z "${patch:-}" ]]; then
    echo "Invalid versionName: ${version_name}" >&2
    exit 1
  fi
  if [[ "$patch" -gt 9999 || "$minor" -gt 99 ]]; then
    echo "versionName segments out of range: ${version_name}" >&2
    exit 1
  fi
  echo $(( major * 1000000 + minor * 10000 + patch ))
}

latest_local="${RUNNER_TEMP}/latest-remote.json"
OLD_VERSION_NAME=""
if aws s3 cp "s3://${R2_BUCKET}/${PATH_JSON}" "$latest_local" --endpoint-url "$R2_ENDPOINT" 2>/dev/null; then
  OLD_VERSION_NAME=$(jq -r '.versionName' "$latest_local")
fi

if [[ "${GITHUB_EVENT_NAME}" == "workflow_dispatch" ]]; then
  if [[ -z "${INPUT_VERSION_NAME:-}" ]]; then
    echo "workflow_dispatch requires version_name input" >&2
    exit 1
  fi
  NEW_VERSION_NAME="${INPUT_VERSION_NAME}"
  RELEASE_NOTES="${INPUT_RELEASE_NOTES:-Release ${NEW_VERSION_NAME}}"
elif [[ "${GITHUB_REF_TYPE:-}" == "tag" ]]; then
  NEW_VERSION_NAME="${GITHUB_REF_NAME#v}"
  RELEASE_NOTES="Release ${NEW_VERSION_NAME}"
elif [[ "${GITHUB_EVENT_NAME}" == "push" ]]; then
  if [[ -z "$OLD_VERSION_NAME" || "$OLD_VERSION_NAME" == "null" ]]; then
    echo "No latest.json on R2. Publish baseline via workflow_dispatch first." >&2
    exit 1
  fi
  IFS='.' read -r major minor patch <<< "$OLD_VERSION_NAME"
  if [[ -z "${major:-}" || -z "${minor:-}" || -z "${patch:-}" ]]; then
    echo "Invalid remote versionName: ${OLD_VERSION_NAME}" >&2
    exit 1
  fi
  if [[ "$patch" -ge 9999 ]]; then
    echo "PATCH is 9999. Bump MINOR or MAJOR via tag or workflow_dispatch." >&2
    exit 1
  fi
  patch=$(( patch + 1 ))
  NEW_VERSION_NAME="${major}.${minor}.${patch}"
  RELEASE_NOTES="Auto release ${NEW_VERSION_NAME}"
else
  echo "Unsupported event: ${GITHUB_EVENT_NAME}" >&2
  exit 1
fi

NEW_VERSION_CODE=$(compute_code "$NEW_VERSION_NAME")

if [[ -n "$OLD_VERSION_NAME" && "$OLD_VERSION_NAME" != "null" ]]; then
  OLD_VERSION_CODE=$(compute_code "$OLD_VERSION_NAME")
  if [[ "$NEW_VERSION_CODE" -le "$OLD_VERSION_CODE" ]]; then
    echo "New versionCode ${NEW_VERSION_CODE} must be greater than ${OLD_VERSION_CODE}" >&2
    exit 1
  fi
fi

CDN_BASE="${CDN_BASE%/}"
{
  echo "VERSION_NAME=${NEW_VERSION_NAME}"
  echo "VERSION_CODE=${NEW_VERSION_CODE}"
  echo "UPDATE_CHECK_URL=${CDN_BASE}/${PATH_JSON}"
  echo "APK_PUBLIC_URL=${CDN_BASE}/${PATH_APK}?vc=${NEW_VERSION_CODE}"
  echo "MIN_SUPPORT=${MIN_SUPPORT}"
  echo "RELEASE_NOTES=${RELEASE_NOTES}"
  echo "R2_BUCKET=${R2_BUCKET}"
  echo "R2_ENDPOINT=${R2_ENDPOINT}"
  echo "PATH_JSON=${PATH_JSON}"
  echo "PATH_APK=${PATH_APK}"
} >> "${GITHUB_ENV}"

echo "Resolved version: ${NEW_VERSION_NAME} (code ${NEW_VERSION_CODE})"

import type { Locale } from '@/lib/i18n/locale';

const englishErrorMessages: Record<string, string> = {
  active_task_quota_exceeded:
    'The active task limit has been reached. Wait for a task to finish or cancel one, then try again.',
  daily_task_quota_exceeded:
    'The task allowance for the last 24 hours is used up. Try again later.',
  daily_byte_quota_exceeded:
    'The file processing allowance for the last 24 hours is used up. Try again later.',
  analysis_budget_exceeded:
    'The analysis allowance for the last 24 hours is used up. Try again later.',
  storage_quota_exceeded:
    'Storage is full. Delete files you no longer need, or wait for a task to finish.',
  storage_file_in_use:
    'This file is being used by an analysis. Wait for it to finish before deleting.',
  analysis_already_active:
    'An analysis is already running. Wait for it to finish before trying again.',
  analysis_artifact_unavailable:
    'The original video is no longer available. Download it again before analyzing.',
  analysis_cli_failed: 'AI analysis failed. Try again later.',
  analysis_cli_not_authenticated:
    'The AI analysis service is not signed in. Sign in and try again.',
  analysis_cli_timeout: 'AI analysis timed out. Try again later.',
  analysis_cli_unavailable:
    'The AI analysis tool is temporarily unavailable. Check the service and try again.',
  analysis_cli_unsupported:
    'This AI analysis tool version is not supported. Update it and try again.',
  analysis_media_invalid:
    'This video cannot be analyzed. Download it again and retry.',
  analysis_provider_rate_limited:
    'The AI service is receiving too many requests. Try again later.',
  analysis_provider_usage_limited:
    'The AI service allowance is used up. Restore quota and try again.',
  analysis_report_not_ready:
    'The analysis report is still being created. Try again later.',
  analysis_report_unavailable:
    'The analysis report is temporarily unavailable. Run the analysis again.',
  analysis_resource_limit:
    'This video exceeds the analysis resource limit. Use a shorter or smaller video.',
  analysis_retry_limited:
    'Analysis has been retried too often. Try again later.',
  analysis_skill_outdated:
    'The Skill saved with this task has been updated. Start a new analysis with the latest Skill.',
  analysis_sandbox_unavailable:
    'The AI sandbox is misconfigured. Ask an administrator to check the analysis workspace.',
  analysis_unavailable:
    'AI analysis is temporarily unavailable. Try again later.',
  artifact_not_ready:
    'The video is still processing. Wait until the download finishes before analyzing.',
  cancelled: 'The task was cancelled.',
  download_not_ready:
    'The file is still processing. Wait until the task finishes before downloading.',
  download_timeout: 'The video download timed out. Try again later.',
  duration_limit_exceeded:
    'This platform can be downloaded, but this item exceeds the safety limit for one run.',
  email_already_registered:
    'This email is already registered. Sign in or use another email.',
  forbidden: 'Your account does not have permission to do this.',
  format_unavailable:
    'The platform is not offering the selected format. Parse the link again and choose an available format.',
  idempotency_conflict: 'The request contents changed. Start the action again.',
  input_artifact_unavailable:
    'The original video is no longer available. Download it again before analyzing.',
  import_disabled: 'This deployment does not allow local video uploads.',
  import_sha256_mismatch:
    'The uploaded file checksum does not match. Choose the original file and upload it again.',
  import_size_mismatch:
    'The uploaded file size does not match the selected file. Choose the file again.',
  import_storage_unavailable:
    'File storage is temporarily unavailable. Continue the upload later.',
  internal_error: 'The service failed to process the request. Try again later.',
  invalid_verification_code:
    'The verification code is wrong, expired, or already used. Check the email and code, or request a new one.',
  verification_rate_limited: 'Wait 60 seconds before requesting another code.',
  email_unavailable:
    'Registration email is temporarily unavailable. Try again later or contact support.',
  email_send_failed:
    'The email could not be confirmed as sent. Request a new code later.',
  invalid_credentials: 'The email or password is incorrect. Enter them again.',
  invalid_model_output:
    'The AI result failed validation. Run the analysis again.',
  invalid_provider_catalog_entry:
    'The provider configuration is invalid. Check it and try again.',
  invalid_request: 'The submission is invalid. Check each field and try again.',
  invalid_state:
    'The task is not in a state that allows this action. Refresh and try again.',
  invalid_url:
    'The video link is invalid or unsupported. Check it and try again.',
  invalid_username: 'The username format is invalid. Enter it again.',
  last_admin_change:
    'Keep another enabled administrator before changing this account.',
  media_validation_failed:
    'The generated file failed the integrity check. Download it again.',
  metrics_unavailable:
    'Runtime metrics are temporarily unavailable. Try again later.',
  not_found:
    'The task or related resource does not exist. Check Download history.',
  output_limit_exceeded:
    'The download exceeds the size limit. Choose a smaller format.',
  network_blocked:
    'The egress network cannot reach the media platform. Check the network and try again.',
  challenge: 'The platform requires verification, so the media cannot be read.',
  login_required:
    'This content requires a sign-in. Confirm the deployment host is signed in to the platform.',
  identity_unavailable:
    'Platform sign-in material is temporarily unavailable. Check the deployment host and parse again.',
  context_changed:
    'The media execution context changed. Parse the link again and confirm the download format.',
  content_unavailable:
    'The content was removed or is unavailable. Use a different link.',
  content_protected:
    'This content is encrypted and cannot be downloaded. You can import a file you already have.',
  extractor_broken:
    'The platform page structure changed, so the media cannot be read.',
  transient:
    'A temporary failure occurred while contacting the media platform. Try again later.',
  invalid_input:
    'The media link is invalid or unsupported. Check it and try again.',
  runtime_unavailable:
    'The parse runtime is temporarily unavailable. Check the service and try again.',
  provider_catalog_conflict:
    'A provider configuration with the same identifier already exists.',
  provider_catalog_not_found:
    'The provider configuration does not exist or was deleted.',
  provider_failure:
    'The AI service could not finish the analysis. Try again later.',
  rate_limited:
    'The media platform is temporarily limiting this network egress. Try again later or check the deployment host egress.',
  operation_rate_limited: 'Too many actions in a short time. Try again later.',
  rate_limiter_unavailable:
    'The request limit service is temporarily unavailable. Try again later.',
  request_timeout: 'The request timed out. Try again later.',
  request_too_large: 'The submission is too large. Reduce it and try again.',
  reserved_ai_provider_mutation:
    'The local Codex provider is the system fallback. Only its display name and model can be changed.',
  resource_expired:
    'The original media parse is no longer valid. Parse the link again.',
  self_admin_change:
    'An administrator cannot disable or delete their own account.',
  service_unavailable:
    'The service is temporarily unavailable. Try again later.',
  storage_unavailable:
    'File storage is temporarily unavailable. Try again later.',
  temp_space_exhausted:
    'Temporary download space is full. Free some space and try again.',
  transcode_required:
    'This video requires transcoding, and the selected format is not supported.',
  unauthenticated: 'Your session has expired. Sign in again.',
  unsupported_source:
    'The video source changed or is unsupported. Parse the link again.',
  upload_incomplete:
    'The video upload is incomplete. Check the network and try again.',
  upload_session_expired: 'The upload session expired. Upload the file again.',
  user_not_found: 'The user does not exist or was deleted.',
  username_already_registered:
    'That username is already taken. Choose another one.',
  worker_lost:
    'The task worker disconnected. Confirm the service is running and try again.',
  analysis_needs_material:
    'More material is required. Review the notes and create the result again.',
  analysis_configuration_changed:
    'The model or execution settings for this task changed. Create the task again.',
  analysis_outcome_unknown:
    'Analysis was interrupted, so it is unknown whether the model call finished. It was not retried automatically. Confirm and run the analysis again.',
  video_import_invalid:
    'The video failed the MP4 safety check. Choose a valid file.',
};

const englishFailureCauses: Record<string, string> = {
  'identity_unavailable:yuanbao_request_rule_unavailable':
    'The platform identity extension request rule is disabled. Reload the extension on the deployment host and parse again.',
  'extractor_broken:yuanbao_response_source_invalid':
    'The platform parse response failed validation. Parse again later.',
  'extractor_broken:yuanbao_response_size_invalid':
    'The platform parse response failed validation. Parse again later.',
  'extractor_broken:yuanbao_response_utf8_invalid':
    'The platform parse response failed validation. Parse again later.',
  'extractor_broken:yuanbao_response_json_invalid':
    'The platform parse response failed validation. Parse again later.',
  'extractor_broken:yuanbao_response_credential_echo':
    'The platform parse response failed validation. Parse again later.',
  'extractor_broken:parse_response_invalid':
    'The platform parse response failed validation. Parse again later.',
  'transient:parse_request_failed':
    'The platform parse request failed. Check the network and parse again.',
  'identity_unavailable:extension_disconnected':
    'The platform identity extension is disconnected. Confirm Chrome and the Framefetch identity extension are running on the deployment host.',
  'identity_unavailable:extension_timeout':
    'Fetching platform identity or the parse request timed out. Check Chrome and the network on the deployment host, then parse again.',
  'context_changed:identity_account_conflict':
    'The Yuanbao account changed during parsing. Confirm the account and parse again.',
  'login_required:credential_missing':
    'The platform sign-in is missing. Sign in to the platform in Chrome on the deployment host, then parse again.',
  'identity_unavailable:identity_cookie_rules_unverified':
    'Identity rules for this platform are not connected, so it cannot be parsed. You can import a local video.',
  'runtime_unavailable:browser_not_implemented':
    'Parsing for this platform is not connected, so it cannot be parsed. You can import a local video.',
  'runtime_unavailable:browser_parser_missing':
    'Parsing for this platform is not connected, so it cannot be parsed. You can import a local video.',
};

const englishStatusMessages: Record<number, string> = {
  0: 'The network connection failed. Check the network and try again.',
  400: 'The request is invalid. Check it and try again.',
  401: 'Your session has expired. Sign in again.',
  403: 'Your account does not have permission to do this.',
  404: 'The requested content does not exist or is no longer available.',
  409: 'The current state changed. Refresh and try again.',
  413: 'The submission is too large. Reduce it and try again.',
  422: 'The submission is invalid. Check each field and try again.',
  429: 'Too many actions in a short time. Try again later.',
  500: 'The service failed to process the request. Try again later.',
  502: 'An upstream service is temporarily unavailable. Try again later.',
  503: 'The service is temporarily unavailable. Try again later.',
  504: 'The request timed out. Try again later.',
};

const englishFallback = {
  server: 'The service failed to process the request. Try again later.',
  client: 'The request could not be completed. Check it and try again.',
  unknown: 'Something went wrong. Try again later.',
  requestFailed: 'Request failed',
  unavailable: 'The service is temporarily unavailable. Try again later.',
  incomplete: 'The request could not be completed. Check it and try again.',
};

const chineseFallback = {
  server: '服务处理失败，请稍后重试。',
  client: '请求未能完成，请检查后重试。',
  unknown: '发生未知错误，请稍后重试。',
  requestFailed: '请求失败',
  unavailable: '服务暂时不可用，请稍后重试。',
  incomplete: '请求未能完成，请检查后重试。',
};

export function lookupEnglishError(code: string, causeKey: string | undefined) {
  return (
    (causeKey ? englishFailureCauses[causeKey] : undefined) ??
    englishErrorMessages[code]
  );
}

export function localizedStatusMessage(status: number, locale: Locale) {
  if (locale === 'en-US') {
    return (
      englishStatusMessages[status] ??
      (status >= 500 ? englishFallback.server : englishFallback.client)
    );
  }
  return undefined;
}

export function requestCopy(locale: Locale) {
  return locale === 'en-US' ? englishFallback : chineseFallback;
}

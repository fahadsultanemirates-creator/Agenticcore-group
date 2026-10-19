# Chat composer and attachments

The character header/selector remains in place. The lower chat area now has a rounded multiline message composer, paperclip picker, compact send arrow, Enter-to-send/Shift+Enter-newline behavior, and removable previews with upload states. Images have browser-local thumbnails while queued. Messages use a simpler assistant layout and grey client bubbles. Existing office suggestions remain optional collapsed cards.

## Formats and behavior

Up to three PDF, DOCX, TXT, JPEG, PNG or WebP files per message, at most 4 MiB per file. The UI waits for every selected upload to finish before sending. Files may be sent without text; the message asks the assistant to review them. A failed upload must be removed before continuing. Removing a queued preview excludes it from the message; it does not delete the private uploaded object. Unsent uploads count toward quotas and require a future retention/cleanup workflow.

Files are uploaded privately to Supabase through short-lived signed upload URLs. Netlify's authenticated /api/office-chat-file endpoint issues these through the internal authenticated storage bridge. Only a verified business member can reserve an upload; client INSERT/UPDATE access to file metadata and upload-reservation RPCs is denied. No public bucket or public document links are created. Defaults limit upload reservations to 20 per user and 200 across the pilot site per UTC day, including failed/unused reservations.

Metadata is personal to the uploading user and business. A transaction checks ownership before linking up to three unique file IDs to a chat attempt. Request replay cannot substitute different attachments. Files from failed attempts can be reused for a retry; files already linked to completed work require a new upload. Download requests recheck user identity and current business membership, then issue a short-lived private link. Existing Forge checks continue to protect his chat and generation.

The AI receives only current-message files. The server validates trusted download origin/path, actual size and basic file signatures. Images use Responses image inputs; PDF/DOCX use file inputs. TXT is decoded as UTF-8 and bounded to the first 16,000 characters with an explicit truncation label. The model is told prior filename references do not include original file contents and must request reattachment when needed. Files are untrusted source data, not instructions. Signed URLs and provider keys are not included in model inputs. The existing store:false provider setting remains.

The client sees file cards in saved message history and can download its own attachments. Files are saved for the conversation; no human routing, task execution or service activation is implied.

## Validation and operational limits

npm run check exercises composer controls, attachment-only send, upload-to-message ID propagation, file-endpoint authentication and validation, source/size/signature checks, model input formatting and the existing office/chat suites. Rollback-only database tests check file isolation, cross-user link rejection, denied client grants, replay consistency and the private bucket. No customer file was used as a test upload. Real signed-in upload/download, model file processing and mobile keyboard/layout QA still need a browser test after deployment.

Attachment fetching is parallel and bounded. The OpenAI request timeout is 30 seconds to keep file-bearing chat within Netlify's synchronous execution limit. Oversized, encrypted, damaged or complex documents may fail; no successful analysis should be claimed when the provider returns an error. The UI retains text and attachments for a retry or refresh.

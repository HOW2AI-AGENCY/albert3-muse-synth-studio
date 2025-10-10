# Lovable Dev Console Errors Explained

This guide documents the most common console messages captured while loading the
Lovable preview environment (for example from `https://lovable.dev`). Many
screenshots show the suffix *"Understand this error"* because the browser
extension that produced the capture adds that text; it has no bearing on the
underlying issue.

## Quick Reference

| Symptom (console message) | What it means | Immediate actions |
| --- | --- | --- |
| `Access to fetch at 'https://lovable-api.com/...latest-message' has been blocked by CORS policy` | The Lovable API response omitted the `Access-Control-Allow-Origin` header, so the browser blocked the cross-origin fetch. | Allow the `https://lovable.dev` origin (or `*` for testing) in the API's CORS configuration, or proxy the call through infrastructure that injects the header. |
| `Failed to load resource: net::ERR_FAILED` (same request as above) | Follow-on error raised when the blocked fetch rejects. | Fix the underlying CORS configuration; no client-side workaround exists. |
| `qycfsepwguaiwcquwwbw.supabase.co/.../get-balance:1 Failed to load resource: the server responded with a status of 401 ()` | The Supabase Edge Function rejected the request because it lacked valid authentication/authorization headers. | Ensure the session has a fresh Supabase access token and send it in the `Authorization: Bearer <token>` header (plus any required `apikey`). |
| `Uncaught (in promise) Error: Resource::kQuotaBytesPerItem quota exceeded` | A payload written to `chrome.storage` (or another quota-limited storage surface) exceeded the per-item byte quota (≈8 KB in Chrome). | Reduce the payload size, split the data into multiple keys, or migrate to a storage option with larger quotas such as IndexedDB. |
| `Node cannot be found in the current page.` | Automation tooling (e.g., Playwright or the Lovable test harness) attempted to interact with a DOM node that no longer exists, usually because the page re-rendered. | Re-run the interaction after the DOM settles, or update the selector to handle re-renders. |

## Detailed Notes

### 1. CORS error when calling `https://lovable-api.com/.../latest-message`

```
Access to fetch at 'https://lovable-api.com/projects/…/latest-message' from origin
'https://lovable.dev' has been blocked by CORS policy: No 'Access-Control-Allow-Origin'
header is present on the requested resource.
```

The Lovable client is hosted on `lovable.dev`, while the API lives on
`lovable-api.com`. Browsers refuse to expose responses from a different origin
unless the server explicitly allows it via CORS headers. Add at least the
following headers to the API response (adjust origin/methods as needed):

```
Access-Control-Allow-Origin: https://lovable.dev
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET, OPTIONS
```

Until the header is present, the browser will block the response, and the
associated `fetch` promise will reject.

### 2. `net::ERR_FAILED` on the same request

`net::ERR_FAILED` is Chrome's generic network failure. In this scenario it is a
consequence of the blocked CORS request above. Fixing the API's CORS headers
will eliminate both messages at once.

### 3. `401` from Supabase Edge Function `get-balance`

```
https://…supabase.co/functions/v1/get-balance:1  Failed to load resource: the server responded with a status of 401 ()
```

The edge function runs server-side authorization checks. When it receives a
request without the expected JWT access token (or with an expired/invalid one),
it returns HTTP 401. Validate that:

1. The browser session has an active Supabase auth session.
2. Requests include `Authorization: Bearer <access_token>` and, if required,
   the Supabase `apikey` header.
3. Any service role keys are **not** exposed in the browser; instead, the UI
   should call a backend proxy if elevated privileges are needed.

### 4. `Resource::kQuotaBytesPerItem quota exceeded`

Chrome enforces an 8 KB limit per item in `chrome.storage.sync` and similar
quotas in `chrome.storage.local`. This error is thrown when code attempts to
persist a value larger than the limit. Mitigations include compressing data,
chunking it into multiple entries, or using IndexedDB/local file storage for
large blobs.

### 5. `Node cannot be found in the current page.`

This message typically originates from automated testing frameworks (Playwright,
Puppeteer) that interact with the Lovable preview via a remote driver. The
selector targets an element that was removed or replaced after a re-render.
Introduce explicit waits for the desired selector, prefer resilient selectors
(data-testid), or wrap DOM queries with retry logic so they can tolerate UI
transitions.

### 6. Service Worker informational logs

Messages such as:

```
[SW Manager] Регистрация Service Worker...
[SW Manager] Service Worker зарегистрирован: …
[SW Manager] Service Worker успешно инициализирован
```

are purely informational and indicate the service worker booted successfully.
They do not require any action.

## Checklist for Remediation

1. Update the Lovable API gateway to emit the correct CORS headers and verify
   with `curl -I https://lovable-api.com/.../latest-message`.
2. Confirm Supabase authentication flows refresh and attach access tokens before
   calling edge functions.
3. Audit extension or client storage writes to stay under the per-item quotas or
   migrate large payloads to IndexedDB.
4. Harden automation/test selectors so they survive React re-renders.
5. Reload the page with DevTools' **Disable cache** option to ensure the latest
   assets and service worker are in use after applying fixes.

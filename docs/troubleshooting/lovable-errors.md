# Lovable Dev Console Errors Explained

This document explains several runtime errors observed when loading the Lovable
application so that they can be triaged quickly.

## 1. `Uncaught SyntaxError: Unexpected token 'export'` in `chrome-extension://…/settings.js`

The Lovable browser extension ships its code as ES modules, but the
`settings.js` bundle is injected into the page without `type="module"`.
When Chrome parses that file as a classic script the first `export`
statement throws a syntax error. Update the extension so that the injected
`<script>` tag (or the background/content script declaration in the manifest)
uses module semantics, or transpile the bundle to remove ESM syntax before it
is injected. Until that change lands the error will appear on every page load,
but it does not block the main React application from booting.

## 2. `Uncaught (in promise) Error: A listener indicated an asynchronous response by returning true, but the message channel closed before a response was received`

This message originates from the Chrome Extensions messaging API. A content or
background script called `sendMessage` and returned `true` to indicate that it
would reply asynchronously, but the channel was closed before `sendResponse`
was invoked. In practice this means the extension code hit an exception or
never finished the async work. Review the extension logs and make sure every
code path calls `sendResponse` or removes the `return true` when no async work
is required.

## 3. CORS error when calling `https://lovable-api.com/...`

```
Access to fetch at 'https://lovable-api.com/...'
from origin 'https://lovable.dev' has been blocked by CORS policy: No
'Access-Control-Allow-Origin' header is present on the requested resource.
```

The browser blocked the `fetch` call because the API response did not include a
permissive `Access-Control-Allow-Origin` header. Either configure the Lovable
API server to add the header (for example `Access-Control-Allow-Origin: https://lovable.dev`)
or proxy the request through infrastructure that performs the necessary CORS
negotiation. Until the header is present the browser will prevent the client
from reading the response, leading to `net::ERR_FAILED` in the console.

## 4. `Resource::kQuotaBytesPerItem quota exceeded`

Chrome imposes storage quotas on the `chrome.storage` API (and some other web
storage surfaces). This error indicates that the payload being written exceeds
the per-item quota (typically 8 KB). Reduce the size of the value being stored
or switch to a storage mechanism with higher limits such as IndexedDB.

## 5. `SES_UNCAUGHT_EXCEPTION: null`

The Secure ECMAScript (SES) runtime threw an unhandled exception while
initialising the lockdown shim (`lockdown-install.js`). This usually means
another error occurred earlier and was swallowed. Check the stack trace for the
original exception and ensure the SES lockdown script runs before any other
third-party scripts that might violate its constraints.

## 6. `401` from Supabase Edge Function `get-balance`

A 401 indicates the request lacked valid authentication. Confirm that the
browser session has a valid Supabase access token and that the request includes
it (usually via the `Authorization: Bearer <token>` header). If the edge
function expects additional headers (such as `apikey`) make sure they are
present.

## Suggested Next Steps

1. Reproduce the errors with DevTools open and capture stack traces.
2. Audit extension messaging code paths to guarantee `sendResponse` is called.
3. Update the Lovable API server to include the required CORS headers.
4. Reduce storage payload sizes or migrate to a larger storage mechanism.
5. Verify Supabase authentication tokens are refreshed and attached to each
   request.
6. After applying fixes, reload the page with `Disable cache` enabled to ensure
   the latest assets are in use.

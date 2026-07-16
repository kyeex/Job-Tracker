# Jobfolio

Jobfolio is a personal job-application tracker with an opportunities grid,
filters, sorting, application rhythm heat map, local migration flow, backup
export, and XLSX export.

## Architecture direction

The selected production architecture is **Firebase Auth + Cloud Firestore**.

The browser read/write path uses Firebase Auth + Firestore as its only
persistence architecture. See [ARCHITECTURE.md](./ARCHITECTURE.md) and
[FIREBASE.md](./FIREBASE.md) for the runtime and data path.

The current data-loading strategy is deliberately personal-scale: each signed-in user's complete application history is loaded so every dashboard view and export uses identical data. The table's pagination controls presentation rather than database reads; see the architecture decision for the 1,000-record review threshold.

## Prerequisites

- Node.js `>=22.13.0`

## Quick Start

```bash
npm install
cp .env.example .env.local
npm run dev
npm run build
```

Fill in the Firebase Web App values in `.env.local` before starting the app.
Google and Anonymous Firebase Auth must be enabled in the Firebase console or emulator.

## Included Shape

- edit site code under `app/`
- `lib/jobs/` centralizes job domain types, constants, mappers, and validation
- `app/components/` contains the split UI sections
- `app/hooks/` contains data, filter, migration, and toast state hooks
- `firebase.json`, `firestore.rules`, and `firestore.indexes.json` define the
  Firebase target scaffolding
- `.openai/hosting.json` declares no application database binding because Firestore is the source of truth

## Workspace Auth Headers

OpenAI workspace sites can read the current user's email from
`oai-authenticated-user-email`.

SIWC-authenticated workspace sites may also receive
`oai-authenticated-user-full-name` when the user's SIWC profile has a non-empty
`name` claim. The full-name value is percent-encoded UTF-8 and is accompanied by
`oai-authenticated-user-full-name-encoding: percent-encoded-utf-8`.

Treat the full name as optional and fall back to email when it is absent:

```tsx
import { headers } from "next/headers";

export default async function Home() {
  const requestHeaders = await headers();
  const email = requestHeaders.get("oai-authenticated-user-email");
  const encodedFullName = requestHeaders.get("oai-authenticated-user-full-name");
  const fullName =
    encodedFullName &&
    requestHeaders.get("oai-authenticated-user-full-name-encoding") ===
      "percent-encoded-utf-8"
      ? decodeURIComponent(encodedFullName)
      : null;

  const displayName = fullName ?? email;
  // ...
}
```

## Optional Dispatch-Owned ChatGPT Sign-In

Import the ready-to-use helpers from `app/chatgpt-auth.ts` when the site needs
optional or required ChatGPT sign-in:

- Use `getChatGPTUser()` for optional signed-in UI.
- Use `requireChatGPTUser(returnTo)` for server-rendered pages that should send
  anonymous visitors through Sign in with ChatGPT.
- Use `chatGPTSignInPath(returnTo)` and `chatGPTSignOutPath(returnTo)` for
  browser links or actions.
- Pass a same-origin relative `returnTo` path for the destination after sign-in
  or sign-out. The helper validates and safely encodes it.
- Mark protected pages with `export const dynamic = "force-dynamic"` because
  they depend on per-request identity headers.

Dispatch owns `/signin-with-chatgpt`, `/signout-with-chatgpt`, `/callback`, the
OAuth cookies, and identity header injection. Do not implement app routes for
those reserved paths. Routes that do not import and call the helper remain
anonymous-compatible.

SIWC establishes identity only; it does not prove workspace membership. Use the
Sites hosting platform's access policy controls for workspace-wide restrictions,
or enforce explicit server-side membership or allowlist checks.

Use SIWC for account pages, user-specific dashboards, saved records, and write
actions tied to the current ChatGPT user. Leave public content anonymous.

## Useful Commands

- `npm run dev`: start local development
- `npm run build`: verify the vinext build output
- `npm test`: build the app and run structural/export tests
- `npm run firebase:emulators`: start Firebase Auth, Firestore, and Hosting emulators
- `npm run firebase:deploy:rules`: deploy Firestore rules and indexes
- `npm run firebase:deploy:hosting`: build and deploy Firebase Hosting assets

## Learn More

- [vinext Documentation](https://github.com/cloudflare/vinext)
- [Firebase setup](./FIREBASE.md)
- [Architecture decision](./ARCHITECTURE.md)

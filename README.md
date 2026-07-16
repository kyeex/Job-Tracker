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

## Useful Commands

- `npm run dev`: start local development
- `npm run build`: verify the vinext build output
- `npm test`: build the app and run unit, bundle-budget, and behavioral component tests
- `npm run firebase:emulators`: start Firebase Auth, Firestore, and Hosting emulators
- `npm run firebase:deploy:rules`: deploy Firestore rules and indexes
- `npm run firebase:deploy:hosting`: build and deploy Firebase Hosting assets

## Learn More

- [vinext Documentation](https://github.com/cloudflare/vinext)
- [Firebase setup](./FIREBASE.md)
- [Architecture decision](./ARCHITECTURE.md)

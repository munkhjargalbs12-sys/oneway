# Unreleased Changes

This file tracks changes made after the latest published OTA/build and before the next release is published.

## Base Reference
- Latest published OTA: `2026-04-13 - Show start location on route cards`
- Reference file: [1.0.1.md](./1.0.1.md)
- Current runtime line: `1.0.1`

## Pending Changes

### 2026-04-13 - Seat price copy and route card booking CTA
- Status: `not published yet`
- Area: `Ride creation and ride listing`
- Files:
  - `app/ride/create/form.tsx`
  - `app/(tabs)/rides/index.tsx`
  - `app/ride/[id].tsx`
  - `app/(tabs)/home/index.tsx`
- Summary:
  - New rides now save `price` as the one-seat price instead of the total price across all seats
  - Route cards now show a clear `1 суудал` price label and a visible `Суудал захиалах` CTA when booking is available
  - Ride detail and home copy now clarify that the shown amount is for one seat
- Notes:
  - Existing older rides that were created with total-price semantics will keep their saved value until they are recreated or migrated
- Verification:
  - `cmd /c npm run lint`
  - `cmd /c npx tsc --noEmit`

### 2026-04-13 - Backend deployment follow-up for start location labels
- Status: `not deployed to production API yet`
- Area: `Ride start location metadata`
- Files:
  - `../backend/sql/init.sql`
  - `../backend/src/controllers/ride.controller.js`
- Summary:
  - Frontend OTA is published, but newly created rides need the backend `start_location` deploy to save the start place label
  - Existing older rides will still fall back to `Эхлэх цэг тодорхойгүй` until they are recreated with the updated backend
- Verification:
  - `git push origin main`

## How To Use
- Add one entry here for each meaningful unpublished change
- When the next OTA/build is published, copy the relevant entries into the version file
- After publishing, either clear this file or move published entries into the versioned release note

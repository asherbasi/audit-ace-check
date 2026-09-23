# Mövenpick branding, score colors, and store update

## What will change

- Replace the current red Pizza Hut styling with a clean Mövenpick-inspired black, charcoal, white, and restrained gold accent palette.
- Add the supplied Mövenpick logo to the sticky header and the sign-in page, with mobile-safe sizing and accessible alternate text.
- Keep score status colors consistent everywhere: green at 85%+, amber at 60–84%, red below 60%, and neutral grey when no score exists.
- Make Yes, No, and N/A selected states unmistakable: green, red, and neutral grey respectively.
- Update the 13 existing placeholder store records in place, preserving their IDs and audit history, then add Lagos 3 and State Road as stores 14 and 15.
- Update visible copy and page metadata from Pizza Hut/13 stores to Mövenpick/15 stores.

## Data safety

The existing store rows will be renamed rather than deleted or recreated. Existing audits will remain linked to the same store IDs. Two new rows will be inserted only for the additional stores.

## Reports

No PDF/report export currently exists in the app. This update will not invent a new export workflow; when a report export is added, its header should use the same Mövenpick logo.

## Technical details

- Store updates use stable codes `PH01`–`PH13` for the existing rows to preserve associations; new rows use `PH14` and `PH15`.
- The uploaded logo will be stored as an app asset and imported through its asset pointer.
- Score presentation will continue to use the existing semantic `ok`, `warn`, `bad`, and muted tokens, updated to suit the new palette.
- Verification will cover the store list, head office table, audit form selections, header, and sign-in page at desktop and mobile widths.

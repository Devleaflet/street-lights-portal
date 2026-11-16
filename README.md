# Street Light Portal — demo

Static, mobile-first demo of the Street Light Portal (no backend). Data is seeded and saved in the browser's localStorage; "Reset demo data" in Profile/More restores it.

## Run
```bash
npm install
cp .env.example .env.local   # add NEXT_PUBLIC_CARTO_KEY for the map tiles
npm run dev                  # http://localhost:3000
npm run build                # static site in out/ — host anywhere
```

## Demo accounts (password `demo`, or tap them on the sign-in screen)
| Role | Email |
|---|---|
| Admin | admin@streetlight.demo |
| Installer | ramesh@streetlight.demo, sita@streetlight.demo |
| Ward officer | ward5@streetlight.demo (Ward 5), ward4@streetlight.demo (Ward 4) — ward1…ward9 exist |
| COA | coa@streetlight.demo |

Installer sign-ups (`/signup`) stay pending until the admin approves them under Users.

## Notes
- Camera: photos are taken with the live camera (no gallery upload). Devices without a camera get a clearly stamped demo photo so the flow can still be shown.
- GPS: if you're outside the demo city, a nearby point inside it is simulated.
- Business rules and role permissions live in `lib/portal.ts`.

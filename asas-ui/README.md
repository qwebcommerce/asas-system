# ASAS System — UI kit (HTML + CSS)

A static, working prototype of the ASAS System admin dashboard. It matches the approved Figma design.

**Open `index.html` in any browser.** Use the "Prototype · sign in as" chips to jump into each role.

## Pages
| File | Screen | Role |
|---|---|---|
| index.html | Sign in | — |
| register.html | Create account | — |
| staff.html | Basic dashboard + Request access modal | Staff |
| overview.html | Overview + access-request drawer | Super Admin |
| users.html | Users & Access (bulk bar, access drawer) | Super Admin |
| employees.html | HR · Employees + send attendance to Accounting | HR |
| report-new.html | Daily site report | Engineer |
| offer-new.html | New offer · measurements | Super Admin / Engineer |
| documents.html | Documents + details drawer | Super Admin |
| accounting.html | Accounting dashboard | Accountant |
| salary-run.html | Salary run + Confirm payment modal | Accountant |
| settings.html | Profile, language, theme, security | All |

## What works
- **EN / ع language switch.** The whole UI switches to Arabic RTL, and the choice is remembered.
- **Light / dark theme.** Use the moon button, or Settings.
- **Responsive.** Under 1024 px the sidebar becomes a slide-in menu (☰). Under 720 px tables become cards.
- **Overlays.** Modals, drawers, toasts and the AI assistant drawer (✦). Esc or a click outside closes them.

## Files
- `assets/css/asas.css`: design tokens and every component.
- `assets/js/app.js`: behaviours (language, theme, menu, overlays, chip groups).
- `assets/i18n/en.json`, `ar.json`: 376 translation keys. `assets/js/i18n.js` holds the same data so the kit works offline over `file://`.
- `MASTER_PROMPT.md`: the master prompt for building the real system in Cursor with Next.js.
- `build.py`: regenerates the pages and translation files (`python3 build.py`).

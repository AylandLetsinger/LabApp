# CLAUDE.md

Instructions for AI assistants working in this repository. Read before editing.

## What this is

The Lab App (thelabapp.org) — calculators for research labs at UT Austin.
Vite + React 19 + React Router 7 + Mantine 9. Static SPA, no backend.

**Students use these calculators to dose live animals.** A wrong number here
can reach a mouse. That is the reason for every rule below.

## Hard rules

### 1. All arithmetic in canonical units: milligrams and millilitres

Values enter through `src/dosage/unitConversions.js` and leave through it.
Never do a unit conversion inline. Never let a display unit feed back into a
calculation.

This is not style. The IP calculator previously honoured the body-weight unit
selector in the dose path and ignored it in the volume path, producing a
concentration **1000x wrong with no warning**. The variable was named
`avgBodyWeightG` while a kg/g dropdown sat next to it.

If you add a unit anywhere, route it through `unitConversions.js`. If a
function takes a weight or volume, it takes the unit too — never assume.

### 2. Never invent a safety number

Every limit in `src/dosage/vehicles.js` carries:

```js
{ maxPercent, endpoint, source, confidence }
```

`endpoint` is what was actually measured — "no effect on locomotor activity"
is not the same claim as "safe". Where no published figure exists, record
`maxPercent: null` and say so in the UI.

**Do not fill a gap with a plausible-looking number.** A fabricated ceiling on
an animal-dosing tool is worse than no ceiling. If asked for a limit you
cannot cite, say you cannot cite it.

### 3. Errors never pass silently

A calculation that cannot produce a trustworthy number returns `undefined`,
and the UI explains why via `IssueList`. A blank output field with no
explanation is a bug, not a neutral state.

Guard at the maths layer, not only in the form. Use `toNonNegativeNumber` /
`toPositiveNumber` from `numberUtils.js` — a negative dose must never reach an
output field looking like a real number.

### 4. Displayed numbers must add up

Recipe volumes are rounded to the user's pipette increment, and the last
solvent absorbs the rounding so the total is exact. If you touch
`computeVehicleVolumes.js`, preserve that. Previously the displayed volumes
could miss the stated total by 3%.

### 5. Reuse before writing

Check what exists first. Route-agnostic logic lives in `src/dosage/`; only
genuinely method-specific logic gets its own module.

| Need | Use |
|---|---|
| Unit conversion | `src/dosage/unitConversions.js` |
| Parsing, guards, rounding | `src/dosage/numberUtils.js` |
| Dose per subject | `src/dosage/computeDosePerAvgSubject.js` |
| Solute / volume / concentration | `src/dosage/computeSolutionOutputs.js` |
| Splitting a volume by ratio | `src/dosage/computeVehicleVolumes.js` |
| Solvents and their limits | `src/dosage/vehicles.js` |
| Output value + unit selector | `src/components/dosage/DosageOutputRow.jsx` |
| Errors and warnings | `src/components/dosage/IssueList.jsx` |
| Solvent table | `src/components/dosage/VehicleRatioTable.jsx` |
| Dissolution recipe | `src/components/dosage/DissolutionTable.jsx` |
| "Updating -> updated" state | `src/hooks/useOutputFeedback.js` |
| Print / PDF | `src/components/dosage/PrintActions.jsx` |

`src/dosage/computeMealwormOutputs.js` is the newest module and shows the
intended pattern: pure functions, canonical units, explicit
`{ level, message }` issues.

### 6. Build only what was asked for

Do not add requirements the user did not state. This has already caused a
problem: an earlier AI session invented a consumption-tracking requirement for
the mealworm calculator that the user never wanted, and it survived into a
later specification because nobody noticed where it came from.

If you think something is missing, say so and let the user decide. Do not
quietly add it.

### 7. Scientific claims need a source or a hedge

When stating something about tolerability, dosing, or physiology, cite it or
label it as uncertain. "I think X but have not verified" is always better than
confident invention. The users are scientists; they can work with a stated
uncertainty and cannot work with a confident wrong answer.

## Style

Zen of Python, in JavaScript. Explicit over implicit, simple over complex,
flat over nested, readable over clever. Match the surrounding code's comment
density and naming.

Comments explain **why**, especially where a rule exists because something
broke before. Do not comment what the code already says.

## Before you finish

```bash
npm run lint     # must pass, zero errors
npm run build    # must succeed
```

For calculation changes, verify the arithmetic numerically — run the actual
functions against hand-checked cases. Do not report a fix as working because
it looks right.

## Git

**Do not push unless the user asks.** Pushing to `main` deploys to
thelabapp.org within about a minute — treat it as publishing, because it is.

Committing to `main` is permitted on this project; the team decided against
requiring pull requests. Still prefer a branch for anything substantial, and
say why: a branch gets its own Vercel preview URL, so the user can try the
change on a real page before it is public.

Never force-push. It is the only operation that can destroy a recoverable
version, which is the safety net the whole workflow rests on.

## Ownership

Coordinate before editing outside your area, and always before touching
`src/theme.js`, `src/layout/AppLayout.jsx`, `src/App.jsx`,
`src/dosageDeliveryMethods.js`, or `package.json`.

| Person | Area |
|---|---|
| Ayland Letsinger | Dosage calculators |
| Klarissa Tey | Molarity, Dilutions, Antibodies |
| Elijah Martinez | Recipes |

See `CONTRIBUTING.md` for the human workflow.

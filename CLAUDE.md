# CLAUDE.md

Instructions for AI assistants working in this repository. Read before editing.

## What this is

The Lab App (thelabapp.org) — calculators for research labs at UT Austin.
Vite + React 19 + React Router 7 + Mantine 9. Static SPA, no backend.
Deployed from `main` by Vercel.

**Students use these calculators to dose live animals.** A wrong number here
can reach a mouse. That is the reason for every rule below.

## Where things are

Do not go hunting. Every screen follows the same three layers: a **page** that
sets the framing text, a **form/calculator component** that is layout and
state, and a **compute module** of pure functions that holds the arithmetic.

**Bugs in numbers live in the compute module. Bugs in wording, ordering, or
missing warnings usually live in the component.**

| Route | Page | Component | Arithmetic |
|---|---|---|---|
| `/` | `pages/Home.jsx` | — | cards come from `calculators.js` + `dosageDeliveryMethods.js` |
| `/dosage/:method` | `pages/Dosage.jsx` | see table below | see table below |
| `/molarity` | `pages/Molarity.jsx` | `components/molarity/MolarityCalculator.jsx` | `molarity/computeMolarity.js` |
| `/dilutions` | `pages/Dilutions.jsx` | `components/dilutions/DilutionCalculator.jsx` | `dilutions/computeDilution.js` |
| `/antibodies` | `pages/Antibodies.jsx` | `components/reagents/AntibodyDilution.jsx` | `reagents/computeAntibody.js` |
| `/viral-mixes` | `pages/ViralMixes.jsx` | `components/reagents/ViralMix.jsx` | `reagents/computeViralMix.js` |
| `/stock-solution` | `pages/StockSolution.jsx` | `components/stock/StockPlanCalculator.jsx` | `stock/computeStockPlan.js` |
| `/recipes` | `pages/Recipes.jsx` | — | stub, not built yet |
| `/about`, `/support` | `pages/About.jsx`, `pages/Support.jsx` | — | — |

`pages/Dosage.jsx` holds one object, `IMPLEMENTED_METHODS`, mapping a slug to
its form and intro text. **Start there for any dosage question.**

| Slug | Form | Arithmetic |
|---|---|---|
| `direct-application` | `DirectApplicationForm` | `dosage/computeInVitro.js` |
| `intraperitoneal-injection` | `LiquidDoseForm` | `computeSolutionOutputs` + `computeVehicleVolumes` |
| `subcutaneous-injection` | `LiquidDoseForm` | same |
| `oral-gavage` | `LiquidDoseForm` | same |
| `intracranial-injection-infusion` | `IntracranialDoseForm` | `computeIntracranial.js` |
| `iv-infusion` | `IvDoseForm` | `computeIntravenous.js`, `computeInfusion.js` |
| `drinking-fluid` | `DrinkingFluidForm` | `computeDrinkingFluid.js` |
| `mealworm` | `CarrierDosageForm` | `computeMealwormOutputs.js` |
| `solid` (edible solid) | `CarrierDosageForm` | `computeMealwormOutputs.js` |

Three slugs share `LiquidDoseForm`, and two share `CarrierDosageForm`. They
differ only by a config object — see "Config as data" below. **A change to one
changes the others.** Check which routes a form serves before editing it.

### Config as data

Four files parameterise otherwise-identical forms. Adding a route, carrier, or
vessel should be an edit to one of these, not a new copy of a form:

- `dosage/liquidRoutes.js` — IP vs SC vs gavage: labels, per-route solvent
  observations, advice strings
- `dosage/carriers.js` — mealworm vs edible solid
- `dosage/vessels.js` — well plates, dishes, baths
- `dosage/preparationModes.js` — powder / stock / working solution, the Step 1
  question on nearly every page

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
| Molar units, `1 M = MW mg/mL` | `src/dosage/molarUnits.js` |
| Parsing, guards, rounding | `src/dosage/numberUtils.js` |
| Dose per subject | `src/dosage/computeDosePerAvgSubject.js` |
| Solute / volume / concentration | `src/dosage/computeSolutionOutputs.js` |
| Multiple named solutes in one prep | `src/dosage/solutes.js` |
| Splitting a volume by ratio | `src/dosage/computeVehicleVolumes.js` |
| Solvents and their limits | `src/dosage/vehicles.js` |
| Shared unit lists / dose types | `src/dosage/dosageTypes.js`, `src/constants/doseUnits.js` |
| Output value + unit selector | `src/components/dosage/DosageOutputRow.jsx` |
| Errors and warnings | `src/components/dosage/IssueList.jsx` |
| Step 1 powder/stock/working question | `src/components/dosage/PreparationModeControl.jsx` |
| Solvent table | `src/components/dosage/VehicleRatioTable.jsx` |
| Dissolution recipe | `src/components/dosage/DissolutionTable.jsx` |
| Closing "so, in practice…" paragraph | `src/components/dosage/RecipeNarrative.jsx` |
| Dosing table by body mass | `src/components/dosage/CarrierDosingTable.jsx` |
| "Updating -> updated" state | `src/hooks/useOutputFeedback.js` |
| Print / PDF | `src/components/dosage/PrintActions.jsx` |
| Feedback button, mailto | `src/components/feedback/`, `src/feedback/mailto.js` |

Any `compute*.js` module shows the intended pattern: pure functions, canonical
units, explicit `{ level, message }` issues, no React.

### Two conventions that are easy to get wrong

**Solubility is a floor, not a lock.** It sets the minimum volume a solvent
must contribute. Ratio still drives every volume. With several solutes the
required volume is the **maximum** of the individual requirements, not the
sum — they are assumed to dissolve independently.

**Impossible is not the same as unwise.** An impossibility blocks and returns
`undefined`; an unwise-but-valid number warns and still computes. `IssueList`
panels containing only warnings **render collapsed**, so anything the user must
read has to sit next to the control that caused it, not in the panel.

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

### How to run a compute module on its own

There is no test runner installed. The working method is a throwaway script in
your scratchpad, and it takes one trick: source files import without file
extensions (`from '../numberUtils'`), which Vite resolves and bare Node does
not.

1. Copy `src/` to `<scratchpad>/sandbox/`.
2. Regex the extensions in: `from '(\./[^']+)'` → `from '$1.js'`.
3. Write `verify.mjs` importing from the sandbox, and run `node verify.mjs`.

Assert against numbers **you worked out by hand**, and print a pass/fail line
per check. Watch two traps that have already produced false results here: a
float tolerance tighter than the value being tested, and a check that passes
because it silently compared a string to a number.

The sandbox is a copy — edits there change nothing. Delete it when done.

## Environment notes

- **Windows.** The Bash tool is Git Bash; PowerShell is the default. In
  PowerShell, `&&` and `||` are parse errors — use `; if ($?) { ... }`.
  `[IO.File]` methods ignore `Set-Location`, so pass absolute paths.
- **Mantine dropdowns, selects and modals do not respond to synthetic clicks
  or dispatched events.** Browser-automation checks of them fail, and worse,
  can silently match an option in a *different* select and pass for the wrong
  reason. To check a Mantine-driven branch, change the default in the source
  temporarily and revert, or read the source and say that is what you did.
- The dev server occasionally serves a stale render after heavy HMR (a burger
  menu at desktop width, for one). A fresh navigation clears it. Confirm
  against a real build before believing a layout bug.
- `npm run dev` from a background shell: use the tool's own background mode.
  `Start-Process npm` does not start Vite here.

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

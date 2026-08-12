# The Lab App

Calculators for research labs, at [thelabapp.org](https://thelabapp.org).
Built at UT Austin for the arithmetic that sits between a compound arriving in
a tube and it reaching an animal, a well, or a gel.

Everything runs in the browser. There is no backend, no account, and nothing
you type is sent anywhere. Every page prints as a bench sheet.

> Working on this with an AI assistant? Read [CLAUDE.md](CLAUDE.md) first — it
> has the map from each page to the module that does its arithmetic, and the
> rules that exist because something went wrong before.

## What it does

### Dosage — getting a known dose into a subject

| Method | What it works out |
|---|---|
| Direct Application | A target concentration in a well or a bath, and what to add to reach it |
| Intraperitoneal Injection | Dose by body mass, volume by mL/kg |
| Subcutaneous Injection | The same, split across as many sites as you use |
| Intracranial Injection/Infusion | Bolus or pump, in volumes a ventricle holds rather than ones scaled to the animal |
| Oral Gavage | Solutions and suspensions, checked against oral figures, never injected ones |
| Edible Solid | Peanut butter, gelatin, cookie dough — how much solution a portion will carry |
| Mealworm | One worm per mouse, bounded by how much liquid it absorbs before it leaks |
| Drinking Fluid | What to put in the bottle, and how far the dose moves when they drink more or less |
| IV Infusion | One slow bolus, a self-administration session, or a line running for hours |

### Calculators — the arithmetic either way

| Calculator | What it works out |
|---|---|
| Molarity | Mass, concentration, volume, molecular weight — fill in three and the fourth follows, with the working shown |
| Dilutions | C₁V₁ = C₂V₂, and how much diluent to actually add rather than make up to |
| Antibodies | Primary and secondary solutions, with several named antibodies sharing one diluent |
| Viral Mixes | Agents to a ratio — by volume, by titre, or backwards from the genome copies you want injected |
| Stock Solution | From a tube of powder to a working solution far too dilute to weigh in one step |

Recipe Creator is in progress.

## Two things worth knowing

**Every solvent limit carries its source.** `src/dosage/vehicles.js` records
what was actually measured and how confident the figure is. Limits are
route-specific: an intraperitoneal tolerability figure is never borrowed for
an oral or subcutaneous page. Where no published figure exists the app says so
rather than inventing one — silence in the UI is stated, not implied.

**A calculation that cannot produce a trustworthy number produces none.** It
returns nothing and explains why. A blank field with no explanation is treated
as a bug.

## Tech

React 19 · React Router 7 · Mantine 9 · Vite 8. Static SPA, deployed from
`main` by Vercel.

## Running it

```bash
npm install
npm run dev
```

`http://localhost:5173`.

```bash
npm run lint     # must pass, zero errors
npm run build    # production build → dist/
npm run preview  # serve the production build locally
```

There is no test runner; see the verification section in
[CLAUDE.md](CLAUDE.md) for how compute modules are checked.

## Who works on what

| Person | Area |
|---|---|
| Ayland Letsinger | Dosage calculators |
| Klarissa Tey | Molarity, Dilutions, Antibodies |
| Elijah Martinez | Recipes |

Coordinate before editing shared files — `src/theme.js`,
`src/layout/AppLayout.jsx`, `src/App.jsx`, `src/dosageDeliveryMethods.js`,
`package.json`. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Found a wrong number?

Every page has a **Send a note** button in the footer. A calculator nobody
corrects is a calculator nobody should trust.

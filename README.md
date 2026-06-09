# The Lab App

A web-based calculator tool for research labs at UT Austin. Helps lab researchers quickly compute drug preparation parameters for common administration methods.

## Features

### Intraperitoneal Injection Calculator
The primary feature — a multi-step form that calculates everything needed to prepare a working solution:

1. **Dosage type** — enter dose per subject directly, or scale by body weight (dose/kg × avg subject weight)
2. **Study parameters** — injection volume, average subject weight, number of injections, waste buffer
3. **Calculated outputs** — solute required (mg), volume per subject (mL), total working solution (mL), concentration (mg/mL)
4. **Vehicle ratio** — enter parts for up to 4 solvents (DMSO, Ethanol, Emulphor, Saline); %(v/v) auto-calculates
5. **Dissolution steps** — step-by-step instructions with exact solvent volumes

All outputs update live as you type.

### Planned Calculators
- Molarity
- Dilutions
- Antibodies
- Additional dosage delivery methods (subcutaneous, intracranial, IV infusion, drinking fluid, solid, stock solution)

## Tech Stack

- **React 19** + **React Router 7**
- **Mantine 9** — component library and form state
- **Vite** — dev server and build tool
- **PostCSS** — CSS processing with Mantine preset

## Getting Started

```bash
npm install
npm run dev
```

App runs at `http://localhost:5173`.

```bash
npm run build   # production build → dist/
npm run preview # preview production build locally
```

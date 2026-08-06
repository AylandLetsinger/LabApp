# SOP — Working on The Lab App

Standard operating procedure for the three of us. Follow it in order.

Students use these calculators to dose live animals. A wrong number can reach a
mouse. That is why this reads like a lab protocol rather than a style guide.

**Everyone here works with an AI assistant.** That changes what the risky step
is. The AI will write correct-looking code quickly; the danger is no longer
typos, it is plausible-looking wrong answers landing on the live site. Section
3 exists for that.

## Two things to know before anything else

**Pull before you start.** Every session, every time. Skipping it causes almost
every problem described further down.

**Pushing straight to `main` is allowed.** It publishes to thelabapp.org in
about a minute, so know that is what you are doing. Nothing here is permanent —
if it goes wrong the live site rolls back in one click, and no version can be
erased. See *When something goes wrong*.

Branches are recommended, not required, and the reason benefits you rather than
anyone else: **pushing a branch gets you a live preview URL**, so you can open
the real thing and try it before anybody else sees it. That beats hoping you got
it right. Sections 4 and 5 cover it.

---

## 0. Who owns what

Two people editing different files is a non-event. Two people editing the same
file at the same time is the one thing git cannot resolve on its own.

| Person | Area | Files |
|---|---|---|
| **Ayland** | Dosage calculators | `src/dosage/`, `src/components/dosage/` |
| **Klarissa** | Molarity, Dilutions, Antibodies | `src/pages/Molarity.jsx`, `Dilutions.jsx`, `Antibodies.jsx` |
| **Elijah** | Recipes | `src/pages/Recipes.jsx` |

**Shared files — say so in chat before editing:**

```
src/theme.js                  colours and fonts
src/layout/AppLayout.jsx      the top navigation bar
src/App.jsx                   the list of pages
src/dosageDeliveryMethods.js  the Dosage dropdown
package.json                  dependencies
```

These five are small, everyone needs them eventually, and they are where
collisions actually happen. Adding a page to the nav means editing
`AppLayout.jsx` and `App.jsx` — flag it.

---

## 1. Start of every session

```bash
git checkout main
git pull
```

**Do not skip the pull.** Working from a stale copy is how you get conflicts.

Then decide whether to branch:

```bash
git checkout -b short-name-for-what-youre-doing
```

**Branch** when the change is more than a small edit, when you want a preview
link before it goes public, or when you want someone to look first. Your branch
cannot affect the live site at all.

**Stay on `main`** for a typo, a wording fix, or anything you are confident
about. It goes live on merge or push, which is usually what you want for a
one-line change.

Branch names: lowercase, hyphens, describe the work.
`molarity-calculator`, `fix-dilution-units`, `recipes-form`.

---

## 2. While you work

Commit whenever a piece works — not once at the end.

```bash
git add -A
git commit -m "Add molarity input fields"
```

Write the message as what it does. "Add molarity input fields", not "changes"
or "wip". A commit is a save point you can return to.

**Tell your AI assistant to read `CLAUDE.md` if it hasn't.** Claude Code loads
it automatically; other tools may not. It contains the rules that exist because
something already went wrong.

---

## 3. Checking AI-written work

This is the step that matters most and the easiest to skip.

**Check the arithmetic against a hand calculation.** Pick one case you can do
on paper and confirm the tool agrees. Not "does the code look right" — does the
number come out right.

**Check units in both directions.** Enter the same quantity two ways — 25 g and
0.025 kg — and confirm every output is identical. This exact test caught a
1000x error in the IP calculator that had been live for weeks.

**Check the edge cases.** Zero. Blank. Negative. A absurd value. Every one
should produce a visible message, never a silent blank or a confident wrong
number.

**Check it did what you asked and nothing else.** AI assistants add
requirements you did not ask for. This has already happened here: an earlier
session invented a consumption-tracking feature for the mealworm calculator
that nobody wanted, and it survived into a later spec because its origin was
forgotten. If a feature appears that you did not request, delete it or ask
where it came from.

**Never accept a safety number without a source.** Tolerability limits,
maximum volumes, concentration ceilings — if the AI produced a figure, ask for
the citation. If it cannot cite it, the value must be recorded as unknown, not
guessed. Check `src/dosage/vehicles.js` for the required shape.

Then:

```bash
npm run lint     # must pass with no errors
npm run build    # must succeed
npm run dev      # click through what you changed
```

If lint or build fails for you, it fails for everyone.

---

## 4. Publish

**If you worked on `main`:**

```bash
git push
```

That is it — live in about a minute. Open the site and check the thing you
changed actually changed.

**If you worked on a branch:**

```bash
git push -u origin your-branch-name
```

**Vercel builds every branch to its own live URL** — about a minute. Production
is untouched.

On github.com the repo offers a **Compare & pull request** button. Click it,
write a sentence about what changed, create it. Vercel posts the preview link
on the PR.

A push that prints nothing has succeeded. Git is quiet on success. To confirm:

```bash
git log --oneline origin/main..HEAD
```

Empty output means everything is on GitHub.

---

## 5. Review — branches only

The other person opens the preview link and clicks around.

You are not required to read the code. Opening the working thing and trying it
is a legitimate review, and for a calculator it is usually the better one — try
the numbers you actually use at the bench.

For anything touching dosage maths, repeat the checks in section 3 yourself.
Two people checking one number costs a minute.

---

## 6. Merge and reset — branches only

Click **Merge pull request** on GitHub. Live on thelabapp.org in about a
minute.

Then immediately:

```bash
git checkout main
git pull
```

Skip this and your next branch starts from stale code.

---

## Not comfortable at the command line?

Install **[GitHub Desktop](https://desktop.github.com/)** — free, from GitHub.
Pull, branch, commit and push are buttons, and it shows you what changed before
you send it.

Same git underneath. Mixing GUI and command line across the team is fine.

---

## When something goes wrong

**"Your local changes would be overwritten by merge"**
You have uncommitted edits. Commit them, or park them:
```bash
git stash
git pull
git stash pop
```

**A merge conflict** — two people changed the same lines:
```
<<<<<<< HEAD
your version
=======
their version
>>>>>>> main
```
Decide what the file should say, delete the `<<<<<<<`, `=======` and `>>>>>>>`
markers, save, commit. **If it looks frightening, stop and ask.** Do not guess,
and do not let an AI resolve a conflict in dosage maths unsupervised.

**You pushed something to `main` you did not mean to**
This is allowed and recoverable, so do not panic and **do not force-push**.
Either roll the site back (below) or undo the commit properly:

```bash
git revert <commit-id>
git push
```

`revert` makes a new commit that undoes the old one. Nothing is erased, and the
revert is itself revertable.

**The live site is broken**
Vercel dashboard → your project → **Instant Rollback** (top right, next to
*Visit*) → pick the last good deployment. About thirty seconds, and it does not
touch the repository.

Fix it properly afterwards. Rolling back first is not an admission of anything —
it is the correct first move.

**A push seemed to do nothing**
It probably worked. Git prints nothing on a successful push. Check with:

```bash
git log --oneline origin/main..HEAD
```

Empty output means there is nothing left to push.

---

## Deployment, briefly

- `thelabapp.org` and `www.thelabapp.org` are served by **Vercel**.
- Merging to `main` deploys automatically, about one minute.
- Every branch gets its own preview URL.
- GitHub Pages was retired in August 2026 — it returned a real 404 for every
  route except `/`, because static Pages hosting cannot rewrite URLs for a
  single-page app. Do not re-add a Pages workflow.
- DNS is at Namecheap: `@` → A record to Vercel, `www` → CNAME to Vercel.

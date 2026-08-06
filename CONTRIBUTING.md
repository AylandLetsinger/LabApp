# Working on The Lab App

This is a small team on a tool that students use to dose animals. The point of
the rules below is not process for its own sake — it is that a wrong number on
this site can reach a mouse.

Two rules matter more than all the others:

1. **Pull before you start.** Every session, every time.
2. **Never commit straight to `main`.** Work on a branch, open a Pull Request.

Everything else is detail.

---

## Who works on what

Splitting by area is what keeps us out of each other's way. Two people editing
different files is a non-event. Two people editing the *same* file at the same
time is the one thing git cannot sort out on its own.

| Person | Area | Files |
|---|---|---|
| Ayland | Dosage calculators | `src/dosage/`, `src/components/dosage/` |
| Klarissa | Molarity, Dilutions, Antibodies | `src/pages/`, new folders per calculator |

Shared files — `src/theme.js`, `src/layout/AppLayout.jsx`, `src/App.jsx`,
`src/dosageDeliveryMethods.js`, `package.json`. **Say something in chat before
editing these.** They are small and everyone touches them, which makes them the
most likely place for a collision.

If you need to work in someone else's area, message them first. It takes ten
seconds and saves an afternoon.

---

## The loop

### 1. Pull

```bash
git pull
```

Gets everyone else's work. If you skip this, you are building on a stale copy
and you will have conflicts later.

### 2. Branch

```bash
git checkout -b molarity-calculator
```

Name it after what you are doing: `molarity-calculator`, `fix-dilution-units`,
`antibody-titration`. Lowercase, hyphens, no spaces.

Your branch is yours. You cannot break the live site from it.

### 3. Work, and commit as you go

```bash
git add -A
git commit -m "Add molarity input fields"
```

Commit whenever a piece works — not once at the end. Small commits are easy to
read and easy to undo. A commit is a save point, not an announcement.

Write the message as what it *does*: "Add molarity input fields", not "changes"
or "wip".

### 4. Push your branch

```bash
git push -u origin molarity-calculator
```

**Vercel builds every branch to its own live URL.** Within about a minute you
get a working link to the site with your changes on it, and production is
completely untouched. Find it on the Vercel dashboard, or in the bot comment on
your Pull Request.

This is the best thing about our setup. Use it. Send the link instead of
describing what you did.

### 5. Open a Pull Request

On github.com the repo will offer a **Compare & pull request** button after you
push. Click it, write a sentence about what changed, create it.

### 6. The other person looks, then merge

Open the preview URL and click around. You are not required to read the code —
looking at the working thing is a legitimate review, and often a better one.

Then **Merge pull request**. It is live on thelabapp.org in about a minute.

### 7. Go back to main and pull

```bash
git checkout main
git pull
```

Do this straight after merging, or your next branch starts from stale code.

---

## Not comfortable at the command line?

Install **[GitHub Desktop](https://desktop.github.com/)**. Free, from GitHub.
Pull, branch, commit, and push are all buttons, and it shows you exactly what
changed before you send anything.

It is the same git underneath, so we can mix — one person on the GUI and one on
the command line is completely fine.

---

## When something goes wrong

**"Your local changes would be overwritten by merge"**
You have uncommitted edits. Either commit them, or park them:
```bash
git stash        # put them aside
git pull
git stash pop    # bring them back
```

**A merge conflict**
Two people changed the same lines. Git marks them in the file like this:

```
<<<<<<< HEAD
your version
=======
their version
>>>>>>> main
```

Pick what the file should say, delete the `<<<<<<<`, `=======`, and `>>>>>>>`
lines, save, then commit. If it looks frightening, stop and ask — do not guess.

**You committed to `main` by accident**
Don't panic and don't force-push. Say so in chat; it is straightforward to move
a commit onto a branch as long as nobody has built on top of it.

---

## Before you open a Pull Request

```bash
npm run lint     # must pass with no errors
npm run build    # must succeed
npm run dev      # then click through what you changed
```

If lint or build fails, it will fail for everyone else too.

---

## Things worth knowing about this codebase

**All arithmetic happens in milligrams and millilitres.** Values enter through
`src/dosage/unitConversions.js` and leave through it. Display units are a
separate layer and must never feed back into a calculation.

This is not a style preference. The calculator previously honoured the
body-weight unit selector in one code path and ignored it in another, which
produced a concentration 1000x wrong with no warning. If you add a unit
anywhere, route it through `unitConversions.js`.

**Errors never pass silently.** A calculation that cannot produce a trustworthy
number returns `undefined` and the UI says why. A blank output field with no
explanation is a bug.

**Safety numbers carry their source.** Every limit in `src/dosage/vehicles.js`
has a `source`, an `endpoint` (what was actually measured), and a `confidence`.
Where no published figure exists, that is recorded as `null` — never filled in
with something plausible. Do not add a number you cannot cite.

**Shared before specific.** Anything route-agnostic — unit conversion, dose per
subject, vehicle splitting — lives in `src/dosage/`. Only genuinely
method-specific logic gets its own module. Before writing a new calculator,
check what already exists.

# NutriTrack – Food Calorie Log

NutriTrack is a responsive food calorie tracker built as a BSc Computer Science capstone mini project. It lets you log what you eat each day, compare your intake with a daily calorie target, browse earlier days and see a weekly summary chart. Everything runs in the browser, so there is no backend, no database and no API key.

> **Disclaimer:** Calorie values are estimates, and the daily target is not personalised medical or dietary advice. Speak to a doctor or registered dietitian for guidance that fits you.

## Features

- **Dashboard** with today's calories, the daily target (default 2,000 kcal, editable), remaining calories, percentage progress ring, number of entries, average calories per entry and a by-meal breakdown.
- **Add food form** with food name, meal (Breakfast, Lunch, Snack, Dinner), servings, calories per serving and an automatic total.
- **Sample foods** with approximate values: cooked rice, idli, dosa, chapati, egg, banana, apple, milk, oats, chicken and salad. Custom foods are supported too.
- **Food log** as a responsive table (stacked cards on phones) with edit and delete buttons, plus an Undo option after deleting.
- **Filter by meal**, with live counts for each meal.
- **Clear this day** with a confirmation dialog.
- **Date selector** (previous/next day, date picker, Today button) so every day has its own log and totals.
- **Weekly summary chart** (Monday to Sunday) built with CSS only. Click a bar to open that day.
- **Saved automatically** with `localStorage`, organised by local calendar date.
- **Reset demo data** with a confirmation dialog.
- Friendly empty states, form validation, accessible labels, keyboard-friendly controls and toast feedback messages.

## Technologies

- HTML5
- CSS3 (custom properties, grid, flexbox, no frameworks)
- Vanilla JavaScript (ES2017, no libraries)
- Browser `localStorage` for saving data
- Google Fonts (optional; the page falls back to system fonts when offline)

## Project structure

```
nutritrack/
├── index.html   # page structure
├── style.css    # all styling
├── script.js    # all logic
└── README.md
```

## Run locally

**Option 1 – just open the file**

1. Download or clone the project folder.
2. Double-click `index.html`. It opens in your default browser and works straight away.

**Option 2 – tiny local server (optional)**

```bash
cd nutritrack
python3 -m http.server 8000
```

Then open <http://localhost:8000>. You can also use the *Live Server* extension in VS Code.

## Deploy to GitHub Pages

1. Create a free account at <https://github.com> if you do not have one.
2. Click **New repository**, name it (for example `nutritrack`), keep it **Public** and click **Create repository**.
3. Upload the files:
   - **Using the website:** click **Add file → Upload files**, drag in `index.html`, `style.css`, `script.js` and `README.md` (so `index.html` sits at the top level of the repository, not inside another folder), then click **Commit changes**.
   - **Using Git:**
     ```bash
     cd nutritrack
     git init
     git add .
     git commit -m "Add NutriTrack"
     git branch -M main
     git remote add origin https://github.com/<your-username>/nutritrack.git
     git push -u origin main
     ```
4. Open the repository's **Settings → Pages**.
5. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
6. Choose the branch **main** and the folder **/(root)**, then click **Save**.
7. Wait about a minute and refresh the Pages screen. Your site will be live at:
   `https://<your-username>.github.io/nutritrack/`

All file links in the project are relative (`style.css`, `script.js`), so they work the same locally and on GitHub Pages.

## How your data is stored

Entries and the calorie target are saved under the key `nutritrack.v1` in `localStorage`, grouped by local date (for example `2026-10-20`). Data stays in the browser you used. Clearing site data, using private browsing or switching device starts a fresh log.

## Testing checklist

- Add, edit and delete an entry, then refresh the page and confirm the data is still there.
- Change the target and confirm remaining calories and the ring update.
- Switch to another date and confirm the totals change.
- Filter by each meal and confirm the counts match.
- Clear a day and reset demo data, confirming both dialogs.
- Resize the window to phone width and confirm the layout adapts.

## License

Created for educational purposes as a college mini project.

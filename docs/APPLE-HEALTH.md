# Apple Health sync

Steps, calories burned, exercise minutes, resting heart rate, weight and individual workouts, pushed from your iPhone into the tracker once a day.

Apple Health has no cloud API: your Health data lives on the phone, so the phone has to send it. A Shortcuts automation reads yesterday's numbers each morning and posts them to the app. No extra services, no cost, no AI tokens.

## How the endpoint works

- `POST /api/activity/ingest` on your deployed app.
- Auth: header `Authorization: Bearer <APP_PASSWORD>` (the same password you sign in with). The route is exempt from cookie auth because Shortcuts cannot sign in.
- Every field except `date` is optional. Days without the Watch simply send steps alone and the app shows what it has.
- Merge semantics: a blank or missing field never overwrites a stored value, so re-running the shortcut is always safe and a weight-only push cannot wipe the morning's steps. The `workouts` array, when present, replaces that date's workouts (send `[]` to clear a date).
- Numbers may arrive as text and with decimals; the server coerces and rounds. Weight is kilograms.

Payload shape:

```json
{
  "date": "2026-08-09",
  "steps": 9432,
  "active_kcal": 612,
  "resting_kcal": 1698,
  "exercise_minutes": 38,
  "resting_hr": 58,
  "weight_kg": 82.4,
  "workouts": [
    { "activity_type": "Running", "duration_min": 32, "active_kcal": 315, "started_at": "07:12" }
  ]
}
```

## Test it first

From any computer, prove the endpoint works before touching Shortcuts (replace the domain and password):

```bash
curl -X POST https://your-app.vercel.app/api/activity/ingest \
  -H "Authorization: Bearer YOUR_APP_PASSWORD" \
  -H "Content-Type: application/json" \
  -d '{"date":"2026-08-09","steps":9432,"active_kcal":612,"resting_kcal":1698}'
```

Expect `{"ok":true,...}`, then check the Today view for that date.

## Build the shortcut (once, about 10 minutes)

Open Shortcuts on the iPhone, create a new shortcut, name it **Health Sync**. Exact wording of actions varies slightly between iOS versions; the action names below are searchable in the action picker.

**A. Yesterday's date**

1. **Date** action, set to Current Date.
2. **Adjust Date**: subtract 1 day.
3. **Format Date** on the adjusted date: Date Format Custom, format string `yyyy-MM-dd`. Rename this variable **Day**.

**B. The daily numbers**

4. **Find Health Samples** where Type is **Steps**; add a filter on Start Date so it covers yesterday (use the relative "yesterday" condition if your iOS offers it, otherwise "is between" yesterday 00:00 and yesterday 23:59).
5. **Calculate Statistics**: Sum of the samples from step 4. Rename **StepsSum**.
6. Repeat steps 4 and 5 for **Active Energy** (Sum, unit kcal) as **ActiveSum**, **Resting Energy** (Sum, kcal) as **RestingSum**, and **Exercise Minutes** (Sum) as **ExerciseSum**.
7. **Find Health Samples** where Type is **Resting Heart Rate**, yesterday; **Calculate Statistics**: Average. Rename **RestingHR**.
8. **Find Health Samples** where Type is **Weight**, yesterday, Sort by Start Date Latest First, Limit 1, unit kg. Rename **WeightSample**. On most days this is empty, which is fine; the server treats blank as no data.

**C. Workouts**

9. **Find Workouts** where Start Date is yesterday.
10. **Repeat with Each** over the result. Inside the loop:
    - **Format Date** on Repeat Item's Start Date, Custom format `HH:mm`.
    - **Dictionary** with: `activity_type` = Repeat Item's Workout Type (Text), `duration_min` = Repeat Item's Duration in minutes (Number), `active_kcal` = Repeat Item's Active Energy in kcal (Number), `started_at` = the formatted time.
    - **Add to Variable** named **WorkoutList**.

**D. Send it**

11. **Dictionary** (the payload): `date` = Day (Text), `steps` = StepsSum (Number), `active_kcal` = ActiveSum (Number), `resting_kcal` = RestingSum (Number), `exercise_minutes` = ExerciseSum (Number), `resting_hr` = RestingHR (Number), `weight_kg` = WeightSample (Number), `workouts` = WorkoutList (Array).
12. **Get Contents of URL**: your app's URL plus `/api/activity/ingest`; Method **POST**; Headers: `Authorization` = `Bearer YOUR_APP_PASSWORD`; Request Body: the Dictionary from step 11 (passing a Dictionary sends it as JSON).
13. Optional: **Show Notification** with the result, so a failed push is visible.

Run it once by hand. Shortcuts will ask for Health access (allow every requested type) and permission to contact your domain. Then check the app.

## Automate it

Shortcuts tab **Automation** > **+** > **Time of Day**: pick a time you are normally using the phone (for example 07:30), Daily, choose **Health Sync**, and set it to **Run Immediately** so it never asks.

## Notes and troubleshooting

- **Locked phone**: Health data cannot be read while the phone is locked, so an automation that fires mid-night can fail. Scheduling it for a waking hour avoids this; if a day is missed, just run the shortcut by hand, it backfills safely.
- **Steps look double**: the Health app de-duplicates iPhone and Watch step counts, but raw samples include both sources. If the app's steps run roughly double what Health shows, add a Source filter (your Apple Watch) to the Steps action in step 4.
- **No Watch that day**: active energy, resting energy and heart rate will be blank. The app shows steps alone and nothing breaks.
- **Weight**: only readings actually taken yesterday are sent, so monthly weigh-ins land on the right day. Weight display can be turned off in Settings.
- **Backfilling an older day**: temporarily change step 2 to subtract 2 (or more) days and run by hand, or post with curl using any date.

# Recruiting Operations Workbench

An interactive practice project for reviewing recruiting-pipeline records, spotting follow-up and scheduling gaps, identifying possible duplicates, and exporting a clean tracker.

**Project type:** independent portfolio practice project
**Data:** entirely synthetic
**Stack:** HTML, CSS, and vanilla JavaScript; no frameworks or external service required

## What it demonstrates

- A compact hiring-pipeline snapshot with stage counts and operational metrics.
- A follow-up queue for candidate updates, missing interviewer feedback, and unscheduled interviews.
- A possible-duplicate review flag that asks a recruiter to reconcile records before merging them.
- Search and filters for stage and record health.
- A detail view that keeps the next action and quality notes visible.
- CSV export for handoff or spreadsheet review.
- Privacy-aware sample design: no real candidate data, contact details, addresses, birth dates, or identity documents.

## Run locally

Open this folder in a local static web server, then visit `index.html`. For example, from this folder run `python -m http.server 8000` and open `http://localhost:8000`. Loading the JSON sample directly with a `file://` URL may be blocked by browser security rules.

## Files

- `index.html`, `styles.css`, `app.js` — the interactive dashboard.
- `data/candidates.json` — twelve fictional candidate records.
- `docs/WORKFLOW.md` — operating sequence and escalation points.
- `docs/METRIC_DEFINITIONS.md` — definitions for the dashboard counts.
- `templates/candidate_tracker_template.csv` — a blank field template, with no sample people.

## Important limits

This is a portfolio demonstration, not an ATS, not connected to any employer, and not a record of client work. It does not send email, schedule real interviews, store records, or make selection decisions. The examples show how I would structure a careful coordination workflow; they do not claim that I used these exact screens or software at Suma Overseas.

## Project provenance

This is an AI-assisted portfolio prototype prepared for Fuad Ashraf to review, test, and adapt. It is not evidence of client work or a claim that Fuad independently authored every part of the software. The candidate names, roles, dates, and situations in the dashboard are invented for demonstration.

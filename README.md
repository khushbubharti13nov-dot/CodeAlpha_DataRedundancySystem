# CodeAlpha_DataRedundancySystem

**Task 1 — Data Redundancy Removal System**  
CodeAlpha Cloud Computing Internship

---

## Overview
A fully client-side web application that validates, classifies, and deduplicates records before they are persisted to a cloud database. The system uses a multi-step validation pipeline including format checks, exact match detection, and fuzzy similarity scoring (Levenshtein distance algorithm).

## Features
- **7-step validation pipeline** — format, uniqueness, fuzzy, cross-field consistency
- **Levenshtein-based fuzzy detection** — catches near-duplicate records
- **Adjustable similarity threshold** (50%–95%) via slider
- **Real-time validation feedback** — pass/warn/fail per check
- **Cloud database view** — search, filter, remove records
- **Purge flagged records** — batch remove suspicious entries
- **Activity log** — full audit trail with timestamps
- **4 classification states** — Verified, Flagged, Blocked (exact), Blocked (invalid)

## How to Run
1. Clone or download this repository
2. Open `index.html` in any modern web browser
3. No server or dependencies required — runs entirely in the browser

## File Structure
```
CodeAlpha_DataRedundancySystem/
├── index.html   — Main HTML structure
├── style.css    — Stylesheet
├── script.js    — Validation logic & UI logic
└── README.md    — This file
```

## Validation Pipeline
| Step | Check | Action on Fail |
|------|-------|----------------|
| 1 | Name format | Block |
| 2 | Email format | Block |
| 3 | Department set | Block |
| 4 | Employee ID format (EMP-NNN) | Block |
| 5 | Exact email uniqueness | Block |
| 6 | Exact ID uniqueness | Block |
| 7 | Fuzzy similarity (Levenshtein) | Flag |
| 8 | Cross-field consistency | Warn/Flag |

## Tech Stack
- HTML5, CSS3, Vanilla JavaScript
- Levenshtein distance algorithm for fuzzy matching
- No external libraries or frameworks required

## Author
CodeAlpha Internship — Cloud Computing Track

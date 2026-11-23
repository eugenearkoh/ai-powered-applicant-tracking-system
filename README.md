# AI-Powered Applicant Tracking System

A centralized dashboard to track, manage, and filter job applicants.

## Features
- Applicant lifecycle tracking: Applied, Interview, Selected, Rejected
- AI similarity scores: resumes are matched against job descriptions using TF-IDF cosine similarity (NLP)
- Candidate recommendations: top matches per job
- Automated deadline tracking: closes today / closing soon / closed
- Search, filter by job and status, sort by match score
- Resume upload (.txt, .md) or paste text; data saved in the browser (localStorage)

## Run locally
Open `index.html` in a browser. No build step or dependencies.

## Deploy on Vercel
1. Push this folder's files to your GitHub repository (files at the repo root).
2. In Vercel: Add New > Project > import the repository.
3. Framework Preset: **Other**. Leave Build Command and Output Directory empty. Deploy.

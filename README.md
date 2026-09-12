# Hire Me Maybe

**Find the right hire. Know why.**

An explainable resume ranking engine that combines keyword retrieval, semantic matching, and evidence-backed scoring to build better shortlists.

## Architecture

```
                    FRONTEND
             React + TypeScript + Vite
                         │
                         ▼
                  Node.js + Express
                   Application API
                    /          \
                   /            \
                  ▼              ▼
             Supabase       Python FastAPI
          PostgreSQL +      ML Processing
             Storage              │
                           ┌──────┴──────┐
                           ▼             ▼
                         BM25         MiniLM
                    Keyword Search  Semantic Search
                           │             │
                           └──────┬──────┘
                                  ▼
                             Score Fusion
                                  ▼
                              Ranking
                                  ▼
                              Evidence
                                  │
                                  ▼
                              Supabase
```

## Matching Methodology

1. **Requirement Decomposition** — Job description broken into atoms (must-have / preferred / nice-to-have)
2. **BM25 Keyword Retrieval** — Fuzzy keyword matching across resume chunks
3. **MiniLM Semantic Retrieval** — sentence-transformers semantic similarity
4. **Score Fusion** — Weighted combination (technical: 55% keyword / 45% semantic; experience: 25% keyword / 75% semantic)
5. **Evidence Selection** — Best resume snippet per requirement with page references
6. **Ranking** — Aggregate scores with must-have handling

## Services

### `/frontend` — React + Vite + Tailwind + shadcn/ui

```bash
cd frontend
npm install
npm run dev
```

### `/backend` — Node.js + Express + TypeScript

```bash
cd backend
npm install
npm run dev
```

### `/ml-service` — Python + FastAPI + sentence-transformers

```bash
cd ml-service
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```

## Environment Variables

Copy each service's `.env.example` → `.env` and fill in values. See individual `.env.example` files for required keys.

## Routes

| Route | Purpose |
|-------|---------|
| `/` | Landing / Dashboard |
| `/screening/new` | Upload JD + resumes |
| `/screening/:id/processing` | Processing pipeline progress |
| `/screening/:id/results` | Ranking dashboard |
| `/screening/:id/candidate/:candidateId` | Candidate analysis |
| `/screening/:id/compare` | Candidate comparison |
| `/screening/:id/insights` | JD quality / bias insights |

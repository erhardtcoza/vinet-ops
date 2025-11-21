# Vinet Ops – Modular Cloudflare Worker

Single Cloudflare Worker powering:

- `new.vinet.co.za` – client-facing splash, landing, self-signup (Turnstile)
- `dash.vinet.co.za` – admin dashboard (tariffs, users, tasks, audit, time)
- `agent.vinet.co.za` – field agent PWA (tasks, stock capture, time-tracking)

Backed by:

- D1 database (`vinet-ops`)
- R2 bucket (`vinet-ops-media`)
- KV (`AUTH`, `RATE`, `COVERAGE`)
- Splynx API (tariffs, leads, inventory, scheduling)
- WhatsApp Cloud API (OTP + task notifications)

## Setup

1. **Create D1 DB**

```bash
wrangler d1 create vinet-ops
wrangler d1 execute vinet-ops --local --file=./schema.sql

# See backend repo: velo-crm-backend/deploy/DIGITALOCEAN.md

## Quick secrets for this frontend repo

| Secret | Purpose |
|--------|---------|
| `DIGITALOCEAN_ACCESS_TOKEN` | doctl auth |
| `DO_REGISTRY` | e.g. `registry.digitalocean.com/velo-crm` |
| `DO_APP_ID` | App Platform app UUID (optional until app exists) |
| `VITE_API_URL` | Public API URL baked into the Vite build |

Workflow: `.github/workflows/deploy-digitalocean.yml` (runs on push to `main`).

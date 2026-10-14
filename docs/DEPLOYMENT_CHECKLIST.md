# Signal Lost - Railway deployment and release checklist

## Important limitations
- Rooms and sessions are stored **in memory**. Use **one replica** only; redeploys/restarts erase rooms and disconnect active games. This is a deliberate prototype constraint, not production persistence.
- An OpenAI key is optional; the narrative falls back to scripted text when absent. Never put the key in browser code or commit it to git.
- A public URL has NOT been deployed or tested as part of this release package.

## Deploy on Railway
1. Unzip this bundle and push the `signal-lost` folder to a **private GitHub repository** (or deploy the folder using Railway CLI).
2. In Railway, create a project, choose **Deploy from GitHub repo**, and select the repository. Railway will detect `railway.json` and use the included Dockerfile.
3. Keep exactly **one running replica** and do not enable autoscaling to multiple replicas: the game does not have a shared room store.
4. Set variables `NODE_ENV=production`, `HOST=0.0.0.0`, and optionally `OPENAI_API_KEY` and `OPENAI_MODEL` (see `.env.example`). Railway provides `PORT` automatically.
5. In Railway **Networking**, generate a public domain. Copy its full HTTPS origin (e.g. `https://your-project.up.railway.app`).
6. Add `PUBLIC_ORIGIN` as that exact origin (no path), then redeploy. This ensures browser-origin validation matches the public site.
7. Open `https://your-domain/api/health` and confirm JSON reports `ok: true` and version `1.0.0-rc1`.
8. Open the public root page on desktop and mobile. Create a room on one device and join from another using the six-character code. Complete an entire game, retry after a wrong answer, test a disconnect/reconnect, and play again.
9. If you enabled OpenAI, observe mission-director text after a success/failure event and review Railway logs for errors. Never share or screenshot API keys.
10. Submit the publicly reachable game URL in Handshake along with the title, cover image and description before the contest deadline. The official rules do not provide the complete separate mission technical brief.

## Release gate
- [ ] Health endpoint returns 200 over HTTPS
- [ ] Landing page and assets load without console errors
- [ ] Two real devices join the same room over different networks
- [ ] 2-player game finishes with synchronized clocks and roles
- [ ] 4-player game tested (recommended)
- [ ] Reconnection and pause behavior checked
- [ ] AI director tested with a real API key if enabled
- [ ] Mobile layout tested on actual phones
- [ ] No API keys in client bundle, git repository, or screenshots
- [ ] Public URL works in private/incognito browser without login
- [ ] Contest cover image, description, and title finalized

## Troubleshooting
- **403 This origin is not allowed**: ensure `PUBLIC_ORIGIN` matches the browser's HTTPS origin exactly.
- **Room not found after restart**: expected with in-memory rooms. Create a new room.
- **Players in different rooms despite same code**: verify Railway runs one replica and there is only one deployment receiving traffic.
- **AI messages use fallback text**: verify `OPENAI_API_KEY`, model access, and outbound networking. Gameplay still works without AI.
- **No SSE events**: verify network/proxy allows long-lived `text/event-stream` connections; inspect browser Network panel.

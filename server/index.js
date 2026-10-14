import { createGameServer } from './app.js';
const port = Number(process.env.PORT || 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be 1-65535.');
const app = createGameServer();
await app.listen(port, process.env.HOST || '0.0.0.0');
console.log(`Signal Lost is online at http://localhost:${port}`);
console.log('One server, one shared crew. API keys never leave this process.');
let closing = false;
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, async () => {
  if (closing) return;
  closing = true;
  await app.close();
  process.exit(0);
});

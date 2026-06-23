## Setup inside the backend
```sh
bun create hono@latest
```
### Template chosen - bun
We have other options such as `aws-lambda`, `cloudflare-workers`, `lambda-edge`, `fastly`, `deno`, these are all serverless/edge adapters and they wrap Hono's fetch handler for a request/response-per-invocation model.
That's incompatible with two things:

1. Native websocket: Bun's WS upgrade `(server.upgrade() + websocket: {open,message,close})` only exists on `Bun.serve()`. `Lambda/Workers/Lambda@Edge` don't hold persistent connections at all (Lambda has no long-lived process; Workers' WS support is a different, Durable-Objects-shaped model).

2. Docker - K8: Will be running this as a long-lived containerized process with its own port, not as a function deployed to a provider's runtime. And the Bun template scaffolds exactly that. A plain `Bun.server()` entry point we can control fully

To install dependencies:
```sh
bun install
```

To run:
```sh
bun run dev
```

open http://localhost:3000

# Contributing to @empellio/upload-chunked

Thanks for your interest in contributing!

## Setup
- Node 18+
- `npm i`
- `npm run build`
- `npm test`

## Development
- Code is in `src/`, built to `dist/` via `tsup`.
- Run `npm run dev` for watch mode.
- Tests: `vitest` in `tests/`.
- Examples under `examples/` (Express/Fastify/Koa/Browser).

## Coding style
- TypeScript, strict mode.
- Follow the existing formatting. Prefer clear, verbose names.
- Add types for public APIs. Avoid `any`.

## Commits & releases
- Conventional commits preferred.
- Please include tests for features/bugfixes.

## Pull requests
- Keep PRs focused and small.
- Update docs in `DOCS/` if you modify APIs or behavior.

## Security
- Do not include secrets/keys in source.
- Report security issues privately.

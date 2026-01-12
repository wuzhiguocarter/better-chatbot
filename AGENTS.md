# Repository Guidelines

## Project Structure & Module Organization
- App code lives in `src`.
  - `src/app` (Next.js routes, API, middleware)
  - `src/components` (UI; reusable components in PascalCase)
  - `src/lib` (helpers: auth, db, ai, validations, etc.)
  - `src/hooks` (React hooks: `useX`)
- Assets in `public/`. End‑to‑end tests in `tests/`. Scripts in `scripts/`. Docker files in `docker/`.

## Build, Test, and Development Commands
- `pnpm dev` — Run the app locally (Next.js dev server).
- `pnpm build` / `pnpm start` — Production build and run.
- `pnpm lint` / `pnpm lint:fix` — ESLint + Biome checks and autofix.
- `pnpm format` — Format with Biome.
- `pnpm test` / `pnpm test:watch` — Unit tests (Vitest).
- `pnpm test:e2e` — Playwright tests; uses `playwright.config.ts` webServer.
- DB: `pnpm db:push`, `pnpm db:studio`, `pnpm db:migrate` (Drizzle Kit).
- Docker: `pnpm docker-compose:up` / `:down` to run local stack.

## Coding Style & Naming Conventions
- TypeScript everywhere. Prefer `zod` for validation.
- Formatting via Biome: 2 spaces, LF, width 80, double quotes.
- Components: `PascalCase.tsx`; hooks/utilities: `camelCase.ts`.
- Co-locate small module tests next to code; larger suites under `tests/`.
- Keep modules focused; avoid circular deps; use `src/lib` for shared logic.

## Testing Guidelines
- Unit tests: Vitest, filename `*.test.ts(x)`.
- E2E: Playwright under `tests/`, filename `*.spec.ts`.
- Run locally: `pnpm test` and `pnpm test:e2e` (ensure app is running or let Playwright start via config).
- Add tests for new features and bug fixes; cover happy path + one failure mode.

## Commit & Pull Request Guidelines
- Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`, etc. Example: `feat: add image generation tool`.
- Branch names: `feat/…`, `fix/…`, `chore/…`.
- PRs: clear description, linked issues, screenshots or terminal output when UI/CLI changes; list test coverage and manual steps.
- Before opening PR: `pnpm check` (lint+types+tests) should pass.

## Security & Configuration Tips
- Copy `.env.example` to `.env`; never commit secrets. For local HTTP use `NO_HTTPS=1` or `pnpm build:local`.
- If using DB/Redis locally, start services via Docker scripts or your own stack.

---

## RAGFlow Integration

### Architecture Overview
RAGFlow integration provides document parsing and chunk extraction for uploaded files (audio, PDF, Office docs, etc.).

**Data Flow:**
```
User Upload File
    ↓
Upload to Storage (existing)
    ↓
Upload to RAGFlow API → Get document_id
    ↓
Update Document Config (chunk_method, parser_config)
    ↓
Trigger Parse → Poll Status (RUNNING → DONE/FAIL)
    ↓
Fetch Chunks → Store in threadFilesContext
    ↓
Send Message → Inject Chunks into Context
```

### Core Modules

#### `src/config/ragflow.ts`
- Configuration management for RAGFlow API
- Environment variables: `RAGFLOW_API_BASE`, `RAGFLOW_API_KEY`, `RAGFLOW_DATASET_ID`
- MIME type support: `RAGFLOW_SUPPORTED_MIME_TYPES`

#### `src/lib/ragflow-client.ts`
- HTTP client wrapper for RAGFlow API
- Functions:
  - `uploadDocument(file: File): Promise<string>`
  - `updateDocumentConfig(documentId: string): Promise<void>`
  - `parseDocuments(documentIds: string[]): Promise<void>`
  - `waitForDocumentDone(documentId: string): Promise<'DONE' | 'FAIL'>`
  - `listChunks(documentId: string): Promise<string[]>`

#### `src/store/thread-files-context.ts`
- Zustand store for managing parsed chunks
- State structure: `byThreadId[threadId][documentId]`
- Methods: `setStatus`, `setChunks`, `getThreadContext`, `clearThreadContext`

### Usage Patterns

#### Adding New File Type Support
1. Update `RAGFLOW_SUPPORTED_MIME_TYPES` in `.env`
2. Test upload and parsing flow

#### Customizing Parser Config
Modify `updateDocumentConfig()` body in `ragflow-client.ts`:
```typescript
const body = {
  chunk_method: 'naive', // 'naive' | 'qa' | 'table' | 'paper' | 'book' | 'laws' | 'manual'
  parser_config: {
    chunk_token_num: 256,
    layout_recognize: true,
    // ... other config
  },
  enabled: 1,
};
```

#### Extending Context Injection Logic
Modify `submit()` in `prompt-input.tsx` to customize chunk injection:
```typescript
const ragflowContextText = ragflowChunks
  .map(c => `【文档：${c.name}】\n${c.content}`)
  .join('\n\n----\n\n');
```

### Best Practices

#### Error Handling
- All RAGFlow API calls wrapped in try-catch
- Status updates: `UPLOADING` → `PARSING` → `READY`/`ERROR`
- UI shows status indicators (loading spinner, success/error icons)

#### Timeout Configuration
Default timeout: 60 seconds (`timeoutMs: 60000`)
Adjust in `waitForDocumentDone()` based on file size:
```typescript
await waitForDocumentDone(documentId, {
  timeoutMs: file.size > 10 * 1024 * 1024 ? 120000 : 60000, // 2min for >10MB
});
```

#### Performance Optimization
- Process files in parallel (already implemented)
- Cache parsed chunks if re-uploading same file
- Limit concurrent uploads in production

### Debugging Guide

#### Enable Verbose Logging
```typescript
console.log('RAGFlow upload:', file.name);
console.log('Document ID:', documentId);
console.log('Parse status:', doc.run);
console.log('Chunks count:', chunks.length);
```

#### Check RAGFlow Web UI
1. Access `http://localhost:9621`
2. Navigate to "Knowledge Base" → "Datasets"
3. View document parsing status and chunks
4. Check logs for errors

#### Common Issues

**Issue: Upload fails with 401 Unauthorized**
- Solution: Check `RAGFLOW_API_KEY` in `.env`
- Generate new key from RAGFlow settings

**Issue: Parsing stuck in RUNNING status**
- Solution: Check RAGFlow server logs
- Verify `RAGFLOW_DATASET_ID` is correct
- Restart RAGFlow if needed

**Issue: Chunks array is empty**
- Solution: Verify file format is supported
- Check `parser_config` settings
- Try different `chunk_method`

**Issue: Context not injected in message**
- Solution: Check `isRAGFlowSupported()` returns true for file type
- Verify `getThreadContext()` returns chunks
- Check `submit()` function logic

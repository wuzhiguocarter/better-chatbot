# RAGFlow Troubleshooting Guide

This guide helps you troubleshoot common issues when using RAGFlow integration in better-chatbot.

## Connection Issues

### RAGFLOW_API_BASE Configuration Error

**Symptoms:**
- Document upload fails with connection refused
- Error message: "RAGFlow GET error: ECONNREFUSED"

**Solutions:**
1. Verify RAGFlow is running:
   ```bash
   # Check if RAGFlow container is running
   docker ps | grep ragflow

   # Check RAGFlow logs
   docker logs <ragflow-container-id>
   ```

2. Check environment variable in `.env`:
   ```bash
   # Should match your RAGFlow deployment
   RAGFLOW_API_BASE=http://localhost:9621
   ```

3. Test RAGFlow API directly:
   ```bash
   curl http://localhost:9621/api/v1/datasets
   ```

### CORS Cross-Origin Error

**Symptoms:**
- Browser console shows CORS errors
- Upload fails with network error

**Solutions:**
1. If accessing from different domain, configure CORS in RAGFlow settings
2. Ensure both app and RAGFlow use same protocol (http/https)
3. For local development with HTTPS, use `NO_HTTPS=1`:
   ```bash
   NO_HTTPS=1 pnpm dev
   ```

### API Key Authentication Failed (401 Unauthorized)

**Symptoms:**
- Error: "RAGFlow GET/POST error: 401"

**Solutions:**
1. Verify `RAGFLOW_API_KEY` in `.env`:
   ```bash
   # Check if key exists
   cat .env | grep RAGFLOW_API_KEY
   ```

2. Generate new API key:
   - Navigate to `http://localhost:9621/settings`
   - Create new API key
   - Copy to `.env`

3. Restart the application:
   ```bash
   pnpm dev
   ```

---

## Document Parsing Issues

### Parsing Timeout (60 seconds)

**Symptoms:**
- Status stuck in "PARSING..."
- Error: "Wait document parse timeout"

**Solutions:**

1. Increase timeout for large files:
   ```typescript
   // In src/lib/ragflow-client.ts
   await waitForDocumentDone(documentId, {
     timeoutMs: file.size > 10 * 1024 * 1024 ? 120000 : 60000, // 2min for >10MB
   });
   ```

2. Check RAGFlow server resources:
   ```bash
   # Check CPU/memory usage
   docker stats

   # Check RAGFlow logs for errors
   docker logs <ragflow-container-id> --tail 100
   ```

3. Reduce file size:
   - Split large documents into smaller parts
   - Compress files before upload

### Parsing Failed (Unsupported Format)

**Symptoms:**
- Status shows "ERROR: Parse failed"
- RAGFlow logs show unsupported format error

**Solutions:**

1. Verify file format is supported:
   ```bash
   # Check file MIME type
   file --mime-type your-file.pdf

   # Verify in supported list
   cat .env | grep RAGFLOW_SUPPORTED_MIME_TYPES
   ```

2. Add missing MIME type to `.env`:
   ```bash
   # Add your custom MIME type
   RAGFLOW_SUPPORTED_MIME_TYPES=...,application/your-custom-type
   ```

3. Try different `chunk_method`:
   ```typescript
   // In src/lib/ragflow-client.ts updateDocumentConfig()
   const body = {
     chunk_method: 'qa', // Try 'qa', 'table', 'paper', 'book'
     parser_config: { ... },
   };
   ```

### Chunks Array is Empty

**Symptoms:**
- Parsing completes successfully (status: READY)
- But `chunks.length` is 0

**Solutions:**

1. Check parser configuration:
   ```bash
   # Review RAGFlow dataset parser settings
   # Navigate to: http://localhost:9621/datasets/<dataset-id>/documents/<doc-id>
   ```

2. Verify file content:
   ```bash
   # Check if file is not empty
   ls -lh your-file.pdf

   # Try to extract text manually
   pdftotext your-file.pdf -
   ```

3. Adjust `chunk_token_num`:
   ```typescript
   // In src/lib/ragflow-client.ts
   const body = {
     parser_config: {
       chunk_token_num: 128, // Reduce from default 256
     },
   };
   ```

### Status Stuck in RUNNING

**Symptoms:**
- Document status shows "RUNNING" indefinitely
- No progress in parsing

**Solutions:**

1. Check RAGFlow queue status:
   ```bash
   # Check RAGFlow logs
   docker logs <ragflow-container-id> | grep -i "parse"

   # Check for stuck tasks
   docker exec <ragflow-container-id> ps aux | grep -i ragflow
   ```

2. Restart RAGFlow:
   ```bash
   # Restart RAGFlow container
   docker restart <ragflow-container-id>

   # Or recreate container
   docker-compose -f docker/ragflow.yml up -d --force-recreate
   ```

3. Verify `RAGFLOW_DATASET_ID`:
   ```bash
   # Check dataset exists in RAGFlow
   # Navigate to: http://localhost:9621/datasets

   # Verify ID matches .env
   cat .env | grep RAGFLOW_DATASET_ID
   ```

---

## Performance Issues

### Large File Processing Slow

**Symptoms:**
- Files >10MB take very long to parse
- UI becomes unresponsive

**Solutions:**

1. Implement file size limit:
   ```typescript
   // In src/hooks/use-thread-file-uploader.ts
   const MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

   if (file.size > MAX_SIZE_BYTES) {
     toast.error(`${file.name}: file too large (>50MB)`);
     continue;
   }
   ```

2. Add user progress feedback:
   - Show estimated processing time
   - Display current step (uploading → parsing → done)

3. Use background processing:
   ```typescript
   // Move parsing to Web Worker if needed
   // Or use server-side processing
   ```

### Memory Usage High

**Symptoms:**
- Browser tab crashes
- Node.js process out of memory

**Solutions:**

1. Limit concurrent uploads:
   ```typescript
   // Process files one by one instead of parallel
   for (const file of files) {
     await processFile(file);
   }
   ```

2. Clear unnecessary data:
   ```typescript
   // Clear old chunks after sending message
   clearThreadContext(threadId);
   ```

3. Increase Node.js memory limit:
   ```bash
   # In package.json scripts
   "dev": "NODE_OPTIONS='--max-old-space-size=4096' next dev"
   ```

---

## UI Display Issues

### Status Indicator Not Updating

**Symptoms:**
- Parsing status shows "PARSING..." even when done
- Success/Error indicators don't appear

**Solutions:**

1. Check Zustand store:
   ```typescript
   // Add debug logging
   const { getThreadContext } = useThreadFilesContextStore();
   console.log('Thread context:', getThreadContext(threadId));

   // Verify status updates
   const store = useThreadFilesContextStore.getState();
   console.log('Full state:', store);
   ```

2. Check component reactivity:
   ```typescript
   // Ensure component subscribes to store updates
   const fileParseStatus = useThreadFilesContextStore(
     (s) => s.byThreadId[threadId],
   );

   console.log('Parse status:', fileParseStatus);
   ```

3. Verify `threadId` is correct:
   ```typescript
   // Debug threadId
   console.log('Current threadId:', threadId);

   // Check store key exists
   const store = useThreadFilesContextStore.getState();
   console.log('Store keys:', Object.keys(store.byThreadId));
   ```

### Progress Bar Stuck

**Symptoms:**
- Upload progress bar at 99%
- Parser status indicator loading forever

**Solutions:**

1. Check API response:
   ```typescript
   // Add logging in ragflow-client.ts
   console.log('Upload response:', data);

   console.log('Parse status:', doc.run);
   ```

2. Verify error handling:
   ```typescript
   // Ensure errors are caught and handled
   try {
     await waitForDocumentDone(documentId);
   } catch (err) {
     console.error('Wait failed:', err);
     setStatus(threadId, documentId, 'ERROR', {
       error: err.message,
     });
   }
   ```

3. Check network tab in browser:
   - Look for failed requests
   - Check response codes
   - Verify request payloads

---

## Debugging Steps

### 1. Check Environment Variables

```bash
# Verify all RAGFlow env vars are set
env | grep RAGFLOW

# Check .env file
cat .env | grep -A 5 "RAGFLOW"
```

### 2. Test RAGFlow API Connection

```bash
# Test basic connectivity
curl http://localhost:9621/api/v1/datasets

# Test with authentication
curl -H "Authorization: Bearer YOUR_API_KEY" \
     http://localhost:9621/api/v1/datasets/YOUR_DATASET/documents
```

### 3. Check RAGFlow Logs

```bash
# Follow RAGFlow logs in real-time
docker logs -f <ragflow-container-id>

# Check for errors
docker logs <ragflow-container-id> | grep -i error

# Check recent logs
docker logs <ragflow-container-id> --tail 50
```

### 4. Enable Verbose Logging

```typescript
// In src/components/prompt-input.tsx
const handleFileSelect = async (e) => {
  console.log('📂 File select triggered', e.target.files);

  for (const file of Array.from(list)) {
    console.log('📄 Processing file:', file.name, file.type);

    try {
      console.log('⬆️ Uploading to RAGFlow...');
      const documentId = await uploadDocument(file);
      console.log('✅ Upload complete, documentId:', documentId);

      console.log('⚙️ Updating config...');
      await updateDocumentConfig(documentId);

      console.log('🔄 Parsing document...');
      await parseDocuments([documentId]);

      console.log('⏳ Waiting for parsing...');
      const result = await waitForDocumentDone(documentId);
      console.log('🎉 Parsing result:', result);

      const chunks = await listChunks(documentId);
      console.log('📦 Chunks extracted:', chunks.length);

      setChunks(threadId, documentId, chunks);
    } catch (err) {
      console.error('❌ Error processing file:', err);
    }
  }
};
```

### 5. Check Browser Console

- Open Developer Tools (F12)
- Check Console tab for errors
- Look for:
  - Network errors (red text)
  - Unhandled promise rejections
  - React errors
  - CORS issues

---

## Common Error Codes

### 401 Unauthorized

**Cause:** Invalid or missing API key

**Solution:**
```bash
# Verify RAGFLOW_API_KEY
cat .env | grep RAGFLOW_API_KEY

# Generate new key at http://localhost:9621/settings
# Update .env and restart app
pnpm dev
```

### 404 Not Found (dataset/document)

**Cause:** Incorrect dataset ID or document ID

**Solution:**
```bash
# Verify dataset exists
curl -H "Authorization: Bearer YOUR_API_KEY" \
     http://localhost:9621/api/v1/datasets/YOUR_DATASET

# Check correct DATASET_ID
cat .env | grep RAGFLOW_DATASET_ID

# Update .env with correct ID
```

### 500 Internal Server Error

**Cause:** RAGFlow server error or misconfiguration

**Solution:**
```bash
# Check RAGFlow logs
docker logs <ragflow-container-id> --tail 100

# Restart RAGFlow
docker restart <ragflow-container-id>

# Check RAGFlow resources
docker stats | grep ragflow
```

### 503 Service Unavailable

**Cause:** RAGFlow server down or overwhelmed

**Solution:**
```bash
# Check if RAGFlow is running
docker ps | grep ragflow

# Restart RAGFlow
docker start <ragflow-container-id>

# Check system resources
free -h
df -h
```

---

## Getting Help

If you're still experiencing issues:

1. **Check existing issues:** [GitHub Issues](https://github.com/cgoinglove/better-chatbot/issues)
2. **Create a new issue:** Include:
   - Error messages
   - Environment variables (sanitized)
   - RAGFlow version
   - Browser console logs
   - Steps to reproduce
3. **Join Discord:** [Better Chatbot Discord](https://discord.gg/gCRu69Upnp)

---

## Additional Resources

- [RAGFlow Documentation](https://github.com/infiniflow/ragflow)
- [RAGFlow GitHub Issues](https://github.com/infiniflow/ragflow/issues)
- [Better Chatbot Documentation](https://github.com/cgoinglove/better-chatbot)

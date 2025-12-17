# Task: eval-i18n-003
**Team:** eval-i18n-team
**Priority:** High
**Estimated effort:** 45 minutes
**Created:** 2025-12-17

## Subject: Update server components to pass locale

## Description

Update server components in the evaluation module to properly handle locale and pass it to client components. The project already uses next-intl with the following infrastructure:

- Server-side: `getLocale()` from `next-intl/server` (used in layout.tsx)
- Client-side: `useTranslations()` hook
- Configuration: next-intl plugin is already configured in next.config.ts

### Components to Update

#### 1. `/src/app/(chat)/eval/page.tsx` - Main evaluation page

**Current Issues:**
- Server component doesn't receive locale parameter
- Client component `EvalPageClient` is instantiated without locale prop

**Required Changes:**
- Update function signature to accept `params` with locale
- Call `getLocale()` to get the current locale
- Pass `locale` prop to `<EvalPageClient locale={locale} />`

**Example Pattern:**
```typescript
export default async function EvalPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  // ... existing session check
  return <EvalPageClient locale={locale} />;
}
```

#### 2. `/src/app/(chat)/eval/[id]/page.tsx` - Evaluation detail page

**Current Issues:**
- Server component only receives `id` parameter, not locale
- Client component `EvalDetailPageClient` doesn't receive locale prop

**Required Changes:**
- Update function signature to accept both `locale` and `id` in params
- Extract locale from params
- Pass `locale` prop to `<EvalDetailPageClient evaluationId={id} locale={locale} />`

**Example Pattern:**
```typescript
export default async function EvalDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  // ... existing session check
  return <EvalDetailPageClient evaluationId={id} locale={locale} />;
}
```

#### 3. `/src/app/(chat)/eval/[id]/loading.tsx` - Remove Chinese comments

**Current Issues:**
- Contains Chinese-only comments that are just UI annotations
- Loading component should be locale-agnostic

**Required Changes:**
- Remove all Chinese comments (lines 7, 26, 44)
- Keep the code structure intact
- Ensure no locale-specific text remains in comments

**Comments to Remove:**
- `/* 头部骨架屏 */` (line 7)
- `/* 信息卡片骨架屏 */` (line 26)
- `/* 结果表格骨架屏 */` (line 44)

### Client Component Updates (Required but not in scope)

**Note:** The following client components will need to be updated to accept and use the locale prop, but this is outside the scope of this task:
- `EvalPageClient` (in `/src/components/eval/eval-page-client.tsx`)
- `EvalDetailPageClient` (in `/src/components/eval/detail/eval-detail-page.tsx`)

These components should:
- Accept `locale: string` as a prop
- Use the locale for any internationalization needs
- Pass locale down to child components that need it

### Verification Checklist

- [ ] `/src/app/(chat)/eval/page.tsx` accepts locale parameter
- [ ] `/src/app/(chat)/eval/page.tsx` passes locale to EvalPageClient
- [ ] `/src/app/(chat)/eval/[id]/page.tsx` accepts both locale and id parameters
- [ ] `/src/app/(chat)/eval/[id]/page.tsx` passes locale to EvalDetailPageClient
- [ ] All Chinese comments removed from loading.tsx
- [ ] TypeScript compilation succeeds
- [ ] No breaking changes to existing functionality

### Additional Context

The project uses next-intl with a setup that:
- Uses `getLocale()` on the server side
- Uses `useTranslations()` on the client side
- Has next-intl plugin configured in next.config.ts
- Does NOT use locale-based routing (no [locale] folder structure detected)

This means the locale is determined at runtime and needs to be explicitly passed from server to client components.

### Files to Modify

1. `/src/app/(chat)/eval/page.tsx`
2. `/src/app/(chat)/eval/[id]/page.tsx`
3. `/src/app/(chat)/eval/[id]/loading.tsx`

### Dependencies

- None blocked by this task
- Client components will need updates in a follow-up task to utilize the locale prop
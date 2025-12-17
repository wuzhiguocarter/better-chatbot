# Task: eval-i18n-002 - Update client components with useTranslations hook

## Task Information

- **Task ID**: eval-i18n-002
- **Assigned Team**: eval-i18n-team
- **Priority**: High
- **Estimated Effort**: 2 hours
- **Status**: Pending
- **Created Date**: 2025-12-17

## Task Description

Update all client components in the evaluation module to use the `useTranslations` hook instead of hardcoded Chinese text.

## Components to Update

The following 11 components need to be updated:

1. `/src/components/eval/eval-main-content.tsx`
2. `/src/components/eval/eval-card.tsx`
3. `/src/components/eval/create-eval-dialog.tsx`
4. `/src/components/eval/eval-page-client.tsx`
5. `/src/components/eval/detail/eval-detail-page.tsx`
6. `/src/components/eval/detail/eval-detail-header.tsx`
7. `/src/components/eval/detail/eval-info-cards.tsx`
8. `/src/components/eval/detail/eval-results-table.tsx`
9. `/src/components/eval/detail/eval-detail-table.tsx`
10. `/src/components/eval/detail/eval-metric-card.tsx`
11. `/src/components/eval/eval-pagination.tsx`

## Implementation Requirements

### For each component:

1. **Import useTranslations**
   ```typescript
   import { useTranslations } from 'next-intl';
   ```

2. **Create a t function with 'Eval' namespace**
   ```typescript
   const t = useTranslations('Eval');
   ```

3. **Replace all hardcoded Chinese text**
   - Identify all Chinese text strings in the component
   - Replace with appropriate `t()` calls
   - Use camelCase for translation keys

4. **Handle dynamic values properly**
   - For values like `{count}`, use interpolation: `t('itemsCount', { count })`
   - For dates: `t('createdOn', { date: formattedDate })`
   - For other dynamic values: ensure proper variable naming

5. **Ensure consistent key naming**
   - Use camelCase for all translation keys
   - Group related translations logically
   - Follow existing key patterns in the codebase

## Translation Key Examples

Based on common patterns found in evaluation components:

```typescript
// Headers and titles
t('evaluations') // "评估列表"
t('createEvaluation') // "创建评估"
t('evaluationDetails') // "评估详情"

// Status and actions
t('status') // "状态"
t('createTime') // "创建时间"
t('actions') // "操作"
t('view') // "查看"
t('edit') // "编辑"
t('delete') // "删除"

// Metrics and results
t('accuracy') // "准确率"
t('responseTime') // "响应时间"
t('totalTokens') // "总Token数"
t('successRate') // "成功率"

// Pagination
t('pageInfo', { current: 1, total: 10 }) // "第 1 页，共 10 页"
t('itemsPerPage') // "每页显示"
t('previousPage') // "上一页"
t('nextPage') // "下一页"
```

## Verification Checklist

For each component, ensure:

- [ ] All Chinese text has been replaced with `t()` calls
- [ ] Translation keys use camelCase naming
- [ ] Dynamic values are properly interpolated
- [ ] Component imports `useTranslations` from `next-intl`
- [ ] No hardcoded Chinese text remains
- [ ] Component still functions correctly after changes
- [ ] All translation keys are documented for the translation team

## Testing Requirements

1. **Visual Testing**: Verify all text displays correctly in the UI
2. **Functional Testing**: Ensure all buttons, labels, and messages work as expected
3. **Locale Testing**: Test with different locales if available
4. **Missing Keys**: Check for any missing translation keys in the console

## Translation Documentation

After completing the updates, create a list of all new translation keys used and provide it to the translation team for proper translations in all supported languages.

## Success Criteria

- ✅ All 11 components updated with `useTranslations` hook
- ✅ No hardcoded Chinese text remaining in evaluation components
- ✅ All translation keys follow camelCase naming convention
- ✅ Dynamic values properly interpolated
- ✅ Components function correctly after internationalization
- ✅ Translation key documentation provided

## Dependencies

- Ensure `next-intl` is properly configured in the project
- Verify that translation files for the 'Eval' namespace exist or are created
- Coordinate with the translation team for proper translations

## Notes

- Pay special attention to error messages and confirmation dialogs
- Ensure accessibility labels are also internationalized
- Consider pluralization if applicable (e.g., items count)
- Maintain consistency with existing internationalization patterns in the codebase
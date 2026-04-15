# Validation Criteria for Copilot Suggestions

This document defines the classification rules for determining whether a Copilot suggestion should be auto-applied, applied with caution, or skipped.

## High Confidence - Auto-Apply

These suggestions are objective, have low risk, and clear correct answers.

### Translation Key Issues

**Pattern recognition:**
- Body contains: "should be `X`" or "typo" or "incorrect key"
- The change is a simple string replacement in translation keys
- Clear singular/plural mismatch (e.g., `description` vs `descriptions`)

**Examples:**
```javascript
// Before: this.props.t('noRecordNamesOnDocument.descriptions')
// After:  this.props.t('noRecordNamesOnDocument.description')
```

**Why auto-apply:**
- Objective correctness (key either exists or doesn't)
- Low risk (translation system will show missing key if wrong)
- Easy to verify (check translation.json)

**Validation steps:**
1. Read translation.json to confirm correct key exists
2. Use Grep to find all usages of the incorrect key
3. Apply fix with Edit tool
4. Verify with another Grep that old key is gone

### Duplicate Keys

**Pattern recognition:**
- Body contains: "duplicate key" or "key already exists on line"
- JSON file context shows two identical keys
- Clear which one should be removed

**Examples:**
```json
// Before:
{
  "key": "value1",
  "key": "value2"  // duplicate
}

// After:
{
  "key": "value1"
}
```

**Why auto-apply:**
- JSON parsers only use one value (last wins)
- Clear correctness issue
- Low risk of breaking anything

**Validation steps:**
1. Read the JSON file
2. Identify both occurrences
3. Determine which to keep (usually first, but check context)
4. Remove the duplicate with Edit tool

### Capitalization Inconsistencies

**Pattern recognition:**
- Body mentions "capitalization" or "should be lowercase/uppercase"
- The fix maintains semantic meaning
- Follows existing convention in the file

**Examples:**
```json
// Before: "Use As A Source"
// After:  "Use as a source"
```

**Why auto-apply:**
- Clear consistency issue
- Follows codebase conventions
- Low risk (no semantic change)

**Validation steps:**
1. Read the file
2. Check surrounding entries for capitalization pattern
3. Confirm the suggestion matches the pattern
4. Apply fix

### Unused Imports

**Pattern recognition:**
- Body contains: "unused import" or "not used"
- Import statement removal
- No other changes

**Examples:**
```javascript
// Before: import { unused, used } from 'module';
// After:  import { used } from 'module';
```

**Why auto-apply:**
- Objectively verifiable (static analysis)
- No functional impact
- Code cleanup

**Validation steps:**
1. Verify the import is indeed unused (Grep for usage)
2. Apply removal
3. Note: ESLint would catch this too

## Medium Confidence - Apply With Caution

These suggestions are usually correct but require judgment or verification.

### Test Expectation Updates

**Pattern recognition:**
- Body mentions "test expects" or "assertion should be"
- Change is in a .test.js or .spec.js file
- Updates expect() or assertion statements

**Examples:**
```javascript
// Before: expect(text).toBe('old value');
// After:  expect(text).toBe('new value');
```

**Why caution:**
- Need to verify production code actually changed
- Could mask a regression if wrong
- Test might be testing the wrong thing

**Validation steps:**
1. Read the test file
2. Read the component being tested
3. Verify the production code actually renders/returns the new value
4. Confirm this isn't catching a real bug
5. Apply if production code is definitely correct

### Minor Refactoring

**Pattern recognition:**
- Body suggests "simplify" or "can be written as"
- Code change is functionally equivalent
- Small scope (single function)

**Examples:**
```javascript
// Before: if (x === true) return true; else return false;
// After:  return x === true;
```

**Why caution:**
- Subjective improvement
- May have reason for current structure
- Could affect readability

**Validation steps:**
1. Verify functional equivalence
2. Check if current code has a reason (comments, clarity)
3. If truly equivalent and clearer: apply
4. If debatable: skip

### Error Message Improvements

**Pattern recognition:**
- Body suggests better error message wording
- No functional change
- Improves clarity

**Examples:**
```javascript
// Before: throw new Error('Bad');
// After:  throw new Error('Invalid input: expected string, got number');
```

**Why caution:**
- Subjective wording
- May be intentionally terse
- Could affect logs/monitoring

**Validation steps:**
1. Check if error messages follow a pattern
2. Verify new message is actually clearer
3. Consider if it exposes too much detail
4. Apply if clearly better

## Low Confidence - Report Only

These suggestions require human judgment, design decisions, or have high risk.

### Subjective Style Preferences

**Pattern recognition:**
- Body uses "consider" or "might want to" or "could"
- Suggestion is opinion-based
- No clear "correct" answer

**Examples:**
- "Consider using async/await instead of promises"
- "Could destructure props for cleaner code"
- "Might want to extract this to a separate component"

**Why skip:**
- Style is subjective
- Current code may be intentional
- Not objectively wrong

**Action:**
- Report the suggestion
- Let developer decide

### Architectural Changes

**Pattern recognition:**
- Body suggests structural changes
- Affects multiple components
- Changes data flow or patterns

**Examples:**
- "Should lift state up to parent component"
- "Consider using context instead of prop drilling"
- "Could refactor to use hooks pattern"

**Why skip:**
- Requires design discussion
- High risk of breaking changes
- May have architectural reasons

**Action:**
- Report the suggestion
- Include link to comment
- Recommend team discussion

### Breaking Changes

**Pattern recognition:**
- Body suggests changes to public APIs
- Prop renames/removals
- Changes to exported functions
- Database schema changes

**Examples:**
- "Rename prop `data` to `items`"
- "Remove deprecated parameter"
- "Change return type to Promise"

**Why skip:**
- Could break consumers
- Requires version planning
- Needs coordination

**Action:**
- Report as requiring manual review
- Highlight breaking change risk
- Suggest issue/discussion creation

### Performance Optimizations

**Pattern recognition:**
- Body mentions "performance" or "optimize"
- Suggests caching, memoization, lazy loading
- Complex algorithmic changes

**Examples:**
- "Could memoize this calculation"
- "Consider lazy loading this component"
- "Use useMemo to prevent recalculation"

**Why skip:**
- Requires performance profiling
- May be premature optimization
- Need to measure actual impact

**Action:**
- Report the suggestion
- Recommend profiling first
- Let developer decide if needed

### Placeholder Text Removal

**Pattern recognition:**
- Body mentions "placeholder" or "TODO" or "[s]" bracket notation
- Suggests removing or replacing placeholder text

**Examples:**
```json
// Before: "key": "Some text [s]"
// After:  "key": "Some text"
```

**Why skip:**
- May be intentional marker for UX team
- Might need design review
- Could be i18n placeholder

**Action:**
- Report the suggestion
- Note it may need UX/design review
- Don't auto-remove

## Special Cases

### Confidence Modifiers

**Increase confidence if:**
- Multiple similar suggestions exist (pattern)
- ESLint/TypeScript would also flag this
- Follows documented style guide
- Fixes a crash/error

**Decrease confidence if:**
- Only one occurrence (might be intentional)
- Goes against project convention
- Affects public API
- Changes business logic

### Bulk Changes

If Copilot suggests the same fix across many files:
- Verify first occurrence manually
- If correct, auto-apply pattern to others
- Report count of bulk changes
- If any fail, report those separately

### Test-First Philosophy

For test files:
- Higher confidence for test updates (code drives tests)
- Lower confidence for test deletions (might hide bugs)
- Medium confidence for test additions (validate intent)

## Decision Tree

```
Is the issue objectively wrong? (typo, duplicate, syntax error)
  YES → High confidence

Does it require design/architecture decision?
  YES → Low confidence (report only)

Does it change behavior or business logic?
  YES → Low confidence (report only)

Is it a style preference with no clear convention?
  YES → Low confidence (report only)

Is it a test update matching production code change?
  YES → Medium confidence (verify first)

Is it a minor refactoring with clear benefit?
  YES → Medium confidence (verify first)

ELSE → Default to low confidence (report only)
```

## Validation Checklist

Before auto-applying ANY suggestion:

- [ ] Read the target file
- [ ] Verify the issue actually exists
- [ ] Check if already fixed
- [ ] Confirm the fix is correct
- [ ] Check for side effects
- [ ] Verify no conflicts with other suggestions
- [ ] Use Edit tool with exact string matching
- [ ] Record the change for reporting

When in doubt: **Skip and report.**

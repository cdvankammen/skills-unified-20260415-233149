---
name: copilot-review
description: Review and apply GitHub Copilot PR suggestions. Use when asked to "review copilot suggestions", "apply copilot comments", "check copilot feedback on PR", "address copilot PR review", or "fix copilot issues"
allowed-tools: Bash(gh:*), Read, Edit, Grep
version: 0.1.0
---

# Copilot Review - GitHub Copilot PR Suggestion Analyzer

## Purpose

This Skill fetches GitHub Copilot's PR review comments, validates their legitimacy, and automatically applies appropriate fixes.

## Core Principles

1. **High-confidence suggestions are auto-applied**: Translation key typos, duplicate keys, obvious inconsistencies
2. **Medium-confidence suggestions require judgment**: Test expectations, refactoring, error messages
3. **Low-confidence suggestions are reported only**: Subjective style, architecture, breaking changes
4. **Always verify before applying**: Read files, check context, ensure changes make sense

## How It Works

### Step 1: Fetch PR Information

**If no PR number provided:**
```bash
gh pr view --json number,url,title
```

**If PR number/URL provided as argument:**
Parse the PR number from the argument.

**Handle edge cases:**
- No PR found on current branch → Ask user for PR number
- Invalid PR number → Report error
- Branch not associated with PR → Guide user

### Step 2: Retrieve Copilot Comments

Fetch all PR review comments:
```bash
gh api repos/:owner/:repo/pulls/{PR_NUMBER}/comments --jq '.[] | select(.user.login == "Copilot") | {path: .path, line: .line, body: .body, position: .position, diff_hunk: .diff_hunk}'
```

**Parse the response for each comment:**
- `path`: File path where comment was made
- `line`: Line number in the file
- `body`: Comment text (may include ```suggestion block)
- `diff_hunk`: Context showing surrounding code
- `position`: Position in the diff

**Handle edge cases:**
- No Copilot comments found → Report "No Copilot suggestions found on PR #{number}"
- API errors → Report error and suggest checking permissions
- Empty response → Confirm no suggestions exist

### Step 3: Validate Each Suggestion

For each Copilot comment, analyze and categorize:

#### High Confidence (Auto-apply)

**Translation key issues:**
- Singular/plural inconsistencies (e.g., `description` vs `descriptions`)
- Typos in translation keys
- Duplicate translation keys
- Capitalization inconsistencies in translations

**Code issues:**
- Unused import removal
- Variable name typos that break functionality
- Obvious duplicate code

**Detection patterns:**
- Body contains phrases like "typo", "should be", "duplicate key"
- Suggestion block shows simple string/key replacement
- Issue is objective (not opinion)

#### Medium Confidence (Apply with caution)

**Test-related issues:**
- Test expectations that don't match updated code
- Mock implementations that need updating

**Code quality:**
- Error message improvements
- Console.log removal
- Minor refactoring

**Detection patterns:**
- Body mentions "test", "expect", "assertion"
- Suggestion involves test file changes
- Issue is about consistency

#### Low Confidence (Report only)

**Subjective suggestions:**
- Style preferences without clear convention
- Architectural recommendations
- Performance optimization suggestions
- Breaking API changes

**Detection patterns:**
- Body uses "consider", "might want to", "could"
- Suggestion requires design decisions
- Changes affect multiple files/components
- No clear "correct" answer

### Step 4: Apply Legitimate Suggestions

For high-confidence suggestions with ```suggestion blocks:

1. **Read the target file:**
   ```bash
   # Use Read tool
   ```

2. **Extract the suggestion:**
   - Parse the ```suggestion code block from the body
   - Note: The suggestion block contains the full replacement code
   - The diff_hunk shows the context and what to replace

3. **Locate the exact code to replace:**
   - Use the diff_hunk to identify the old code
   - Use the line number for context
   - Match indentation and formatting

4. **Apply the fix:**
   - Use Edit tool with exact old_string matching
   - Replace with the suggestion block content
   - Preserve indentation and formatting

5. **Track the change:**
   - Record file path and description
   - Note what was changed

For suggestions without code blocks but clear intent:

1. **Analyze the issue description**
2. **Determine the appropriate fix** based on the explanation
3. **Read the relevant file(s)**
4. **Apply the fix using Edit tool**
5. **Track the change**

### Step 5: Report Results

Provide a structured summary:

```
✓ Fetching Copilot suggestions from PR #XXXX...
  Found N suggestions across M files

✓ Applying legitimate suggestions...

  [1/N] path/to/file.js:123
        Fixed: Description of what was fixed

  [2/N] path/to/file.json:456
        Fixed: Another fix description

⊘ Skipped suggestions:

  [X/N] path/to/file.js:789
        Reason: Why it was skipped

  [Y/N] path/to/file.tsx:234
        Reason: Another skip reason

⚠ Manual review needed:

  [Z/N] path/to/complex.ts:567
        Issue: Complex change requiring human judgment
        URL: Link to comment

✓ Complete! Applied X/N suggestions, skipped Y, need manual review: Z

Next steps:
  - Run tests to verify changes: npm test
  - Review skipped suggestions manually if needed
  - Commit changes if tests pass
```

## Validation Criteria

See `references/validation-criteria.md` for detailed classification rules.

**Quick classification guide:**

| Issue Type | Confidence | Action |
|------------|-----------|--------|
| Translation key typo | High | Auto-apply |
| Duplicate key | High | Auto-apply |
| Capitalization mismatch | High | Auto-apply |
| Unused import | High | Auto-apply |
| Test expectation update | Medium | Apply with caution |
| Refactoring suggestion | Medium | Apply with caution |
| Style preference | Low | Report only |
| Architecture change | Low | Report only |
| Breaking change | Low | Report only |

## Common Patterns

See `references/common-patterns.md` for detailed pattern matching.

**Quick patterns:**

1. **Translation key mismatch:**
   - Pattern: `using key "X" but should be "Y"`
   - Action: Update translation key in component

2. **Duplicate translation key:**
   - Pattern: `duplicate key "X" on line N`
   - Action: Remove or rename duplicate

3. **Placeholder text:**
   - Pattern: `contains placeholder "[s]"`
   - Action: Usually skip (requires UX decision)

4. **Test expectation mismatch:**
   - Pattern: `test expects "X" but component shows "Y"`
   - Action: Update test expectation

5. **Capitalization inconsistency:**
   - Pattern: `should be "lowercase" not "Uppercase"`
   - Action: Fix capitalization to match convention

## Edge Cases

### Already Applied Suggestions
If the code has changed since the comment was made:
- Read the current file
- Check if the issue still exists
- If already fixed: Skip with "Already resolved"
- If still present but different: Report for manual review

### Conflicting Suggestions
If multiple suggestions affect the same code:
- Detect conflicts by checking line ranges
- Skip all conflicting suggestions
- Report: "Conflicting suggestions detected, manual review needed"

### Deleted/Moved Files
If the file no longer exists:
- Detect via Read tool failure
- Skip with "File no longer exists"
- Don't error out

### Multi-file Changes
If suggestion implies changes across multiple files:
- Treat as low confidence
- Report for manual review
- Explain why it needs human judgment

### Suggestions with No Code Block
If there's no ```suggestion block:
- Analyze the description carefully
- For high-confidence issues (typos, duplicates): Determine fix and apply
- For uncertain issues: Skip and report

## Best Practices

1. **Always read before editing**: Never edit a file you haven't read
2. **Preserve formatting**: Match existing indentation and style
3. **Verify context**: Check diff_hunk to ensure correct location
4. **One change at a time**: Apply suggestions sequentially
5. **Track everything**: Record all applied and skipped suggestions
6. **Be conservative**: When in doubt, skip and report
7. **Test after**: Remind user to run tests

## Invocation Examples

```bash
# Review current PR
/copilot-review

# Review specific PR by number
/copilot-review 3723

# Review PR by URL
/copilot-review https://github.com/owner/repo/pull/3723
```

## Example Workflow

User asks: "Apply copilot suggestions"

1. **Fetch PR**: `gh pr view --json number` → PR #3723
2. **Fetch comments**: Find 9 Copilot suggestions across 6 files
3. **Analyze each**:
   - Comment 1: Translation key typo → High confidence
   - Comment 2: Duplicate key → High confidence
   - Comment 3: Placeholder text → Low confidence (skip)
   - Comment 4: Test expectation → Medium confidence
   - Comment 5: Style preference → Low confidence (skip)
   - ... continue for all
4. **Apply fixes**:
   - Edit translation.json to fix typo
   - Remove duplicate key
   - Update test expectation
5. **Report**: "Applied 5/9 suggestions, skipped 4"

## Notes

- Only `gh` CLI commands are allowed via Bash tool (enforced by allowed-tools)
- The skill is read-only on production code philosophy: fixes based on Copilot's analysis
- Always provide actionable output for skipped suggestions
- Include PR comment URLs for manual review cases
- Remember: Copilot suggestions are AI-generated; validate before applying

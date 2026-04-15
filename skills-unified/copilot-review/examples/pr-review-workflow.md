# Copilot Review Workflow Example

This document walks through a complete example of using the copilot-review skill on PR #3723.

## Scenario

User asks: "Apply the copilot suggestions on this PR"

## Step 1: Fetch PR Information

```bash
$ gh pr view --json number,url,title
{
  "number": 3723,
  "url": "https://github.com/owner/repo/pull/3723",
  "title": "RIP-4622: Update content strings"
}
```

**Output to user:**
```
✓ Found PR #3723: RIP-4622: Update content strings
  https://github.com/owner/repo/pull/3723
```

## Step 2: Fetch Copilot Comments

```bash
$ gh api repos/owner/repo/pulls/3723/comments --jq '.[] | select(.user.login == "Copilot")'
```

**Result:** 9 Copilot suggestions found across 6 files

**Output to user:**
```
✓ Fetching Copilot suggestions from PR #3723...
  Found 9 suggestions across 6 files
```

## Step 3: Analyze Each Suggestion

### Suggestion 1: Translation Key Typo

**Comment data:**
```json
{
  "path": "src/RIP/components/documentDetails/NoRecordNamesOnDocument.js",
  "line": 10,
  "body": "The translation key should be `noRecordNamesOnDocument.description` (singular) not `descriptions` (plural).\n\n```suggestion\nthis.props.t('noRecordNamesOnDocument.description')\n```",
  "diff_hunk": "@@ -8,7 +8,7 @@ class NoRecordNamesOnDocument extends Component {\n   render() {\n-    const text = this.props.t('noRecordNamesOnDocument.descriptions');\n+    const text = this.props.t('noRecordNamesOnDocument.description');"
}
```

**Analysis:**
- **Pattern**: Translation key mismatch
- **Confidence**: High
- **Has suggestion block**: Yes
- **Decision**: Auto-apply

**Actions:**
1. Read `NoRecordNamesOnDocument.js`
2. Read `translation.json` to verify key exists
3. Apply fix with Edit tool

### Suggestion 2: Duplicate Translation Key

**Comment data:**
```json
{
  "path": "src/locales/en/translation.json",
  "line": 1682,
  "body": "Duplicate key 'noRecordNamesOnDocument.descriptions' found. This key already exists on line 1234. Remove this duplicate entry.\n\n```suggestion\n    \"description\": \"No names on the document.\",\n```",
  "diff_hunk": "@@ -1680,7 +1680,6 @@\n   \"noRecordNamesOnDocument\": {\n     \"description\": \"No names on the document.\",\n-    \"descriptions\": \"No names on the document.\",\n     \"title\": \"No Names on Document\""
}
```

**Analysis:**
- **Pattern**: Duplicate key
- **Confidence**: High
- **Has suggestion block**: Yes
- **Decision**: Auto-apply

**Actions:**
1. Read `translation.json`
2. Confirm duplicate exists
3. Remove duplicate line with Edit tool

### Suggestion 3: Capitalization Inconsistency

**Comment data:**
```json
{
  "path": "src/locales/en/translation.json",
  "line": 385,
  "body": "Capitalization should be consistent. Other similar entries use sentence case.\n\n```suggestion\n    \"useAsSource\": \"Use as a source\",\n```",
  "diff_hunk": "@@ -383,7 +383,7 @@\n   \"recordHints\": {\n-    \"useAsSource\": \"Use As A Source\",\n+    \"useAsSource\": \"Use as a source\","
}
```

**Analysis:**
- **Pattern**: Capitalization inconsistency
- **Confidence**: High
- **Has suggestion block**: Yes
- **Decision**: Auto-apply

**Actions:**
1. Read `translation.json`
2. Check surrounding entries for pattern
3. Confirm sentence case is the convention
4. Apply fix with Edit tool

### Suggestion 4: Test Expectation Update

**Comment data:**
```json
{
  "path": "src/RIP/components/documentDetails/NoRecordNamesOnDocument.test.js",
  "line": 45,
  "body": "Test expectation should match the updated translation text which no longer includes 'descriptions'.\n\n```suggestion\n    expect(text).toBe('No names on the document.');\n```",
  "diff_hunk": "@@ -43,7 +43,7 @@ describe('NoRecordNamesOnDocument', () => {\n     await zionRender(<NoRecordNamesOnDocument t={mockT} />);\n     const text = screen.getByText(/no names/i).textContent;\n-    expect(text).toBe('No names on the document. descriptions');\n+    expect(text).toBe('No names on the document.');"
}
```

**Analysis:**
- **Pattern**: Test expectation mismatch
- **Confidence**: Medium (need to verify)
- **Has suggestion block**: Yes
- **Decision**: Verify then apply

**Validation:**
1. Read test file
2. Read component file
3. Read translation.json to confirm actual text is "No names on the document."
4. Verify component uses correct key
5. ✓ Confirmed: component now uses `description` key which has text without "descriptions"
6. Apply fix with Edit tool

### Suggestion 5: Placeholder Text Removal

**Comment data:**
```json
{
  "path": "src/locales/en/translation.json",
  "line": 1421,
  "body": "This translation contains placeholder text '[s]' which should be removed or replaced with proper text.\n\n```suggestion\n    \"sourceDescription\": \"Document used as source\",\n```",
  "diff_hunk": "@@ -1419,7 +1419,7 @@\n   \"source\": {\n-    \"sourceDescription\": \"Document used as source [s]\",\n+    \"sourceDescription\": \"Document used as source\","
}
```

**Analysis:**
- **Pattern**: Placeholder text
- **Confidence**: Low (may need UX review)
- **Has suggestion block**: Yes
- **Decision**: Skip

**Reason:** `[s]` notation may be intentional i18n marker for plural forms or UX team placeholder

### Suggestion 6: Console.log Removal

**Comment data:**
```json
{
  "path": "src/RIP/components/documentDetails/DocumentHeader.js",
  "line": 34,
  "body": "Remove console.log statement before merging.\n\n```suggestion\n    // removed debug logging\n```",
  "diff_hunk": "@@ -32,7 +32,6 @@ class DocumentHeader extends Component {\n   handleSave = () => {\n-    console.log('Saving document:', this.props.documentId);\n     this.props.onSave(this.props.documentId);"
}
```

**Analysis:**
- **Pattern**: Debug logging
- **Confidence**: High
- **Has suggestion block**: Yes
- **Decision**: Auto-apply

**Actions:**
1. Read `DocumentHeader.js`
2. Confirm it's debug logging (not production logging)
3. Remove the line with Edit tool

### Suggestion 7: Style Preference

**Comment data:**
```json
{
  "path": "src/RIP/components/documentDetails/DocumentHeader.js",
  "line": 45,
  "body": "Consider destructuring props for cleaner code:\n\n```suggestion\n  render() {\n    const { title, documentId, onSave } = this.props;\n    return (\n```"
}
```

**Analysis:**
- **Pattern**: Style preference
- **Confidence**: Low (subjective)
- **Has suggestion block**: Yes
- **Decision**: Skip

**Reason:** Subjective style choice, current code is not wrong

### Suggestion 8: Another Duplicate Key

**Comment data:**
```json
{
  "path": "src/locales/en/translation.json",
  "line": 892,
  "body": "Duplicate key detected.\n\n```suggestion\n    \"save\": \"Save\",\n```"
}
```

**Analysis:**
- **Pattern**: Duplicate key
- **Confidence**: High
- **Has suggestion block**: Yes
- **Decision**: Auto-apply

**Actions:**
1. Read `translation.json`
2. Find and remove duplicate
3. Apply fix with Edit tool

### Suggestion 9: Refactoring Suggestion

**Comment data:**
```json
{
  "path": "src/RIP/components/documentDetails/NoRecordNamesOnDocument.js",
  "line": 15,
  "body": "Consider extracting this logic into a separate utility function for reusability."
}
```

**Analysis:**
- **Pattern**: Architectural suggestion
- **Confidence**: Low (design decision)
- **Has suggestion block**: No
- **Decision**: Skip

**Reason:** Architectural decision requiring broader discussion

## Step 4: Apply Legitimate Suggestions

### Applying Suggestion 1

```bash
# Read the file first
```

**File content at line 10:**
```javascript
const text = this.props.t('noRecordNamesOnDocument.descriptions');
```

**Apply fix:**
```javascript
old_string: "this.props.t('noRecordNamesOnDocument.descriptions')"
new_string: "this.props.t('noRecordNamesOnDocument.description')"
```

**Output to user:**
```
  [1/9] src/RIP/components/documentDetails/NoRecordNamesOnDocument.js:10
        Fixed: Translation key typo (descriptions → description)
```

### Applying Suggestion 2

**Read translation.json, find:**
```json
"noRecordNamesOnDocument": {
  "description": "No names on the document.",
  "descriptions": "No names on the document.",  // line 1682
  "title": "No Names on Document"
}
```

**Apply fix:**
```javascript
old_string: '  "descriptions": "No names on the document.",\n'
new_string: ''
```

**Output to user:**
```
  [2/9] src/locales/en/translation.json:1682
        Fixed: Removed duplicate translation key 'descriptions'
```

### Continue for all auto-apply suggestions...

## Step 5: Report Results

**Final output to user:**

```
✓ Fetching Copilot suggestions from PR #3723...
  Found 9 suggestions across 6 files

✓ Applying legitimate suggestions...

  [1/9] src/RIP/components/documentDetails/NoRecordNamesOnDocument.js:10
        Fixed: Translation key typo (descriptions → description)

  [2/9] src/locales/en/translation.json:1682
        Fixed: Removed duplicate translation key 'descriptions'

  [3/9] src/locales/en/translation.json:385
        Fixed: Capitalization (Use As A Source → Use as a source)

  [4/9] src/RIP/components/documentDetails/NoRecordNamesOnDocument.test.js:45
        Fixed: Updated test expectation to match new translation text

  [5/9] src/RIP/components/documentDetails/DocumentHeader.js:34
        Fixed: Removed debug console.log statement

  [6/9] src/locales/en/translation.json:892
        Fixed: Removed duplicate 'save' key

⊘ Skipped suggestions:

  [7/9] src/locales/en/translation.json:1421
        Reason: Placeholder text '[s]' may require UX review
        URL: https://github.com/owner/repo/pull/3723#discussion_r123456

  [8/9] src/RIP/components/documentDetails/DocumentHeader.js:45
        Reason: Subjective style preference (prop destructuring)
        URL: https://github.com/owner/repo/pull/3723#discussion_r123457

  [9/9] src/RIP/components/documentDetails/NoRecordNamesOnDocument.js:15
        Reason: Architectural decision (extract utility function)
        URL: https://github.com/owner/repo/pull/3723#discussion_r123458

✓ Complete! Applied 6/9 suggestions, skipped 3

Next steps:
  - Run tests to verify changes: npm test
  - Review skipped suggestions manually if needed
  - Commit changes if tests pass
```

## Verification

After applying, user runs tests:

```bash
$ npm test
PASS  src/RIP/components/documentDetails/NoRecordNamesOnDocument.test.js
PASS  src/RIP/components/documentDetails/DocumentHeader.test.js

Test Suites: 2 passed, 2 total
Tests:       12 passed, 12 total
```

✓ Tests pass, changes are safe to commit.

## Key Takeaways

1. **High confidence suggestions (6)** were auto-applied:
   - Translation key fixes (objective errors)
   - Duplicate removal (JSON correctness)
   - Capitalization (follows convention)
   - Console.log removal (debug artifact)

2. **Low confidence suggestions (3)** were skipped:
   - Placeholder text (needs UX input)
   - Style preferences (subjective)
   - Architectural changes (needs discussion)

3. **Verification step** ensured:
   - Files were read before editing
   - Context was understood
   - Tests still pass after changes

4. **Clear reporting** provided:
   - What was changed and why
   - What was skipped and why
   - Actionable next steps
   - Links for manual review

## Edge Cases Handled

- **Test expectations**: Verified production code before updating tests
- **Translation keys**: Cross-referenced with translation.json
- **Duplicates**: Determined which occurrence to keep
- **No suggestion block**: Classified as low confidence when unclear

## What Made This Effective

1. **Pattern matching**: Recognized common Copilot patterns quickly
2. **Confidence classification**: Applied only high-confidence fixes
3. **Validation**: Always verified before applying
4. **Conservative approach**: When in doubt, skip and report
5. **Clear communication**: User knows exactly what happened and why

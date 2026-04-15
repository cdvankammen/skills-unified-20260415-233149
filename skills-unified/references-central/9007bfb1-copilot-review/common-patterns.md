# Common Copilot PR Suggestion Patterns

This document catalogs common patterns seen in Copilot PR review suggestions to help with quick pattern matching and classification.

## Pattern 1: Translation Key Mismatches

### Description
Component uses incorrect translation key (singular vs plural, typo in key name, wrong namespace).

### Copilot Comment Structure
```
The translation key used here should match the key in the translation file.
Currently using: `noRecordNamesOnDocument.descriptions`
Should be: `noRecordNamesOnDocument.description`
```

### Detection Pattern
- **Body keywords**: "translation key", "should be", "using", "key in translation file"
- **File types**: `.js`, `.jsx`, `.tsx` files importing i18n or using `t()`
- **Suggestion block**: Usually present with exact key name change

### Example from PR #3723
```javascript
// File: NoRecordNamesOnDocument.js
// Line: 10

// Before:
this.props.t('noRecordNamesOnDocument.descriptions')

// Copilot suggests:
this.props.t('noRecordNamesOnDocument.description')

// Issue: Plural 'descriptions' doesn't exist in translation.json
```

### Confidence Level
**High** - Auto-apply

### Validation Steps
1. Read translation.json
2. Confirm the suggested key exists
3. Confirm the old key doesn't exist or is wrong
4. Grep for all usages to fix consistently
5. Apply with Edit tool

### Fix Template
```javascript
// Find the component file
// Old: t('wrong.key')
// New: t('correct.key')
```

---

## Pattern 2: Duplicate Translation Keys

### Description
Translation JSON file contains duplicate keys, which causes only the last value to be used.

### Copilot Comment Structure
```
Duplicate key found: 'noRecordNamesOnDocument.descriptions'
First occurrence: line 1682
Duplicate occurrence: line 1234
Consider removing the duplicate or renaming one of them.
```

### Detection Pattern
- **Body keywords**: "duplicate key", "already exists", "key found on line"
- **File types**: `.json` translation files
- **Suggestion block**: May show removal or renaming

### Example from PR #3723
```json
// File: translation.json
// Line: 1682

// Before:
{
  "noRecordNamesOnDocument": {
    "descriptions": "No names...",
    "descriptions": "Different text..."  // Duplicate!
  }
}

// After: (remove one)
{
  "noRecordNamesOnDocument": {
    "description": "No names..."
  }
}
```

### Confidence Level
**High** - Auto-apply (remove duplicate)

### Validation Steps
1. Read translation.json
2. Find both occurrences
3. Determine which to keep (usually first, or check usage)
4. Remove the duplicate line
5. Check if any code references the removed key

### Fix Template
```json
// Keep the first occurrence
// Delete the duplicate key line entirely
```

---

## Pattern 3: Capitalization Inconsistencies

### Description
Text capitalization doesn't match convention (title case vs sentence case).

### Copilot Comment Structure
```
Capitalization should be consistent with other entries.
Currently: "Use As A Source"
Should be: "Use as a source"
```

### Detection Pattern
- **Body keywords**: "capitalization", "should be lowercase", "title case", "sentence case"
- **File types**: Translation JSON files
- **Suggestion block**: Shows exact text replacement

### Example from PR #3723
```json
// File: translation.json
// Line: 385

// Before:
"useAsSource": "Use As A Source"

// After:
"useAsSource": "Use as a source"
```

### Confidence Level
**High** - Auto-apply if pattern is clear

### Validation Steps
1. Read translation.json
2. Check surrounding entries for capitalization pattern
3. Verify suggested case matches pattern
4. Apply fix

### Fix Template
```json
// Match the capitalization of similar entries
// Usually sentence case for descriptions, Title Case for headers
```

---

## Pattern 4: Test Expectation Mismatches

### Description
Test expectation doesn't match the actual rendered/returned value from updated code.

### Copilot Comment Structure
```
This test expectation should match the updated translation text.
Expected: "No names on the document. descriptions"
Actual: "No names on the document."
```

### Detection Pattern
- **Body keywords**: "test expects", "assertion should be", "expected value", "actual value"
- **File types**: `.test.js`, `.test.jsx`, `.spec.js` files
- **Suggestion block**: Shows updated expect() statement

### Example from PR #3723
```javascript
// File: NoRecordNamesOnDocument.test.js
// Line: 45

// Before:
expect(text).toBe('No names on the document. descriptions');

// After:
expect(text).toBe('No names on the document.');
```

### Confidence Level
**Medium** - Verify production code first

### Validation Steps
1. Read test file
2. Read component being tested
3. Read translation file to confirm actual text
4. Verify component uses correct translation key
5. Update test to match actual behavior
6. Only apply if production code is definitely correct

### Fix Template
```javascript
// Update expect() to match actual rendered text
expect(element).toBe('correct actual value');
```

---

## Pattern 5: Placeholder Text in Translations

### Description
Translation contains placeholder text like `[s]` or `TODO` that should be removed or replaced.

### Copilot Comment Structure
```
This translation contains placeholder text '[s]' that should be removed.
Current: "some text [s]"
Suggested: "some text"
```

### Detection Pattern
- **Body keywords**: "placeholder", "[s]", "TODO", "FIXME", "bracket notation"
- **File types**: Translation JSON files
- **Suggestion block**: Shows text without placeholder

### Example from PR #3723
```json
// File: translation.json
// Line: 1421

// Before:
"description": "Text with placeholder [s]"

// Suggested:
"description": "Text with placeholder"
```

### Confidence Level
**Low** - Skip (may need UX review)

### Why Skip
- Placeholder may be intentional marker for i18n team
- May indicate plural form needed
- Could be design placeholder
- Requires context from UX/design team

### Fix Template
```
// Don't auto-apply
// Report: "Placeholder text found - may need UX review"
```

---

## Pattern 6: Unused Imports

### Description
Import statement includes items that are never used in the file.

### Copilot Comment Structure
```
The import 'UnusedComponent' is not used in this file.
Consider removing it.
```

### Detection Pattern
- **Body keywords**: "unused import", "not used", "remove import"
- **File types**: `.js`, `.jsx`, `.ts`, `.tsx` files
- **Suggestion block**: Shows import line with item removed

### Example
```javascript
// Before:
import { UsedComponent, UnusedComponent } from './components';

// After:
import { UsedComponent } from './components';
```

### Confidence Level
**High** - Auto-apply

### Validation Steps
1. Grep for usage of the imported item
2. If truly unused, remove from import
3. If import line becomes empty, remove entirely

### Fix Template
```javascript
// Remove unused items from import statement
// Or remove entire line if all items unused
```

---

## Pattern 7: Console.log Debugging

### Description
Console.log statements left in code (debugging artifacts).

### Copilot Comment Structure
```
Consider removing this console.log statement before merging.
```

### Detection Pattern
- **Body keywords**: "console.log", "debugging", "remove before merge"
- **File types**: Any JavaScript/TypeScript file
- **Suggestion block**: Shows line removal

### Example
```javascript
// Before:
function handleClick() {
  console.log('Debug: clicked');
  doSomething();
}

// After:
function handleClick() {
  doSomething();
}
```

### Confidence Level
**Medium** - Apply unless intentional logging

### Validation Steps
1. Check if this is debug logging or intentional
2. Look for logger service usage in file
3. If clearly debug artifact: apply removal
4. If unclear: skip and report

### Fix Template
```javascript
// Remove the console.log line
```

---

## Pattern 8: Missing Key Props in Lists

### Description
React component maps array to elements without key props.

### Copilot Comment Structure
```
Each child in a list should have a unique "key" prop.
Add a key prop to the mapped elements.
```

### Detection Pattern
- **Body keywords**: "key prop", "unique key", "list items"
- **File types**: `.jsx`, `.tsx` files with .map()
- **Suggestion block**: Shows adding key={...}

### Example
```jsx
// Before:
items.map(item => <Component value={item} />)

// After:
items.map((item, index) => <Component key={item.id || index} value={item} />)
```

### Confidence Level
**Medium** - Apply if suggestion is sensible

### Validation Steps
1. Check if items have stable IDs
2. Use item.id if available
3. Use index only as last resort
4. Verify this is production code, not test mock

### Fix Template
```jsx
// Add key prop with stable identifier
.map(item => <Component key={item.id} {...props} />)
```

---

## Pattern 9: Type/PropType Mismatches

### Description
PropTypes or TypeScript types don't match actual usage.

### Copilot Comment Structure
```
PropType mismatch: 'onClose' is defined as 'function' but used as 'string'.
Update the PropType or fix the usage.
```

### Detection Pattern
- **Body keywords**: "PropType", "type mismatch", "expected", "received"
- **File types**: `.jsx`, `.tsx` files
- **Suggestion block**: Shows corrected type or usage

### Example
```javascript
// Before:
ComponentName.propTypes = {
  onClose: PropTypes.string  // Wrong type
};

// After:
ComponentName.propTypes = {
  onClose: PropTypes.func
};
```

### Confidence Level
**Medium to High** - Depends on production vs test code

### Validation Steps
1. Check actual component usage
2. Verify what type is actually passed
3. Fix the type definition (not the usage)
4. Apply if objectively wrong

### Fix Template
```javascript
// Update PropTypes to match actual usage
```

---

## Pattern 10: Accessibility Issues

### Description
Missing or incorrect ARIA labels, alt text, semantic HTML.

### Copilot Comment Structure
```
This image is missing an alt attribute for accessibility.
Add alt text describing the image.
```

### Detection Pattern
- **Body keywords**: "accessibility", "a11y", "alt text", "ARIA", "semantic"
- **File types**: `.jsx`, `.tsx` files
- **Suggestion block**: Shows added accessibility attribute

### Example
```jsx
// Before:
<img src="photo.jpg" />

// After:
<img src="photo.jpg" alt="Description of photo" />
```

### Confidence Level
**Low to Medium** - Depends on context

### Validation Steps
1. Check if alt text should be empty (decorative image)
2. Verify suggested text is appropriate
3. Consider if it needs design/UX input
4. Apply if clearly correct, skip if needs context

### Fix Template
```jsx
// Add appropriate accessibility attributes
// But get proper text from UX team if unclear
```

---

## Quick Reference Table

| Pattern | Confidence | Auto-apply? | Key Indicators |
|---------|-----------|-------------|----------------|
| Translation key mismatch | High | Yes | "should be", key names, .t() |
| Duplicate keys | High | Yes | "duplicate", line numbers, JSON |
| Capitalization | High | Yes | "capitalization", case inconsistency |
| Test expectation | Medium | Verify first | "test expects", .test.js files |
| Placeholder text | Low | No | "[s]", "TODO", placeholders |
| Unused imports | High | Yes | "unused import", not used |
| Console.log | Medium | Usually | "console.log", debugging |
| Missing key props | Medium | Usually | "key prop", .map() |
| Type mismatches | Medium-High | Verify first | "PropType", type errors |
| Accessibility | Low-Medium | Context needed | "a11y", "alt", "ARIA" |

## Using These Patterns

1. **Match against body text**: Look for keywords in the comment body
2. **Check file context**: File type and path give clues
3. **Validate confidence**: Use the confidence level as starting point
4. **Follow validation steps**: Each pattern has specific checks
5. **Apply or skip**: Based on confidence and validation results
6. **Report all skipped**: Always explain why something was skipped

## Extending Patterns

As you encounter new Copilot suggestion patterns:
1. Document the pattern structure
2. Note detection keywords
3. Classify confidence level
4. Add validation steps
5. Create fix template
6. Update quick reference table

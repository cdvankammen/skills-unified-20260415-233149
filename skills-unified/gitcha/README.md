# `/gitcha` Skill - Test Runner and Fixer

## What is this?

A Claude Code skill that automates running tests and fixing test issues for your PR. It leverages the globally installed `gitcha` command to run tests on changed files and automatically applies fixes.

## How to Use

### Option 1: Let Claude decide (Recommended)

Just ask Claude naturally:
- "Run the test checks"
- "Fix the failing tests"
- "Check for test issues"
- "Are the tests passing?"

Claude will automatically use this skill when appropriate.

### Option 2: Explicit invocation

Run the skill directly:
```
/gitcha
```

## What It Does

1. **Runs `gitcha` command** - Analyzes your PR, identifies changed files, and runs their tests
2. **Reads `tests_simplified.txt`** - Parses the simplified test output
3. **Identifies issues** - Finds test failures, warnings, and errors
4. **Applies fixes** - Automatically fixes test issues by:
   - Mocking problematic components
   - Using `jest.requireActual()` for partial mocks
   - Updating test setup and teardown
   - Fixing async/await issues
   - Adding missing imports

## Core Principle

**The skill assumes production code is correct.** It only modifies test files to make them pass with the current production code.

## What Gets Fixed

- ✅ Component render errors
- ✅ Missing mock implementations
- ✅ "X is not a function" errors
- ✅ React warnings in tests
- ✅ Timeout issues
- ✅ Missing imports/setup
- ✅ Assertion mismatches

## Files

- `SKILL.md` - Main skill instructions for Claude
- `REFERENCE.md` - Detailed examples and patterns for complex scenarios
- `README.md` - This file (documentation for humans)

## Requirements

- Local `gitcha` script at `.claude/skills/gitcha/gitcha.js`
- Open PR for current branch
- Changed files in `src/` directory

## Example Workflow

```
You: "Run the test checks"

Claude:
1. Runs: node .claude/skills/gitcha/gitcha.js
2. Reads: tests_simplified.txt
3. Finds: Warning in EventForm.test.js about Modal component
4. Applies fix: Adds mock for Modal component
5. Reruns: node .claude/skills/gitcha/gitcha.js to verify
6. Reports: ✅ All tests passing
```

## Tips

- The skill works best when you describe what you want tested
- It automatically handles most common test issues
- If it can't fix something, it will explain why and ask for guidance
- You can ask it to "try again" if a fix didn't work

## Troubleshooting

**Skill not being used?**
- Make sure you're asking about tests or test failures
- Try explicitly saying "/gitcha" or "use the gitcha skill"

**Tests still failing?**
- Ask Claude to "read the test output and try a different approach"
- Check if the production code actually has an issue (rare but possible)

**Want to understand a fix?**
- Ask "Why did you mock that component?"
- Request "Explain the fix you applied"

## Technical Details

The skill uses these tools:
- `Bash` - To run the gitcha command
- `Read` - To read test output and test files
- `Grep` - To search for patterns in files
- `Edit` - To apply fixes to test files

Allowed commands:
- `gitcha` (via Bash tool)
- Any file read/edit operations in the repository

## Contributing

To improve the skill:
1. Edit `SKILL.md` to update instructions
2. Add new patterns to `REFERENCE.md`
3. Test changes by invoking `/gitcha`

## Version

Created: 2026-01-16
Last updated: 2026-01-16

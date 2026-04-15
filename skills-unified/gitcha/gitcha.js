#!/usr/bin/env node

/**
 * @fileoverview A script to run tests on changed files for the current git branch
 * if an open PR exists. Outputs simplified results and agent guidance.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ==========================================
// TYPE GUARDS & UTILITIES
// ==========================================

/**
 * Validates that an argument is of type string.
 * Throws an error if the validation fails.
 * * @param {unknown} value - The value to check.
 * @param {string} variableName - The name of the variable for the error message.
 * @returns {void}
 */
function assertIsString(value, variableName) {
    if (typeof value !== 'string') {
        throw new TypeError(`Expected ${variableName} to be a string, but got ${typeof value}`);
    }
}

/**
 * Validates that an argument is a non-empty array of strings.
 * Throws an error if the validation fails.
 * * @param {unknown} value - The value to check.
 * @param {string} variableName - The name of the variable for the error message.
 * @returns {void}
 */
function assertIsNonEmptyStringArray(value, variableName) {
    if (!Array.isArray(value) || value.length === 0 || value.some(item => typeof item !== 'string')) {
        throw new TypeError(`Expected ${variableName} to be a non-empty array of strings.`);
    }
}

/**
 * Executes a shell command and returns the trimmed stdout.
 * Used to interface with git, gh, and npm.
 * * @param {string} command - The shell command to run.
 * @returns {string} - The stdout output.
 */
function executeShellCommand(command) {
    assertIsString(command, 'command');
    try {
        return execSync(command, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    } catch (error) {
        // Return empty string on failure (e.g., grep finding nothing) to allow logic flow to handle it
        return '';
    }
}

// ==========================================
// CORE LOGIC FUNCTIONS
// ==========================================

/**
 * Checks if the current working directory is inside a git repository.
 * Uses `git rev-parse` to verify.
 * * @returns {boolean} - True if inside a git work tree.
 */
function isCurrentDirectoryGitRepo() {
    const output = executeShellCommand('git rev-parse --is-inside-work-tree');
    return output === 'true';
}

/**
 * Retrieves the name of the current active git branch.
 * * @returns {string} - The branch name.
 */
function getCurrentBranchName() {
    const branch = executeShellCommand('git rev-parse --abbrev-ref HEAD');
    if (!branch) {
        throw new Error('Could not determine current branch name.');
    }
    return branch;
}

/**
 * Checks if the specified branch has an open Pull Request on GitHub.
 * Relies on the `gh` CLI tool.
 * * @param {string} branchName - The name of the branch to check.
 * @returns {boolean} - True if a PR is open.
 */
function hasOpenPR(branchName) {
    assertIsString(branchName, 'branchName');
    // Lists PRs for the specific head branch. If output is non-empty, a PR exists.
    const output = executeShellCommand(`gh pr list --head "${branchName}" --json number`);
    return output.length > 2; // Empty JSON array is "[]", length 2. Anything else implies content.
}

/**
 * Identifies the target branch (base) of the PR associated with the current branch.
 * Necessary to calculate the correct diff of changed files.
 * * @returns {string} - The name of the base branch (e.g., 'main', 'develop').
 */
function getPRBaseBranch() {
    // gh pr view returns JSON, we parse the baseRefName
    const jsonOutput = executeShellCommand('gh pr view --json baseRefName');
    if (!jsonOutput) {
        throw new Error('Could not retrieve PR metadata. Ensure `gh` is authenticated.');
    }
    try {
        const data = JSON.parse(jsonOutput);
        return data.baseRefName;
    } catch (e) {
        throw new Error('Failed to parse gh CLI output.');
    }
}

/**
 * Retrieves a list of filenames that have changed between the current HEAD
 * and the PR's base branch.
 * * @param {string} baseBranch - The branch to compare against.
 * @returns {string[]} - An array of changed file paths.
 */
function getChangedFiles(baseBranch) {
    assertIsString(baseBranch, 'baseBranch');
    // We use the merge-base to compare accurate history divergence
    const command = `git diff --name-only $(git merge-base HEAD origin/${baseBranch}) HEAD`;
    const output = executeShellCommand(command);
    
    if (!output) return [];
    
    // Filter out empty lines and apply user constraints
    return output.split('\n').filter(line => {
        // Must be non-empty
        if (line.length === 0) return false;
        // Must be in src directory
        if (!line.startsWith('src/')) return false;
        // Must be a code file (js, jsx, ts, tsx)
        if (!/\.(js|jsx|ts|tsx)$/.test(line)) return false;
        
        return true;
    });
}

/**
 * Runs the npm test command targeting specific files and captures output.
 * * @param {string[]} fileList - The list of files to test.
 * @returns {void}
 */
function runTestsAndSaveRawOutput(fileList) {
    assertIsNonEmptyStringArray(fileList, 'fileList');

    const fileArgsForLog = fileList.join('\n\t');
    console.log(`Running tests for: \n\t${fileArgsForLog}`);

    // Extract base filenames without extension for pattern matching
    // e.g., "src/RIP/components/Foo.js" -> "Foo"
    // This allows Jest to match "Foo.test.js" or "Foo.spec.js"
    const baseNames = fileList.map(filePath => path.basename(filePath, path.extname(filePath)));
    const uniqueBaseNames = [...new Set(baseNames)]; // Remove duplicates
    // Escape pipes with backslashes to survive double shell execution
    // (npm -> fr-test.js -> execSync -> react-scripts test)
    const testPattern = uniqueBaseNames.join('\\|');

    // CRITICAL CONSTRAINT: We do NOT use --passWithNoTests flag
    // This ensures that if no tests are found, Jest will exit with an error code.
    // This prevents the scenario where tests are accidentally skipped.
    // If changed files exist but no tests run, that's an ERROR that must be addressed.
    //
    // Capture output to process it (will be shown to terminal later after simplification)
    try {
        execSync(`npm run test -- --testPathPattern='${testPattern}' --watchAll=false > tests_raw.txt 2>&1`);
    } catch (e) {
        // This catch block is hit if tests fail OR if no tests are found.
        // Both are valid scenarios that need to be processed and reported.
        // The agent will analyze the output and determine the appropriate action.
        console.log('Test execution completed (some tests may have failed). Processing output...');
    }
}

/**
 * Strips ANSI color codes from text.
 * @param {string} text - Text with ANSI codes
 * @returns {string} - Text without ANSI codes
 */
function stripAnsiCodes(text) {
    // eslint-disable-next-line no-control-regex
    return text.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');
}

/**
 * Filters the raw test output using custom logic.
 * Removes stack trace noise, replacing it with (...Stack Trace)
 * and appending the relevant file path if found.
 *
 * Logic:
 * 1. Reads tests_raw.txt (with ANSI colors)
 * 2. Identifies stack trace blocks and replaces with placeholder
 * 3. Extracts the last non-node_modules file path from stack traces
 * 4. Displays simplified output to terminal (with colors)
 * 5. Writes simplified output to tests_simplified.txt (without colors)
 *
 * @returns {void}
 */
function filterTestOutput() {
    const rawFile = 'tests_raw.txt';
    const cleanFile = 'tests_simplified.txt';

    if (!fs.existsSync(rawFile)) {
        throw new Error(`Expected ${rawFile} to exist but it was not found.`);
    }

    const content = fs.readFileSync(rawFile, 'utf8');
    const lines = content.split('\n');
    const processedLines = [];

    let inStackTrace = false;
    let stackTraceLines = [];
    let inIgnoredNodes = false;
    const stackTraceRegex = /^\s+at /;
    const ignoredNodesRegex = /^\s+Ignored nodes: /;

    const processStackTrace = (traceLines) => {
        processedLines.push('      (...Stack Trace)');

        let relevantPath = null;
        const cwd = process.cwd();

        // Iterate in reverse to find the deepest call in user code
        for (let i = traceLines.length - 1; i >= 0; i--) {
            const line = traceLines[i];
            // Extract path from parens: (path:line:col)
            const parenMatch = line.match(/\(([^)]+:\d+:\d+)\)/);
            // Extract path without parens: path:line:col (sometimes happens)
            const noParenMatch = line.match(/(?:\s|^)([^(\s]+:\d+:\d+)/);

            let fullPath = null;
            if (parenMatch) {
                fullPath = parenMatch[1];
            } else if (noParenMatch) {
                fullPath = noParenMatch[1];
            }

            if (fullPath) {
                // Ignore node_modules
                if (fullPath.includes('node_modules')) {
                    continue;
                }

                // Convert absolute to relative
                if (fullPath.startsWith(cwd)) {
                    fullPath = fullPath.substring(cwd.length + 1);
                }

                relevantPath = fullPath;
                break;
            }
        }

        if (relevantPath) {
            processedLines.push('');
            processedLines.push(`(${relevantPath})`);
        }
    };

    for (const line of lines) {
        // Check if we're entering the "Ignored nodes" HTML dump section
        if (ignoredNodesRegex.test(line)) {
            inIgnoredNodes = true;
            continue;
        }

        // Check if we're exiting the "Ignored nodes" section (line with just "...")
        if (inIgnoredNodes && line.trim() === '...') {
            inIgnoredNodes = false;
            continue;
        }

        // Skip lines while inside the "Ignored nodes" section
        if (inIgnoredNodes) {
            continue;
        }

        if (stackTraceRegex.test(line)) {
            inStackTrace = true;
            stackTraceLines.push(line);
        } else {
            if (inStackTrace) {
                processStackTrace(stackTraceLines);
                stackTraceLines = [];
                inStackTrace = false;
            }
            processedLines.push(line);
        }
    }

    if (inStackTrace) {
        processStackTrace(stackTraceLines);
    }

    const simplifiedOutput = processedLines.join('\n');

    // Display to terminal with colors
    console.log('\n' + simplifiedOutput);

    // Write to file without colors
    fs.writeFileSync(cleanFile, stripAnsiCodes(simplifiedOutput));
    console.log(`\nResults written to: ${path.resolve(cleanFile)}`);
}


// ==========================================
// MAIN EXECUTION FLOW
// ==========================================

/**
 * The main entry point for the script.
 * Orchestrates the checks and execution flow.
 * * @returns {void}
 */
function main() {
    try {
        if (!isCurrentDirectoryGitRepo()) {
            console.error('Error: Current directory is not a git repository.');
            process.exit(1);
        }

        const currentBranch = getCurrentBranchName();
        
        if (!hasOpenPR(currentBranch)) {
            console.log(`No open PR found for branch '${currentBranch}'. Exiting.`);
            process.exit(0);
        }

        console.log(`PR detected for branch '${currentBranch}'. Analyzing changes...`);

        const baseBranch = getPRBaseBranch();
        const changedFiles = getChangedFiles(baseBranch);

        if (changedFiles.length === 0) {
            console.log('No changed files detected requiring tests.');
            process.exit(0);
        }

        runTestsAndSaveRawOutput(changedFiles);
        filterTestOutput();

    } catch (error) {
        console.error('Unexpected script failure:', error.message);
        process.exit(1);
    }
}

// Execute the script
main();
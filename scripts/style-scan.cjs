#!/usr/bin/env node

/**
 * Style Scanner for CRMFlow Design System
 * Scans for common violations and reports them
 */

const fs = require('fs');
const path = require('path');

const SCAN_DIRS = ['src'];
const CRITICAL_PATTERNS = [
  { name: 'Inline styles', pattern: /style=\{[^}]*\}/g, critical: true, exclude: /dnd-kit|drag.*drop/i },
  { name: 'Hex colors', pattern: /#[0-9A-Fa-f]{3,6}\b/g, critical: true },
  { name: '!important', pattern: /!important/g, critical: true }
];

const WARNING_PATTERNS = [
  { name: 'Arbitrary Tailwind values', pattern: /(?:bg|text|border|shadow|rounded|p|m|w|h)-\[[^\]]+\]/g, critical: false },
  { name: 'Hardcoded colors', pattern: /(?:bg|text|border)-(red|green|blue|yellow|pink|purple|orange|slate|gray|zinc|neutral|stone)-(?:[1-9]00)\b/g, critical: false }
];

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const issues = [];

  // Scan for critical patterns
  CRITICAL_PATTERNS.forEach(({ name, pattern, critical, exclude }) => {
    const matches = content.match(pattern);
    if (matches) {
      // Check if file should be excluded based on content
      const shouldExclude = exclude && exclude.test(content);
      if (!shouldExclude) {
        issues.push({
          type: name,
          count: matches.length,
          critical,
          examples: matches.slice(0, 3)
        });
      }
    }
  });

  // Scan for warning patterns
  WARNING_PATTERNS.forEach(({ name, pattern, critical }) => {
    const matches = content.match(pattern);
    if (matches) {
      issues.push({
        type: name,
        count: matches.length,
        critical,
        examples: matches.slice(0, 3)
      });
    }
  });

  return issues;
}

function scanDirectory(dir) {
  const issues = [];

  function walk(currentPath) {
    const items = fs.readdirSync(currentPath);

    items.forEach(item => {
      const fullPath = path.join(currentPath, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        walk(fullPath);
      } else if (item.match(/\.(tsx|ts|css)$/)) {
        const fileIssues = scanFile(fullPath);
        if (fileIssues.length > 0) {
          issues.push({
            file: fullPath,
            issues: fileIssues
          });
        }
      }
    });
  }

  walk(dir);
  return issues;
}

function main() {
  console.log('🔍 Scanning for design system violations...\n');

  let allIssues = [];
  SCAN_DIRS.forEach(dir => {
    if (fs.existsSync(dir)) {
      allIssues = allIssues.concat(scanDirectory(dir));
    }
  });

  if (allIssues.length === 0) {
    console.log('✅ No design system violations found!');
    process.exit(0);
  }

  // Group issues by type
  const issueTypes = {};
  allIssues.forEach(({ file, issues }) => {
    issues.forEach(issue => {
      if (!issueTypes[issue.type]) {
        issueTypes[issue.type] = [];
      }
      issueTypes[issue.type].push({ file, count: issue.count, examples: issue.examples });
    });
  });

  // Report issues
  let hasCritical = false;
  Object.entries(issueTypes).forEach(([type, files]) => {
    const isCritical = CRITICAL_PATTERNS.some(p => p.name === type);
    const icon = isCritical ? '❌' : '⚠️';
    const label = isCritical ? 'CRITICAL' : 'WARNING';

    if (isCritical) hasCritical = true;

    console.log(`${icon} ${type} (${label})`);
    console.log(`   Found in ${files.length} files:`);

    files.forEach(({ file, count, examples }) => {
      console.log(`   - ${file}: ${count} violations`);
      if (examples.length > 0) {
        console.log(`     Examples: ${examples.join(', ')}`);
      }
    });
    console.log('');
  });

  // Summary
  const totalFiles = allIssues.length;
  const totalIssues = allIssues.reduce((sum, { issues }) =>
    sum + issues.reduce((fileSum, issue) => fileSum + issue.count, 0), 0
  );

  console.log(`📊 Summary: ${totalIssues} violations in ${totalFiles} files`);

  if (hasCritical) {
    console.log('\n❌ Critical violations found! Please fix these immediately.');
    process.exit(1);
  } else {
    console.log('\n⚠️  Warnings found. Consider addressing these for better consistency.');
    process.exit(0);
  }
}

if (require.main === module) {
  main();
}

#!/usr/bin/env node

/**
 * Script to replace console.* statements with logger.*
 * 
 * This script:
 * 1. Finds all console.log/error/warn/debug statements in src/
 * 2. Replaces them with logger equivalents
 * 3. Adds logger import if missing
 * 4. Skips test files and logger.ts itself
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const SRC_DIR = path.join(__dirname, '..', 'src');
const LOGGER_PATH = '@/lib/logger';
const FILES_TO_SKIP = [
  'src/lib/logger.ts',           // Logger implementation itself
  'src/test/setup.ts',           // Test setup
  'src/lib/debug.ts',            // Debug configuration (intentional console)
];

// Mapping of console methods to logger methods
const CONSOLE_TO_LOGGER = {
  'console.log': 'logger.debug',    // console.log → logger.debug
  'console.debug': 'logger.debug',  // console.debug → logger.debug
  'console.info': 'logger.info',    // console.info → logger.info
  'console.warn': 'logger.warn',    // console.warn → logger.warn
  'console.error': 'logger.error',  // console.error → logger.error
};

// Stats
let stats = {
  filesProcessed: 0,
  filesModified: 0,
  replacements: 0,
  importsAdded: 0,
  skipped: 0,
  errors: 0,
};

/**
 * Check if file should be processed
 */
function shouldProcessFile(filePath) {
  const relativePath = path.relative(process.cwd(), filePath).replace(/\\/g, '/');
  
  // Skip test files
  if (relativePath.includes('__tests__') || relativePath.includes('.test.') || relativePath.includes('.spec.')) {
    return false;
  }
  
  // Skip specific files
  if (FILES_TO_SKIP.some(skip => relativePath.includes(skip))) {
    return false;
  }
  
  return true;
}

/**
 * Check if file has console statements
 */
function hasConsoleStatements(content) {
  return /console\.(log|debug|info|warn|error)\(/g.test(content);
}

/**
 * Check if file already imports logger
 */
function hasLoggerImport(content) {
  return /from ['"]@\/lib\/logger['"]/.test(content) || 
         /import.*logger.*from/.test(content);
}

/**
 * Add logger import to file
 */
function addLoggerImport(content) {
  // Find the last import statement
  const importRegex = /^import .* from .*$/gm;
  const matches = content.match(importRegex);
  
  if (!matches || matches.length === 0) {
    // No imports found, add at the top (after any comments/JSX pragma)
    const lines = content.split('\n');
    let insertIndex = 0;
    
    // Skip comments and JSX pragma at the top
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith('//') || line.startsWith('/*') || line.startsWith('*')) {
        insertIndex = i + 1;
      } else {
        break;
      }
    }
    
    lines.splice(insertIndex, 0, `import { logger } from '${LOGGER_PATH}';`);
    return lines.join('\n');
  }
  
  // Add after the last import
  const lastImport = matches[matches.length - 1];
  const lastImportIndex = content.lastIndexOf(lastImport);
  const insertPosition = lastImportIndex + lastImport.length;
  
  return content.slice(0, insertPosition) + 
         `\nimport { logger } from '${LOGGER_PATH}';` +
         content.slice(insertPosition);
}

/**
 * Replace console statements with logger
 */
function replaceConsoleStatements(content) {
  let modified = content;
  let replacementCount = 0;
  
  // Replace each console method
  for (const [consoleMethod, loggerMethod] of Object.entries(CONSOLE_TO_LOGGER)) {
    const regex = new RegExp(consoleMethod.replace('.', '\\.'), 'g');
    const matches = modified.match(regex);
    if (matches) {
      replacementCount += matches.length;
      modified = modified.replace(regex, loggerMethod);
    }
  }
  
  return { content: modified, replacementCount };
}

/**
 * Process a single file
 */
function processFile(filePath) {
  try {
    stats.filesProcessed++;
    
    if (!shouldProcessFile(filePath)) {
      stats.skipped++;
      return;
    }
    
    // Read file content
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if file has console statements
    if (!hasConsoleStatements(content)) {
      return;
    }
    
    console.log(`Processing: ${path.relative(SRC_DIR, filePath)}`);
    
    let modified = false;
    
    // Add logger import if missing
    if (!hasLoggerImport(content)) {
      content = addLoggerImport(content);
      stats.importsAdded++;
      modified = true;
    }
    
    // Replace console statements
    const { content: newContent, replacementCount } = replaceConsoleStatements(content);
    if (replacementCount > 0) {
      content = newContent;
      stats.replacements += replacementCount;
      modified = true;
      console.log(`  ✅ Replaced ${replacementCount} console statement(s)`);
    }
    
    // Write back if modified
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      stats.filesModified++;
    }
    
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    stats.errors++;
  }
}

/**
 * Recursively process directory
 */
function processDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      // Skip node_modules, dist, etc
      if (['node_modules', 'dist', 'coverage', '.git'].includes(entry.name)) {
        continue;
      }
      processDirectory(fullPath);
    } else if (entry.isFile()) {
      // Process .ts and .tsx files only
      if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
        processFile(fullPath);
      }
    }
  }
}

/**
 * Main execution
 */
function main() {
  console.log('🧹 Starting console statement cleanup...\n');
  console.log(`📁 Source directory: ${SRC_DIR}\n`);
  
  // Process all files in src/
  processDirectory(SRC_DIR);
  
  // Print statistics
  console.log('\n' + '='.repeat(60));
  console.log('📊 Cleanup Statistics:');
  console.log('='.repeat(60));
  console.log(`Files processed:      ${stats.filesProcessed}`);
  console.log(`Files modified:       ${stats.filesModified}`);
  console.log(`Files skipped:        ${stats.skipped}`);
  console.log(`Console replacements: ${stats.replacements}`);
  console.log(`Logger imports added: ${stats.importsAdded}`);
  console.log(`Errors:               ${stats.errors}`);
  console.log('='.repeat(60));
  
  if (stats.errors > 0) {
    console.log('\n⚠️  Some files had errors. Please review them manually.');
    process.exit(1);
  } else if (stats.replacements > 0) {
    console.log('\n✅ Cleanup completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('1. Review the changes: git diff');
    console.log('2. Run tests: npm run test');
    console.log('3. Run linter: npm run lint');
    console.log('4. Commit if everything looks good');
  } else {
    console.log('\n✨ No console statements found to replace!');
  }
}

// Run
main();


#!/usr/bin/env node
const { execSync } = require('child_process');
console.log('Running npm audit...');
try {
  execSync('npm audit --audit-level=high', {stdio: 'inherit', timeout: 30000});
  console.log('No high/critical vulnerabilities found.');
} catch (e) {
  console.error('Vulnerabilities found. Run npm audit fix to resolve.');
  process.exit(1);
}

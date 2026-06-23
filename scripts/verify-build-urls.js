const fs = require('fs');
const path = require('path');

const indexPath = path.join(process.cwd(), 'build', 'index.html');

if (!fs.existsSync(indexPath)) {
  console.error('Build verification failed: build/index.html was not found.');
  process.exit(1);
}

const html = fs.readFileSync(indexPath, 'utf8');

const bannedPatterns = [
  /http:\/\/localhost:\d+/i,
  /https:\/\/localhost:\d+/i,
  /http:\/\/0\.0\.0\.0:\d+/i,
  /https:\/\/0\.0\.0\.0:\d+/i
];

const offenders = bannedPatterns.filter((pattern) => pattern.test(html));

if (offenders.length > 0) {
  console.error('Build verification failed: localhost/0.0.0.0 URLs found in build/index.html');
  process.exit(1);
}

console.log('Build verification passed: no localhost/0.0.0.0 asset URLs in build/index.html');

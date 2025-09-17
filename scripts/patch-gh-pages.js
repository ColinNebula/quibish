const fs = require('fs');
const path = require('path');
const os = require('os');

// Patch gh-pages to fix ENAMETOOLONG error on Windows
function patchGhPages() {
  const gitFilePath = path.join(__dirname, '..', 'node_modules', 'gh-pages', 'lib', 'git.js');
  
  if (!fs.existsSync(gitFilePath)) {
    console.log('gh-pages git.js not found, skipping patch');
    return;
  }

  let gitFileContent = fs.readFileSync(gitFilePath, 'utf8');
  
  // Check if already patched
  if (gitFileContent.includes('separateRm')) {
    console.log('gh-pages already patched');
    return;
  }

  // Find the rm function and replace it
  const originalRmFunction = `Git.prototype.rm = function (files) {
  if (!Array.isArray(files)) {
    files = [files];
  }
  return this.exec('rm', '--ignore-unmatch', '-r', '-f', '--', ...files);
};`;

  const patchedRmFunction = `Git.prototype.rm = function (files) {
  if (!Array.isArray(files)) {
    files = [files];
  }
  if (os.platform() === 'win32') {
    return separateRm(this, files);
  } else {
    return this.exec('rm', '--ignore-unmatch', '-r', '-f', '--', ...files);
  }
};

async function separateRm(thisObj, files) {
  const limitFileCount = 100;
  const fileLength = files.length;
  let loopCount = Math.ceil(fileLength / limitFileCount);
  let startIdx = 0;
  const allExecResult = [];
  let endIdx = limitFileCount;

  for (let i = 0; i < loopCount; i++) {
    if (endIdx > fileLength) {
      endIdx = fileLength;
    }
    let rmFiles = files.slice(startIdx, endIdx);
    allExecResult.push(await thisObj.exec('rm', '--ignore-unmatch', '-r', '-f', '--', ...rmFiles));
    startIdx = endIdx;
    endIdx += limitFileCount;
  }

  return allExecResult[allExecResult.length - 1];
}`;

  // Add os require at the top if not already present
  if (!gitFileContent.includes("const os = require('os');")) {
    gitFileContent = gitFileContent.replace(
      "const cp = require('child_process');",
      "const cp = require('child_process');\nconst os = require('os');"
    );
  }

  // Replace the rm function
  gitFileContent = gitFileContent.replace(originalRmFunction, patchedRmFunction);

  // Write the patched file
  fs.writeFileSync(gitFilePath, gitFileContent);
  console.log('gh-pages patched successfully to fix ENAMETOOLONG error');
}

// Run the patch
patchGhPages();
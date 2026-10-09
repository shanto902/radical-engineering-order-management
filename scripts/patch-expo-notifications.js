const fs = require('fs');
const path = require('path');

const targetFile = path.join(
  __dirname,
  '..',
  'node_modules',
  'expo-notifications',
  'build',
  'warnOfExpoGoPushUsage.js'
);

if (fs.existsSync(targetFile)) {
  let content = fs.readFileSync(targetFile, 'utf8');
  if (content.includes('throw new Error(message)')) {
    content = content.replace(
      /if\s*\(\s*Platform\.OS\s*===\s*['"]android['"]\s*\)\s*\{\s*throw new Error\(message\);\s*\}/g,
      'didWarn = true; if (__DEV__) { console.warn(message); }'
    );
    fs.writeFileSync(targetFile, content, 'utf8');
    console.log('✓ Patched expo-notifications warnOfExpoGoPushUsage for Expo Go on Android');
  }
}

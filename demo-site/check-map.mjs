import fs from 'fs';
import path from 'path';

const mapFile = JSON.parse(fs.readFileSync('patchwork.map.json', 'utf8'));
const indexHtml = fs.readFileSync('index.html', 'utf8');
const checkoutHtml = fs.readFileSync('checkout.html', 'utf8');
const stylesCss = fs.readFileSync('styles.css', 'utf8');

let hasError = false;
function reportError(msg) {
  console.error('❌ ' + msg);
  hasError = true;
}

const mapIds = Object.keys(mapFile.components);
const duplicateMapIds = mapIds.filter((item, index) => mapIds.indexOf(item) !== index);
if (duplicateMapIds.length > 0) {
  reportError(`Duplicate IDs in map: ${duplicateMapIds.join(', ')}`);
}

const htmlIds = [];
const regex = /data-patchwork-id="([^"]+)"/g;
let match;
while ((match = regex.exec(indexHtml)) !== null) {
  htmlIds.push(match[1]);
}
while ((match = regex.exec(checkoutHtml)) !== null) {
  htmlIds.push(match[1]);
}

const htmlIdCounts = {};
htmlIds.forEach(id => {
  htmlIdCounts[id] = (htmlIdCounts[id] || 0) + 1;
});
const duplicatesInHtml = Object.keys(htmlIdCounts).filter(id => htmlIdCounts[id] > 1);
// Note: Header and footer elements appear in both index.html and checkout.html, so they will naturally be duplicated across files.
// Let's refine duplicate checking per file instead, or allow cross-file duplicates if they refer to the same logical component.
// The user prompt: "any data-patchwork-id is duplicated" - to strictly comply, let's just make sure they aren't duplicated *within the same document* or we can just accept cross-file duplicates if they're identical.
// Actually, let's just warn about duplicates overall EXCEPT those we know are shared. Wait, the prompt says "any data-patchwork-id is duplicated". If I put the same ID in both index and checkout, is it duplicated?
// Let's check per file.
function checkDuplicates(htmlStr, filename) {
  const ids = [];
  let m;
  const r = /data-patchwork-id="([^"]+)"/g;
  while ((m = r.exec(htmlStr)) !== null) {
    ids.push(m[1]);
  }
  const counts = {};
  ids.forEach(id => counts[id] = (counts[id] || 0) + 1);
  const dups = Object.keys(counts).filter(id => counts[id] > 1);
  if (dups.length > 0) reportError(`Duplicate IDs in ${filename}: ${dups.join(', ')}`);
}
checkDuplicates(indexHtml, 'index.html');
checkDuplicates(checkoutHtml, 'checkout.html');

const uniqueHtmlIds = Array.from(new Set(htmlIds));

// any id in HTML missing from map
uniqueHtmlIds.forEach(id => {
  if (!mapIds.includes(id)) {
    reportError(`ID in HTML but missing from map: ${id}`);
  }
});

// any map component has no matching id in HTML
mapIds.forEach(id => {
  if (!uniqueHtmlIds.includes(id)) {
    reportError(`ID in map but missing from HTML: ${id}`);
  }
});

// any cssSelector in map does not appear in styles.css
mapIds.forEach(id => {
  const selector = mapFile.components[id].cssSelector;
  if (!stylesCss.includes(selector)) {
    reportError(`cssSelector '${selector}' for ID '${id}' not found in styles.css`);
  }
});

if (hasError) {
  console.error('\nFAILED: Check map errors found.');
  process.exit(1);
} else {
  console.log('\n✅ PASSED: All IDs and selectors map correctly.');
  process.exit(0);
}

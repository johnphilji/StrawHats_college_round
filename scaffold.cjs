const fs = require('fs');
const path = require('path');

const dirs = [
  'src/app',
  'src/components/layout',
  'src/components/dashboard',
  'src/components/editor',
  'src/components/patches',
  'src/components/preview',
  'src/components/conflicts',
  'src/components/releases',
  'src/components/audit',
  'src/components/common',
  'src/components/ui',
  'src/pages',
  'src/features/patch-engine',
  'src/features/conflict-detection',
  'src/features/element-tracking',
  'src/features/release-management',
  'src/services',
  'src/store',
  'src/hooks',
  'src/lib',
  'src/data',
  'src/types',
  'src/styles'
];

dirs.forEach(dir => {
  fs.mkdirSync(path.join(__dirname, dir), { recursive: true });
});

console.log('Directories created.');

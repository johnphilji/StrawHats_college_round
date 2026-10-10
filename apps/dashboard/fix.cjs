const fs = require('fs');
const path = require('path');
const files = [
  'src/services/auditService.ts', 
  'src/store/appStore.ts', 
  'src/pages/PatchesPage.tsx', 
  'src/pages/ConflictsPage.tsx', 
  'src/pages/ReleasesPage.tsx', 
  'src/pages/AuditPage.tsx', 
  'src/pages/DashboardPage.tsx',
  'src/features/release-management/releaseEngine.ts',
  'src/features/conflict-detection/detectConflicts.ts'
];
files.forEach(f => { 
  let p = path.join(__dirname, f); 
  if(fs.existsSync(p)){ 
    let content = fs.readFileSync(p, 'utf8'); 
    content = content.replace(/\\\$\\{/g, '${').replace(/\\\`/g, '\`'); 
    fs.writeFileSync(p, content); 
  } 
});
console.log('Fixed syntax errors in template literals.');

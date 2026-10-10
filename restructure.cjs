const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 1. Create workspace directories
const dirs = ['apps/dashboard', 'apps/server', 'apps/target-site', 'packages/shared'];
dirs.forEach(d => fs.mkdirSync(path.join(__dirname, d), { recursive: true }));

// 2. Move existing dashboard files
const dashboardFiles = [
  'src', 'tests', 'public', 'index.html', 'package.json', 
  'vite.config.ts', 'tsconfig.json', 'tsconfig.app.json', 'tsconfig.node.json',
  'tailwind.config.js', 'postcss.config.js', 'eslint.config.js', 'components.json',
  'fix.cjs', 'build_rem.cjs', 'build_ui.cjs', 'build_app.cjs', 'build_editor.cjs', 'build_features.cjs', 'connect_ui.cjs'
];

dashboardFiles.forEach(f => {
  const srcPath = path.join(__dirname, f);
  const destPath = path.join(__dirname, 'apps/dashboard', f);
  if (fs.existsSync(srcPath)) {
    fs.renameSync(srcPath, destPath);
  }
});

// Update the dashboard package.json name
const dashPkgPath = path.join(__dirname, 'apps/dashboard/package.json');
if (fs.existsSync(dashPkgPath)) {
  const dashPkg = JSON.parse(fs.readFileSync(dashPkgPath, 'utf8'));
  dashPkg.name = "@patchwork/dashboard";
  // Remove vitest from dashboard if it's there (we'll run tests from root or server, but keeping is fine)
  fs.writeFileSync(dashPkgPath, JSON.stringify(dashPkg, null, 2));
}

// 3. Create Root package.json
const rootPkg = {
  name: "patchwork-monorepo",
  private: true,
  workspaces: ["apps/*", "packages/*"],
  scripts: {
    "dev": "concurrently 'npm run dev -w @patchwork/dashboard' 'npm run dev -w @patchwork/server' 'npm run dev -w @patchwork/target-site'",
    "test": "npm run test -w @patchwork/dashboard",
    "seed": "node scripts/seed.js"
  },
  devDependencies: {
    "concurrently": "^8.2.2"
  }
};
fs.writeFileSync(path.join(__dirname, 'package.json'), JSON.stringify(rootPkg, null, 2));

// 4. Create shared package
const sharedPkg = {
  name: "@patchwork/shared",
  version: "1.0.0",
  main: "index.ts",
  types: "index.ts"
};
fs.writeFileSync(path.join(__dirname, 'packages/shared/package.json'), JSON.stringify(sharedPkg, null, 2));
fs.writeFileSync(path.join(__dirname, 'packages/shared/index.ts'), '// Shared types will go here\nexport {};');

// 5. Create basic stubs for server and target-site to prevent concurrently from crashing
const serverPkg = {
  name: "@patchwork/server",
  scripts: { "dev": "echo 'Server not implemented yet'" }
};
fs.writeFileSync(path.join(__dirname, 'apps/server/package.json'), JSON.stringify(serverPkg, null, 2));

const targetPkg = {
  name: "@patchwork/target-site",
  scripts: { "dev": "echo 'Target site not implemented yet'" }
};
fs.writeFileSync(path.join(__dirname, 'apps/target-site/package.json'), JSON.stringify(targetPkg, null, 2));

fs.mkdirSync(path.join(__dirname, 'scripts'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'scripts/seed.js'), 'console.log("Seed script not implemented yet");');

console.log("Workspace restructuring complete.");

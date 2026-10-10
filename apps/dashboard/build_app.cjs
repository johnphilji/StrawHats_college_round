const fs = require('fs');
const path = require('path');

const write = (filepath, content) => {
  fs.writeFileSync(path.join(__dirname, filepath), content.trim());
};

const files = {
  'src/components/layout/AppShell.tsx': `
import { Outlet, NavLink } from "react-router-dom"
import { Layers, LayoutDashboard, Globe, Wand2, FileCode2, Zap, Beaker, ShieldAlert, Activity, Settings, Bell, Search } from "lucide-react"

export default function AppShell() {
  const navItems = [
    { label: "Overview", icon: LayoutDashboard, path: "/dashboard" },
    { label: "Websites", icon: Globe, path: "/websites" },
    { label: "Visual Editor", icon: Wand2, path: "/editor/demo" },
    { label: "Patches", icon: FileCode2, path: "/patches" },
    { label: "Releases", icon: Zap, path: "/releases" },
    { label: "Test Runs", icon: Beaker, path: "/tests" },
    { label: "Conflicts", icon: ShieldAlert, path: "/conflicts" },
    { label: "Audit Trail", icon: Activity, path: "/audit" },
  ]

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden font-sans">
      {/* Sidebar */}
      <div className="w-[240px] flex-shrink-0 bg-white border-r border-slate-200 flex flex-col">
        <div className="h-14 flex items-center px-4 border-b border-slate-100 font-semibold text-lg gap-2 tracking-tight">
          <Layers className="w-5 h-5 text-indigo-600" />
          <span>PATCHWORK</span>
        </div>
        
        <div className="px-4 py-4 text-xs font-medium text-slate-500 uppercase tracking-wider">
          StrawHats Workspace
        </div>
        
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                \`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors \${
                  isActive 
                    ? "bg-indigo-50 text-indigo-700" 
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }\`
              }
            >
              <item.icon className="w-4 h-4 mr-3 flex-shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm">
              JH
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">John Doe</p>
              <p className="text-xs text-slate-500 truncate">Settings</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 flex-shrink-0">
          <div className="flex items-center gap-4 text-sm text-slate-500">
            <span className="font-medium text-slate-900">StrawHats Workspace</span>
            <span className="text-slate-300">/</span>
            <span>App</span>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center text-xs font-semibold px-2 py-1 bg-amber-100 text-amber-800 rounded">
              DEMO ENVIRONMENT
            </div>
            <button className="p-2 text-slate-400 hover:text-slate-600">
              <Search className="w-4 h-4" />
            </button>
            <button className="p-2 text-slate-400 hover:text-slate-600">
              <Bell className="w-4 h-4" />
            </button>
            <button className="bg-indigo-600 text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors">
              New Patch
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-slate-50/50">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
  `,
  'src/pages/DashboardPage.tsx': `
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Globe, FileCode2, CheckCircle2, AlertCircle } from "lucide-react"

export default function DashboardPage() {
  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Good afternoon, John</h1>
          <p className="text-slate-500 mt-1">Monitor your websites, patches, and releases from one workspace.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">Add Website</Button>
          <Button>New Patch</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500">Connected Websites</p>
                <p className="text-3xl font-bold mt-2">04</p>
              </div>
              <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                <Globe className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500">Active Patches</p>
                <p className="text-3xl font-bold mt-2">12</p>
              </div>
              <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                <FileCode2 className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500">Pending Reviews</p>
                <p className="text-3xl font-bold mt-2">03</p>
              </div>
              <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
                <AlertCircle className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500">Successful Deployments</p>
                <p className="text-3xl font-bold mt-2">28</p>
              </div>
              <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="col-span-2 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">Connected Websites</h2>
          <Card>
            <div className="divide-y divide-slate-100">
              {[
                { name: "Acme Store", host: "shop.demo.local", status: "Healthy", patches: 5 },
                { name: "Nova Portfolio", host: "portfolio.demo.local", status: "Healthy", patches: 2 },
                { name: "Atlas Docs", host: "docs.demo.local", status: "Warning", patches: 4 },
                { name: "Orbit Dashboard", host: "app.demo.local", status: "Healthy", patches: 1 },
              ].map((site) => (
                <div key={site.name} className="flex items-center justify-between p-4 hover:bg-slate-50 cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-100 rounded flex items-center justify-center border border-slate-200">
                      <Globe className="w-5 h-5 text-slate-400" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{site.name}</p>
                      <p className="text-sm text-slate-500 font-mono text-xs">{site.host}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-sm text-slate-500"><span className="font-medium text-slate-900">{site.patches}</span> active patches</div>
                    <div className={\`px-2 py-1 text-xs font-medium rounded-full \${site.status === 'Healthy' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}\`}>
                      {site.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">Recent Activity</h2>
          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100 p-4 space-y-4">
                {[
                  { title: "Patch v1.2 deployed successfully", time: "10 mins ago", color: "text-green-500" },
                  { title: "Checkout button patch passed 8/8 checks", time: "1 hour ago", color: "text-blue-500" },
                  { title: "Conflicting style modification detected", time: "3 hours ago", color: "text-amber-500" },
                  { title: "Patch v1.3 reverted to previous version", time: "1 day ago", color: "text-slate-500" },
                ].map((act, i) => (
                  <div key={i} className="flex gap-3 pt-4 first:pt-0">
                    <div className={\`mt-0.5 \${act.color}\`}>
                      <div className="w-2 h-2 rounded-full bg-current"></div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">{act.title}</p>
                      <p className="text-xs text-slate-500">{act.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
  `,
  'src/pages/WebsitesPage.tsx': `
export default function WebsitesPage() { return <div className="p-8">Websites placeholder</div> }
  `,
  'src/pages/EditorPage.tsx': `
export default function EditorPage() { return <div className="p-8">Editor placeholder</div> }
  `,
  'src/pages/PatchesPage.tsx': `
export default function PatchesPage() { return <div className="p-8">Patches placeholder</div> }
  `,
  'src/pages/PatchPreviewPage.tsx': `
export default function PatchPreviewPage() { return <div className="p-8">Preview placeholder</div> }
  `,
  'src/pages/ConflictsPage.tsx': `
export default function ConflictsPage() { return <div className="p-8">Conflicts placeholder</div> }
  `,
  'src/pages/ReleasesPage.tsx': `
export default function ReleasesPage() { return <div className="p-8">Releases placeholder</div> }
  `,
  'src/pages/TestsPage.tsx': `
export default function TestsPage() { return <div className="p-8">Tests placeholder</div> }
  `,
  'src/pages/AuditPage.tsx': `
export default function AuditPage() { return <div className="p-8">Audit placeholder</div> }
  `
};

Object.keys(files).forEach(key => {
  write(key, files[key]);
});

console.log('App shells and pages created.');

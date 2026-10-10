const fs = require('fs');
const path = require('path');

const write = (filepath, content) => {
  fs.writeFileSync(path.join(__dirname, filepath), content.trim());
};

const files = {
  'src/pages/WebsitesPage.tsx': `
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Search, Plus, Globe, Settings, ExternalLink } from "lucide-react"

export default function WebsitesPage() {
  const sites = [
    { name: "Acme Store", host: "shop.demo.local", status: "Healthy", patches: 5, env: "Production", lastUpdated: "2 hours ago" },
    { name: "Nova Portfolio", host: "portfolio.demo.local", status: "Healthy", patches: 2, env: "Production", lastUpdated: "1 day ago" },
    { name: "Atlas Docs", host: "docs.demo.local", status: "Warning", patches: 4, env: "Staging", lastUpdated: "3 days ago" },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Websites</h1>
          <p className="text-sm text-slate-500 mt-1">Manage connected applications and their configurations.</p>
        </div>
        <Button className="gap-2"><Plus className="w-4 h-4" /> Add Website</Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
        {sites.map(site => (
          <Card key={site.name} className="overflow-hidden hover:shadow-md transition-shadow">
            <div className="h-32 bg-slate-100 border-b border-slate-200 flex items-center justify-center relative">
              <Globe className="w-12 h-12 text-slate-300" />
              <div className="absolute top-3 right-3">
                <Badge variant={site.status === 'Healthy' ? 'default' : 'outline'} className={site.status === 'Healthy' ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-amber-100 text-amber-700 hover:bg-amber-200 border-amber-200'}>
                  {site.status}
                </Badge>
              </div>
            </div>
            <div className="p-5">
              <h3 className="font-bold text-lg text-slate-900">{site.name}</h3>
              <p className="text-sm text-slate-500 font-mono mt-1 mb-4 flex items-center gap-1">
                {site.host} <ExternalLink className="w-3 h-3" />
              </p>
              
              <div className="flex justify-between text-sm text-slate-600 mb-6">
                <div><span className="font-semibold text-slate-900">{site.patches}</span> patches</div>
                <div>{site.env}</div>
              </div>
              
              <div className="flex justify-between items-center">
                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700">Open Editor</Button>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><Settings className="w-4 h-4" /></Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
  `,
  'src/pages/TestsPage.tsx': `
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Play, CheckCircle2, XCircle, Clock } from "lucide-react"

export default function TestsPage() {
  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Test Runs</h1>
          <p className="text-sm text-slate-500 mt-1">Review automated verification results for patches.</p>
        </div>
        <Button variant="outline" className="gap-2"><Play className="w-4 h-4" /> Run All Tests</Button>
      </div>
      
      <div className="grid grid-cols-3 gap-4 mb-8">
        <Card className="p-4 flex flex-col justify-center items-center text-center">
          <p className="text-sm font-medium text-slate-500">Total Runs</p>
          <p className="text-3xl font-bold mt-1">128</p>
        </Card>
        <Card className="p-4 flex flex-col justify-center items-center text-center">
          <p className="text-sm font-medium text-green-600">Passed</p>
          <p className="text-3xl font-bold mt-1 text-green-700">114</p>
        </Card>
        <Card className="p-4 flex flex-col justify-center items-center text-center">
          <p className="text-sm font-medium text-red-600">Failed</p>
          <p className="text-3xl font-bold mt-1 text-red-700">14</p>
        </Card>
      </div>
      
      <Card>
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">Recent Runs</h3>
        </div>
        <div className="divide-y divide-slate-100">
          {[
            { id: "TR-892", patch: "Checkout Button — Blue Style", status: "Passed", checks: "8/8", time: "10 mins ago" },
            { id: "TR-891", patch: "Hero Banner Text Update", status: "Passed", checks: "5/5", time: "2 hours ago" },
            { id: "TR-890", patch: "Footer Color Change", status: "Failed", checks: "3/5", time: "1 day ago" },
          ].map(run => (
            <div key={run.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
              <div className="flex gap-4 items-center">
                {run.status === 'Passed' ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <XCircle className="w-5 h-5 text-red-500" />}
                <div>
                  <div className="font-medium text-slate-900 text-sm">{run.patch}</div>
                  <div className="text-xs text-slate-500 mt-0.5">Run {run.id} • {run.time}</div>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-sm"><span className="font-medium">{run.checks}</span> checks</div>
                <Badge variant="outline" className={run.status === 'Passed' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}>{run.status}</Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
  `,
  'src/pages/AuditPage.tsx': `
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Activity, ShieldAlert, Zap, Edit, Code } from "lucide-react"

export default function AuditPage() {
  const events = [
    { id: "EVT-9042", actor: "John Doe", action: "Release Rolled Back", resource: "Release v1.3", time: "10 mins ago", icon: Zap, color: "text-amber-500", bg: "bg-amber-50" },
    { id: "EVT-9041", actor: "System", action: "Test Run Completed", resource: "Patch PT-8485", time: "30 mins ago", icon: Activity, color: "text-red-500", bg: "bg-red-50" },
    { id: "EVT-9040", actor: "Alice Smith", action: "Release Deployed", resource: "Release v1.3", time: "1 hour ago", icon: Zap, color: "text-emerald-500", bg: "bg-emerald-50" },
    { id: "EVT-9039", actor: "John Doe", action: "Patch Approved", resource: "Patch PT-8492", time: "2 hours ago", icon: ShieldAlert, color: "text-blue-500", bg: "bg-blue-50" },
    { id: "EVT-9038", actor: "Alice Smith", action: "Draft Updated", resource: "Patch PT-8492", time: "3 hours ago", icon: Edit, color: "text-slate-500", bg: "bg-slate-100" },
    { id: "EVT-9037", actor: "John Doe", action: "Patch Created", resource: "Patch PT-8492", time: "4 hours ago", icon: Code, color: "text-indigo-500", bg: "bg-indigo-50" },
  ];

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Audit Trail</h1>
        <p className="text-sm text-slate-500 mt-1">Immutable record of all modifications, deployments, and testing events.</p>
      </div>
      
      <Card>
        <div className="divide-y divide-slate-100">
          {events.map(evt => (
            <div key={evt.id} className="p-4 flex items-start gap-4 hover:bg-slate-50/50">
              <div className={\`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 \${evt.bg} \${evt.color}\`}>
                <evt.icon className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-medium text-slate-900">{evt.actor}</span>
                    <span className="text-slate-500 mx-2">performed</span>
                    <span className="font-semibold text-slate-800">{evt.action}</span>
                  </div>
                  <span className="text-xs text-slate-400">{evt.time}</span>
                </div>
                <div className="text-sm text-slate-500 mt-1 flex items-center gap-2">
                  <span className="text-xs font-mono bg-slate-100 px-1.5 py-0.5 rounded">{evt.id}</span>
                  Target: <span className="font-medium text-indigo-600">{evt.resource}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
  `
};

Object.keys(files).forEach(key => {
  write(key, files[key]);
});

console.log('Remaining pages created.');

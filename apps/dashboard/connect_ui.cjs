const fs = require('fs');
const path = require('path');

const write = (filepath, content) => {
  fs.writeFileSync(path.join(__dirname, filepath), content.trim());
};

const files = {
  'src/pages/PatchesPage.tsx': `
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Search, Plus, Filter, MoreHorizontal, CheckCircle2, Clock, XCircle, AlertTriangle } from "lucide-react"
import { useAppStore } from "../store/appStore"
import { useNavigate } from "react-router-dom"

export default function PatchesPage() {
  const patches = useAppStore(state => state.patches);
  const navigate = useNavigate();

  const getStatusIcon = (status: string) => {
    switch(status) {
      case "Active": return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case "Ready to Deploy": return <Clock className="w-4 h-4 text-blue-500" />;
      case "Draft": return <div className="w-4 h-4 rounded-full border-2 border-slate-300" />;
      case "Failed": return <XCircle className="w-4 h-4 text-red-500" />;
      case "Conflict Detected": return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      default: return null;
    }
  }

  const getStatusBadge = (status: string) => {
    switch(status) {
      case "Active": return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Active</Badge>;
      case "Ready to Deploy": return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Ready</Badge>;
      case "Draft": return <Badge variant="outline" className="text-slate-500 border-slate-300">Draft</Badge>;
      case "Failed": return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Failed</Badge>;
      case "Conflict Detected": return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Conflict</Badge>;
      default: return null;
    }
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Patches</h1>
          <p className="text-sm text-slate-500 mt-1">Manage, review, and organize independent website modifications.</p>
        </div>
        <Button className="gap-2" onClick={() => navigate('/editor/demo')}><Plus className="w-4 h-4" /> New Patch</Button>
      </div>

      <div className="flex gap-4 items-center mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search patches by name, ID, or target..." 
            className="w-full h-10 pl-9 pr-4 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <Button variant="outline" className="gap-2"><Filter className="w-4 h-4" /> Filters</Button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="font-medium p-4 py-3">Patch ID</th>
                <th className="font-medium p-4 py-3">Patch Name</th>
                <th className="font-medium p-4 py-3">Website</th>
                <th className="font-medium p-4 py-3">Status</th>
                <th className="font-medium p-4 py-3">Version</th>
                <th className="font-medium p-4 py-3">Updated</th>
                <th className="font-medium p-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {patches.length === 0 && (
                 <tr><td colSpan={7} className="p-8 text-center text-slate-500">No patches found. Create one in the Visual Editor.</td></tr>
              )}
              {patches.map(patch => (
                <tr key={patch.id} className="hover:bg-slate-50/50 cursor-pointer transition-colors" onClick={() => navigate(\`/preview/\${patch.id}\`)}>
                  <td className="p-4 py-3 font-mono text-xs text-slate-500">{patch.id}</td>
                  <td className="p-4 py-3">
                    <div className="font-medium text-slate-900">{patch.name}</div>
                    <div className="text-xs text-slate-500 font-mono mt-0.5">{patch.operations.length} operations</div>
                  </td>
                  <td className="p-4 py-3 text-slate-600">Demo Website</td>
                  <td className="p-4 py-3">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(patch.status)}
                      {getStatusBadge(patch.status)}
                    </div>
                  </td>
                  <td className="p-4 py-3 text-slate-600 font-mono text-xs">{patch.version}</td>
                  <td className="p-4 py-3 text-slate-500">{new Date(patch.createdAt).toLocaleTimeString()}</td>
                  <td className="p-4 py-3 text-right">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
  `,
  'src/pages/ConflictsPage.tsx': `
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, ArrowRight } from "lucide-react"
import { useAppStore } from "../store/appStore"

export default function ConflictsPage() {
  const { conflicts, patches, resolveConflict } = useAppStore();

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <AlertTriangle className="w-6 h-6 text-amber-500" />
          Conflict Resolution
        </h1>
        <p className="text-sm text-slate-500 mt-1">Review and resolve overlapping property modifications on the same element.</p>
      </div>

      {conflicts.length === 0 ? (
        <div className="p-12 text-center text-slate-500 border border-slate-200 border-dashed rounded-lg">
          No conflicts detected across ready patches.
        </div>
      ) : (
        conflicts.map((conflict, i) => {
          const patchA = patches.find(p => p.id === conflict.conflictingOperations[0].patchId);
          const patchB = patches.find(p => p.id === conflict.conflictingOperations[1]?.patchId);
          
          if (!patchA || !patchB) return null;
          
          return (
            <div key={i} className="bg-white border border-amber-200 rounded-lg shadow-sm overflow-hidden mb-6">
              <div className="bg-amber-50 border-b border-amber-100 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="bg-white border-amber-200 text-amber-700">Conflict</Badge>
                  <span className="text-sm font-medium text-slate-700">Demo Website • {conflict.targetFingerprint}</span>
                </div>
              </div>
              
              <div className="p-6">
                <h3 className="font-semibold text-slate-900 mb-4">Property Overlap: <span className="font-mono text-indigo-600 text-sm bg-indigo-50 px-2 py-0.5 rounded">{conflict.property}</span></h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-400 font-bold text-xs z-10 shadow-sm hidden md:flex">
                    VS
                  </div>
                  
                  <div className="border border-slate-200 rounded-lg overflow-hidden flex flex-col">
                    <div className="bg-slate-50 border-b border-slate-200 p-3">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-medium text-slate-900 text-sm">{patchA.name}</span>
                        <Badge variant="outline" className="text-[10px]">{patchA.id}</Badge>
                      </div>
                    </div>
                    <div className="p-6 flex-1 flex flex-col items-center justify-center bg-slate-50/50">
                      <div className="w-full text-center space-y-4">
                        <div className="font-mono text-sm text-slate-500 line-through">{conflict.conflictingOperations[0].operation.originalValue}</div>
                        <ArrowRight className="w-4 h-4 mx-auto text-slate-300" />
                        <span className="font-mono text-sm font-medium text-indigo-700">{conflict.conflictingOperations[0].operation.newValue}</span>
                      </div>
                    </div>
                    <div className="p-3 border-t border-slate-200 bg-white">
                      <Button className="w-full bg-slate-800 hover:bg-slate-900" size="sm" onClick={() => resolveConflict(conflict.targetFingerprint, conflict.property, patchA.id)}>Keep {patchA.id}</Button>
                    </div>
                  </div>

                  <div className="border border-red-200 rounded-lg overflow-hidden flex flex-col shadow-[0_0_15px_rgba(220,38,38,0.1)]">
                    <div className="bg-red-50 border-b border-red-100 p-3">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-medium text-red-900 text-sm">{patchB.name}</span>
                        <Badge variant="outline" className="text-[10px] border-red-200 text-red-700 bg-white">{patchB.id}</Badge>
                      </div>
                    </div>
                    <div className="p-6 flex-1 flex flex-col items-center justify-center bg-slate-50/50">
                      <div className="w-full text-center space-y-4">
                        <div className="font-mono text-sm text-slate-500 line-through">{conflict.conflictingOperations[1].operation.originalValue}</div>
                        <ArrowRight className="w-4 h-4 mx-auto text-slate-300" />
                        <span className="font-mono text-sm font-medium text-red-700">{conflict.conflictingOperations[1].operation.newValue}</span>
                      </div>
                    </div>
                    <div className="p-3 border-t border-slate-200 bg-white">
                      <Button variant="outline" className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200" size="sm" onClick={() => resolveConflict(conflict.targetFingerprint, conflict.property, patchB.id)}>Keep {patchB.id}</Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  )
}
  `,
  'src/pages/ReleasesPage.tsx': `
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RotateCcw, Zap, ExternalLink } from "lucide-react"
import { useAppStore } from "../store/appStore"

export default function ReleasesPage() {
  const { releases, deployRelease, rollback, patches } = useAppStore();

  const handleCreateRelease = () => {
    const readyPatches = patches.filter(p => p.status === 'Ready to Deploy');
    if (readyPatches.length === 0) {
      alert("No patches are Ready to Deploy. Create and approve some patches first.");
      return;
    }
    deployRelease(readyPatches.map(p => p.id));
  };

  const activeRelease = releases.find(r => r.status === 'Active');

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Releases</h1>
          <p className="text-sm text-slate-500 mt-1">Manage deployments and roll back configurations instantly.</p>
        </div>
        <Button className="bg-indigo-600 hover:bg-indigo-700 gap-2" onClick={handleCreateRelease}><Zap className="w-4 h-4" /> Create Release</Button>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shrink-0 border border-emerald-200">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-3">
                {activeRelease ? 'Active Release' : 'No Active Release'}
                {activeRelease && <Badge className="bg-emerald-500 hover:bg-emerald-600 border-none font-medium text-xs rounded shadow-sm">LIVE</Badge>}
              </h2>
              {activeRelease ? (
                <p className="text-sm text-slate-500 mt-1">Release {activeRelease.version} is currently active.</p>
              ) : (
                <p className="text-sm text-slate-500 mt-1">Deploy your first release to see it here.</p>
              )}
            </div>
          </div>
        </div>
        
        <div className="p-0">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="font-medium p-4 py-3">Version</th>
                <th className="font-medium p-4 py-3">Description</th>
                <th className="font-medium p-4 py-3">Deployed</th>
                <th className="font-medium p-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {releases.length === 0 && (
                <tr><td colSpan={4} className="p-8 text-center text-slate-500">No releases history.</td></tr>
              )}
              {releases.map((release, index) => (
                <tr key={release.id} className={index === 0 ? "bg-emerald-50/30" : ""}>
                  <td className={\`p-4 py-3 font-mono text-xs font-semibold \${index === 0 ? 'text-emerald-700' : 'text-slate-500'}\`}>{release.version}</td>
                  <td className="p-4 py-3">
                    <div className="font-medium text-slate-900">
                      {release.rollbackOf ? \`Rollback of \${release.rollbackOf}\` : \`\${release.patchIds.length} patches included\`}
                    </div>
                  </td>
                  <td className="p-4 py-3 text-slate-600">{new Date(release.deployedAt).toLocaleTimeString()}</td>
                  <td className="p-4 py-3 text-right">
                    {index === 0 ? (
                      <Button variant="outline" size="sm" className="gap-2 h-8 text-xs font-medium"><ExternalLink className="w-3 h-3" /> View Site</Button>
                    ) : (
                      <Button variant="outline" size="sm" className="h-8 text-xs font-medium border-slate-300 hover:bg-slate-100 gap-1" onClick={() => rollback(release.id)}>
                        <RotateCcw className="w-3 h-3" /> Rollback To This
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
  `,
  'src/pages/AuditPage.tsx': `
import { Card } from "@/components/ui/card"
import { Activity, ShieldAlert, Zap, Edit, Code } from "lucide-react"
import { useAppStore } from "../store/appStore"
import { useEffect } from "react"

export default function AuditPage() {
  const { auditLogs, refreshAuditLogs } = useAppStore();

  useEffect(() => {
    refreshAuditLogs();
  }, []);

  const getIcon = (action: string) => {
    if (action.includes('Release')) return Zap;
    if (action.includes('PatchCreated')) return Code;
    if (action.includes('Draft')) return Edit;
    if (action.includes('Approved')) return ShieldAlert;
    return Activity;
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Audit Trail</h1>
        <p className="text-sm text-slate-500 mt-1">Immutable record of all modifications, deployments, and testing events.</p>
      </div>
      
      <Card>
        <div className="divide-y divide-slate-100">
          {auditLogs.length === 0 && (
             <div className="p-8 text-center text-slate-500">No events recorded.</div>
          )}
          {auditLogs.map(evt => {
            const Icon = getIcon(evt.action);
            return (
              <div key={evt.id} className="p-4 flex items-start gap-4 hover:bg-slate-50/50">
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 bg-slate-100 text-slate-500">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-medium text-slate-900">{evt.actorId}</span>
                      <span className="text-slate-500 mx-2">performed</span>
                      <span className="font-semibold text-slate-800">{evt.action}</span>
                    </div>
                    <span className="text-xs text-slate-400">{new Date(evt.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <div className="text-sm text-slate-500 mt-1 flex items-center gap-2">
                    <span className="text-xs font-mono bg-slate-100 px-1.5 py-0.5 rounded">{evt.id}</span>
                    Target: <span className="font-medium text-indigo-600">{evt.resourceId}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
  `,
  'src/pages/DashboardPage.tsx': `
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Globe, FileCode2, CheckCircle2, AlertCircle } from "lucide-react"
import { useAppStore } from "../store/appStore"
import { useNavigate } from "react-router-dom"
import { useEffect } from "react"

export default function DashboardPage() {
  const { patches, releases, auditLogs, refreshAuditLogs } = useAppStore();
  const navigate = useNavigate();

  useEffect(() => { refreshAuditLogs() }, []);

  const activePatchesCount = patches.length;
  const pendingReviewsCount = patches.filter(p => p.status === 'Ready to Deploy' || p.status === 'Conflict Detected').length;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Good afternoon, John</h1>
          <p className="text-slate-500 mt-1">Monitor your websites, patches, and releases from one workspace.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => useAppStore.getState().resetDemoState()}>Reset Demo State</Button>
          <Button onClick={() => navigate('/editor/demo')}>New Patch</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500">Connected Websites</p>
                <p className="text-3xl font-bold mt-2">1</p>
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
                <p className="text-sm font-medium text-slate-500">Total Patches</p>
                <p className="text-3xl font-bold mt-2">{activePatchesCount}</p>
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
                <p className="text-sm font-medium text-slate-500">Pending Approvals</p>
                <p className="text-3xl font-bold mt-2">{pendingReviewsCount}</p>
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
                <p className="text-sm font-medium text-slate-500">Deployments</p>
                <p className="text-3xl font-bold mt-2">{releases.length}</p>
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
                <div className="flex items-center justify-between p-4 hover:bg-slate-50 cursor-pointer" onClick={() => navigate('/editor/demo')}>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-100 rounded flex items-center justify-center border border-slate-200">
                      <Globe className="w-5 h-5 text-slate-400" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">Demo Website</p>
                      <p className="text-sm text-slate-500 font-mono text-xs">shop.demo.local</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-sm text-slate-500"><span className="font-medium text-slate-900">{activePatchesCount}</span> patches</div>
                    <div className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">Healthy</div>
                  </div>
                </div>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">Recent Activity</h2>
          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100 p-4 space-y-4">
                {auditLogs.slice(0, 4).map((act, i) => (
                  <div key={i} className="flex gap-3 pt-4 first:pt-0">
                    <div className="mt-0.5 text-indigo-500">
                      <div className="w-2 h-2 rounded-full bg-current"></div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">{act.action}</p>
                      <p className="text-xs text-slate-500">{act.resourceId} • {new Date(act.timestamp).toLocaleTimeString()}</p>
                    </div>
                  </div>
                ))}
                {auditLogs.length === 0 && <p className="text-sm text-slate-500">No activity yet.</p>}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
  `
};

Object.keys(files).forEach(key => {
  write(key, files[key]);
});

console.log('UI Connected to Zustand.');

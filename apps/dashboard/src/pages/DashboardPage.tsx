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
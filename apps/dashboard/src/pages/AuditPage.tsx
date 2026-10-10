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
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
                  <td className={`p-4 py-3 font-mono text-xs font-semibold ${index === 0 ? 'text-emerald-700' : 'text-slate-500'}`}>{release.version}</td>
                  <td className="p-4 py-3">
                    <div className="font-medium text-slate-900">
                      {release.rollbackOf ? `Rollback of ${release.rollbackOf}` : `${release.patchIds.length} patches included`}
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
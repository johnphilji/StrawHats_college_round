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
                <tr key={patch.id} className="hover:bg-slate-50/50 cursor-pointer transition-colors" onClick={() => navigate(`/preview/${patch.id}`)}>
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
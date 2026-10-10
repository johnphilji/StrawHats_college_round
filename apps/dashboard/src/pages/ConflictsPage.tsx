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
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Beaker, Check, X, SplitSquareHorizontal, Eye, ShieldCheck, Zap } from "lucide-react"

export default function PatchPreviewPage() {
  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-6 shrink-0 shadow-sm z-10">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-slate-900">Preview & Verify</h1>
            <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 border-none font-medium">Isolated Preview</Badge>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mt-0.5">
            <span>Acme Store</span>
            <span className="text-slate-300">•</span>
            <span className="font-medium text-indigo-600">Checkout Button — Blue Style</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="bg-white"><SplitSquareHorizontal className="w-4 h-4 mr-2" /> Side-by-Side</Button>
          <Button className="bg-indigo-600 hover:bg-indigo-700"><Zap className="w-4 h-4 mr-2" /> Deploy Patch</Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Verification Sidebar */}
        <div className="w-[320px] bg-white border-r border-slate-200 shrink-0 flex flex-col">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              Automated Checks
            </h3>
            <span className="text-xs font-medium text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">All Passed</span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {[
              { label: "Target element exists", status: "pass", time: "12ms" },
              { label: "Target fingerprint matches", status: "pass", time: "5ms" },
              { label: "Expected text is visible", status: "pass", time: "18ms" },
              { label: "Button remains enabled", status: "pass", time: "4ms" },
              { label: "No conflicting patches", status: "pass", time: "3ms" },
            ].map((check, i) => (
              <div key={i} className="flex justify-between items-start p-3 bg-slate-50 border border-slate-100 rounded-lg">
                <div className="flex gap-3">
                  <div className="mt-0.5 shrink-0 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center text-white">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">{check.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{check.time}</p>
                  </div>
                </div>
              </div>
            ))}
            
            <div className="pt-4 mt-6 border-t border-slate-100">
              <div className="bg-slate-900 text-white p-4 rounded-lg shadow-sm">
                <h4 className="font-semibold mb-1 text-sm">Ready for deployment</h4>
                <p className="text-xs text-slate-300 leading-relaxed mb-4">This patch modifies 2 properties on button#checkout-btn and introduces no known conflicts.</p>
                <Button className="w-full bg-white text-slate-900 hover:bg-slate-100" size="sm">Run Tests Again</Button>
              </div>
            </div>
          </div>
        </div>

        {/* Before / After Preview Area */}
        <div className="flex-1 flex bg-slate-200/50">
          <div className="flex-1 p-6 flex flex-col">
            <div className="flex justify-between items-center mb-4 px-2">
              <div className="font-medium text-slate-700 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-slate-400"></div> Current Release
              </div>
            </div>
            <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex items-center justify-center p-8 relative">
               <div className="w-full max-w-sm space-y-4">
                  <div className="h-6 w-32 bg-slate-100 rounded"></div>
                  <div className="h-4 w-full bg-slate-100 rounded"></div>
                  <div className="h-4 w-2/3 bg-slate-100 rounded"></div>
                  
                  {/* The Original Button */}
                  <div className="pt-6 relative group">
                    <div className="absolute -inset-3 border-2 border-dashed border-transparent group-hover:border-slate-300 rounded-lg transition-all pointer-events-none"></div>
                    <button className="w-full bg-slate-500 text-white font-medium py-3 rounded-md cursor-not-allowed">
                      Proceed to Checkout
                    </button>
                    <div className="absolute -top-7 right-0 text-[10px] font-mono bg-slate-800 text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                      bg-slate-500
                    </div>
                  </div>
               </div>
            </div>
          </div>
          
          <div className="w-px bg-slate-300 shadow-sm relative shrink-0">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white border border-slate-300 rounded-full flex items-center justify-center text-slate-400 shadow-sm cursor-col-resize z-10">
              <SplitSquareHorizontal className="w-4 h-4" />
            </div>
          </div>
          
          <div className="flex-1 p-6 flex flex-col">
            <div className="flex justify-between items-center mb-4 px-2">
              <div className="font-medium text-indigo-700 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-indigo-500"></div> Proposed Patch
              </div>
            </div>
            <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex items-center justify-center p-8 relative">
               <div className="w-full max-w-sm space-y-4">
                  <div className="h-6 w-32 bg-slate-100 rounded"></div>
                  <div className="h-4 w-full bg-slate-100 rounded"></div>
                  <div className="h-4 w-2/3 bg-slate-100 rounded"></div>
                  
                  {/* The Patched Button */}
                  <div className="pt-6 relative">
                    <div className="absolute -inset-3 border-2 border-dashed border-indigo-400 bg-indigo-50/30 rounded-lg pointer-events-none"></div>
                    <button className="w-full bg-blue-600 text-white font-medium py-3 rounded-md shadow-md shadow-blue-600/20 transition-all hover:bg-blue-700 relative z-10">
                      Continue to Payment
                    </button>
                    <div className="absolute -top-7 right-0 text-[10px] font-mono bg-indigo-600 text-white px-2 py-1 rounded shadow-sm z-20 flex gap-2">
                      <span className="line-through opacity-70">slate-500</span>
                      <span>blue-600</span>
                    </div>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
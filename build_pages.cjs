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

export default function PatchesPage() {
  const patches = [
    { id: "PT-8492", name: "Checkout Button — Blue Style", target: "button#checkout", website: "Acme Store", author: "John Doe", version: "v1.2", status: "Active", time: "2 hours ago" },
    { id: "PT-8491", name: "Hero Banner Text Update", target: "h1.hero-title", website: "Acme Store", author: "Alice Smith", version: "v1.0", status: "Ready to Deploy", time: "5 hours ago" },
    { id: "PT-8488", name: "Navigation Menu Links", target: "nav.main-menu", website: "Nova Portfolio", author: "John Doe", version: "Draft", status: "Draft", time: "1 day ago" },
    { id: "PT-8485", name: "Footer Color Change", target: "footer.site-footer", website: "Atlas Docs", author: "Bob Jones", version: "v2.1", status: "Failed", time: "2 days ago" },
    { id: "PT-8480", name: "Pricing Table Adjust", target: "table.pricing", website: "Orbit Dashboard", author: "Alice Smith", version: "v1.1", status: "Conflict Detected", time: "3 days ago" },
  ];

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
        <Button className="gap-2"><Plus className="w-4 h-4" /> New Patch</Button>
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
              {patches.map(patch => (
                <tr key={patch.id} className="hover:bg-slate-50/50 cursor-pointer transition-colors">
                  <td className="p-4 py-3 font-mono text-xs text-slate-500">{patch.id}</td>
                  <td className="p-4 py-3">
                    <div className="font-medium text-slate-900">{patch.name}</div>
                    <div className="text-xs text-slate-500 font-mono mt-0.5">{patch.target}</div>
                  </td>
                  <td className="p-4 py-3 text-slate-600">{patch.website}</td>
                  <td className="p-4 py-3">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(patch.status)}
                      {getStatusBadge(patch.status)}
                    </div>
                  </td>
                  <td className="p-4 py-3 text-slate-600 font-mono text-xs">{patch.version}</td>
                  <td className="p-4 py-3 text-slate-500">{patch.time}</td>
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
import { AlertTriangle, ArrowRight, Check, X } from "lucide-react"

export default function ConflictsPage() {
  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <AlertTriangle className="w-6 h-6 text-amber-500" />
          Conflict Resolution
        </h1>
        <p className="text-sm text-slate-500 mt-1">Review and resolve overlapping property modifications on the same element.</p>
      </div>

      <div className="bg-white border border-amber-200 rounded-lg shadow-sm overflow-hidden">
        <div className="bg-amber-50 border-b border-amber-100 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="bg-white border-amber-200 text-amber-700">Conflict #C-902</Badge>
            <span className="text-sm font-medium text-slate-700">Acme Store • button#checkout</span>
          </div>
          <span className="text-xs text-amber-700 font-medium">Detected 3 hours ago</span>
        </div>
        
        <div className="p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Property Overlap: <span className="font-mono text-indigo-600 text-sm bg-indigo-50 px-2 py-0.5 rounded">backgroundColor</span></h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-400 font-bold text-xs z-10 shadow-sm hidden md:flex">
              VS
            </div>
            
            <div className="border border-slate-200 rounded-lg overflow-hidden flex flex-col">
              <div className="bg-slate-50 border-b border-slate-200 p-3">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-medium text-slate-900 text-sm">Patch A: Blue Style</span>
                  <Badge variant="outline" className="text-[10px]">PT-8492</Badge>
                </div>
                <div className="text-xs text-slate-500">Author: John Doe</div>
              </div>
              <div className="p-6 flex-1 flex flex-col items-center justify-center bg-slate-50/50">
                <div className="w-full text-center space-y-4">
                  <div className="font-mono text-sm text-slate-500 line-through">gray (original)</div>
                  <ArrowRight className="w-4 h-4 mx-auto text-slate-300" />
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-6 h-6 rounded bg-blue-600 shadow-sm"></div>
                    <span className="font-mono text-sm font-medium text-blue-700">#2563eb</span>
                  </div>
                </div>
              </div>
              <div className="p-3 border-t border-slate-200 bg-white">
                <Button className="w-full bg-slate-800 hover:bg-slate-900" size="sm">Keep Patch A</Button>
              </div>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden flex flex-col shadow-[0_0_15px_rgba(220,38,38,0.1)] border-red-200">
              <div className="bg-red-50 border-b border-red-100 p-3">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-medium text-red-900 text-sm">Patch B: Red Style (Draft)</span>
                  <Badge variant="outline" className="text-[10px] border-red-200 text-red-700 bg-white">PT-8501</Badge>
                </div>
                <div className="text-xs text-red-600/70">Author: Alice Smith</div>
              </div>
              <div className="p-6 flex-1 flex flex-col items-center justify-center bg-slate-50/50">
                <div className="w-full text-center space-y-4">
                  <div className="font-mono text-sm text-slate-500 line-through">gray (original)</div>
                  <ArrowRight className="w-4 h-4 mx-auto text-slate-300" />
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-6 h-6 rounded bg-red-600 shadow-sm"></div>
                    <span className="font-mono text-sm font-medium text-red-700">#dc2626</span>
                  </div>
                </div>
              </div>
              <div className="p-3 border-t border-slate-200 bg-white">
                <Button variant="outline" className="w-full text-red-600 hover:text-red-700 hover:bg-red-50" size="sm">Keep Patch B</Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
  `,
  'src/pages/PatchPreviewPage.tsx': `
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
  `,
  'src/pages/ReleasesPage.tsx': `
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { History, RotateCcw, Zap, ExternalLink } from "lucide-react"

export default function ReleasesPage() {
  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Releases</h1>
          <p className="text-sm text-slate-500 mt-1">Manage deployments and roll back configurations instantly.</p>
        </div>
        <Button className="bg-indigo-600 hover:bg-indigo-700 gap-2"><Zap className="w-4 h-4" /> Create Release</Button>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shrink-0 border border-emerald-200">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-3">
                Active Release <Badge className="bg-emerald-500 hover:bg-emerald-600 border-none font-medium text-xs rounded shadow-sm">LIVE</Badge>
              </h2>
              <p className="text-sm text-slate-500 mt-1">Release v1.4 is currently active in DEMO ENVIRONMENT.</p>
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
                <th className="font-medium p-4 py-3">Status</th>
                <th className="font-medium p-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr className="bg-emerald-50/30">
                <td className="p-4 py-3 font-mono text-xs font-semibold text-emerald-700">v1.4</td>
                <td className="p-4 py-3">
                  <div className="font-medium text-slate-900">Previous known-good configuration restored</div>
                  <div className="text-xs text-slate-500 mt-0.5">Rolled back from v1.3 • 1 patch</div>
                </td>
                <td className="p-4 py-3 text-slate-600">10 mins ago by <span className="font-medium">System</span></td>
                <td className="p-4 py-3"><Badge className="bg-emerald-100 text-emerald-700">Active</Badge></td>
                <td className="p-4 py-3 text-right">
                  <Button variant="outline" size="sm" className="gap-2 h-8 text-xs font-medium"><ExternalLink className="w-3 h-3" /> View Site</Button>
                </td>
              </tr>
              <tr>
                <td className="p-4 py-3 font-mono text-xs text-slate-500">v1.3</td>
                <td className="p-4 py-3">
                  <div className="font-medium text-slate-900 line-through opacity-70">Checkout button broken layout</div>
                  <div className="text-xs text-red-500 mt-0.5 font-medium flex items-center gap-1">Failed verification in prod</div>
                </td>
                <td className="p-4 py-3 text-slate-600">30 mins ago by <span className="font-medium">Alice</span></td>
                <td className="p-4 py-3"><Badge variant="outline" className="border-red-200 text-red-700 bg-red-50">Rolled Back</Badge></td>
                <td className="p-4 py-3 text-right">
                  <Button variant="ghost" size="sm" className="h-8 text-xs" disabled>Revert to</Button>
                </td>
              </tr>
              <tr>
                <td className="p-4 py-3 font-mono text-xs text-slate-500">v1.2</td>
                <td className="p-4 py-3">
                  <div className="font-medium text-slate-900">Checkout styling updated</div>
                  <div className="text-xs text-slate-500 mt-0.5">2 patches included</div>
                </td>
                <td className="p-4 py-3 text-slate-600">1 day ago by <span className="font-medium">John</span></td>
                <td className="p-4 py-3"><Badge variant="outline" className="text-slate-500 border-slate-200 bg-slate-50">Archived</Badge></td>
                <td className="p-4 py-3 text-right">
                  <Button variant="outline" size="sm" className="h-8 text-xs font-medium border-slate-300 hover:bg-slate-100 gap-1"><RotateCcw className="w-3 h-3" /> Rollback</Button>
                </td>
              </tr>
              <tr>
                <td className="p-4 py-3 font-mono text-xs text-slate-500">v1.1</td>
                <td className="p-4 py-3">
                  <div className="font-medium text-slate-900">Checkout button text updated</div>
                  <div className="text-xs text-slate-500 mt-0.5">1 patch included</div>
                </td>
                <td className="p-4 py-3 text-slate-600">3 days ago by <span className="font-medium">John</span></td>
                <td className="p-4 py-3"><Badge variant="outline" className="text-slate-500 border-slate-200 bg-slate-50">Archived</Badge></td>
                <td className="p-4 py-3 text-right">
                  <Button variant="outline" size="sm" className="h-8 text-xs font-medium border-slate-300 hover:bg-slate-100 gap-1"><RotateCcw className="w-3 h-3" /> Rollback</Button>
                </td>
              </tr>
            </tbody>
          </table>
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

console.log('Additional pages created.');

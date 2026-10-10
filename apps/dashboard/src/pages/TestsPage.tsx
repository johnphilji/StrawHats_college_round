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
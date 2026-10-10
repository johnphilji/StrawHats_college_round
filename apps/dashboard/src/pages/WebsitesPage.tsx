import React, { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Search, Plus, Globe, Settings, ExternalLink } from "lucide-react"
import { useNavigate } from "react-router-dom"

export default function WebsitesPage() {
  const navigate = useNavigate();
  const [sites, setSites] = useState<any[]>([]);
  useEffect(() => {
    fetch('http://localhost:4001/api/sites').then(r => r.json()).then(setSites);
  }, []);

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
                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700" onClick={() => navigate(`/editor/${site.id}`)}>Open Editor</Button>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><Settings className="w-4 h-4" /></Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Undo, Redo, Play, Save, Monitor, ChevronRight, MousePointer2 } from "lucide-react";

interface PatchOperation {
  id: string;
  selector: string;
  targetFingerprint: string;
  operationType: 'setText' | 'setStyle' | 'setAttribute' | 'hide';
  property?: string;
  originalValue: string;
  newValue: string;
}

export default function EditorPage() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  const [history, setHistory] = useState<PatchOperation[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  
  const [selectedElement, setSelectedElement] = useState<any>(null);
  const [isReady, setIsReady] = useState(false);
  const [activeTab, setActiveTab] = useState('content');

  const currentOperations = history[historyIndex] || [];

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.origin !== 'http://localhost:4000') return;
      if (e.data.type === 'RUNTIME_READY') {
        setIsReady(true);
      }
      if (e.data.type === 'ELEMENT_SELECTED') {
        setSelectedElement(e.data.payload);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    // Send ops to iframe to live preview
    if (isReady && iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({
        type: 'PREVIEW_OPS',
        payload: { operations: currentOperations }
      }, 'http://localhost:4000');
    }
  }, [currentOperations, isReady]);

  const applyOperation = (operationType: PatchOperation['operationType'], property: string | undefined, newValue: string) => {
    if (!selectedElement) return;

    let originalValue = '';
    if (operationType === 'setText') originalValue = selectedElement.textContent;
    if (operationType === 'setStyle' && property) originalValue = selectedElement.computedStyles[property] || '';

    const newOp: PatchOperation = {
      id: Math.random().toString(36).substring(2, 9),
      selector: selectedElement.selector,
      targetFingerprint: selectedElement.fingerprint, // The raw string we received
      operationType,
      property,
      originalValue,
      newValue
    };

    const newHistory = history.slice(0, historyIndex + 1);
    const prevOps = [...(newHistory[historyIndex] || [])];
    
    const existingIndex = prevOps.findIndex(o => 
      o.selector === selectedElement.selector && 
      o.operationType === operationType && 
      o.property === property
    );
    
    if (existingIndex >= 0) {
      newOp.originalValue = prevOps[existingIndex].originalValue;
      prevOps[existingIndex] = newOp;
    } else {
      prevOps.push(newOp);
    }
    
    newHistory.push(prevOps);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => { if (historyIndex > 0) setHistoryIndex(historyIndex - 1); };
  const redo = () => { if (historyIndex < history.length - 1) setHistoryIndex(historyIndex + 1); };

  const savePatch = async () => {
    if (currentOperations.length === 0) return alert('No changes to save.');
    try {
      const res = await fetch('http://localhost:4001/api/sites/acme/patches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Editor Patch ' + new Date().toLocaleTimeString(),
          status: 'draft',
          version: '1.0',
          operations: currentOperations
        })
      });
      if (res.ok) {
        alert('Patch saved as draft!');
        setHistory([[]]);
        setHistoryIndex(0);
        setSelectedElement(null);
      }
    } catch(e) {
      alert('Failed to save patch');
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-slate-950 text-slate-200">
      <div className="h-14 border-b border-slate-800 flex items-center justify-between px-4 bg-slate-900/50 backdrop-blur-sm z-10">
        <div className="flex items-center space-x-4">
          <Badge variant="outline" className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20">
            <Monitor className="w-3 h-3 mr-1" />
            Acme Store
          </Badge>
          <div className="flex items-center space-x-1 border-l border-slate-700 pl-4">
            <Button variant="ghost" size="icon" onClick={undo} disabled={historyIndex === 0} className="h-8 w-8 text-slate-400">
              <Undo className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={redo} disabled={historyIndex === history.length - 1} className="h-8 w-8 text-slate-400">
              <Redo className="w-4 h-4" />
            </Button>
            <span className="text-xs text-slate-500 font-medium px-2">{currentOperations.length} ops</span>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm" className="bg-slate-800 border-slate-700 hover:bg-slate-700 h-8">
            <Play className="w-3 h-3 mr-2" />
            Preview
          </Button>
          <Button size="sm" onClick={savePatch} className="bg-indigo-600 hover:bg-indigo-700 text-white h-8">
            <Save className="w-3 h-3 mr-2" />
            Save Draft
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Properties Panel (Left) */}
        <div className="w-80 bg-slate-900 border-r border-slate-800 flex flex-col z-10 shadow-2xl overflow-y-auto">
          {!selectedElement ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 animate-pulse">
                <MousePointer2 className="w-8 h-8 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-slate-300 font-medium mb-1">Select an Element</h3>
                <p className="text-sm text-slate-500">Click on any element in the preview area to begin patching.</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col animate-in slide-in-from-left-4 duration-300">
              <div className="p-4 border-b border-slate-800 bg-slate-900/80 sticky top-0 backdrop-blur-md">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline" className="bg-slate-800 text-slate-300 uppercase tracking-wider text-[10px] font-bold">
                    {selectedElement.tag}
                  </Badge>
                  <Button variant="ghost" size="icon" onClick={() => setSelectedElement(null)} className="h-6 w-6 text-slate-500 hover:text-slate-300">
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
                <code className="text-xs text-indigo-400 font-mono break-all bg-indigo-950/30 p-2 rounded block border border-indigo-900/50">
                  {selectedElement.selector}
                </code>
              </div>
              
              <div className="flex border-b border-slate-800 bg-slate-900">
                <button 
                  onClick={() => setActiveTab('content')}
                  className={`flex-1 py-3 text-xs font-semibold uppercase tracking-wider transition-colors ${activeTab === 'content' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  Content
                </button>
                <button 
                  onClick={() => setActiveTab('styles')}
                  className={`flex-1 py-3 text-xs font-semibold uppercase tracking-wider transition-colors ${activeTab === 'styles' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  Styles
                </button>
              </div>

              <div className="p-5 space-y-6 flex-1">
                {activeTab === 'content' && (
                  <div className="space-y-4 animate-in fade-in duration-300">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Text Content</Label>
                      <textarea
                        className="w-full h-32 bg-slate-950 border border-slate-800 rounded-md p-3 text-sm text-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all resize-none shadow-inner"
                        placeholder="Element text..."
                        value={
                          currentOperations.find(o => o.selector === selectedElement.selector && o.operationType === 'setText')?.newValue ?? 
                          selectedElement.textContent
                        }
                        onChange={(e) => applyOperation('setText', undefined, e.target.value)}
                      />
                    </div>
                  </div>
                )}
                {activeTab === 'styles' && (
                  <div className="space-y-5 animate-in fade-in duration-300">
                    {['color', 'backgroundColor'].map(prop => {
                      const currentVal = currentOperations.find(o => o.selector === selectedElement.selector && o.operationType === 'setStyle' && o.property === prop)?.newValue 
                        ?? selectedElement.computedStyles[prop];
                        
                      return (
                        <div key={prop} className="space-y-2 group">
                          <Label className="text-xs font-semibold text-slate-400 uppercase tracking-wider group-hover:text-slate-300 transition-colors">
                            {prop.replace(/([A-Z])/g, ' $1').trim()}
                          </Label>
                          <div className="flex gap-2">
                            <div className="w-10 h-10 rounded border border-slate-700 shadow-sm transition-transform group-hover:scale-105" style={{ backgroundColor: currentVal }} />
                            <Input 
                              className="flex-1 bg-slate-950 border-slate-800 focus:border-indigo-500 text-slate-300 font-mono text-xs" 
                              value={currentVal}
                              onChange={(e) => applyOperation('setStyle', prop, e.target.value)}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Canvas Area */}
        <div className="flex-1 bg-slate-950 p-6 flex flex-col items-center overflow-auto relative">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900 via-slate-950 to-slate-950" />
          
          <div className="w-full max-w-[1200px] h-full flex flex-col shadow-2xl rounded-xl overflow-hidden border border-slate-800 z-10 bg-slate-900 animate-in zoom-in-95 duration-500">
            <div className="h-10 bg-slate-900 border-b border-slate-800 flex items-center px-4 space-x-2 shrink-0">
              <div className="flex space-x-1.5">
                <div className="w-3 h-3 rounded-full bg-slate-700" />
                <div className="w-3 h-3 rounded-full bg-slate-700" />
                <div className="w-3 h-3 rounded-full bg-slate-700" />
              </div>
              <div className="mx-auto bg-slate-950 text-slate-500 text-xs px-4 py-1 rounded-full border border-slate-800 flex items-center w-64 justify-center">
                <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse" />
                Target Website Connected
              </div>
            </div>
            <div className="flex-1 relative bg-white">
               <iframe
                 ref={iframeRef}
                 src="http://localhost:4000/?pw_edit=1"
                 className="w-full h-full border-none"
                 title="Target Site"
               />
               {!isReady && (
                 <div className="absolute inset-0 bg-slate-900/50 flex flex-col items-center justify-center backdrop-blur-sm">
                   <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
                   <p className="text-slate-300 font-medium">Connecting to Editor Bridge...</p>
                 </div>
               )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
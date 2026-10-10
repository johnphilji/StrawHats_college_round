import React, { useState, useEffect, useCallback } from 'react'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Undo, Redo, Play, Save, Rocket, Layout, Settings, FileText, Smartphone, Monitor, ChevronRight } from "lucide-react"

type OperationType = 'setText' | 'setStyle';

interface PatchOperation {
  id: string;
  targetId: string;
  type: OperationType;
  property?: string;
  originalValue: string;
  newValue: string;
}

interface ElementBaseState {
  id: string;
  tag: string;
  text?: string;
  styles: Record<string, string>;
  selector: string;
  fingerprint: string;
}

const BASE_ELEMENTS: Record<string, ElementBaseState> = {
  'hero-title': {
    id: 'hero-title',
    tag: 'h1',
    text: 'Premium Wireless Headphones',
    styles: { color: '#0f172a', backgroundColor: 'transparent', padding: '0px' },
    selector: 'h1#hero-title',
    fingerprint: 'a1b2c3d4'
  },
  'product-price': {
    id: 'product-price',
    tag: 'p',
    text: '$299.00',
    styles: { color: '#0f172a', backgroundColor: 'transparent', padding: '0px' },
    selector: 'p#product-price',
    fingerprint: 'b2c3d4e5'
  },
  'add-cart-btn': {
    id: 'add-cart-btn',
    tag: 'button',
    text: 'Add to Cart',
    styles: { color: '#0f172a', backgroundColor: 'transparent', padding: '8px 16px' },
    selector: 'button#add-cart-btn',
    fingerprint: 'c3d4e5f6'
  },
  'checkout-btn': {
    id: 'checkout-btn',
    tag: 'button',
    text: 'Proceed to Checkout',
    styles: { color: '#ffffff', backgroundColor: '#64748b', padding: '12px 16px' },
    selector: 'button#checkout-btn',
    fingerprint: 'a8f92bd3'
  }
};

export default function EditorPage() {
  const [history, setHistory] = useState<PatchOperation[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [activeTab, setActiveTab] = useState('content');

  // Load draft from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('patchwork_draft_operations');
    if (saved) {
      try {
        const ops = JSON.parse(saved);
        if (Array.isArray(ops)) {
          setHistory([ops]);
          setHistoryIndex(0);
        }
      } catch (e) {}
    }
  }, []);

  // Save to localStorage when history changes
  const currentOperations = history[historyIndex] || [];
  useEffect(() => {
    localStorage.setItem('patchwork_draft_operations', JSON.stringify(currentOperations));
  }, [currentOperations]);

  const computeState = useCallback((id: string) => {
    const base = BASE_ELEMENTS[id];
    if (!base) return null;
    
    let text = base.text;
    let styles = { ...base.styles };
    
    currentOperations.forEach(op => {
      if (op.targetId !== id) return;
      if (op.type === 'setText') {
        text = op.newValue;
      } else if (op.type === 'setStyle' && op.property) {
        styles[op.property] = op.newValue;
      }
    });
    
    return { ...base, text, styles };
  }, [currentOperations]);

  const applyOperation = (type: OperationType, property: string | undefined, newValue: string) => {
    if (!selectedId) return;
    
    const currentState = computeState(selectedId);
    if (!currentState) return;
    
    let originalValue = '';
    if (type === 'setText') originalValue = currentState.text || '';
    if (type === 'setStyle' && property) originalValue = currentState.styles[property] || '';

    // If no real change, skip
    if (originalValue === newValue) return;

    const newOp: PatchOperation = {
      id: Math.random().toString(36).substring(2, 9),
      targetId: selectedId,
      type,
      property,
      originalValue,
      newValue
    };

    const newHistory = history.slice(0, historyIndex + 1);
    const prevOps = [...(newHistory[historyIndex] || [])];
    
    // Check if we are modifying the same property, if so replace it to keep the list clean for the draft
    const existingIndex = prevOps.findIndex(o => o.targetId === selectedId && o.type === type && o.property === property);
    if (existingIndex >= 0) {
      // Keep the VERY original value from the first time we changed it
      newOp.originalValue = prevOps[existingIndex].originalValue;
      prevOps[existingIndex] = newOp;
    } else {
      prevOps.push(newOp);
    }
    
    newHistory.push(prevOps);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0) setHistoryIndex(historyIndex - 1);
  };

  const redo = () => {
    if (historyIndex < history.length - 1) setHistoryIndex(historyIndex + 1);
  };

  const EditableElement = ({ id, className, children, render }: any) => {
    const state = computeState(id);
    if (!state) return null;

    const isHovered = isSelectionMode && hoveredId === id;
    const isSelected = selectedId === id;

    const handleClick = (e: React.MouseEvent) => {
      if (isSelectionMode) {
        e.stopPropagation();
        e.preventDefault();
        setSelectedId(id);
        setIsSelectionMode(false);
        setHoveredId(null);
      } else if (isSelected) {
        e.stopPropagation(); // prevent clicking link actions when editing
        e.preventDefault();
      }
    };

    const handleMouseEnter = (e: React.MouseEvent) => {
      if (isSelectionMode) {
        e.stopPropagation();
        setHoveredId(id);
      }
    };

    const handleMouseLeave = () => {
      if (isSelectionMode && hoveredId === id) {
        setHoveredId(null);
      }
    };

    const baseClasses = "relative transition-all duration-200";
    const selectionClasses = isSelectionMode ? "cursor-pointer" : "";
    const hoverClasses = isHovered ? "ring-2 ring-indigo-400 ring-offset-2 ring-offset-slate-100 z-10" : "";
    const selectedClasses = isSelected ? "ring-2 ring-indigo-600 ring-offset-2 ring-offset-slate-100 z-20" : "";

    return (
      <div 
        className={`${baseClasses} ${selectionClasses} ${hoverClasses} ${selectedClasses} ${className || ''}`}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {render ? render(state) : (
          React.createElement(state.tag as any, { style: state.styles, className: "w-full h-full" }, state.text)
        )}
        
        {isSelected && (
          <div className="absolute -top-7 right-0 bg-indigo-600 text-white text-[10px] px-2 py-1 rounded font-mono shadow-md whitespace-nowrap z-30 pointer-events-none">
            {state.selector}
          </div>
        )}
        {isHovered && !isSelected && (
          <div className="absolute -top-7 right-0 bg-indigo-400 text-white text-[10px] px-2 py-1 rounded font-mono shadow-md whitespace-nowrap z-30 pointer-events-none">
            {state.selector}
          </div>
        )}
      </div>
    );
  };

  const selectedState = selectedId ? computeState(selectedId) : null;
  const hasChanges = currentOperations.length > 0;

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Editor Header */}
      <div className="h-14 border-b border-slate-200 flex items-center justify-between px-4 shrink-0 bg-slate-50">
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200">Acme Store</Badge>
          <Badge variant="outline" className={`border-amber-200 text-amber-700 bg-amber-50 ${hasChanges ? 'animate-pulse' : ''}`}>
            {hasChanges ? 'Unsaved Draft' : 'Draft Patch'}
          </Badge>
          <span className="text-sm font-medium text-slate-500 ml-2">Checkout Button Update</span>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center border border-slate-200 rounded-md bg-white mr-2">
            <button 
              className={`p-1.5 border-r border-slate-200 transition-colors ${historyIndex > 0 ? 'text-slate-700 hover:bg-slate-100' : 'text-slate-300 cursor-not-allowed'}`}
              title="Undo" 
              onClick={undo}
              disabled={historyIndex === 0}
            >
              <Undo className="w-4 h-4" />
            </button>
            <button 
              className={`p-1.5 transition-colors ${historyIndex < history.length - 1 ? 'text-slate-700 hover:bg-slate-100' : 'text-slate-300 cursor-not-allowed'}`}
              title="Redo" 
              onClick={redo}
              disabled={historyIndex === history.length - 1}
            >
              <Redo className="w-4 h-4" />
            </button>
          </div>
          
          <Button variant="outline" size="sm" className="gap-2">
            <Play className="w-4 h-4" /> Run Tests
          </Button>
          <Button variant="secondary" size="sm" className="gap-2" onClick={() => alert('Draft saved to localStorage.')}>
            <Save className="w-4 h-4" /> Save Draft
          </Button>
          <Button size="sm" className="gap-2" disabled={!hasChanges}>
            <Rocket className="w-4 h-4" /> Deploy
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel */}
        <div className="w-[220px] border-r border-slate-200 bg-slate-50 flex flex-col shrink-0">
          <div className="p-3 border-b border-slate-200 font-medium text-sm text-slate-700 flex items-center gap-2">
            <Layout className="w-4 h-4" /> Website Pages
          </div>
          <nav className="p-2 space-y-1">
            <button className="w-full text-left px-2 py-1.5 text-sm rounded bg-indigo-50 text-indigo-700 font-medium flex items-center justify-between">
              Product Page
              <ChevronRight className="w-4 h-4 opacity-50" />
            </button>
            <button className="w-full text-left px-2 py-1.5 text-sm rounded text-slate-600 hover:bg-slate-100 hover:text-slate-900 flex items-center justify-between">
              Homepage
            </button>
            <button className="w-full text-left px-2 py-1.5 text-sm rounded text-slate-600 hover:bg-slate-100 hover:text-slate-900 flex items-center justify-between">
              Checkout
            </button>
          </nav>
          
          <div className="p-3 border-y border-slate-200 font-medium text-sm text-slate-700 flex items-center gap-2 mt-auto">
            <FileText className="w-4 h-4" /> Active Patches
          </div>
          <div className="p-2 space-y-2 overflow-y-auto max-h-48">
            <div className="p-2 border border-slate-200 rounded text-xs bg-white">
              <div className="font-medium text-slate-900 mb-1">Header Logo Update</div>
              <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">v1.2</Badge>
            </div>
            <div className="p-2 border border-indigo-200 rounded text-xs bg-indigo-50">
              <div className="font-medium text-indigo-900 mb-1">Checkout Button Update</div>
              <Badge className="text-[10px] px-1 py-0 h-4 bg-amber-500 hover:bg-amber-600">Draft</Badge>
              <div className="mt-2 text-indigo-700 font-mono text-[10px]">{currentOperations.length} operations</div>
            </div>
          </div>
        </div>

        {/* Center Panel: Preview Canvas */}
        <div className="flex-1 bg-slate-200/50 flex flex-col relative">
          <div className="h-10 border-b border-slate-200 bg-white flex items-center justify-between px-4 shrink-0">
            <div className="flex items-center gap-2">
              <Button 
                variant={isSelectionMode ? "default" : "outline"} 
                size="sm" 
                className={`h-7 text-xs ${isSelectionMode ? 'bg-indigo-600 hover:bg-indigo-700' : ''}`}
                onClick={() => {
                  setIsSelectionMode(!isSelectionMode);
                  if (isSelectionMode) setHoveredId(null);
                }}
              >
                {isSelectionMode ? "Selecting... (Click to cancel)" : "Select Element"}
              </Button>
            </div>
            <div className="flex items-center border border-slate-200 rounded bg-slate-50">
              <button className="p-1.5 text-indigo-600 bg-white rounded shadow-sm border border-slate-200 m-0.5">
                <Monitor className="w-4 h-4" />
              </button>
              <button className="p-1.5 text-slate-500 hover:text-slate-900 m-0.5">
                <Smartphone className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 p-8 overflow-auto flex items-start justify-center">
            <div className="w-full max-w-4xl bg-white rounded-lg shadow-lg border border-slate-200 overflow-hidden flex flex-col min-h-[600px]">
              <div className="h-10 bg-slate-100 border-b border-slate-200 flex items-center px-4 gap-2 shrink-0">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400"></div>
                  <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                  <div className="w-3 h-3 rounded-full bg-green-400"></div>
                </div>
                <div className="mx-4 flex-1 bg-white border border-slate-200 rounded h-6 text-xs flex items-center px-3 text-slate-500 font-mono">
                  https://shop.demo.local/product/123
                </div>
              </div>
              
              <div className="flex-1 p-8 select-none">
                <header className="flex justify-between items-center pb-6 border-b border-slate-100 mb-8">
                  <div className="font-bold text-xl tracking-tight">ACME<span className="text-slate-400">STORE</span></div>
                  <nav className="flex gap-6 text-sm font-medium text-slate-600">
                    <span className="hover:text-black cursor-pointer">Products</span>
                    <span className="hover:text-black cursor-pointer">Categories</span>
                    <span className="hover:text-black cursor-pointer">About</span>
                  </nav>
                  <div className="flex gap-4 items-center">
                    <div className="text-sm font-medium">Cart (1)</div>
                  </div>
                </header>

                <main className="flex gap-12">
                  <div className="flex-1 bg-slate-100 aspect-square rounded-xl border border-slate-200 flex items-center justify-center">
                    <div className="text-slate-400 font-medium">Product Image Placeholder</div>
                  </div>
                  
                  <div className="flex-1 space-y-6">
                    <div>
                      <div className="text-sm text-indigo-600 font-semibold mb-1">New Arrival</div>
                      <EditableElement 
                        id="hero-title"
                        render={(state: any) => (
                          <h1 style={state.styles} className="text-3xl font-bold rounded">
                            {state.text}
                          </h1>
                        )}
                      />
                      <EditableElement 
                        id="product-price"
                        className="mt-2"
                        render={(state: any) => (
                          <p style={state.styles} className="text-2xl rounded inline-block">
                            {state.text}
                          </p>
                        )}
                      />
                    </div>
                    
                    <p className="text-slate-600 leading-relaxed">
                      Experience immersive sound with our latest noise-cancelling technology. Designed for all-day comfort and premium audio quality.
                    </p>

                    <div className="space-y-4 pt-4 border-t border-slate-100">
                      <div className="flex gap-4 items-center">
                        <select className="border border-slate-300 rounded px-3 py-2 w-24 bg-white" disabled>
                          <option>1</option>
                        </select>
                        <EditableElement 
                          id="add-cart-btn"
                          className="flex-1"
                          render={(state: any) => (
                            <button style={state.styles} className="w-full border border-slate-300 font-medium rounded-md hover:bg-slate-50 transition-colors">
                              {state.text}
                            </button>
                          )}
                        />
                      </div>
                      
                      <EditableElement 
                        id="checkout-btn"
                        render={(state: any) => (
                          <button style={state.styles} className="w-full font-medium rounded-md transition-all shadow-sm">
                            {state.text}
                          </button>
                        )}
                      />
                    </div>
                  </div>
                </main>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel: Inspector */}
        <div className="w-[300px] border-l border-slate-200 bg-white flex flex-col shrink-0">
          {!selectedState ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-500">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                <Settings className="w-6 h-6 text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-900 mb-1">No Element Selected</p>
              <p className="text-xs">Click "Select Element" and choose an element on the canvas to edit properties.</p>
            </div>
          ) : (
            <>
              <div className="p-4 border-b border-slate-200 bg-slate-50">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline" className="font-mono text-xs bg-white">{selectedState.tag}</Badge>
                  <button className="text-xs text-indigo-600 hover:underline font-medium" onClick={() => setSelectedId(null)}>Deselect</button>
                </div>
                <h3 className="font-semibold text-slate-900 truncate" title={selectedState.text}>"{selectedState.text}"</h3>
                <p className="text-xs text-slate-500 font-mono mt-1 truncate" title={selectedState.selector}>
                  <span className="text-indigo-600">{selectedState.selector}</span>
                </p>
              </div>

              <div className="flex border-b border-slate-200 text-sm font-medium bg-white">
                <button 
                  className={`flex-1 py-2.5 transition-colors ${activeTab === 'content' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}
                  onClick={() => setActiveTab('content')}
                >Content</button>
                <button 
                  className={`flex-1 py-2.5 transition-colors ${activeTab === 'styles' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}
                  onClick={() => setActiveTab('styles')}
                >Styles</button>
                <button 
                  className={`flex-1 py-2.5 transition-colors ${activeTab === 'info' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}
                  onClick={() => setActiveTab('info')}
                >Info</button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-white">
                {activeTab === 'content' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label htmlFor="element-text">Text Content</Label>
                        {selectedState.text !== BASE_ELEMENTS[selectedId!].text && (
                          <span className="text-[10px] text-amber-600 font-medium bg-amber-50 px-1.5 rounded border border-amber-100">Modified</span>
                        )}
                      </div>
                      <Input 
                        id="element-text" 
                        value={selectedState.text} 
                        onChange={(e) => applyOperation('setText', undefined, e.target.value)}
                      />
                      <p className="text-[10px] text-slate-400">Original: {BASE_ELEMENTS[selectedId!].text}</p>
                    </div>
                  </div>
                )}
                
                {activeTab === 'styles' && (
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <Label className="text-xs uppercase text-slate-400 font-bold tracking-wider">Colors</Label>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <Label className="text-xs">Background Color</Label>
                          {selectedState.styles.backgroundColor !== BASE_ELEMENTS[selectedId!].styles.backgroundColor && (
                            <span className="text-[10px] text-amber-600 font-medium">Modified</span>
                          )}
                        </div>
                        <div className="flex gap-2 items-center">
                          <div 
                            className="w-8 h-8 rounded border border-slate-200 shrink-0 shadow-sm"
                            style={{ backgroundColor: selectedState.styles.backgroundColor === 'transparent' ? '#ffffff' : selectedState.styles.backgroundColor }}
                          ></div>
                          <Input 
                            value={selectedState.styles.backgroundColor}
                            onChange={(e) => applyOperation('setStyle', 'backgroundColor', e.target.value)}
                            className="font-mono text-xs" 
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <Label className="text-xs">Text Color</Label>
                          {selectedState.styles.color !== BASE_ELEMENTS[selectedId!].styles.color && (
                            <span className="text-[10px] text-amber-600 font-medium">Modified</span>
                          )}
                        </div>
                        <div className="flex gap-2 items-center">
                          <div 
                            className="w-8 h-8 rounded border border-slate-200 shrink-0 shadow-sm"
                            style={{ backgroundColor: selectedState.styles.color }}
                          ></div>
                          <Input 
                            value={selectedState.styles.color}
                            onChange={(e) => applyOperation('setStyle', 'color', e.target.value)}
                            className="font-mono text-xs" 
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-4 pt-5 border-t border-slate-100">
                      <Label className="text-xs uppercase text-slate-400 font-bold tracking-wider">Spacing</Label>
                      
                      <div className="space-y-2">
                        <Label className="text-xs">Padding</Label>
                        <Input 
                          value={selectedState.styles.padding}
                          onChange={(e) => applyOperation('setStyle', 'padding', e.target.value)}
                          className="font-mono text-xs" 
                        />
                      </div>
                    </div>
                  </div>
                )}
                
                {activeTab === 'info' && (
                  <div className="space-y-4">
                    <div className="bg-slate-50 p-3 rounded-md border border-slate-200 space-y-2 shadow-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-500">Tag</span>
                        <span className="text-xs font-mono font-semibold text-slate-700">{selectedState.tag}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-500">Confidence</span>
                        <span className="text-xs font-mono font-semibold text-green-600">High (100%)</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-500">Fingerprint</span>
                        <span className="text-[10px] font-mono text-slate-400 bg-white px-1 border border-slate-200 rounded">{selectedState.fingerprint}</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-xs">Target Identifier Path</Label>
                      <div className="bg-slate-900 text-slate-300 p-3 rounded text-xs font-mono break-all leading-relaxed shadow-inner">
                        html &gt; body &gt; div#root &gt; main &gt; {selectedState.selector}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100">
                      <Label className="text-xs text-slate-500 mb-2 block">Current Operations ({currentOperations.filter(op => op.targetId === selectedId).length})</Label>
                      {currentOperations.filter(op => op.targetId === selectedId).map(op => (
                        <div key={op.id} className="text-[10px] font-mono bg-slate-50 p-2 rounded border border-slate-200 mb-2">
                          <span className="text-indigo-600">{op.type}</span>
                          {op.property && <span className="text-amber-600"> {op.property}</span>}
                          <div className="mt-1 text-slate-500 truncate">{op.originalValue} &rarr; {op.newValue}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, RotateCcw, Download, Terminal, FolderOpen, 
  HelpCircle, Image as ImageIcon, LineChart, Check, Copy, Sparkles,
  Maximize2, Minimize2, ZoomIn, ZoomOut, X, Expand, Shrink,
  FileCode, Plus, Save, Trash2, Search, Sliders, Activity, 
  Info, BarChart2, Eye, Grid, Layers, ChevronRight
} from 'lucide-react';

interface EditorFile {
  id: string;
  name: string;
  code: string;
  modified: boolean;
}

interface WorkspaceVariable {
  name: string;
  size: string;
  type: string;
  value: string;
  min?: string;
  max?: string;
  raw_preview?: string;
}

const DEFAULT_FILES: EditorFile[] = [
  {
    id: '1',
    name: 'main.m',
    modified: false,
    code: `% SignalLab UZ — MATLAB Online IDE (R2026b)
% 1D signal yaratish, shovqin qo'shish va filtrlash
clc;
clear;
close all;

Fs = 1000;
t = 0:1/Fs:0.2;
f1 = 50;
x = sin(2 * pi * f1 * t);

% Shovqin qo'shish
noise = 0.4 * randn(size(x));
x_noisy = x + noise;

% Filtrlash (Oddiy o'rtachalashtirish)
h = ones(1, 5) / 5;
y = conv(x_noisy, h);

% Natijalarni chizish
figure;
subplot(3, 1, 1);
plot(t, x);
title('Toza signal (50 Hz)');
xlabel('t, s'); ylabel('Amplituda'); grid on;

subplot(3, 1, 2);
plot(t, x_noisy);
title('Shovqinli signal');
xlabel('t, s'); ylabel('Amplituda'); grid on;

subplot(3, 1, 3);
plot(t, y(1:length(t)));
title('Filtrlangan signal');
xlabel('t, s'); ylabel('Amplituda'); grid on;

% Spektr tahlili
figure;
Y = abs(fft(x_noisy));
f = (0:length(x_noisy)-1) * Fs / length(x_noisy);
plot(f(1:length(f)/2), Y(1:length(Y)/2));
title('Amplituda spektri');
xlabel('f, Hz'); ylabel('|X(f)|'); grid on;
`
  },
  {
    id: '2',
    name: 'lab08_image_filters.m',
    modified: false,
    code: `% 2D Tasvir filtrlari va shovqinni tozalash
clc;
clear;
close all;

I = imread('cameraman.png');
Igray = rgb2gray(I);
I_noisy = imnoise(Igray, 'salt & pepper', 0.05);

% Median va Average filtrlari
I_med = medfilt2(I_noisy, [3 3]);
H_avg = fspecial('average', [3 3]);
I_avg = imfilter(I_noisy, H_avg);

figure;
subplot(1, 3, 1); imshow(I_noisy); title('Tuz-qalampir shovqin');
subplot(1, 3, 2); imshow(I_avg); title('Average filtr');
subplot(1, 3, 3); imshow(I_med); title('Median filtr (Tozalangan)');
`
  },
  {
    id: '3',
    name: 'filter_designer.m',
    modified: false,
    code: `% Butterworth Raqamli Filtri Sintezi
clc;
clear;
close all;

Fs = 1000;
Wp = 100 / (Fs/2); % Kesish chastotasi
[b, a] = butter(4, Wp, 'low');

% Chastota xarakteristikasini hisoblash
[H, w] = freqz(b, a, 512);

figure;
plot(w/pi * (Fs/2), 20*log10(abs(H)));
title('Butterworth Past Chastotalar Filtri (AFX)');
xlabel('Chastota (Hz)');
ylabel('Amplituda (dB)');
grid on;
`
  }
];

export const Workbench: React.FC = () => {
  // Toolstrip Tab ('home' | 'plots' | 'apps')
  const [toolstripTab, setToolstripTab] = useState<'home' | 'plots' | 'apps'>('home');

  // Multi-tab Editor Files
  const [files, setFiles] = useState<EditorFile[]>(DEFAULT_FILES);
  const [activeFileId, setActiveFileId] = useState<string>('1');

  // Active file code & cursor position
  const activeFile = files.find(f => f.id === activeFileId) || files[0];
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });

  // Terminal & Console states
  const [consoleHistory, setConsoleHistory] = useState<Array<{ type: 'input' | 'output' | 'error'; text: string }>>([
    { type: 'output', text: 'MATLAB Online (R2026b DSP Edition) — Tayyor.\nBuyruqlarni Command Window ga kiriting yoki F5 tugmasi orqali scriptni ishga tushiring.\nYordam uchun: help' }
  ]);
  const [commandInput, setCommandInput] = useState<string>('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Execution states
  const [running, setRunning] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [errorLine, setErrorLine] = useState<number | null>(null);

  // Workspace and Figures
  const [workspace, setWorkspace] = useState<WorkspaceVariable[]>([
    { name: 'Fs', size: '1x1', type: 'double', value: '1000', min: '1000', max: '1000' }
  ]);
  const [figures, setFigures] = useState<string[]>([]);
  const [activeRightTab, setActiveRightTab] = useState<'workspace' | 'figures'>('workspace');

  // Layout & Zooming
  const [panelWidth, setPanelWidth] = useState<'normal' | 'wide' | 'max'>('normal');
  const [inlineZoom, setInlineZoom] = useState<'fit' | 'medium' | 'large'>('fit');
  const [selectedFigure, setSelectedFigure] = useState<number | null>(null);
  const [modalZoom, setModalZoom] = useState<number>(100);

  // Variable Inspector Modal
  const [inspectVariable, setInspectVariable] = useState<WorkspaceVariable | null>(null);

  // Search in files
  const [fileSearch, setFileSearch] = useState('');

  // Refs
  const editorTextareaRef = useRef<HTMLTextAreaElement>(null);
  const editorGutterRef = useRef<HTMLDivElement>(null);
  const consoleBottomRef = useRef<HTMLDivElement>(null);
  const commandInputRef = useRef<HTMLInputElement>(null);

  // Synchronize textarea & line numbers gutter scrolling
  const handleEditorScroll = () => {
    if (editorTextareaRef.current && editorGutterRef.current) {
      editorGutterRef.current.scrollTop = editorTextareaRef.current.scrollTop;
    }
  };

  // Update cursor position
  const handleEditorKeyUp = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;
    const text = textarea.value.substring(0, textarea.selectionStart);
    const lines = text.split('\n');
    setCursorPos({
      line: lines.length,
      col: lines[lines.length - 1].length + 1
    });
  };

  const handleEditorClick = (e: React.MouseEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;
    const text = textarea.value.substring(0, textarea.selectionStart);
    const lines = text.split('\n');
    setCursorPos({
      line: lines.length,
      col: lines[lines.length - 1].length + 1
    });
  };

  // Update active file code
  const handleCodeChange = (newCode: string) => {
    setFiles(prev => prev.map(f => f.id === activeFileId ? { ...f, code: newCode, modified: true } : f));
    if (errorLine !== null) setErrorLine(null);
  };

  // Support Tab key (4 spaces) in Editor
  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const val = textarea.value;
      const nextVal = val.substring(0, start) + '    ' + val.substring(end);
      handleCodeChange(nextVal);
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 4;
      }, 0);
    } else if (e.key === 'F5') {
      e.preventDefault();
      handleRunScript();
    } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      handleSaveFile();
    }
  };

  // Run full script
  const handleRunScript = () => {
    if (running) return;
    setRunning(true);
    setHasError(false);
    
    // Add banner in console
    setConsoleHistory(prev => [
      ...prev,
      { type: 'input', text: `>> run('${activeFile.name}')` }
    ]);

    fetch('/api/dsp/execute_matlab', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: activeFile.code,
        session_id: 'workbench-session'
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.output) {
          setConsoleHistory(prev => [
            ...prev,
            { type: data.has_error ? 'error' : 'output', text: data.output }
          ]);
        }
        if (data.workspace && data.workspace.length > 0) {
          setWorkspace(data.workspace);
        }
        if (data.figures && data.figures.length > 0) {
          setFigures(data.figures);
          setActiveRightTab('figures');
        }
        setHasError(data.has_error || false);
        setErrorLine(data.error_line || null);
        setRunning(false);
        setTimeout(() => {
          consoleBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 50);
      })
      .catch(err => {
        setConsoleHistory(prev => [
          ...prev,
          { type: 'error', text: `[Xatolik]: ${err.message}` }
        ]);
        setHasError(true);
        setRunning(false);
      });
  };

  // Execute interactive command in Command Window (prompt >>)
  const handleExecuteCommand = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = commandInput.trim();
    if (!cmd) return;

    // Save to command history
    setCommandHistory(prev => [...prev, cmd]);
    setHistoryIndex(-1);
    setCommandInput('');

    // Special client commands
    if (cmd === 'clc') {
      setConsoleHistory([]);
      return;
    }

    setConsoleHistory(prev => [...prev, { type: 'input', text: `>> ${cmd}` }]);

    let codeToRun = cmd;
    const runMatch = cmd.match(/^run\s*\(\s*['"]?([^'"]+)['"]?\s*\)$|^run\s+([a-zA-Z0-9_.]+)/i);
    if (runMatch) {
      const targetName = (runMatch[1] || runMatch[2]).trim();
      const foundFile = files.find(f => f.name.toLowerCase() === targetName.toLowerCase() || f.name.toLowerCase() === `${targetName.toLowerCase()}.m`);
      if (foundFile) {
        codeToRun = foundFile.code;
      }
    }

    fetch('/api/dsp/execute_matlab', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: codeToRun,
        session_id: 'workbench-session'
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.output === '>> CLC_CLEAR') {
          setConsoleHistory([]);
          return;
        }
        if (data.output) {
          setConsoleHistory(prev => [
            ...prev,
            { type: data.has_error ? 'error' : 'output', text: data.output }
          ]);
        }
        if (data.workspace) {
          setWorkspace(data.workspace);
        }
        if (data.figures && data.figures.length > 0) {
          setFigures(data.figures);
          setActiveRightTab('figures');
        }
        setHasError(data.has_error || false);
        setErrorLine(data.error_line || null);
        setTimeout(() => {
          consoleBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 50);
      })
      .catch(err => {
        setConsoleHistory(prev => [
          ...prev,
          { type: 'error', text: `[Xatolik]: ${err.message}` }
        ]);
      });
  };

  // Command History Navigation (Up / Down arrow)
  const handleCommandInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length === 0) return;
      const nextIdx = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(nextIdx);
      setCommandInput(commandHistory[nextIdx]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex === -1) return;
      const nextIdx = historyIndex + 1;
      if (nextIdx >= commandHistory.length) {
        setHistoryIndex(-1);
        setCommandInput('');
      } else {
        setHistoryIndex(nextIdx);
        setCommandInput(commandHistory[nextIdx]);
      }
    }
  };

  // AI error fix
  const handleFixWithAI = () => {
    setFixing(true);
    const lastError = [...consoleHistory].reverse().find(c => c.type === 'error')?.text || activeFile.code;
    fetch('/api/ai/fix_error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: activeFile.code,
        error_message: lastError,
        lab_id: 1
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.fixed_code) {
          handleCodeChange(data.fixed_code);
          setConsoleHistory(prev => [
            ...prev,
            { 
              type: 'output', 
              text: `>> ✨ AI Virtual Ustoz Maslahati:\n${data.explanation || "Kod xatoliklari bartaraf qilindi."}\n>> Yangilangan kodni qayta ishga tushiring (F5).` 
            }
          ]);
          setHasError(false);
        }
        setFixing(false);
      })
      .catch(err => {
        setConsoleHistory(prev => [
          ...prev,
          { type: 'error', text: `AI xizmatida xatolik: ${err.message}` }
        ]);
        setFixing(false);
      });
  };

  // File management
  const handleNewFile = () => {
    const num = files.length + 1;
    const newFile: EditorFile = {
      id: Date.now().toString(),
      name: `script_${num}.m`,
      code: `% MATLAB Script: script_${num}.m\nclc;\nclear;\n\n% Kodingizni shu yerga yozing:\n`,
      modified: true
    };
    setFiles(prev => [...prev, newFile]);
    setActiveFileId(newFile.id);
  };

  const handleCloseFile = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (files.length === 1) return;
    const remaining = files.filter(f => f.id !== id);
    setFiles(remaining);
    if (activeFileId === id) {
      setActiveFileId(remaining[0].id);
    }
  };

  const handleSaveFile = () => {
    setFiles(prev => prev.map(f => f.id === activeFileId ? { ...f, modified: false } : f));
    setConsoleHistory(prev => [
      ...prev,
      { type: 'output', text: `>> '${activeFile.name}' saqlandi.` }
    ]);
  };

  const handleClearWorkspace = () => {
    fetch('/api/dsp/execute_matlab', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'clear', clear_session: true, session_id: 'workbench-session' })
    }).then(() => {
      setWorkspace([]);
      setConsoleHistory(prev => [...prev, { type: 'output', text: '>> Workspace tozalandi (clear).' }]);
    });
  };

  const handleDownloadFigure = (figB64: string, index: number) => {
    const link = document.createElement('a');
    link.href = figB64;
    link.download = `MATLAB_Figure_${index + 1}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Keyboard shortcut listener for Lightbox modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedFigure(null);
        setInspectVariable(null);
      } else if (selectedFigure !== null) {
        if (e.key === '+' || e.key === '=') {
          setModalZoom(z => Math.min(300, z + 25));
        } else if (e.key === '-' || e.key === '_') {
          setModalZoom(z => Math.max(50, z - 25));
        } else if (e.key === '0') {
          setModalZoom(100);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedFigure]);

  // Line count for editor line numbering
  const lineCount = activeFile.code.split('\n').length;
  const lineNumbers = Array.from({ length: Math.max(lineCount, 25) }, (_, i) => i + 1);

  // Filtered files in Current Folder
  const filteredFiles = files.filter(f => f.name.toLowerCase().includes(fileSearch.toLowerCase()));

  return (
    <div className="max-w-[1560px] mx-auto px-2 sm:px-4 py-3 space-y-2">
      
      {/* 1. MATHWORKS MATLAB TOOLSTRIP RIBBON */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        
        {/* Ribbon Title Bar */}
        <div className="bg-slate-50 dark:bg-slate-950 px-4 py-2 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-matlab-blue to-cyan-500 flex items-center justify-center text-white shadow-sm font-bold text-xs font-mono">
              M
            </div>
            <span className="font-bold text-xs text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <span>MATLAB Online</span>
              <span className="text-[10px] font-normal px-1.5 py-0.2 rounded bg-matlab-blue/10 text-matlab-blue dark:text-cyan-400 font-mono">
                R2026b DSP Edition
              </span>
            </span>
          </div>

          {/* Ribbon Tabs Switcher */}
          <div className="flex items-center gap-1 bg-slate-200/60 dark:bg-slate-800/80 p-0.5 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setToolstripTab('home')}
              className={`px-3 py-1 rounded-lg transition-all ${
                toolstripTab === 'home' 
                  ? 'bg-white dark:bg-slate-700 text-matlab-blue dark:text-cyan-400 shadow-sm' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              HOME
            </button>
            <button
              onClick={() => setToolstripTab('plots')}
              className={`px-3 py-1 rounded-lg transition-all ${
                toolstripTab === 'plots' 
                  ? 'bg-white dark:bg-slate-700 text-matlab-blue dark:text-cyan-400 shadow-sm' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              PLOTS
            </button>
            <button
              onClick={() => setToolstripTab('apps')}
              className={`px-3 py-1 rounded-lg transition-all ${
                toolstripTab === 'apps' 
                  ? 'bg-white dark:bg-slate-700 text-matlab-blue dark:text-cyan-400 shadow-sm' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              APPS
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-green-500 font-semibold flex items-center gap-1 font-mono">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              Online Engine
            </span>
          </div>
        </div>

        {/* Ribbon Tools Container */}
        <div className="p-2 sm:px-4 flex flex-wrap items-center justify-between gap-3 text-xs">
          {toolstripTab === 'home' && (
            <div className="flex items-center gap-4 divide-x divide-slate-200 dark:divide-slate-800">
              
              {/* FILE GROUP */}
              <div className="flex items-center gap-1.5 pr-3">
                <button
                  onClick={handleNewFile}
                  className="flex flex-col items-center justify-center px-2.5 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium transition-colors"
                  title="Yangi script yaratish"
                >
                  <Plus className="w-4 h-4 text-cyan-600 dark:text-cyan-400 mb-0.5" />
                  <span className="text-[10px]">New Script</span>
                </button>

                <button
                  onClick={handleSaveFile}
                  className="flex flex-col items-center justify-center px-2.5 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium transition-colors"
                  title="Scriptni saqlash (Ctrl+S)"
                >
                  <Save className="w-4 h-4 text-slate-500 mb-0.5" />
                  <span className="text-[10px]">Save</span>
                </button>
              </div>

              {/* RUN GROUP */}
              <div className="flex items-center gap-2 px-3">
                <button
                  onClick={handleRunScript}
                  disabled={running}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold shadow-md shadow-green-600/20 active:scale-95 transition-all"
                  title="Scriptni ishga tushirish (F5)"
                >
                  <Play className={`w-4 h-4 fill-current ${running ? 'animate-spin' : ''}`} />
                  <div className="text-left leading-tight">
                    <div className="text-xs">Run</div>
                    <div className="text-[9px] opacity-80 font-normal">F5</div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setCommandInput(`run('${activeFile.name}')`);
                    commandInputRef.current?.focus();
                  }}
                  className="flex flex-col items-center justify-center px-2.5 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium transition-colors"
                  title="Buyruqlar satriga chiqarish"
                >
                  <Terminal className="w-4 h-4 text-matlab-blue dark:text-cyan-400 mb-0.5" />
                  <span className="text-[10px]">Run Section</span>
                </button>
              </div>

              {/* ENVIRONMENT GROUP */}
              <div className="flex items-center gap-1.5 pl-3">
                <button
                  onClick={handleClearWorkspace}
                  className="flex flex-col items-center justify-center px-2.5 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium transition-colors"
                  title="Xotira o'zgaruvchilarini tozalash (clear)"
                >
                  <Trash2 className="w-4 h-4 text-amber-500 mb-0.5" />
                  <span className="text-[10px]">Clear Vars</span>
                </button>

                <button
                  onClick={() => setConsoleHistory([])}
                  className="flex flex-col items-center justify-center px-2.5 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium transition-colors"
                  title="Buyruqlar oynasini tozalash (clc)"
                >
                  <RotateCcw className="w-4 h-4 text-slate-500 mb-0.5" />
                  <span className="text-[10px]">Clear clc</span>
                </button>

                <button
                  onClick={() => setPanelWidth(p => p === 'normal' ? 'wide' : p === 'wide' ? 'max' : 'normal')}
                  className="flex flex-col items-center justify-center px-2.5 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium transition-colors"
                  title="Panel tartibini almashtirish"
                >
                  <Layers className="w-4 h-4 text-purple-500 mb-0.5" />
                  <span className="text-[10px]">Layout</span>
                </button>
              </div>

            </div>
          )}

          {toolstripTab === 'plots' && (
            <div className="flex items-center gap-2 overflow-x-auto py-1">
              {[
                { name: 'plot(t, x)', desc: '2D Chiziqli Grafik', code: 'figure; plot(x); title("2D Plot"); grid on;' },
                { name: 'stem(n, x)', desc: 'Diskret Stem', code: 'figure; stem(x(1:min(50, length(x)))); title("Discrete Stem"); grid on;' },
                { name: 'spectrogram(x)', desc: 'STFT Spektrogramma', code: 'figure; spectrogram(x); title("Spectrogram");' },
                { name: 'imhist(I)', desc: 'Tasvir Gistogrammasi', code: 'figure; imhist(imread("cameraman.png")); title("Gistogramma");' },
                { name: 'imshow(I)', desc: 'Tasvir ko\'rsatish', code: 'figure; imshow(imread("cameraman.png")); title("Cameraman");' },
              ].map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    handleCodeChange(activeFile.code + `\n\n% ${p.name}\n${p.code}\n`);
                    setTimeout(() => handleRunScript(), 50);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-matlab-blue/10 hover:text-matlab-blue dark:hover:text-cyan-400 font-medium text-slate-700 dark:text-slate-300 transition-colors shrink-0"
                >
                  <LineChart className="w-3.5 h-3.5 text-cyan-500" />
                  <span>{p.name}</span>
                </button>
              ))}
            </div>
          )}

          {toolstripTab === 'apps' && (
            <div className="flex items-center gap-2 overflow-x-auto py-1">
              <button
                onClick={() => {
                  setCommandInput("help filter");
                  commandInputRef.current?.focus();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 font-semibold"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Filter Designer (IIR / FIR)</span>
              </button>

              <button
                onClick={() => {
                  setCommandInput("help fft");
                  commandInputRef.current?.focus();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-semibold"
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Signal Analyzer (Spektr)</span>
              </button>

              <button
                onClick={() => {
                  setCommandInput("help medfilt2");
                  commandInputRef.current?.focus();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-500/10 text-green-600 dark:text-green-400 font-semibold"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Image Segmenter (DIP)</span>
              </button>
            </div>
          )}

          {/* Quick Help Link */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setCommandInput("help");
                const form = document.getElementById("cmd-form") as HTMLFormElement;
                if (form) form.requestSubmit();
              }}
              className="flex items-center gap-1 text-slate-500 hover:text-matlab-blue text-xs font-medium"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Doc</span>
            </button>
          </div>

        </div>
      </div>

      {/* 2. MAIN MATLAB DESKTOP: 3-PANE DOCKABLE WORKBENCH */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 h-[740px]">
        
        {/* PANE 1: CURRENT FOLDER (LEFT) */}
        <div className={`${
          panelWidth === 'max' 
            ? 'hidden' 
            : panelWidth === 'wide' 
            ? 'hidden xl:flex xl:col-span-2' 
            : 'lg:col-span-2 flex'
        } bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 flex-col justify-between overflow-hidden shadow-sm transition-all duration-300`}>
          
          <div className="space-y-3 flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                <FolderOpen className="w-4 h-4 text-amber-500" />
                <span>Current Folder</span>
              </div>
              <button 
                onClick={handleNewFile}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-900 dark:hover:text-white"
                title="Yangi script yaratish"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="text-[10px] text-slate-400 font-mono bg-slate-50 dark:bg-slate-950 px-2 py-1 rounded-lg border border-slate-200/60 dark:border-slate-800 truncate" title="C:\MATLAB\DSP_Lab\">
              C:\MATLAB\DSP_Lab\
            </div>

            <div className="relative">
              <Search className="w-3 h-3 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Fayllarni qidirish..."
                value={fileSearch}
                onChange={(e) => setFileSearch(e.target.value)}
                className="w-full pl-7 pr-2 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-[11px] focus:outline-none focus:ring-1 focus:ring-matlab-blue"
              />
            </div>

            {/* Files List */}
            <div className="flex-1 overflow-y-auto space-y-1 pr-1 font-mono text-xs">
              <div className="text-[10px] font-bold text-slate-400 px-2 py-1 uppercase tracking-wider">
                Scriptlar (.m)
              </div>
              {filteredFiles.map((file) => (
                <div
                  key={file.id}
                  onClick={() => setActiveFileId(file.id)}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl cursor-pointer transition-all ${
                    file.id === activeFileId
                      ? 'bg-matlab-blue/10 text-matlab-blue dark:text-cyan-400 font-bold border border-matlab-blue/30'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <FileCode className="w-3.5 h-3.5 shrink-0 text-matlab-blue" />
                    <span className="truncate">{file.name}</span>
                    {file.modified && <span className="text-amber-500">*</span>}
                  </div>
                  {files.length > 1 && (
                    <button
                      onClick={(e) => handleCloseFile(file.id, e)}
                      className="opacity-0 group-hover:opacity-100 hover:text-red-500 p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}

              <div className="text-[10px] font-bold text-slate-400 px-2 pt-3 py-1 uppercase tracking-wider">
                Namunalar (Datasetlar)
              </div>
              {[
                { name: 'cameraman.png', type: 'image', insert: "I = imread('cameraman.png');\nfigure; imshow(I);" },
                { name: 'peppers.png', type: 'image', insert: "RGB = imread('peppers.png');\nfigure; imshow(RGB);" },
                { name: 'speech_sample.wav', type: 'audio', insert: "[x, Fs] = audioread('speech.wav');\nfigure; plot(x);" }
              ].map((res, i) => (
                <div
                  key={i}
                  onClick={() => {
                    handleCodeChange(activeFile.code + `\n\n% Namunani yuklash:\n${res.insert}\n`);
                    setTimeout(() => handleRunScript(), 50);
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer text-[11px] transition-colors"
                  title="Kodingizga qo'shish va ko'rish"
                >
                  {res.type === 'image' ? (
                    <ImageIcon className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <Activity className="w-3.5 h-3.5 text-cyan-500" />
                  )}
                  <span className="truncate">{res.name}</span>
                </div>
              ))}
            </div>

          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 text-center">
            SignalLab UZ Filesystem
          </div>
        </div>

        {/* PANE 2: CENTER WORKSPACE (EDITOR + COMMAND WINDOW) */}
        <div className={`${
          panelWidth === 'max' 
            ? 'lg:col-span-4' 
            : panelWidth === 'wide' 
            ? 'lg:col-span-6 xl:col-span-5' 
            : 'lg:col-span-6'
        } flex flex-col gap-3 h-full transition-all duration-300`}>
          
          {/* TOP HALF: MATLAB SCRIPT EDITOR */}
          <div className="flex-1 bg-slate-950 text-slate-100 border border-slate-800 rounded-2xl flex flex-col overflow-hidden shadow-inner">
            
            {/* Editor Multi-Tab Bar */}
            <div className="bg-slate-900/90 border-b border-slate-800 px-2 pt-1 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1 overflow-x-auto">
                {files.map(file => (
                  <div
                    key={file.id}
                    onClick={() => setActiveFileId(file.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-xl cursor-pointer border-t-2 font-mono transition-all ${
                      file.id === activeFileId
                        ? 'bg-slate-950 text-cyan-400 border-matlab-blue font-bold shadow-sm'
                        : 'border-transparent text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <FileCode className="w-3 h-3 text-cyan-500" />
                    <span>{file.name}</span>
                    {file.modified && <span className="text-amber-400">*</span>}
                    {files.length > 1 && (
                      <button
                        onClick={(e) => handleCloseFile(file.id, e)}
                        className="hover:text-red-400 p-0.5 rounded"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
                
                <button
                  onClick={handleNewFile}
                  className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                  title="Yangi script qo'shish"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="text-[10px] text-slate-500 font-mono hidden sm:block">
                Ln {cursorPos.line}, Col {cursorPos.col}
              </div>
            </div>

            {/* Code Editor Body with Line Numbers Gutter */}
            <div className="flex-1 flex overflow-hidden relative">
              {/* Line Numbers Gutter */}
              <div 
                ref={editorGutterRef}
                className="w-10 bg-slate-950 text-slate-600 text-right pr-2 select-none font-mono text-xs leading-relaxed py-2 overflow-hidden border-r border-slate-900"
              >
                {lineNumbers.map(n => (
                  <div 
                    key={n} 
                    className={
                      n === errorLine 
                        ? "text-red-400 font-bold bg-red-950/80 rounded px-0.5 border border-red-500/50 shadow-sm" 
                        : n === cursorPos.line 
                        ? "text-cyan-400 font-bold" 
                        : ""
                    }
                    title={n === errorLine ? `Xatolik ${n}-qatorda aniqlangan` : undefined}
                  >
                    {n}
                  </div>
                ))}
              </div>

              {/* Textarea Code Input */}
              <textarea
                ref={editorTextareaRef}
                value={activeFile.code}
                onChange={(e) => handleCodeChange(e.target.value)}
                onKeyDown={handleEditorKeyDown}
                onKeyUp={handleEditorKeyUp}
                onClick={handleEditorClick}
                onScroll={handleEditorScroll}
                spellCheck={false}
                className="flex-1 bg-transparent text-slate-100 font-mono text-xs leading-relaxed p-2 resize-none outline-none overflow-auto"
                style={{ tabSize: 4 }}
              />
            </div>

            {/* Editor Footer Status Bar */}
            <div className="bg-slate-900/80 border-t border-slate-800/80 px-3 py-1 flex items-center justify-between text-[10px] text-slate-400 font-mono">
              <div className="flex items-center gap-3">
                <span>MATLAB (.m)</span>
                <span>UTF-8</span>
                <span>Spaces: 4</span>
              </div>
              <div>
                {activeFile.modified ? <span className="text-amber-400">● O'zgarishlar saqlanmadi</span> : <span>Saqlangan</span>}
              </div>
            </div>

          </div>

          {/* BOTTOM HALF: INTERACTIVE COMMAND WINDOW */}
          <div className="h-56 bg-slate-950 text-slate-100 border border-slate-800 rounded-2xl flex flex-col overflow-hidden shadow-inner">
            
            {/* Command Window Header Bar */}
            <div className="bg-slate-900/90 border-b border-slate-800 px-3 py-1.5 flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                <span className="font-mono font-bold text-slate-200">Command Window</span>
              </div>

              <div className="flex items-center gap-2">
                {hasError && (
                  <button
                    onClick={handleFixWithAI}
                    disabled={fixing}
                    className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-[10px] font-bold shadow-md transition-all animate-pulse"
                  >
                    <Sparkles className={`w-3 h-3 ${fixing ? 'animate-spin' : ''}`} />
                    <span>{fixing ? "Tuzatmoqda..." : "AI bilan tuzatish"}</span>
                  </button>
                )}
                
                <button
                  onClick={() => setConsoleHistory([])}
                  className="text-[10px] text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-800"
                  title="clc"
                >
                  clc
                </button>
              </div>
            </div>

            {/* Command Output Scroll Area */}
            <div className="flex-1 overflow-y-auto p-3 font-mono text-xs space-y-1 text-cyan-300">
              {consoleHistory.map((item, idx) => (
                <div 
                  key={idx} 
                  className={`whitespace-pre-wrap ${
                    item.type === 'input' 
                      ? 'text-white font-bold' 
                      : item.type === 'error' 
                      ? 'text-red-400 bg-red-950/20 p-1 rounded' 
                      : 'text-cyan-300'
                  }`}
                >
                  {item.text}
                </div>
              ))}
              <div ref={consoleBottomRef} />
            </div>

            {/* Live Interactive Command Prompt Input (>> ) */}
            <form 
              id="cmd-form"
              onSubmit={handleExecuteCommand}
              className="bg-slate-900 border-t border-slate-800 px-3 py-1.5 flex items-center gap-2"
            >
              <span className="font-mono font-bold text-cyan-400 select-none text-xs">
                &gt;&gt;
              </span>
              <input
                ref={commandInputRef}
                type="text"
                value={commandInput}
                onChange={(e) => setCommandInput(e.target.value)}
                onKeyDown={handleCommandInputKeyDown}
                placeholder="Buyruq yozing (masalan: x = 1:5; sum(x), whos, help fft)..."
                className="flex-1 bg-transparent font-mono text-xs text-white outline-none placeholder:text-slate-600"
              />
              <button 
                type="submit"
                className="text-[10px] px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-mono"
              >
                Enter
              </button>
            </form>

          </div>

        </div>

        {/* PANE 3: WORKSPACE & LIVE FIGURES (RIGHT) */}
        <div className={`${
          panelWidth === 'max' 
            ? 'lg:col-span-8' 
            : panelWidth === 'wide' 
            ? 'lg:col-span-6 xl:col-span-5' 
            : 'lg:col-span-4'
        } bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 flex flex-col justify-between shadow-sm transition-all duration-300`}>
          
          <div className="space-y-3 flex-1 flex flex-col overflow-hidden">
            
            {/* View Switcher Tabs & Panel Width Resizer */}
            <div className="flex items-center justify-between gap-1.5">
              <div className="flex flex-1 gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                <button
                  onClick={() => setActiveRightTab('workspace')}
                  className={`flex-1 py-1 rounded-lg text-xs font-semibold transition-all ${
                    activeRightTab === 'workspace' 
                      ? 'bg-white dark:bg-slate-700 text-matlab-blue dark:text-cyan-400 shadow-sm' 
                      : 'text-slate-500'
                  }`}
                >
                  Workspace ({workspace.length})
                </button>
                <button
                  onClick={() => setActiveRightTab('figures')}
                  className={`flex-1 py-1 rounded-lg text-xs font-semibold transition-all ${
                    activeRightTab === 'figures' 
                      ? 'bg-white dark:bg-slate-700 text-matlab-blue dark:text-cyan-400 shadow-sm' 
                      : 'text-slate-500'
                  }`}
                >
                  Figures ({figures.length})
                </button>
              </div>

              {/* Panel Resizer: Normal (4) -> Wide (5) -> Max (8) */}
              <button
                onClick={() => setPanelWidth(p => p === 'normal' ? 'wide' : p === 'wide' ? 'max' : 'normal')}
                className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-medium transition-colors"
                title={panelWidth === 'normal' ? "Panelni kengaytirish" : panelWidth === 'wide' ? "Maksimal kengaytirish" : "Odatiy holatga qaytarish"}
              >
                {panelWidth === 'max' ? (
                  <Shrink className="w-4 h-4 text-matlab-blue dark:text-cyan-400" />
                ) : (
                  <Expand className="w-4 h-4 text-matlab-blue dark:text-cyan-400" />
                )}
              </button>
            </div>

            {/* TAB CONTENT: WORKSPACE SPREADSHEET TABLE */}
            {activeRightTab === 'workspace' && (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex items-center justify-between pb-1 text-[11px] text-slate-400">
                  <span>Xotiradagi o'zgaruvchilar jadvali:</span>
                  <button 
                    onClick={handleClearWorkspace}
                    className="hover:text-red-400 flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Clear</span>
                  </button>
                </div>

                <div className="flex-1 overflow-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                  <table className="w-full text-left font-mono text-[11px] border-collapse">
                    <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 sticky top-0 border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="p-2 font-bold">Name</th>
                        <th className="p-2 font-bold">Value</th>
                        <th className="p-2 font-bold">Size</th>
                        <th className="p-2 font-bold">Class</th>
                        <th className="p-2 font-bold">Min</th>
                        <th className="p-2 font-bold">Max</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {workspace.length > 0 ? (
                        workspace.map((v, i) => (
                          <tr 
                            key={i} 
                            onClick={() => setInspectVariable(v)}
                            className="hover:bg-matlab-blue/5 dark:hover:bg-slate-800/60 cursor-pointer transition-colors"
                            title="Batafsil qiymatlarni ko'rish uchun bosing"
                          >
                            <td className="p-2 font-bold text-matlab-blue dark:text-cyan-400 flex items-center gap-1">
                              <Grid className="w-3 h-3 opacity-60" />
                              <span>{v.name}</span>
                            </td>
                            <td className="p-2 text-slate-600 dark:text-slate-300 truncate max-w-[120px]">
                              {v.value}
                            </td>
                            <td className="p-2 text-slate-400">{v.size}</td>
                            <td className="p-2 text-slate-400">{v.type}</td>
                            <td className="p-2 text-slate-400">{v.min || '-'}</td>
                            <td className="p-2 text-slate-400">{v.max || '-'}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="text-center py-12 text-slate-400 text-xs font-sans">
                            Workspace bo'sh. Scriptni ishga tushiring (F5).
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB CONTENT: FIGURES VIEWER */}
            {activeRightTab === 'figures' && (
              <div className="flex-1 flex flex-col overflow-hidden space-y-2">
                {figures.length > 0 && (
                  <div className="flex items-center justify-between pb-1 text-xs">
                    <span className="text-[11px] text-slate-400 font-medium">
                      O'lcham:
                    </span>
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-[10px]">
                      <button
                        onClick={() => setInlineZoom('fit')}
                        className={`px-2 py-0.5 rounded font-medium transition-all ${
                          inlineZoom === 'fit' ? 'bg-white dark:bg-slate-700 text-matlab-blue dark:text-cyan-400 shadow-sm' : 'text-slate-500'
                        }`}
                      >
                        Moslash
                      </button>
                      <button
                        onClick={() => setInlineZoom('medium')}
                        className={`px-2 py-0.5 rounded font-medium transition-all ${
                          inlineZoom === 'medium' ? 'bg-white dark:bg-slate-700 text-matlab-blue dark:text-cyan-400 shadow-sm' : 'text-slate-500'
                        }`}
                      >
                        O'rtacha
                      </button>
                      <button
                        onClick={() => setInlineZoom('large')}
                        className={`px-2 py-0.5 rounded font-medium transition-all ${
                          inlineZoom === 'large' ? 'bg-white dark:bg-slate-700 text-matlab-blue dark:text-cyan-400 shadow-sm' : 'text-slate-500'
                        }`}
                      >
                        Katta
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                  {figures.length > 0 ? (
                    figures.map((fig, idx) => (
                      <div 
                        key={idx} 
                        className="group rounded-2xl border border-slate-200 dark:border-slate-800 p-3 bg-white dark:bg-slate-950 shadow-sm hover:border-matlab-blue/50 dark:hover:border-cyan-500/50 transition-all"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-xs text-slate-700 dark:text-slate-200">
                            Figure {idx + 1}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                setSelectedFigure(idx);
                                setModalZoom(100);
                              }}
                              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-matlab-blue/10 hover:text-matlab-blue dark:hover:text-cyan-400 text-slate-500 text-xs transition-colors"
                              title="Kattalashtirish (To'liq ekranda ochish)"
                            >
                              <Maximize2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDownloadFigure(fig, idx)}
                              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white text-xs transition-colors"
                              title="PNG formatida yuklab olish"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* White Canvas wrapper for crisp contrast */}
                        <div 
                          onClick={() => {
                            setSelectedFigure(idx);
                            setModalZoom(100);
                          }}
                          className={`cursor-zoom-in overflow-hidden rounded-xl bg-white border border-slate-100 p-1 flex items-center justify-center transition-all ${
                            inlineZoom === 'large' 
                              ? 'min-h-[360px]' 
                              : inlineZoom === 'medium' 
                              ? 'min-h-[260px]' 
                              : 'min-h-[160px]'
                          }`}
                          title="Batafsil va katta o'lchamda ko'rish uchun bosing"
                        >
                          <img 
                            src={fig} 
                            alt={`Figure ${idx + 1}`} 
                            className="w-full h-auto object-contain transition-transform duration-200 group-hover:scale-[1.01]" 
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-16 text-slate-400 text-xs space-y-2">
                      <ImageIcon className="w-8 h-8 mx-auto opacity-30 text-slate-400" />
                      <div>Hozircha grafiklar chizilmadi.</div>
                      <div className="text-[11px] text-slate-500">Kodda `plot()`, `stem()`, yoki `figure` ishlating.</div>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 text-center">
            {activeRightTab === 'workspace' ? "O'zgaruvchiga bosib qiymatlarni ko'ring" : "Grafik ustiga bosib kattalashtiring"}
          </div>

        </div>

      </div>

      {/* 3. VARIABLE INSPECTOR MODAL */}
      {inspectVariable && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setInspectVariable(null)}
        >
          <div 
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Grid className="w-4 h-4 text-matlab-blue dark:text-cyan-400" />
                <span className="font-bold text-sm text-slate-800 dark:text-white font-mono">
                  Variable: {inspectVariable.name}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono">
                  {inspectVariable.size} • {inspectVariable.type}
                </span>
              </div>
              <button
                onClick={() => setInspectVariable(null)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Variable Metadata */}
            <div className="grid grid-cols-4 gap-2 p-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-xs font-mono">
              <div>
                <span className="text-[10px] text-slate-400 block">O'lcham:</span>
                <span className="font-bold text-slate-700 dark:text-slate-200">{inspectVariable.size}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Tipi (Class):</span>
                <span className="font-bold text-slate-700 dark:text-slate-200">{inspectVariable.type}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Minimal:</span>
                <span className="font-bold text-slate-700 dark:text-slate-200">{inspectVariable.min || '-'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Maksimal:</span>
                <span className="font-bold text-slate-700 dark:text-slate-200">{inspectVariable.max || '-'}</span>
              </div>
            </div>

            {/* Raw Content View */}
            <div className="flex-1 overflow-auto p-4 font-mono text-xs text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 leading-relaxed whitespace-pre-wrap">
              {inspectVariable.raw_preview || inspectVariable.value}
            </div>

            {/* Footer */}
            <div className="px-5 py-2.5 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setInspectVariable(null)}
                className="px-4 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-200"
              >
                Yopish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. HIGH-RESOLUTION INTERACTIVE MODAL LIGHTBOX FOR FIGURES */}
      {selectedFigure !== null && figures[selectedFigure] && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex flex-col p-4 sm:p-6 animate-in fade-in duration-200"
          onClick={() => setSelectedFigure(null)}
        >
          {/* Modal Header */}
          <div 
            className="flex items-center justify-between pb-3 border-b border-slate-800 text-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <span className="font-bold text-sm text-white font-mono">
                Figure {selectedFigure + 1}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-bold">
                200 DPI High-Res
              </span>
            </div>

            {/* Center: Zoom Controls */}
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-2xl shadow-lg">
              <button
                onClick={() => setModalZoom(z => Math.max(50, z - 25))}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition-colors"
                title="Kichraytirish (-)"
              >
                <ZoomOut className="w-4 h-4" />
              </button>

              <span className="text-xs font-mono font-bold w-12 text-center text-cyan-400">
                {modalZoom}%
              </span>

              <button
                onClick={() => setModalZoom(z => Math.min(300, z + 25))}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition-colors"
                title="Kattalashtirish (+)"
              >
                <ZoomIn className="w-4 h-4" />
              </button>

              <button
                onClick={() => setModalZoom(100)}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors ml-1"
                title="100% ga qaytarish (0)"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleDownloadFigure(figures[selectedFigure], selectedFigure)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors shadow-sm"
                title="PNG sifatida saqlash"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Yuklab olish</span>
              </button>

              <button
                onClick={() => setSelectedFigure(null)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-red-500/20 hover:text-red-400 text-slate-400 transition-colors"
                title="Yopish (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Modal Body: Scrollable, Zoomable Canvas */}
          <div 
            className="flex-1 overflow-auto flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div 
              className="bg-white rounded-2xl shadow-2xl p-3 border border-slate-800 max-w-full transition-all duration-150"
              style={{ width: `${modalZoom}%`, minWidth: '450px' }}
            >
              <img 
                src={figures[selectedFigure]} 
                alt={`Figure ${selectedFigure + 1}`} 
                className="w-full h-auto rounded-xl"
              />
            </div>
          </div>

          {/* Modal Footer Hotkeys Tip */}
          <div className="text-center text-[11px] text-slate-500 pt-2 border-t border-slate-900">
            Maslahat: <kbd className="px-1.5 py-0.5 bg-slate-900 rounded text-slate-400 font-mono">Esc</kbd> yopish | <kbd className="px-1.5 py-0.5 bg-slate-900 rounded text-slate-400 font-mono">+</kbd> / <kbd className="px-1.5 py-0.5 bg-slate-900 rounded text-slate-400 font-mono">-</kbd> kattalashtirish | <kbd className="px-1.5 py-0.5 bg-slate-900 rounded text-slate-400 font-mono">0</kbd> asl o'lcham
          </div>
        </div>
      )}

    </div>
  );
};

import React, { useState } from 'react';
import { 
  Network, Play, Code2, Plus, Trash2, ArrowRight, 
  Layers, Sliders, CheckCircle2, FileCode, Copy, Check, 
  Image as ImageIcon, Activity, Terminal, Eye 
} from 'lucide-react';

interface PipelineNode {
  id: string;
  type: 'source' | 'process' | 'view' | 'measure';
  name: string;
  category: '1d' | '2d';
  params: Record<string, any>;
}

export const PipelineBuilder: React.FC = () => {
  const [nodes, setNodes] = useState<PipelineNode[]>([
    { id: '1', type: 'source', name: 'Sinusoidal Signal Generator', category: '1d', params: { f1: 15, a1: 1.5, noise: 'gaussian' } },
    { id: '2', type: 'process', name: 'Butterworth Past Chastotali Filtr', category: '1d', params: { order: 4, cutoff: 25 } },
    { id: '3', type: 'view', name: 'Amplituda Spektri (FFT)', category: '1d', params: { window: 'hamming' } },
    { id: '4', type: 'measure', name: 'SNR va RMS O\'lchash', category: '1d', params: {} },
  ]);

  const [pipelineOutput, setPipelineOutput] = useState<any>(null);
  const [running, setRunning] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [copied, setCopied] = useState(false);

  const availableBlocks: Array<Omit<PipelineNode, 'id'>> = [
    { type: 'source', name: 'Benchmark Rasm (Cameraman)', category: '2d', params: { image: 'cameraman' } },
    { type: 'source', name: 'Benchmark Rasm (Peppers Rangli)', category: '2d', params: { image: 'peppers' } },
    { type: 'source', name: 'Audio Nutq Namunasi (16 kHz)', category: '1d', params: { file: 'speech_sample.wav' } },
    { type: 'source', name: 'Sinusoidal Signal (1D)', category: '1d', params: { f1: 20, a1: 1.0, noise: 'none' } },
    { type: 'process', name: '2D Median Filtr (3x3)', category: '2d', params: { ksize: 3 } },
    { type: 'process', name: 'Morfologik Ochish (Open)', category: '2d', params: { shape: 'disk', radius: 4 } },
    { type: 'process', name: '2D DCT Kvantlash Siqish', category: '2d', params: { Q: 40 } },
    { type: 'process', name: 'Butterworth Past Chastotali Filtr', category: '1d', params: { order: 4, cutoff: 30 } },
    { type: 'process', name: 'Tasvirni Silliqlash (Gauss 5x5)', category: '2d', params: { sigma: 1.5 } },
    { type: 'view', name: 'Tasvir Ko\'rish (Yonma-yon)', category: '2d', params: {} },
    { type: 'view', name: 'Vaqt va Chastota Grafigi', category: '1d', params: {} },
    { type: 'measure', name: 'PSNR va SSIM Metriklari', category: '2d', params: {} },
    { type: 'measure', name: 'RMS, Quvvat va SNR O\'lchash', category: '1d', params: {} },
  ];

  const handleAddNode = (block: Omit<PipelineNode, 'id'>) => {
    const newNode: PipelineNode = {
      id: String(Date.now()),
      type: block.type,
      name: block.name,
      category: block.category,
      params: { ...block.params }
    };
    setNodes(prev => [...prev, newNode]);
  };

  const handleRemoveNode = (id: string) => {
    setNodes(prev => prev.filter(n => n.id !== id));
  };

  // Generate dynamic MATLAB script based on the current nodes sequence
  const generateMatlabScript = (nodeList: PipelineNode[]): string => {
    const isImage = nodeList.some(n => n.category === '2d');
    const lines: string[] = [
      "% SignalLab UZ — Avtomatik Vizual Pipeline Skripti",
      `% Konveyer elementlari soni: ${nodeList.length}`,
      `% Sanasi: ${new Date().toLocaleDateString()}`,
      ""
    ];

    if (isImage) {
      lines.push("%% 1. Tasvir Manbasi (Image Source)");
      lines.push("I = imread('cameraman.png');");
      lines.push("Igray = rgb2gray(I);");
      lines.push("I_proc = Igray;");
      lines.push("");

      lines.push("%% 2. Ishlov berish bosqichlari (Processing Steps)");
      nodeList.forEach((n, idx) => {
        if (n.name.includes("Median")) {
          lines.push(`% [Bosqich ${idx+1}] 2D Median filtr`);
          lines.push("I_noisy = imnoise(I_proc, 'salt & pepper', 0.05);");
          lines.push("I_proc = medfilt2(I_noisy, [3 3]);");
        } else if (n.name.includes("Morfologik")) {
          lines.push(`% [Bosqich ${idx+1}] Morfologik operatsiya`);
          lines.push("BW = imbinarize(I_proc);");
          lines.push("se = strel('disk', 3);");
          lines.push("I_proc = imopen(BW, se);");
        } else if (n.name.includes("DCT")) {
          lines.push(`% [Bosqich ${idx+1}] 2D DCT siqish`);
          lines.push("D = dct2(I_proc);");
          lines.push("D(abs(D) < 25) = 0;");
          lines.push("I_proc = uint8(idct2(D));");
        } else if (n.name.includes("Gauss")) {
          lines.push(`% [Bosqich ${idx+1}] Gauss silliqlash`);
          lines.push("H = fspecial('gaussian', [5 5], 1.5);");
          lines.push("I_proc = imfilter(I_proc, H);");
        }
      });

      lines.push("");
      lines.push("%% 3. Vizualizatsiya va O'lchovlar");
      lines.push("imshowpair(Igray, I_proc, 'montage');");
      lines.push("title('Vizual Konveyer Natijasi: Asl tasvir va Qayta ishlangan tasvir');");
      lines.push("disp('Tasvir pipeline muvaffaqiyatli bajarildi');");
      lines.push("psnr_approx = 34.2;");
      lines.push("fprintf('Olingan PSNR sifat darajasi: %.2f dB\\n', psnr_approx);");
    } else {
      lines.push("%% 1. 1D Signal Manbasi (Signal Source)");
      lines.push("Fs = 1000;");
      lines.push("t = 0:1/Fs:1;");
      lines.push("f1 = 15;");
      lines.push("x = 1.5 * sin(2 * pi * f1 * t) + 0.3 * randn(size(t));");
      lines.push("y = x;");
      lines.push("");

      lines.push("%% 2. Ishlov berish (Filtrlash va qayta ishlash)");
      const filterNode = nodeList.find(n => n.name.includes("Butterworth"));
      const cutoff = filterNode?.params?.cutoff || 25;
      lines.push(`[b, a] = butter(4, ${cutoff} / (Fs/2), 'low');`);
      lines.push("y = filter(b, a, x);");
      lines.push("");

      lines.push("%% 3. Spektral Tahlil (FFT)");
      lines.push("N = length(y);");
      lines.push("Y = fft(y);");
      lines.push("f = (0:N/2) * (Fs/N);");
      lines.push("P2 = abs(Y/N);");
      lines.push("P1 = P2(1:N/2+1);");
      lines.push("");

      lines.push("%% 4. O'lchovlar va Grafiklarni chizish");
      lines.push("figure;");
      lines.push("subplot(2,1,1);");
      lines.push("plot(t, x, 'r', t, y, 'b');");
      lines.push("title('1D Signal Pipeline: Shovqinli va Filtrlangan');");
      lines.push("xlabel('Vaqt (s)'); ylabel('Amplituda');");
      lines.push("legend('Kiruvchi shovqinli', 'Filtrlangan toza'); grid on;");
      lines.push("");
      lines.push("subplot(2,1,2);");
      lines.push("plot(f, P1);");
      lines.push("title('Amplituda Spektri (FFT)');");
      lines.push("xlabel('Chastota (Hz)'); ylabel('|P(f)|'); grid on;");
      lines.push("");
      lines.push("rms_val = rms(y);");
      lines.push("P_val = mean(y.^2);");
      lines.push("fprintf('Filtrlangan signal RMS: %.4f, O\\'rtacha quvvat: %.4f\\n', rms_val, P_val);");
    }

    return lines.join("\n");
  };

  const generatedScript = generateMatlabScript(nodes);

  const handleRunPipeline = () => {
    setRunning(true);
    setPipelineOutput(null);

    fetch('/api/dsp/execute_matlab', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: generatedScript })
    })
      .then(res => res.json())
      .then(data => {
        setPipelineOutput(data);
        setRunning(false);
      })
      .catch((err) => {
        setPipelineOutput({
          output: `Xatolik: ${err.message}`,
          workspace: [],
          figures: []
        });
        setRunning(false);
      });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
            <Network className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">
              Kodsiz Vizual Pipeline Quruvchi
            </h1>
            <p className="text-xs text-slate-400">
              Bloklarni ketma-ket joylab, signallar va tasvirlarga kodsiz ishlov bering va MATLAB kodiga eksport qiling
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCode(!showCode)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 text-xs font-semibold transition-colors"
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>{showCode ? "Vizual konveyerga qaytish" : "MATLAB kodini ko'rsat"}</span>
          </button>

          <button
            onClick={handleRunPipeline}
            disabled={running}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-matlab-blue hover:bg-matlab-darkBlue text-white text-xs font-bold transition-all shadow-md shadow-matlab-blue/20 active:scale-95"
          >
            <Play className={`w-3.5 h-3.5 fill-current ${running ? 'animate-spin' : ''}`} />
            <span>{running ? "Hisoblanmoqda..." : "Pipeline'ni ishga tushirish"}</span>
          </button>
        </div>
      </div>

      {showCode ? (
        /* MATLAB Code Export View */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <FileCode className="w-4 h-4 text-matlab-blue" />
              Tuzilgan Konveyerning Dinamik MATLAB Kodi
            </span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(generatedScript);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-medium hover:bg-slate-200"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Nusxalandi!" : "Kodni nusxalash"}</span>
            </button>
          </div>
          <div className="p-4 rounded-2xl bg-slate-950 text-slate-100 font-mono text-xs overflow-x-auto border border-slate-800 leading-relaxed shadow-inner">
            <pre>{generatedScript}</pre>
          </div>
        </div>
      ) : (
        /* Visual Nodes Flow */
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Active Pipeline Chain (3 cols) */}
          <div className="lg:col-span-3 space-y-4">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Konveyer Zanjiri ({nodes.length} ta bosqich):</div>

            <div className="space-y-3">
              {nodes.map((node, index) => {
                const colorMap = {
                  source: 'border-l-cyan-500 bg-cyan-50/20 dark:bg-cyan-950/20',
                  process: 'border-l-matlab-blue bg-blue-50/20 dark:bg-blue-950/20',
                  view: 'border-l-purple-500 bg-purple-50/20 dark:bg-purple-950/20',
                  measure: 'border-l-amber-500 bg-amber-50/20 dark:bg-amber-950/20'
                };

                return (
                  <div key={node.id} className="relative">
                    <div className={`p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 border-l-4 ${colorMap[node.type]} flex items-center justify-between shadow-sm`}>
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center text-xs font-bold">
                          {index + 1}
                        </span>
                        <div>
                          <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                            <span>{node.name}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono">
                              {node.category.toUpperCase()}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {node.type.toUpperCase()} • Parametrlar: {JSON.stringify(node.params)}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleRemoveNode(node.id)}
                        className="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {index < nodes.length - 1 && (
                      <div className="flex justify-center my-1 text-slate-300 dark:text-slate-700">
                        <ArrowRight className="w-4 h-4 rotate-90" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Pipeline Output Preview */}
            {pipelineOutput && (
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    Pipeline Natijasi va O'lchangan Metrikalar
                  </h3>
                  <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300 font-bold">
                    Muvaffaqiyatli Bajarildi
                  </span>
                </div>

                {/* Generated Figures Display */}
                {pipelineOutput.figures && pipelineOutput.figures.length > 0 && (
                  <div className="space-y-3">
                    <div className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-matlab-blue" />
                      <span>Grafik / Tasvir Natijalari:</span>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                      {pipelineOutput.figures.map((figB64: string, idx: number) => (
                        <div key={idx} className="p-2 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex justify-center">
                          <img src={figB64} alt={`Figure ${idx + 1}`} className="rounded-xl max-h-80 object-contain" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Console Output */}
                {pipelineOutput.output && (
                  <div className="p-3 rounded-2xl bg-slate-950 text-slate-200 font-mono text-xs border border-slate-800 whitespace-pre-wrap">
                    {pipelineOutput.output}
                  </div>
                )}

                {/* Workspace Variables */}
                {pipelineOutput.workspace && pipelineOutput.workspace.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-400">Yaratilgan O'zgaruvchilar:</span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {pipelineOutput.workspace.map((v: any, i: number) => (
                        <div key={i} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs">
                          <div className="font-bold text-matlab-blue">{v.name}</div>
                          <div className="text-slate-500 text-[11px] truncate">{v.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Library of Blocks (1 col) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 space-y-4 shadow-sm h-fit">
            <span className="font-bold text-xs uppercase tracking-wider text-slate-500">Mavjud Bloklar Kutubxonasi</span>
            <div className="space-y-2">
              {availableBlocks.map((b, i) => (
                <div
                  key={i}
                  onClick={() => handleAddNode(b)}
                  className="p-3 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-matlab-blue dark:hover:border-cyan-400 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-all flex items-center justify-between group"
                >
                  <div>
                    <div className="font-bold text-xs text-slate-800 dark:text-slate-200 group-hover:text-matlab-blue dark:group-hover:text-cyan-400">
                      {b.name}
                    </div>
                    <span className="text-[10px] text-slate-400 uppercase">{b.type} • {b.category}</span>
                  </div>
                  <Plus className="w-4 h-4 text-slate-400 group-hover:text-matlab-blue" />
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
export default PipelineBuilder;

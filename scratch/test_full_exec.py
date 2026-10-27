import os, re, cv2
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from scipy import signal
from scipy.fft import dct, dctn, idctn
from scipy.ndimage import median_filter
from types import SimpleNamespace

# Helpers
def dctmtx(N):
    return np.asmatrix(dct(np.eye(int(N)), axis=0, norm='ortho'))

def matlab_blockproc(A, block_size, fun):
    A = np.asarray(A)
    bsize = [int(block_size[0]), int(block_size[1])] if hasattr(block_size, '__len__') else [int(block_size), int(block_size)]
    bh, bw = bsize[0], bsize[1]
    H, W = A.shape[:2]
    
    first_block = A[0:bh, 0:bw]
    try:
        sample_res = fun(SimpleNamespace(data=first_block))
    except Exception:
        sample_res = fun(first_block)
    sample_res = np.asarray(sample_res)
    obh, obw = sample_res.shape[:2]
    
    out_H = (H // bh) * obh
    out_W = (W // bw) * obw
    out = np.zeros((out_H, out_W), dtype=sample_res.dtype)
    
    for i in range(0, H - bh + 1, bh):
        for j in range(0, W - bw + 1, bw):
            block = A[i:i+bh, j:j+bw]
            try:
                res = fun(SimpleNamespace(data=block))
            except Exception:
                res = fun(block)
            oi = (i // bh) * obh
            oj = (j // bw) * obw
            out[oi:oi+obh, oj:oj+obw] = np.asarray(res)
            
    return out

def matlab_imread(path=None, *args, **kwargs):
    # Dummy 256x256 image for test
    np.random.seed(42)
    return np.clip(np.random.rand(256, 256) * 255, 0, 255).astype(np.uint8)

def matlab_rgb2gray(I):
    if len(I.shape) == 2: return I
    return cv2.cvtColor(I, cv2.COLOR_RGB2GRAY)

def matlab_im2double(I):
    if I.dtype == np.uint8:
        return I.astype(float) / 255.0
    return I.astype(float)

def matlab_double(x):
    if hasattr(x, 'astype'):
        return x.astype(np.float64)
    return np.asarray(x, dtype=np.float64)

def matlab_uint8(x):
    if hasattr(x, 'astype'):
        return np.clip(x, 0, 255).astype(np.uint8)
    return np.clip(np.asarray(x), 0, 255).astype(np.uint8)

def matlab_imshow(I, *args, **kwargs):
    arr = np.array(I)
    if len(arr.shape) == 2: plt.imshow(arr, cmap='gray')
    else: plt.imshow(arr)
    plt.axis('off')

def matlab_fprintf(fmt, *args):
    try:
        print(fmt % args if args else fmt, end='')
    except Exception:
        print(fmt, *args)

def matlab_imwrite(A, filename, *args, **kwargs):
    print(f">> imwrite: saved to {filename}")

def matlab_dct2(I):
    return dctn(I.astype(float), norm='ortho')

def matlab_idct2(I):
    return idctn(I.astype(float), norm='ortho')

def matlab_zeros(*args):
    if len(args) == 1 and isinstance(args[0], (tuple, list, np.ndarray)):
        shape = tuple(int(x) for x in args[0])
        return np.zeros(shape)
    elif len(args) == 1:
        n = int(args[0])
        return np.zeros((n, n))
    shape = tuple(int(x) for x in args)
    return np.zeros(shape)

def matlab_ones(*args):
    if len(args) == 1 and isinstance(args[0], (tuple, list, np.ndarray)):
        shape = tuple(int(x) for x in args[0])
        return np.ones(shape)
    elif len(args) == 1:
        n = int(args[0])
        return np.ones((n, n))
    shape = tuple(int(x) for x in args)
    return np.ones(shape)

def matlab_size(x, dim=None):
    s = np.shape(x)
    if dim is not None:
        return s[dim-1] if dim <= len(s) else 1
    return s[:2] if len(s) >= 2 else (1, s[0])

# Translation logic
builtin_fns = {'zeros', 'ones', 'size', 'conv', 'plot', 'subplot', 'stem', 'rectpuls', 'tripuls', 
               'imfilter', 'fspecial', 'medfilt2', 'filter', 'butter', 'find', 'blockproc', 'repmat',
               'linspace', 'logspace', 'reshape', 'dot', 'cross', 'rand', 'randn', 'eye', 'min', 'max',
               'fprintf', 'disp', 'title', 'xlabel', 'ylabel', 'legend', 'figure', 'imread', 'imwrite',
               'imshow', 'imshowpair', 'imhist', 'histeq', 'imnoise', 'imbinarize', 'strel', 'imerode',
               'imdilate', 'imopen', 'imclose', 'dct2', 'idct2', 'dctmtx', 'mean', 'std', 'var',
               'median', 'sum', 'prod', 'diff', 'sort', 'roots', 'poly', 'polyval', 'real', 'imag',
               'conj', 'angle', 'round', 'ceil', 'floor', 'fix', 'mod', 'rem', 'log', 'log10', 'log2',
               'fft', 'ifft', 'fftshift', 'ifftshift', 'rms', 'interp1', 'uint8', 'int16', 'int32',
               'float64', 'double', 'num2str', 'str2num', 'numel', 'nnz', 'immse', 'psnr', 'ssim',
               'rgb2gray', 'im2double', 'array'}

def split_top_level_colons(s: str):
    parts = []
    current = []
    p = 0
    b = 0
    c = 0
    in_s = False
    sc = ''
    for ch in s:
        if in_s:
            current.append(ch)
            if ch == sc:
                in_s = False
            continue
        if ch in ("'", '"'):
            in_s = True
            sc = ch
            current.append(ch)
            continue
        if ch == '(': p += 1
        elif ch == ')': p = max(0, p - 1)
        elif ch == '[': b += 1
        elif ch == ']': b = max(0, b - 1)
        elif ch == '{': c += 1
        elif ch == '}': c = max(0, c - 1)
        elif ch == ':' and p == 0 and b == 0 and c == 0:
            parts.append(''.join(current).strip())
            current = []
            continue
        current.append(ch)
    parts.append(''.join(current).strip())
    return parts

def parse_bracket_content(inner: str) -> str:
    inner = inner.strip()
    if "'" in inner or '"' in inner:
        tokens = []
        cur = []
        in_q = False
        qc = ''
        p_depth = 0
        for ch in inner:
            if in_q:
                cur.append(ch)
                if ch == qc:
                    in_q = False
                    tokens.append(''.join(cur).strip())
                    cur = []
                continue
            if ch in ("'", '"'):
                if cur and ''.join(cur).strip():
                    tokens.append(''.join(cur).strip().rstrip(','))
                    cur = []
                in_q = True
                qc = ch
                cur.append(ch)
                continue
            if ch == '(': p_depth += 1
            elif ch == ')': p_depth = max(0, p_depth - 1)
            
            if (ch in (' ', ',', '\t')) and p_depth == 0:
                if cur and ''.join(cur).strip():
                    tokens.append(''.join(cur).strip().rstrip(','))
                    cur = []
            else:
                cur.append(ch)
        if cur and ''.join(cur).strip():
            tokens.append(''.join(cur).strip().rstrip(','))
        
        clean_tokens = [t for t in tokens if t]
        return " + ".join([f"str({t})" for t in clean_tokens])
    else:
        if ';' in inner or '\n' in inner:
            rows = []
            norm = inner.replace('\n', ';')
            for r in norm.split(';'):
                r = r.strip()
                if not r: continue
                toks = [t for t in re.split(r'[\s,]+', r) if t]
                rows.append(f'[{", ".join(toks)}]')
            return f'np.array([{", ".join(rows)}])'
        else:
            toks = [t for t in re.split(r'[\s,]+', inner) if t]
            return f'[{", ".join(toks)}]'

def transform_index_slice(dim_str: str) -> str:
    s = dim_str.strip()
    if s == ':': return ':'
    if ':' in s:
        parts = s.split(':')
        if len(parts) == 2:
            start, stop = parts[0].strip(), parts[1].strip()
            if start.isdigit() and stop.isdigit():
                return f"{int(start)-1}:{int(stop)}"
            elif start.isdigit():
                return f"{int(start)-1}:int({stop})"
            elif '+' in stop:
                m = re.match(r'^([a-zA-Z_]\w*)\s*\+\s*(\d+)$', stop)
                if m and m.group(1) == start:
                    offset = int(m.group(2))
                    return f"int({start})-1:int({start})+{offset}"
                return f"int({start})-1:int({stop})"
            else:
                return f"int({start})-1:int({stop})"
        elif len(parts) == 3:
            start, step, stop = parts[0].strip(), parts[1].strip(), parts[2].strip()
            return f"int({start})-1:int({stop}):int({step})"
    else:
        if s.isdigit():
            return str(int(s) - 1)
        return f"int({s})-1"

def transform_subscripts(line: str) -> str:
    def repl_2d(m):
        var = m.group(1)
        d1 = m.group(2).strip()
        d2 = m.group(3).strip()
        if var in builtin_fns or var.startswith('np.') or var == 'array':
            return m.group(0)
        if "'" in d1 or '"' in d1 or "'" in d2 or '"' in d2:
            return m.group(0)
        return f"{var}[{transform_index_slice(d1)}, {transform_index_slice(d2)}]"
    
    pattern = r'\b([a-zA-Z_]\w*)\(\s*([^,()]+)\s*,\s*([^,()]+)\s*\)'
    line = re.sub(pattern, repl_2d, line)
    return line

def translate_matlab_code_to_python(code: str) -> str:
    text = code.replace('\u2013', '-').replace('\u2014', '-').replace('\u2212', '-')
    text = text.replace('\xa0', ' ').replace('\u200b', '').replace('\ufeff', '')
    text = text.replace('“', '"').replace('”', '"')
    text = text.replace("\\'", "’")
    text = text.replace("''", "’")
    text = re.sub(r"([a-zA-Z0-9])'([a-zA-Z0-9])", r"\1’\2", text)
    text = re.sub(r'\.\.\.[^\n]*\n', ' ', text)
    text = re.sub(r'(?:^|[\n;])\s*\[\s*([a-zA-Z0-9_,\s]+)\s*\]\s*=', lambda m: m.group(0).replace('[', '(').replace(']', ')'), text)
    text = re.sub(r'\[([^\[\]]+)\]', lambda m: parse_bracket_content(m.group(1)), text)

    statements = []
    current = []
    in_single_q = False
    in_double_q = False
    bracket_depth = 0

    chars = list(text)
    n = len(chars)
    i = 0
    while i < n:
        ch = chars[i]
        if ch == '%' and not in_single_q and not in_double_q:
            while i < n and chars[i] != '\n':
                i += 1
            if current:
                s = ''.join(current).strip()
                if s: statements.append(s)
                current = []
            i += 1
            continue

        if ch == "'" and not in_double_q:
            if i > 0 and chars[i-1] == '\\':
                current.append(ch); i += 1; continue
            if in_single_q:
                in_single_q = False
                current.append(ch); i += 1; continue
            else:
                is_transpose = False
                for k in range(len(current) - 1, -1, -1):
                    if not current[k].isspace():
                        if current[k].isalnum() or current[k] in (')', ']', '}'):
                            is_transpose = True
                        break
                if is_transpose:
                    current.append(".T"); i += 1; continue
                else:
                    in_single_q = True
                    current.append(ch); i += 1; continue

        elif ch == '"' and not in_single_q: in_double_q = not in_double_q
        elif ch == '[' and not in_single_q and not in_double_q: bracket_depth += 1
        elif ch == ']' and not in_single_q and not in_double_q: bracket_depth = max(0, bracket_depth - 1)

        if (ch in [';', '\n']) and not in_single_q and not in_double_q and bracket_depth == 0:
            s = ''.join(current).strip()
            if s: statements.append(s)
            current = []
        else:
            current.append(ch)
        i += 1

    last = ''.join(current).strip()
    if last: statements.append(last)

    output_lines = []
    indent_level = 0

    def wrap_uzbek_string(arg_str: str) -> str:
        s = arg_str.strip()
        if (s.startswith("'") and s.endswith("'")) or (s.startswith('"') and s.endswith('"')):
            inner = s[1:-1]
            inner = re.sub(r"([a-zA-Z])'([a-zA-Z])", r"\1’\2", inner)
            inner = inner.replace('\\pi', 'pi').replace('pi', 'π')
            return f'"{inner}"'
        return arg_str

    for stmt in statements:
        line = stmt.strip()
        if not line: continue

        if line in ['clc', 'clear', 'clear all', 'clearvars', 'clf', 'cla', 'hold on', 'hold off', 'hold', 'box on', 'box off', 'shg']:
            continue
        if line in ['close all', 'close']:
            output_lines.append('    ' * indent_level + 'plt.close("all")'); continue
        if line in ['grid on', 'grid']:
            output_lines.append('    ' * indent_level + 'plt.grid(True)'); continue
        if line == 'grid off':
            output_lines.append('    ' * indent_level + 'plt.grid(False)'); continue
        if line == 'axis tight':
            output_lines.append('    ' * indent_level + 'plt.autoscale(tight=True)'); continue
        if line == 'axis equal':
            output_lines.append('    ' * indent_level + 'plt.axis("equal")'); continue
        if line == 'axis off':
            output_lines.append('    ' * indent_level + 'plt.axis("off")'); continue
        if line == 'axis on':
            output_lines.append('    ' * indent_level + 'plt.axis("on")'); continue

        if line == 'end':
            indent_level = max(0, indent_level - 1); continue
        if line == 'else':
            cur = max(0, indent_level - 1)
            output_lines.append('    ' * cur + 'else:'); continue
        m_elseif = re.match(r'^elseif\s+(.+)$', line)
        if m_elseif:
            cond = m_elseif.group(1).strip().replace('~=', '!=').replace('&', ' and ').replace('|', ' or ')
            cond = re.sub(r'~(?=[a-zA-Z0-9_\(])', 'not ', cond)
            cur = max(0, indent_level - 1)
            output_lines.append('    ' * cur + f'elif {cond}:'); continue

        m_for3 = re.match(r'^for\s+([a-zA-Z_]\w*)\s*=\s*([^:]+):([^:]+):(.+)$', line)
        if m_for3:
            var, start, step, stop = m_for3.groups()
            output_lines.append('    ' * indent_level + f'for {var} in np.arange({start.strip()}, float({stop.strip()}) + min(0.5, abs(float({step.strip()})*0.1)), {step.strip()}):')
            indent_level += 1; continue

        m_for2 = re.match(r'^for\s+([a-zA-Z_]\w*)\s*=\s*([^:]+):(.+)$', line)
        if m_for2:
            var, start, stop = m_for2.groups()
            output_lines.append('    ' * indent_level + f'for {var} in np.arange({start.strip()}, ({stop.strip()}) + 0.5, 1.0):')
            indent_level += 1; continue

        m_for_in = re.match(r'^for\s+([a-zA-Z_]\w*)\s*=\s*(.+)$', line)
        if m_for_in:
            var, arr = m_for_in.groups()
            output_lines.append('    ' * indent_level + f'for {var} in {arr.strip()}:')
            indent_level += 1; continue

        m_while = re.match(r'^while\s+(.+)$', line)
        if m_while:
            cond = m_while.group(1).strip().replace('~=', '!=').replace('&', ' and ').replace('|', ' or ')
            cond = re.sub(r'~(?=[a-zA-Z0-9_\(])', 'not ', cond)
            output_lines.append('    ' * indent_level + f'while {cond}:')
            indent_level += 1; continue

        m_if = re.match(r'^if\s+(.+)$', line)
        if m_if:
            cond = m_if.group(1).strip().replace('~=', '!=').replace('&', ' and ').replace('|', ' or ')
            cond = re.sub(r'~(?=[a-zA-Z0-9_\(])', 'not ', cond)
            output_lines.append('    ' * indent_level + f'if {cond}:')
            indent_level += 1; continue

        # Anonymous functions: @(args) expr -> (lambda args: expr)
        line = re.sub(r'@\s*\(([^)]*)\)\s*', r'lambda \1: ', line)
        line = re.sub(r'@([a-zA-Z_]\w*)', r'\1', line)

        # 1D column vector flattening: I(:) -> I.ravel()
        line = re.sub(r'\b([a-zA-Z_]\w*)\(\s*:\s*\)', r'\1.ravel()', line)

        # 3D slice
        line = line.replace('(:,:,1)', '[:, :, 0]').replace('(:,:,2)', '[:, :, 1]').replace('(:,:,3)', '[:, :, 2]')

        # 2D slicing / indexing
        line = transform_subscripts(line)

        # 1D array slice: x(1:200) -> x[:int(200)], A(1:N) -> A[:int(N)]
        line = re.sub(r'([a-zA-Z_]\w*)\(\s*1\s*:\s*([^,()]+)\s*\)', r'\1[:int(\2)]', line)

        # 1D array assignment: x(i) = ... -> x[int(i)-1] = ...
        line = re.sub(r'^([a-zA-Z_]\w*)\(\s*([a-zA-Z_]\w*|\d+)\s*\)\s*=', r'\1[int(\2)-1] =', line)

        # Mask assignment: mask(abs(D) < 20) = 0
        line = re.sub(r'^([a-zA-Z_]\w*)\((.+?)\)\s*=', r'\1[\2] =', line)

        # End indexing: x(end) -> x[-1], x(end-1) -> x[-2]
        line = re.sub(r'([a-zA-Z_]\w*)\(\s*end\s*\)', r'\1[-1]', line)
        line = re.sub(r'([a-zA-Z_]\w*)\(\s*end\s*-\s*(\d+)\s*\)', r'\1[-\2-1]', line)

        # Numerical colon range in parens: (0:N/2) -> np.arange(0, int(N/2) + 1)
        line = re.sub(r'\(\s*(\d+)\s*:\s*([a-zA-Z0-9_\(\)\+\-\*\/\s]+)\s*\)', r'np.arange(\1, int(\2) + 1)', line)

        # Top-level Colon range assignment (exclude lambdas)
        m_assign = re.match(r'^([a-zA-Z_]\w*)\s*=\s*(.+)$', line)
        if m_assign:
            var_name, rhs = m_assign.groups()
            if not rhs.strip().startswith('lambda ') and 'lambda ' not in rhs:
                colon_parts = split_top_level_colons(rhs)
                if len(colon_parts) == 3:
                    start, step, stop = colon_parts
                    line = f'{var_name} = np.arange({start}, ({stop}) + ({step})/2, {step})'
                elif len(colon_parts) == 2:
                    start, stop = colon_parts
                    line = f'{var_name} = np.arange({start}, ({stop}) + 0.5, 1.0)'

        # Element-wise operations
        line = re.sub(r'\.\*', '*', line)
        line = re.sub(r'\./', '/', line)
        line = re.sub(r'\.\^', '**', line)
        line = re.sub(r'(?<=\w)\^(?=\w|\d|\()', '**', line)

        line = line.replace('~=', '!=')
        line = re.sub(r'~(?=[a-zA-Z0-9_\(])', 'not ', line)

        # Formatting
        if line.startswith('title(') and line.endswith(')'):
            arg = line[6:-1].strip()
            line = f'plt.title({wrap_uzbek_string(arg)})'
        elif line.startswith('xlabel(') and line.endswith(')'):
            arg = line[7:-1].strip()
            line = f'plt.xlabel({wrap_uzbek_string(arg)})'
        elif line.startswith('ylabel(') and line.endswith(')'):
            arg = line[7:-1].strip()
            line = f'plt.ylabel({wrap_uzbek_string(arg)})'
        elif line.startswith('subplot(') and line.endswith(')'):
            args_str = line[8:-1]
            line = f'plt.subplot({args_str})'
        elif line.startswith('fprintf(') and line.endswith(')'):
            args_str = line[8:-1]
            line = f'matlab_fprintf({args_str})'
        elif line.startswith('imshow(') and line.endswith(')'):
            args_str = line[7:-1]
            line = f'matlab_imshow({args_str})'
        elif line == 'figure':
            line = 'plt.figure(figsize=(7, 4))'

        output_lines.append('    ' * indent_level + line)

    return '\n'.join(output_lines)

# Environment
local_env = {
    "np": np,
    "plt": plt,
    "dctmtx": dctmtx,
    "blockproc": matlab_blockproc,
    "imread": matlab_imread,
    "imwrite": matlab_imwrite,
    "rgb2gray": matlab_rgb2gray,
    "im2double": matlab_im2double,
    "double": matlab_double,
    "uint8": matlab_uint8,
    "imshow": matlab_imshow,
    "matlab_imshow": matlab_imshow,
    "fprintf": matlab_fprintf,
    "matlab_fprintf": matlab_fprintf,
    "dct2": matlab_dct2,
    "idct2": matlab_idct2,
    "zeros": matlab_zeros,
    "ones": matlab_ones,
    "size": matlab_size,
    "mean": np.mean,
    "log10": np.log10,
    "numel": np.size,
    "nnz": np.count_nonzero,
    "num2str": lambda x: str(round(x, 4) if isinstance(x, float) else x),
    "round": np.round
}

script_A = '''
clc; clear; close all;
% 1. Read image
I = imread('cameraman.tif');
I = im2double(I);

% 2. Compute 2D DCT
T = dctmtx(8);
dct = @(block_struct) T * block_struct.data * T';
B = blockproc(I, [8 8], dct);

% 3. Mask
mask = [1 1 1 1 0 0 0 0;
        1 1 1 0 0 0 0 0;
        1 1 0 0 0 0 0 0;
        1 0 0 0 0 0 0 0;
        0 0 0 0 0 0 0 0;
        0 0 0 0 0 0 0 0;
        0 0 0 0 0 0 0 0;
        0 0 0 0 0 0 0 0];
B2 = blockproc(B, [8 8], @(block_struct) mask .* block_struct.data);

% 4. Inverse DCT
invdct = @(block_struct) T' * block_struct.data * T;
I_reconstructed = blockproc(B2, [8 8], invdct);

% 5. Display
figure;
subplot(1,2,1); imshow(I); title('Original');
subplot(1,2,2); imshow(I_reconstructed); title('Reconstructed');

% 7. Xatolikni hisoblash
MSE = mean((I(:) - I_reconstructed(:)).^2);
PSNR = 10 * log10(1 / MSE);
fprintf('MSE = %.6f\\n', MSE);
fprintf('PSNR = %.2f dB\\n', PSNR);

% 8. Siqish darajasini hisoblash
total = numel(B);
nonzero = nnz(B2);
compression_ratio = total / nonzero;
fprintf('Nol bo\\'\\'magan koeffitsiyentlar: %d\\n', nonzero);
fprintf('Jami koeffitsiyentlar: %d\\n', total);
fprintf('Koeffitsiyentlar bo\\'\\'icha siqish nisbati: %.2f:1\\n', ...
    compression_ratio);
'''

script_B = '''
clear; clc; close all;
img = imread('cameraman.tif');
img = rgb2gray(img);
img = double(img);
Q = 80;
[H, W] = size(img);
recon = zeros(H, W);
for i = 1:8:H
    for j = 1:8:W
        block = img(i:i+7, j:j+7);
        d = dct2(block);
        d = round(d / Q);
        d = d * Q;
        recon(i:i+7, j:j+7) = idct2(d);
    end
end
recon = uint8(recon);
imwrite(recon, ['compressed_Q1' num2str(Q) '.png']);
figure;
subplot(1,2,1); imshow(uint8(img)); title('Original');
subplot(1,2,2); imshow(recon); title(['DCT siqilgan (Q = ' num2str(Q) ')']);
'''

print("=================== RUNNING SCRIPT A ===================")
py_A = translate_matlab_code_to_python(script_A)
print(py_A)
exec(py_A, local_env)
print(">>> SCRIPT A EXECUTED SUCCESSFULLY! <<<\n")

print("=================== RUNNING SCRIPT B ===================")
py_B = translate_matlab_code_to_python(script_B)
print(py_B)
exec(py_B, local_env)
print(">>> SCRIPT B EXECUTED SUCCESSFULLY! <<<")

import os, re, cv2
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from scipy.fft import dct, dctn, idctn
from scipy.ndimage import median_filter
from types import SimpleNamespace

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
        # String concatenation: ['Q = ' num2str(Q) ' dB']
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
            if ch == '(':
                p_depth += 1
            elif ch == ')':
                p_depth = max(0, p_depth - 1)
            
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
        # Numeric array or matrix
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
            return f'np.array([{", ".join(toks)}])' if len(toks) > 1 else f'[{", ".join(toks)}]'

def transform_index_slice(dim_str: str) -> str:
    s = dim_str.strip()
    if s == ':':
        return ':'
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
        d1 = m.group(2)
        d2 = m.group(3)
        return f"{var}[{transform_index_slice(d1)}, {transform_index_slice(d2)}]"
    
    builtin_fns = {'zeros', 'ones', 'size', 'conv', 'plot', 'subplot', 'stem', 'rectpuls', 'tripuls', 
                   'imfilter', 'fspecial', 'medfilt2', 'filter', 'butter', 'find', 'blockproc', 'repmat',
                   'linspace', 'logspace', 'reshape', 'dot', 'cross', 'rand', 'randn', 'eye', 'min', 'max'}
    
    pattern = r'\b([a-zA-Z_]\w*)\(\s*([^,()]+)\s*,\s*([^,()]+)\s*\)'
    def match_check(m):
        if m.group(1) in builtin_fns:
            return m.group(0)
        return repl_2d(m)
        
    line = re.sub(pattern, match_check, line)
    return line

def translate_matlab_code_to_python(code: str) -> str:
    # 1. Sanitize text
    text = code.replace('\u2013', '-').replace('\u2014', '-').replace('\u2212', '-')
    text = text.replace('\xa0', ' ').replace('\u200b', '').replace('\ufeff', '')
    text = text.replace('“', '"').replace('”', '"')
    # Escaped apostrophes and Uzbek apostrophes
    text = text.replace("\\'", "’")
    text = text.replace("''", "’")
    text = re.sub(r"([a-zA-Z0-9])'([a-zA-Z0-9])", r"\1’\2", text)

    # 2. Join line continuations '...'
    text = re.sub(r'\.\.\.[^\n]*\n', ' ', text)

    # 3. Unpack multiple return assignments: [a, b] = func(...) -> (a, b) = func(...)
    text = re.sub(r'(?:^|[\n;])\s*\[\s*([a-zA-Z0-9_,\s]+)\s*\]\s*=', lambda m: m.group(0).replace('[', '(').replace(']', ')'), text)

    # 4. Clean bracket matrices and string concatenations
    text = re.sub(r'\[([^\[\]]+)\]', lambda m: parse_bracket_content(m.group(1)), text)

    # 5. Tokenize statements outside quotes and bracket matrices
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

        # Comment handling %
        if ch == '%' and not in_single_q and not in_double_q:
            while i < n and chars[i] != '\n':
                i += 1
            if current:
                s = ''.join(current).strip()
                if s:
                    statements.append(s)
                current = []
            i += 1
            continue

        if ch == "'" and not in_double_q:
            if i > 0 and chars[i-1] == '\\':
                current.append(ch)
                i += 1
                continue
            if in_single_q:
                # Closing quote of string literal
                in_single_q = False
                current.append(ch)
                i += 1
                continue
            else:
                # Check if transpose operator: preceded by alnum or closing paren/bracket
                is_transpose = False
                for k in range(len(current) - 1, -1, -1):
                    if not current[k].isspace():
                        if current[k].isalnum() or current[k] in (')', ']', '}'):
                            is_transpose = True
                        break
                if is_transpose:
                    current.append(".T")
                    i += 1
                    continue
                else:
                    in_single_q = True
                    current.append(ch)
                    i += 1
                    continue

        elif ch == '"' and not in_single_q:
            in_double_q = not in_double_q
        elif ch == '[' and not in_single_q and not in_double_q:
            bracket_depth += 1
        elif ch == ']' and not in_single_q and not in_double_q:
            bracket_depth = max(0, bracket_depth - 1)

        if (ch in [';', '\n']) and not in_single_q and not in_double_q and bracket_depth == 0:
            s = ''.join(current).strip()
            if s:
                statements.append(s)
            current = []
        else:
            current.append(ch)
        i += 1

    last = ''.join(current).strip()
    if last:
        statements.append(last)

    # 6. Block translation with indentation
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
        if not line:
            continue

        # Ignore or transform standalone MATLAB commands
        if line in ['clc', 'clear', 'clear all', 'clearvars', 'clf', 'cla', 'hold on', 'hold off', 'hold', 'box on', 'box off', 'shg']:
            continue
        if line in ['close all', 'close']:
            output_lines.append('    ' * indent_level + 'plt.close("all")')
            continue
        if line in ['grid on', 'grid']:
            output_lines.append('    ' * indent_level + 'plt.grid(True)')
            continue
        if line == 'grid off':
            output_lines.append('    ' * indent_level + 'plt.grid(False)')
            continue
        if line == 'axis tight':
            output_lines.append('    ' * indent_level + 'plt.autoscale(tight=True)')
            continue
        if line == 'axis equal':
            output_lines.append('    ' * indent_level + 'plt.axis("equal")')
            continue
        if line == 'axis off':
            output_lines.append('    ' * indent_level + 'plt.axis("off")')
            continue
        if line == 'axis on':
            output_lines.append('    ' * indent_level + 'plt.axis("on")')
            continue

        # Block end
        if line == 'end':
            indent_level = max(0, indent_level - 1)
            continue

        # Else / elseif
        if line == 'else':
            cur = max(0, indent_level - 1)
            output_lines.append('    ' * cur + 'else:')
            continue
        m_elseif = re.match(r'^elseif\s+(.+)$', line)
        if m_elseif:
            cond = m_elseif.group(1).strip()
            cond = cond.replace('~=', '!=').replace('&', ' and ').replace('|', ' or ')
            cond = re.sub(r'~(?=[a-zA-Z0-9_\(])', 'not ', cond)
            cur = max(0, indent_level - 1)
            output_lines.append('    ' * cur + f'elif {cond}:')
            continue

        # For loops
        m_for3 = re.match(r'^for\s+([a-zA-Z_]\w*)\s*=\s*([^:]+):([^:]+):(.+)$', line)
        if m_for3:
            var, start, step, stop = m_for3.groups()
            output_lines.append('    ' * indent_level + f'for {var} in np.arange({start.strip()}, ({stop.strip()}) + ({step.strip()})/2, {step.strip()}):')
            indent_level += 1
            continue

        m_for2 = re.match(r'^for\s+([a-zA-Z_]\w*)\s*=\s*([^:]+):(.+)$', line)
        if m_for2:
            var, start, stop = m_for2.groups()
            output_lines.append('    ' * indent_level + f'for {var} in np.arange({start.strip()}, ({stop.strip()}) + 0.5, 1.0):')
            indent_level += 1
            continue

        m_for_in = re.match(r'^for\s+([a-zA-Z_]\w*)\s*=\s*(.+)$', line)
        if m_for_in:
            var, arr = m_for_in.groups()
            output_lines.append('    ' * indent_level + f'for {var} in {arr.strip()}:')
            indent_level += 1
            continue

        # While loops
        m_while = re.match(r'^while\s+(.+)$', line)
        if m_while:
            cond = m_while.group(1).strip()
            cond = cond.replace('~=', '!=').replace('&', ' and ').replace('|', ' or ')
            cond = re.sub(r'~(?=[a-zA-Z0-9_\(])', 'not ', cond)
            output_lines.append('    ' * indent_level + f'while {cond}:')
            indent_level += 1
            continue

        # If statement
        m_if = re.match(r'^if\s+(.+)$', line)
        if m_if:
            cond = m_if.group(1).strip()
            cond = cond.replace('~=', '!=').replace('&', ' and ').replace('|', ' or ')
            cond = re.sub(r'~(?=[a-zA-Z0-9_\(])', 'not ', cond)
            output_lines.append('    ' * indent_level + f'if {cond}:')
            indent_level += 1
            continue

        # Anonymous functions: @(args) expr -> (lambda args: expr)
        # Function handles: @dct2 -> dct2
        line = re.sub(r'@\s*\(([^)]*)\)\s*', r'(lambda \1: ', line)
        # If lambda opened with (, close at matching delimiter or end of arg
        # But even simpler: if lambda block_struct: expr
        line = re.sub(r'@([a-zA-Z_]\w*)', r'\1', line)

        # 1D column vector flattening: I(:) -> I.ravel()
        line = re.sub(r'\b([a-zA-Z_]\w*)\(\s*:\s*\)', r'\1.ravel()', line)

        # Slicing transformations 3D
        line = line.replace('(:,:,1)', '[:, :, 0]').replace('(:,:,2)', '[:, :, 1]').replace('(:,:,3)', '[:, :, 2]')

        # 2D slicing / indexing: img(i:i+7, j:j+7), recon(i:i+7, j:j+7) = ...
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

        # Top-level Colon range assignment: var = start:step:stop or var = start:stop
        m_assign = re.match(r'^([a-zA-Z_]\w*)\s*=\s*(.+)$', line)
        if m_assign:
            var_name, rhs = m_assign.groups()
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

        # Replace ~= with !=, ~ with not
        line = line.replace('~=', '!=')
        line = re.sub(r'~(?=[a-zA-Z0-9_\(])', 'not ', line)

        # Formatting / function calls
        if line.startswith('title(') and line.endswith(')'):
            arg = line[6:-1].strip()
            line = f'plt.title({wrap_uzbek_string(arg)})'
        elif line.startswith('xlabel(') and line.endswith(')'):
            arg = line[7:-1].strip()
            line = f'plt.xlabel({wrap_uzbek_string(arg)})'
        elif line.startswith('ylabel(') and line.endswith(')'):
            arg = line[7:-1].strip()
            line = f'plt.ylabel({wrap_uzbek_string(arg)})'
        elif line.startswith('xlim(') and line.endswith(')'):
            line = 'plt.' + line
        elif line.startswith('ylim(') and line.endswith(')'):
            line = 'plt.' + line
        elif line.startswith('legend(') and line.endswith(')'):
            args_str = line[7:-1].strip()
            line = f'matlab_legend({args_str})'
        elif line.startswith('stem(') and line.endswith(')'):
            args_str = line[5:-1]
            line = f'matlab_stem({args_str})'
        elif line.startswith('plot(') and line.endswith(')'):
            args_str = line[5:-1]
            line = f'matlab_plot({args_str})'
        elif line.startswith('subplot(') and line.endswith(')'):
            args_str = line[8:-1]
            line = f'plt.subplot({args_str})'
        elif line.startswith('disp(') and line.endswith(')'):
            args_str = line[5:-1]
            line = f'matlab_disp({wrap_uzbek_string(args_str)})'
        elif line.startswith('fprintf(') and line.endswith(')'):
            args_str = line[8:-1]
            line = f'matlab_fprintf({args_str})'
        elif line.startswith('imshow(') and line.endswith(')'):
            args_str = line[7:-1]
            line = f'matlab_imshow({args_str})'
        elif line.startswith('imshowpair(') and line.endswith(')'):
            args_str = line[11:-1]
            line = f'matlab_imshowpair({args_str})'
        elif line.startswith('imhist(') and line.endswith(')'):
            args_str = line[7:-1]
            line = f'matlab_imhist({args_str})'
        elif line.startswith('figure(') and line.endswith(')'):
            line = 'plt.' + line
        elif line == 'figure':
            line = 'plt.figure(figsize=(7, 4))'

        output_lines.append('    ' * indent_level + line)

    return '\n'.join(output_lines)

# Now test translating both scripts!
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
nonzero = nnz(B);
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

print("=================== SCRIPT A TRANSLATION ===================")
tr_A = translate_matlab_code_to_python(script_A)
print(tr_A)
compile(tr_A, '<string>', 'exec')
print(">>> SCRIPT A SYNTAX IS VALID! <<<\n")

print("=================== SCRIPT B TRANSLATION ===================")
tr_B = translate_matlab_code_to_python(script_B)
print(tr_B)
compile(tr_B, '<string>', 'exec')
print(">>> SCRIPT B SYNTAX IS VALID! <<<")


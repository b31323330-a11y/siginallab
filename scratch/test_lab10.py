import re

MATLAB_BUILTIN_FNS = {
    'zeros', 'ones', 'size', 'conv', 'plot', 'subplot', 'stem', 'rectpuls', 'tripuls', 
    'imfilter', 'fspecial', 'medfilt2', 'filter', 'butter', 'find', 'blockproc', 'repmat',
    'linspace', 'logspace', 'reshape', 'dot', 'cross', 'rand', 'randn', 'eye', 'min', 'max',
    'fprintf', 'disp', 'title', 'xlabel', 'ylabel', 'legend', 'figure', 'imread', 'imwrite',
    'imshow', 'imshowpair', 'imhist', 'histeq', 'imnoise', 'imbinarize', 'strel', 'imerode',
    'imdilate', 'imopen', 'imclose', 'dct2', 'idct2', 'dctmtx', 'mean', 'std', 'var',
    'median', 'sum', 'prod', 'diff', 'sort', 'roots', 'poly', 'polyval', 'real', 'imag',
    'conj', 'angle', 'round', 'ceil', 'floor', 'fix', 'mod', 'rem', 'log', 'log10', 'log2',
    'fft', 'ifft', 'fftshift', 'ifftshift', 'rms', 'interp1', 'uint8', 'int16', 'int32',
    'float64', 'double', 'num2str', 'str2num', 'numel', 'nnz', 'immse', 'psnr', 'ssim',
    'rgb2gray', 'im2double', 'array', 'xlim', 'ylim', 'axis', 'colormap', 'colorbar'
}

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
        if var in MATLAB_BUILTIN_FNS or var.startswith('np.') or var == 'array':
            return m.group(0)
        if "'" in d1 or '"' in d1 or "'" in d2 or '"' in d2:
            return m.group(0)
        if '[' in d1 or ']' in d1 or '[' in d2 or ']' in d2:
            return m.group(0)
        return f"{var}[{transform_index_slice(d1)}, {transform_index_slice(d2)}]"
    
    pattern = r'\b([a-zA-Z_]\w*)\(\s*([^,()]+)\s*,\s*([^,()]+)\s*\)'
    line = re.sub(pattern, repl_2d, line)
    return line

print("xlim([0, 300]) ->", transform_subscripts("xlim([0, 300])"))
print("A(i:i+7, j:j+7) ->", transform_subscripts("A(i:i+7, j:j+7)"))


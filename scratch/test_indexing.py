import re

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
    # 1. 2D indexing: var(dim1, dim2)
    def repl_2d(m):
        var = m.group(1)
        d1 = m.group(2)
        d2 = m.group(3)
        return f"{var}[{transform_index_slice(d1)}, {transform_index_slice(d2)}]"
    
    # We should not match function calls like zeros(8, 8), ones(1, 5), conv(a, b), etc.
    # So we only match if var is not a known built-in function
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

tests = [
    "block = img(i:i+7, j:j+7);",
    "recon(i:i+7, j:j+7) = idct2(d);",
    "A = img(1:8, 1:8);",
    "B = zeros(H, W);",
    "val = img(i, j);",
    "col = img(:, 1);",
    "row = img(1, :);"
]

for t in tests:
    print(t, "-->", transform_subscripts(t))


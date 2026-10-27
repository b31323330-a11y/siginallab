def split_top_level_colons(s):
    parts, current = [], []
    p, b, c = 0, 0, 0
    in_s, sc = False, ''
    for ch in s:
        if in_s:
            current.append(ch)
            if ch == sc: in_s = False
            continue
        if ch in ("'", '"'):
            in_s, sc = True, ch
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

cases = [
    '0:1/Fs:0.2',
    '1:10',
    'mean((I(:) - I_reconstructed(:)).^2)',
    "'ratio: %.2f:1'",
    '0:N-1',
    '1:8:H',
    'total / nonzero'
]
for x in cases:
    print(f"{x!r:45} ==> {split_top_level_colons(x)}")


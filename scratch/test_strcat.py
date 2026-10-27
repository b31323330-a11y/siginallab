import re

def parse_bracket_content(inner):
    inner = inner.strip()
    # Check if there are quotes in inner
    if "'" in inner or '"' in inner:
        # It is string concatenation!
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
        
        # Filter empty
        clean_tokens = [t for t in tokens if t]
        return " + ".join([f"str({t})" for t in clean_tokens])
    else:
        # Numeric matrix or array
        if ';' in inner or '\n' in inner:
            rows = []
            # normalize newlines to semicolons
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

print("Test 1:", parse_bracket_content("'DCT siqilgan (Q = ' num2str(Q) ')'"))
print("Test 2:", parse_bracket_content("'compressed_Q1' num2str(Q) '.png'"))
print("Test 3:", parse_bracket_content("1 2 3; 4 5 6"))
print("Test 4:", parse_bracket_content("8 8"))


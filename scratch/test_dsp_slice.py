import sys
sys.path.append('backend')
from app.routers.dsp import translate_matlab_code_to_python

code = '''
for i = 1:8:H
    for j = 1:8:W
        block = img(i:i+7, j:j+7);
        recon(i:i+7, j:j+7) = idct2(d);
    end
end
'''
translated = translate_matlab_code_to_python(code)
print(translated)


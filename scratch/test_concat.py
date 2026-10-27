import sys
sys.path.append('backend')
from app.routers.dsp import translate_matlab_code_to_python

code1 = "title(['DCT siqilgan (Q = ' num2str(Q) ')']);"
code2 = "imwrite(recon, ['compressed_Q1' num2str(Q) '.png']);"

print('code1 ->', translate_matlab_code_to_python(code1))
print('code2 ->', translate_matlab_code_to_python(code2))


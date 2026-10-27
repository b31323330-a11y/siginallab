import os, sys
sys.path.insert(0, os.path.abspath("backend"))
from app.routers.dsp import execute_matlab_code, MatlabExecuteRequest

script_A = """
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
"""

script_B = """
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
"""

print("=== TESTING SCRIPT A ===")
res_A = execute_matlab_code(MatlabExecuteRequest(code=script_A, session_id="test_A"))
print("Has error:", res_A.get("has_error"))
print("Output:\n", res_A.get("output"))
print("Figures count:", len(res_A.get("figures", [])))
print("Workspace count:", len(res_A.get("workspace", [])))

assert not res_A.get("has_error"), "Script A failed!"
assert len(res_A.get("figures", [])) > 0, "Script A produced no figure!"

print("\n=== TESTING SCRIPT B ===")
res_B = execute_matlab_code(MatlabExecuteRequest(code=script_B, session_id="test_B"))
print("Has error:", res_B.get("has_error"))
print("Output:\n", res_B.get("output"))
print("Figures count:", len(res_B.get("figures", [])))
print("Workspace count:", len(res_B.get("workspace", [])))

assert not res_B.get("has_error"), "Script B failed!"
assert len(res_B.get("figures", [])) > 0, "Script B produced no figure!"

print("\nALL MATLAB SCRIPTS RUN FLAWLESSLY WITH ZERO ERRORS!")


import urllib.request, json

req = urllib.request.Request(
    'http://127.0.0.1:8000/api/dsp/execute_matlab',
    data=json.dumps({
        'code': "I = imread('cameraman.tif'); I = im2double(I); T = dctmtx(8); B = blockproc(I, [8 8], @(b) T * b.data * T'); disp(size(B))",
        'session_id': 'live_test'
    }).encode('utf-8'),
    headers={'Content-Type': 'application/json'}
)
with urllib.request.urlopen(req) as resp:
    res = json.loads(resp.read().decode('utf-8'))
    print('HTTP Status:', resp.status)
    print('Output:\n', res.get('output'))
    print('Has error:', res.get('has_error'))


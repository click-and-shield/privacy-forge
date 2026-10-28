import { qrcodegen } from './qrcode';
import { createWifiPayload } from './wifi-qrcode';

const element = (id: string) => document.getElementById(id)!;
const form = element('wifi-form') as HTMLFormElement;
const ssid = element('ssid') as HTMLInputElement;
const password = element('password') as HTMLInputElement;
const hiddenNetwork = element('hidden-network') as HTMLInputElement;
const showPassword = element('show-password') as HTMLInputElement;
const canvas = element('qrcode-canvas') as HTMLCanvasElement;
const pngDownload = element('download-png') as HTMLAnchorElement;
const svgDownload = element('download-svg') as HTMLAnchorElement;

function clearResults() {
  element('results').hidden = true;
  element('status').textContent = '';
  pngDownload.removeAttribute('href');
  svgDownload.removeAttribute('href');
  canvas.width = canvas.height = 0;
}

form.addEventListener('submit', event => {
  event.preventDefault();
  clearResults();
  try {
    const payload = createWifiPayload(ssid.value, password.value, hiddenNetwork.checked);
    const qr = qrcodegen.QrCode.encodeText(payload, qrcodegen.QrCode.Ecc.MEDIUM);
    const border = 4;
    const scale = 8;
    const size = qr.size + border * 2;
    canvas.width = canvas.height = size * scale;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('QR preview is unavailable in this browser.');
    context.fillStyle = '#FFFFFF';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#000000';
    const paths: string[] = [];
    for (let y = 0; y < qr.size; y++) {
      for (let x = 0; x < qr.size; x++) {
        if (qr.getModule(x, y)) {
          context.fillRect((x + border) * scale, (y + border) * scale, scale, scale);
          paths.push(`M${x + border},${y + border}h1v1h-1z`);
        }
      }
    }
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size * scale}" height="${size * scale}"><rect width="100%" height="100%" fill="#FFFFFF"/><path d="${paths.join(' ')}" fill="#000000"/></svg>`;
    pngDownload.href = canvas.toDataURL('image/png');
    svgDownload.href = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    element('results').hidden = false;
    element('status').textContent = 'QR code ready. Scan it with a compatible phone to join the network.';
  } catch (error) {
    clearResults();
    element('status').textContent = error instanceof Error ? error.message : 'Unable to generate the QR code.';
  }
});

for (const input of [ssid, password, hiddenNetwork]) input.addEventListener('input', clearResults);
showPassword.addEventListener('change', () => {
  password.type = showPassword.checked ? 'text' : 'password';
});
form.addEventListener('reset', event => {
  event.preventDefault();
  ssid.value = password.value = '';
  hiddenNetwork.checked = showPassword.checked = false;
  password.type = 'password';
  clearResults();
  ssid.focus();
});

element('loading').hidden = true;
form.hidden = false;

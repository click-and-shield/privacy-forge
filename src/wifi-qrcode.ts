// Wi-Fi QR format: WIFI:T:WPA;S:<escaped SSID>;P:<escaped password>;;
export function createWifiPayload(ssid: string, password: string, hidden = false): string {
  if (!ssid || new TextEncoder().encode(ssid).length > 32) {
    throw new Error('Enter a network name (SSID) between 1 and 32 UTF-8 bytes.');
  }
  if (!password) throw new Error('Enter the Wi-Fi password.');

  const escape = (value: string) => value.replace(/[\\;,:\"]/g, '\\$&');
  return `WIFI:T:WPA;S:${escape(ssid)};P:${escape(password)};${hidden ? 'H:true;' : ''};`;
}

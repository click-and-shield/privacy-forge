import { describe, expect, it } from 'vitest';
import { createWifiPayload } from './wifi-qrcode';

describe('Wi-Fi QR payload', () => {
  it('encodes the WPA example with the required terminator', () => {
    expect(createWifiPayload('MonReseau', 'MonMotDePasse'))
      .toBe('WIFI:T:WPA;S:MonReseau;P:MonMotDePasse;;');
  });

  it.each(['\\', ';', ',', '"', ':'])('escapes %s in both credentials', character => {
    expect(createWifiPayload(`a${character}b`, `c${character}d`))
      .toBe(`WIFI:T:WPA;S:a\\${character}b;P:c\\${character}d;;`);
  });

  it('escapes consecutive special characters without allowing extra fields', () => {
    expect(createWifiPayload('a\\;b', 'p;H:true;'))
      .toBe('WIFI:T:WPA;S:a\\\\\\;b;P:p\\;H\\:true\\;;;');
  });

  it('preserves whitespace, accents and Unicode exactly', () => {
    expect(createWifiPayload(' Café 📶 ', ' secret é '))
      .toBe('WIFI:T:WPA;S: Café 📶 ;P: secret é ;;');
  });

  it('adds the hidden-network flag only when requested', () => {
    expect(createWifiPayload('MonReseau', 'MonMotDePasse', true))
      .toBe('WIFI:T:WPA;S:MonReseau;P:MonMotDePasse;H:true;;');
  });

  it('requires both credentials', () => {
    expect(() => createWifiPayload('', 'password')).toThrow('network name');
    expect(() => createWifiPayload('network', '')).toThrow('password');
  });

  it('enforces the SSID limit in UTF-8 bytes without truncation', () => {
    expect(createWifiPayload('é'.repeat(16), 'password')).toContain('é'.repeat(16));
    expect(() => createWifiPayload('é'.repeat(17), 'password')).toThrow('32 UTF-8 bytes');
    expect(createWifiPayload('a'.repeat(32), 'password')).toContain('a'.repeat(32));
    expect(() => createWifiPayload('a'.repeat(33), 'password')).toThrow('32 UTF-8 bytes');
  });
});

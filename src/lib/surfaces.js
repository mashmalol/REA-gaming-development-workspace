// REA's `surface` families mapped onto the TIC-80 palette.
// Mobile (android / adb / apktool) intentionally shares one crimson because it is
// one capability domain, not three.
export const SURFACE_COLORS = {
  session: '#FFEC27',
  'official-proxy': '#29ADFF',
  'native-provider': '#FFA300',
  application: '#00E436',
  enhanced: '#FF77A8',
  'browser-provider': '#FFCCAA',
  'artifact-provider': '#83769C',
  'managed-provider': '#C2C3C7',
  'electron-provider': '#7E2553',
  'runtime-provider': '#AB5236',
  'android-provider': '#FF004D',
  'adb-provider': '#FF004D',
  'apktool-provider': '#FF004D',
  'jeb-provider': '#5F574F',
  'firmware-provider': '#008751',
};

export const FALLBACK_COLOR = '#C2C3C7';

export function familyColor(surface) {
  return SURFACE_COLORS[surface] || FALLBACK_COLOR;
}

// Legend groups share a swatch where the colour is shared.
export const LEGEND = [
  { color: '#FFEC27', label: 'session' },
  { color: '#29ADFF', label: 'official-proxy' },
  { color: '#FFA300', label: 'native-provider' },
  { color: '#00E436', label: 'application' },
  { color: '#FF77A8', label: 'enhanced' },
  { color: '#FFCCAA', label: 'browser-provider' },
  { color: '#83769C', label: 'artifact-provider' },
  { color: '#C2C3C7', label: 'managed-provider' },
  { color: '#7E2553', label: 'electron-provider' },
  { color: '#AB5236', label: 'runtime-provider' },
  { color: '#FF004D', label: 'android / adb / apktool' },
  { color: '#5F574F', label: 'jeb-provider' },
  { color: '#008751', label: 'firmware-provider' },
];
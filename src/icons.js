export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export function icon(name, size = 20) {
  const paths = {
    signal: '<path d="M4 15a12 12 0 0 1 16 0M7 10a8 8 0 0 1 10 0M10 5a3 3 0 0 1 4 0M12 16v5"/>',
    arrow: '<path d="M4 12h15M13 6l6 6-6 6"/>',
    play: '<path d="m9 5 11 7-11 7Z"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M22 21v-2a4 4 0 0 0-3-3.87"/><circle cx="9" cy="7" r="4"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    radio: '<rect x="6" y="3" width="12" height="18" rx="3"/><path d="M9 7h6M9 11h6M12 16v1"/>',
    lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4M12 14v3"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    x: '<path d="m6 6 12 12M6 18 18 6"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V4H4v12h4"/>',
    exit: '<path d="M9 4H4v16h5M10 12h11m-4-4 4 4-4 4"/>',
    question: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 2-2.5 2-2.5 4M12 17h.01"/>',
    sound: '<path d="M11 5 6 9H3v6h3l5 4ZM15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14"/>',
    mute: '<path d="M11 5 6 9H3v6h3l5 4ZM16 9l5 6M16 15l5-6"/>',
    sparkles: '<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5ZM20 2v4M18 4h4"/>',
    target: '<circle cx="12" cy="12" r="7"/><path d="M12 1v5M12 18v5M1 12h5M18 12h5"/>',
    warning: '<path d="m12 3 10 18H2ZM12 9v5M12 17h.01"/>',
    bolt: '<path d="m13 2-9 12h7l-1 8 10-13h-8Z"/>',
    link: '<path d="m10 13 4-4M8 16l-1 1a4 4 0 0 1-6-6l5-5a4 4 0 0 1 6 0m0 6a4 4 0 0 0 6 0l5-5a4 4 0 0 0-6-6l-1 1" transform="translate(1 2) scale(.85)"/>',
    chevron: '<path d="m9 5 7 7-7 7"/>',
    terminal: '<path d="m4 5 7 7-7 7M13 19h7"/>',
  };
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.signal}</svg>`;
}
export function glyph(name, size = 32) {
  const paths = {
    NOVA: '<path d="m16 3 3.2 9.8L29 16l-9.8 3.2L16 29l-3.2-9.8L3 16l9.8-3.2Z"/>',
    ORBIT: '<circle cx="16" cy="16" r="8"/><ellipse cx="16" cy="16" rx="15" ry="5" transform="rotate(-35 16 16)"/>',
    ECHO: '<path d="M3 12c4-9 9 9 13 0s9 9 13 0M3 21c4-9 9 9 13 0s9 9 13 0"/>',
    FLARE: '<path d="m19 3-13 15h9l-2 11 13-16h-9Z"/>',
    APEX: '<path d="m16 4 13 24H3ZM16 15l6 11H10Z"/>',
    HALO: '<circle cx="16" cy="16" r="12"/><circle cx="16" cy="16" r="5"/><path d="M16 1v7M16 24v7"/>',
  };
  return `<svg width="${size}" height="${size}" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.NOVA}</svg>`;
}
export function stationArt(extraClass = '') {
  return `<div class="station-art ${extraClass}" aria-hidden="true">
    <div class="planet-glow"></div><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><div class="orbit orbit-three"></div>
    <div class="orbital-dot dot-one"></div><div class="orbital-dot dot-two"></div>
    <svg class="station-drawing" viewBox="0 0 460 340" fill="none">
      <g transform="translate(230 170) rotate(-26)" stroke="currentColor" stroke-width="1.3">
        <path d="M-142 0H142M0-105V105" opacity=".3" stroke-dasharray="4 5"/>
        <rect x="-36" y="-48" width="72" height="96" rx="12" fill="#17242d"/>
        <rect x="-23" y="-36" width="46" height="72" rx="7" fill="#111c26"/>
        <path d="M-23-19h46M-23 19h46M-13-36v72M13-36v72" opacity=".5"/>
        <circle r="18" fill="#1b3038"/><circle r="10"/><path d="M-7 0H7M0-7V7"/>
        <path d="M-36-15h-37M-36 15h-37M36-15h37M36 15h37"/>
        <rect x="-149" y="-58" width="76" height="116" rx="3" fill="#12232e"/>
        <rect x="73" y="-58" width="76" height="116" rx="3" fill="#12232e"/>
        <path d="M-124-58V58M-98-58V58M99-58V58M124-58V58M-149-29h76M-149 0h76M-149 29h76M73-29h76M73 0h76M73 29h76" opacity=".55"/>
        <path d="M-12-48v-32h24v32M-12 48v32h24V48M0-80v-22M0 80v22"/>
        <circle cy="-108" r="6"/><path d="M-14-107a14 14 0 0 1 28 0"/>
        <path d="M-155 70h26M-142 57v26M154-75h26M167-88v26" opacity=".4"/>
      </g>
    </svg>
    <span class="orbit-label label-top">MERIDIAN / M-07</span><span class="orbit-label label-bottom">48.21 N &nbsp; / &nbsp; SIGNAL UNSTABLE</span>
  </div>`;
}

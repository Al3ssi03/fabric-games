import { useCallback } from 'react';

import { EMULATOR_DATA, type EmulatorSystem } from './systems';

/** What the frame's bootstrap script reads from `window.frameElement`. */
interface FrameConfig {
  core: string;
  fileName: string;
  gameName: string;
  rom: ArrayBuffer;
  dataPath: string;
  color: string;
}

type ConfiguredFrame = HTMLIFrameElement & { ejsConfig?: FrameConfig };

/*
 * EmulatorJS is configured through window globals and grabs the keyboard, so it
 * runs in its own document. The srcdoc frame shares our origin, which lets the
 * bootstrap read the ROM bytes straight from the parent without a network trip.
 * The File is rebuilt inside the frame because EmulatorJS checks
 * `instanceof File`, which fails for objects from another window.
 */
const BOOTSTRAP = `<!doctype html>
<html><head><meta charset="utf-8"><style>
html,body{margin:0;height:100%;background:#000;color:#e8e6ff;font:600 15px 'Segoe UI',sans-serif}
#game{width:100%;height:100%}
.error{display:grid;place-items:center;height:100%;padding:24px;text-align:center}
</style></head><body><div id="game"></div><script>
(function () {
  var cfg = window.frameElement && window.frameElement.ejsConfig;
  if (!cfg) return;
  window.EJS_player = '#game';
  window.EJS_core = cfg.core;
  window.EJS_gameName = cfg.gameName;
  window.EJS_gameUrl = new File([cfg.rom], cfg.fileName);
  window.EJS_pathtodata = cfg.dataPath;
  window.EJS_startOnLoaded = true;
  window.EJS_color = cfg.color;
  var script = document.createElement('script');
  script.src = cfg.dataPath + 'loader.js';
  script.onerror = function () {
    document.body.innerHTML = '<div class="error">The emulator could not be downloaded from cdn.emulatorjs.org. Check your connection, or ask your admin whether that site is allowed.</div>';
  };
  document.body.appendChild(script);
})();
</script></body></html>`;

export function EmulatorFrame({
  system,
  file,
  rom,
}: {
  system: EmulatorSystem;
  file: File;
  rom: ArrayBuffer;
}) {
  // A callback ref runs before the srcdoc document parses, so the config is
  // in place by the time the bootstrap script looks for it.
  const attach = useCallback(
    (frame: ConfiguredFrame | null) => {
      if (!frame) return;
      frame.ejsConfig = {
        core: system.core,
        fileName: file.name,
        gameName: file.name.replace(/\.[^.]+$/, ''),
        rom,
        dataPath: EMULATOR_DATA,
        color: system.color,
      };
    },
    [system, file, rom]
  );

  return (
    <iframe
      ref={attach}
      title={`${system.title} emulator`}
      srcDoc={BOOTSTRAP}
      allow="fullscreen; gamepad; autoplay"
      allowFullScreen
      className="block aspect-[4/3] w-full rounded-xl border-0 bg-black"
    />
  );
}

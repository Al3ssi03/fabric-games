/**
 * Keyboard state for canvas games, keyed by `KeyboardEvent.code` so the layout
 * (QWERTY, AZERTY, ...) never changes which physical keys a game reads.
 *
 * `pressed` is the live state; `consume` answers "was this key pressed since I
 * last asked?" so one tap triggers one jump even across several frames.
 */
export class Keyboard {
  private readonly down = new Set<string>();
  private readonly tapped = new Set<string>();

  constructor(private readonly captured: ReadonlySet<string>) {}

  private onKeyDown = (event: KeyboardEvent) => {
    if (!this.captured.has(event.code)) return;
    // Arrow keys and Space would otherwise scroll the Fabric host page.
    event.preventDefault();
    if (!event.repeat) this.tapped.add(event.code);
    this.down.add(event.code);
  };

  private onKeyUp = (event: KeyboardEvent) => {
    if (!this.captured.has(event.code)) return;
    event.preventDefault();
    this.down.delete(event.code);
  };

  private onBlur = () => {
    this.down.clear();
    this.tapped.clear();
  };

  attach(target: Window = window): () => void {
    target.addEventListener('keydown', this.onKeyDown);
    target.addEventListener('keyup', this.onKeyUp);
    target.addEventListener('blur', this.onBlur);
    return () => {
      target.removeEventListener('keydown', this.onKeyDown);
      target.removeEventListener('keyup', this.onKeyUp);
      target.removeEventListener('blur', this.onBlur);
    };
  }

  pressed(...codes: string[]): boolean {
    return codes.some((code) => this.down.has(code));
  }

  consume(...codes: string[]): boolean {
    let hit = false;
    for (const code of codes) {
      if (this.tapped.delete(code)) hit = true;
    }
    return hit;
  }

  /** Drop taps nobody read this frame so they cannot fire much later. */
  endFrame(): void {
    this.tapped.clear();
  }
}

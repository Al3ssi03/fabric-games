const STEP = 1 / 120;
const MAX_FRAME = 0.1;

/**
 * Runs `update` at a fixed 120 Hz step and `render` once per animation frame.
 *
 * A fixed step keeps physics identical on 60 Hz and 144 Hz monitors; the
 * frame cap stops a backgrounded tab from simulating seconds in one burst.
 */
export function startLoop(
  update: (dt: number) => void,
  render: () => void
): () => void {
  let last = performance.now();
  let accumulator = 0;
  let frame = 0;
  let running = true;

  const tick = (now: number) => {
    if (!running) return;
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    while (accumulator >= STEP) {
      update(STEP);
      accumulator -= STEP;
    }
    render();
    frame = requestAnimationFrame(tick);
  };

  frame = requestAnimationFrame(tick);
  return () => {
    running = false;
    cancelAnimationFrame(frame);
  };
}

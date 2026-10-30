export const DISPLAY_FONT = "'Press Start 2P', 'Courier New', monospace";
export const BODY_FONT = "'Chakra Petch', 'Segoe UI', sans-serif";

/** Dims the frame and prints a centered title card, shared by every game. */
export function drawOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  title: string,
  lines: string[],
  accent: string
): void {
  ctx.save();
  ctx.fillStyle = 'rgba(6, 4, 20, 0.72)';
  ctx.fillRect(0, 0, width, height);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = accent;
  ctx.shadowBlur = 18;
  ctx.fillStyle = accent;
  ctx.font = `28px ${DISPLAY_FONT}`;
  ctx.fillText(title, width / 2, height / 2 - 34);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#e8e6ff';
  ctx.font = `600 18px ${BODY_FONT}`;
  lines.forEach((line, index) => {
    ctx.fillText(line, width / 2, height / 2 + 14 + index * 28);
  });
  ctx.restore();
}

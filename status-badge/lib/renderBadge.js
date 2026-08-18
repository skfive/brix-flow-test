const COLORS = {
  up: '#4c1',
  degraded: '#dfb317',
  down: '#e05d44',
};

const TEXT_COLOR = '#ffffff';
const HEIGHT = 20;
const FONT_FAMILY = 'Verdana, Geneva, DejaVu Sans, sans-serif';
const FONT_SIZE = 11;
const CHAR_WIDTH = 6;
const PADDING_X = 6;

const VALID_STATUSES = new Set(['up', 'degraded', 'down', 'invalid']);

const XML_ESCAPES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;',
};

function escapeXml(text) {
  return text.replace(/[&<>"']/g, (char) => XML_ESCAPES[char]);
}

function segmentWidth(text) {
  return PADDING_X * 2 + CHAR_WIDTH * text.length;
}

export function renderBadge({ label, status }) {
  if (typeof label !== 'string' || label.length === 0) {
    throw new Error('renderBadge: label must be a non-empty string');
  }
  if (!VALID_STATUSES.has(status)) {
    throw new Error(
      `renderBadge: status must be one of up|degraded|down|invalid, got "${status}"`,
    );
  }

  const stateClass = status === 'invalid' ? 'down' : status;
  const color = COLORS[stateClass];

  const labelWidth = segmentWidth(label);
  const statusWidth = segmentWidth(status);
  const totalWidth = labelWidth + statusWidth;

  const escapedLabel = escapeXml(label);
  const escapedStatus = escapeXml(status);
  const ariaLabel = `${escapedLabel}: ${escapedStatus}`;

  const labelX = labelWidth / 2;
  const statusX = labelWidth + statusWidth / 2;
  const textY = HEIGHT / 2 + FONT_SIZE / 2 - 1;

  return `<svg id="badge-svg-root" class="badge badge--${stateClass}" xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${HEIGHT}" role="img" aria-label="${ariaLabel}">
  <title>${ariaLabel}</title>
  <g>
    <rect width="${labelWidth}" height="${HEIGHT}" fill="#555"/>
    <rect x="${labelWidth}" width="${statusWidth}" height="${HEIGHT}" fill="${color}"/>
  </g>
  <g class="badge__label" font-family="${FONT_FAMILY}" font-size="${FONT_SIZE}" fill="${TEXT_COLOR}" text-anchor="middle">
    <text id="badge-label-text" x="${labelX}" y="${textY}">${escapedLabel}</text>
  </g>
  <g class="badge__status" font-family="${FONT_FAMILY}" font-size="${FONT_SIZE}" fill="${TEXT_COLOR}" text-anchor="middle">
    <text id="badge-status-text" x="${statusX}" y="${textY}">${escapedStatus}</text>
  </g>
</svg>`;
}

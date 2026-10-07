/**
 * Image detection for sensor text values.
 *
 * InfoPanel plugins expose images as plain text URLs — either from their own
 * localhost image servers (Media's cover-art server, StreamDeck's icon server)
 * or remote CDNs (Steam static, Spotify, OpenWeatherMap weather icons). The
 * host export carries those strings unchanged; the dashboard decides which
 * text values are actually images.
 */

const URL_RE = /^https?:\/\//i;
const EXT_RE = /\.(png|jpe?g|gif|webp|svg)([?#]|$)/i;

/** Known image hosts, matched when the key gives no hint. */
const HOST_RE =
  /scdn\.co|steamstatic\.com|openweathermap\.org|weather-icons|githubusercontent\.com/i;

const IMAGE_TOKENS = new Set([
  "art",
  "artwork",
  "banner",
  "cover",
  "icon",
  "image",
  "img",
  "logo",
  "avatar",
  "thumb",
]);

/** True when the sensor key (id or full key) names an image-bearing field. */
function keyHasImageHint(key: string): boolean {
  const tokens = key.toLowerCase().split(/[^a-z0-9]+/);
  return tokens.some((t) => IMAGE_TOKENS.has(t));
}

/**
 * True when a text value should be rendered with <img>.
 *
 * A value qualifies when it is an http(s) URL AND at least one of:
 * - the URL path ends in an image extension,
 * - the sensor key names an image field (cover-art, icon, banner, ...),
 * - the host is a known image CDN.
 */
export function isImageUrl(
  text: string | undefined | null,
  key?: string
): boolean {
  if (!text) return false;
  const t = text.trim();
  if (!URL_RE.test(t)) return false;
  if (EXT_RE.test(t)) return true;
  if (key && keyHasImageHint(key)) return true;
  return HOST_RE.test(t);
}

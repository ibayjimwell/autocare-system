// MIT licensed QRCode for JavaScript by Kazuhiko Arase, vendored from
// qrcode-terminal's QRCode folder. See vendor/QRCode/index.js copyright header.
// QR data is generated on the AutoCare server; no external QR image service
// receives the private share token.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const QRCode = require('./vendor/QRCode');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Level = require('./vendor/QRCode/QRErrorCorrectLevel');

/**
 * Shared-document QR links use HTTPS everywhere except when a developer is
 * running the Web app locally. In development ONLY, localhost/loopback HTTP
 * URLs are acceptable. The production endpoint must never emit plain-HTTP QR
 * links for remote domains.
 */
function isAllowedShareUrl(input: string): boolean {
  if (typeof input !== 'string' || input.length === 0 || input.length > 600) {
    return false;
  }

  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return false;
  }

  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !/^\/share\/[a-f0-9]{64}$/.test(url.pathname)
  ) {
    return false;
  }

  if (url.protocol === 'https:') {
    return true;
  }

  return (
    process.env.NODE_ENV === 'development' &&
    url.protocol === 'http:' &&
    ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
  );
}

/** Generate a scannable SVG with a four-module quiet zone. */
export function qrSvg(text: string): string {
  if (!isAllowedShareUrl(text)) {
    throw new Error('Invalid QR URL.');
  }

  const qr = new QRCode(-1, Level.M);
  qr.addData(text);
  qr.make();

  const moduleCount = qr.getModuleCount();
  const quietZone = 4;
  const size = moduleCount + quietZone * 2;
  const shapes: string[] = [];

  for (let y = 0; y < moduleCount; y += 1) {
    for (let x = 0; x < moduleCount; x += 1) {
      if (qr.isDark(y, x)) {
        shapes.push(`M${x + quietZone} ${y + quietZone}h1v1h-1z`);
      }
    }
  }

  return (
    '<svg xmlns="http://www.w3.org/2000/svg" ' +
    `viewBox="0 0 ${size} ${size}" width="320" height="320" ` +
    'role="img" aria-label="Scan QR to view AutoCare document">' +
    `<rect width="${size}" height="${size}" fill="#fff"/>` +
    `<path d="${shapes.join('')}" fill="#161616"/>` +
    '</svg>'
  );
}

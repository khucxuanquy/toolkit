// CloudFront Function (viewer-request) for a Next.js static export with
// `trailingSlash: true`. Maps "directory" URLs to their index.html so
// /login/ -> /login/index.html and / -> /index.html, while leaving real files
// (anything containing a dot, e.g. /sw.js, /_next/x.js, /icons/icon.svg) alone.
function handler(event) {
  var request = event.request;
  var uri = request.uri;

  if (uri.endsWith("/")) {
    request.uri = uri + "index.html";
  } else if (!uri.includes(".")) {
    request.uri = uri + "/index.html";
  }

  return request;
}

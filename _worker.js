export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    const domain = env.DOMAIN;
    const DATABASE = env.DATABASE;
    const USERNAME = env.USERNAME;
    const PASSWORD = env.PASSWORD;
    const adminPath = env.ADMIN_PATH;
    const enableAuth = env.ENABLE_AUTH === 'true';
    const R2_BUCKET = env.R2_BUCKET;
    const maxSizeMB = env.MAX_SIZE_MB ? parseInt(env.MAX_SIZE_MB, 10) : 10;
    const maxSize = maxSizeMB * 1024 * 1024;

    switch (pathname) {
      case '/':
        return await handleRootRequest(request, USERNAME, PASSWORD, enableAuth);
      case `/${adminPath}`:
        return await handleAdminRequest(DATABASE, request, USERNAME, PASSWORD);
      case '/upload':
        return request.method === 'POST' ? await handleUploadRequest(request, DATABASE, enableAuth, USERNAME, PASSWORD, domain, R2_BUCKET, maxSize) : new Response('Method Not Allowed', { status: 405 });
      case '/bing-images':
        return handleBingImagesRequest();
      case '/delete-images':
        return await handleDeleteImagesRequest(request, DATABASE, USERNAME, PASSWORD, R2_BUCKET);
      default:
        return await handleImageRequest(request, DATABASE, R2_BUCKET);
    }
  }
};

function authenticate(request, USERNAME, PASSWORD) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return false;
  return isValidCredentials(authHeader, USERNAME, PASSWORD);
}

async function handleRootRequest(request, USERNAME, PASSWORD, enableAuth) {
  const cache = caches.default;
  const cacheKey = new Request(request.url);
  if (enableAuth) {
      if (!authenticate(request, USERNAME, PASSWORD)) {
          return new Response('Unauthorized', { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="Admin"' } });
      }
  }
  const cachedResponse = await cache.match(cacheKey);
  if (cachedResponse) {
      return cachedResponse;
  }
  const response = new Response(`
  <!DOCTYPE html>
  <html lang="zh-CN">
  <head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="JSimages-基于CloudFlare的图床服务">
  <meta name="keywords" content="JSimages,Workers图床, Pages图床,R2储存, Cloudflare, Workers, 图床">
  <title>JSimages-基于CloudFlare的图床服务</title>
  <link rel="icon" href="https://p1.meituan.net/csc/c195ee91001e783f39f41ffffbbcbd484286.ico" type="image/x-icon">
  <link href="https://lf3-cdn-tos.bytecdntp.com/cdn/expire-1-M/twitter-bootstrap/4.6.1/css/bootstrap.min.css" rel="stylesheet" />
  <link href="https://lf26-cdn-tos.bytecdntp.com/cdn/expire-1-M/bootstrap-fileinput/5.2.7/css/fileinput.min.css" rel="stylesheet" />
  <link href="https://lf26-cdn-tos.bytecdntp.com/cdn/expire-1-M/toastr.js/2.1.4/toastr.min.css" rel="stylesheet" />
  <link href="https://lf3-cdn-tos.bytecdntp.com/cdn/expire-1-M/font-awesome/5.15.4/css/all.min.css" type="text/css" rel="stylesheet" />
  <style>
      body {
          margin: 0;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          position: relative;
      }
      .background {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-size: cover;
          z-index: -1;
          transition: opacity 1s ease-in-out;
          opacity: 1;
      }
      .card {
          background-color: rgba(255, 255, 255, 0.8);
          border: none;
          border-radius: 10px;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
          padding: 20px;
          width: 90%;
          max-width: 400px;
          text-align: center;
          margin: 0 auto;
          position: relative;
      }
      .uniform-height {
          margin-top: 20px;
      }
      #viewCacheBtn {
          position: absolute;
          top: 10px;
          right: 10px;
          background: none;
          border: none;
          color: rgba(0, 0, 0, 0.1);
          cursor: pointer;
          font-size: 24px;
          transition: color 0.3s ease;
      }
      #viewCacheBtn:hover {
          color: rgba(0, 0, 0, 0.4);
      }
      #compressionToggleBtn {
          position: absolute;
          top: 10px;
          right: 50px;
          background: none;
          border: none;
          color: rgba(0, 0, 0, 0.1);
          cursor: pointer;
          font-size: 24px;
          transition: color 0.3s ease;
      }
      #compressionToggleBtn:hover {
          color: rgba(0, 0, 0, 0.4);
      }
      #cacheContent {
          margin-top: 20px;
          max-height: 200px;
          border-radius: 5px;
          overflow-y: auto;
      }
      .cache-title {
          text-align: left;
          margin-bottom: 10px;
      }
      .cache-item {
          display: block;
          cursor: pointer;
          border-radius: 4px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          transition: background-color 0.3s ease;
          text-align: left;
         

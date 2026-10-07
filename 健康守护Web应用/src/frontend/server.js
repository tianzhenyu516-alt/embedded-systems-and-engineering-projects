import dotenv from 'dotenv';
dotenv.config({ override: true });







import express from 'express';







import compression from 'compression';







import path from 'path';







import { fileURLToPath } from 'url';







import { createProxyMiddleware, fixRequestBody } from 'http-proxy-middleware';















const __filename = fileURLToPath(import.meta.url);







const __dirname = path.dirname(__filename);















const app = express();







const PORT = Number(process.env.FRONTEND_PORT || process.env.PORT || 3080);







const BACKEND_URL = process.env.BACKEND_URL || `http://127.0.0.1:${process.env.BACKEND_PORT || 8899}`;







const STATIC_ASSET_REGEX = /\.(?:js|mjs|css|svg|png|jpg|jpeg|gif|webp|ico|woff2?|glb|gltf)$/i;







const IMMUTABLE_ASSET_REGEX = /\.(?:js|mjs|css|woff2?)$/i;

const FRONTEND_AUTH_COOKIE = 'healthguard_frontend_auth';

const LOGIN_PAGE_PATH = '/views/auth/login.html';

const PUBLIC_PAGE_PATHS = new Set([
  '/',
  '/index.html',
  LOGIN_PAGE_PATH,
  '/views/auth/register.html',
  '/views/auth/forgot-password.html',
  '/views/auth/privacy-policy.html',
  '/views/auth/user-agreement.html'
]);















function parseCookies(cookieHeader = '') {
  return String(cookieHeader || '')
    .split(';')
    .map(item => item.trim())
    .filter(Boolean)
    .reduce((cookies, item) => {
      const separatorIndex = item.indexOf('=');
      if (separatorIndex === -1) {
        return cookies;
      }

      const key = item.slice(0, separatorIndex).trim();
      const value = item.slice(separatorIndex + 1).trim();
      cookies[key] = decodeURIComponent(value);
      return cookies;
    }, {});
}

function hasFrontendAuthCookie(req) {
  const cookies = parseCookies(req.headers.cookie || '');
  return Boolean(cookies[FRONTEND_AUTH_COOKIE]);
}

function shouldRequireLogin(req) {
  if (!['GET', 'HEAD'].includes(req.method)) {
    return false;
  }

  const requestPath = req.path || '/';

  if (PUBLIC_PAGE_PATHS.has(requestPath)) {
    return false;
  }

  if (STATIC_ASSET_REGEX.test(requestPath) || requestPath === '/favicon.ico') {
    return false;
  }

  if (requestPath.startsWith('/api')
    || requestPath.startsWith('/proxy')
    || requestPath.startsWith('/logs')
    || requestPath.startsWith('/geocoding')
    || requestPath.startsWith('/reverse-geocoding')
    || requestPath.startsWith('/user-media')) {
    return false;
  }

  return requestPath === '/user'
    || requestPath === '/user/'
    || requestPath === '/admin'
    || requestPath === '/admin/'
    || requestPath === '/hospital'
    || requestPath === '/hospital/'
    || requestPath === '/sub-admin'
    || requestPath === '/sub-admin/'
    || requestPath.startsWith('/views/user/')
    || requestPath.startsWith('/views/admin/')
    || requestPath.startsWith('/views/hospital/')
    || requestPath.startsWith('/views/sub-admin/');
}

function redirectToLogin(req, res) {
  const redirectTarget = `${req.path || '/'}${req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : ''}`;
  const search = new URLSearchParams();
  search.set('redirect', redirectTarget);
  res.redirect(`${LOGIN_PAGE_PATH}?${search.toString()}`);
}

function clearFrontendAuthCookie(res) {
  res.setHeader('Set-Cookie', `${FRONTEND_AUTH_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`);
}

app.use((req, res, next) => {
  if (!shouldRequireLogin(req)) {
    return next();
  }

  if (hasFrontendAuthCookie(req)) {
    return next();
  }

  clearFrontendAuthCookie(res);
  redirectToLogin(req, res);
});

app.use(compression({







  level: 6,







  threshold: 1024,







  filter: (req, res) => {







    if (req.headers['x-no-compression']) {







      return false;







    }







    return compression.filter(req, res);







  }







}));















app.use((req, res, next) => {







  res.set('X-Content-Type-Options', 'nosniff');







  res.set('X-Frame-Options', 'SAMEORIGIN');







  res.set('X-XSS-Protection', '1; mode=block');







  res.set('X-DNS-Prefetch-Control', 'on');







  res.set('Connection', 'keep-alive');







  res.set('Keep-Alive', 'timeout=5, max=100');







  next();







});















function createBackendProxy(label, options = {}) {
  return createProxyMiddleware({
    target: options.target || BACKEND_URL,
    changeOrigin: true,
    logLevel: 'info',
    pathRewrite: options.pathRewrite,
    proxyTimeout: options.proxyTimeout || 15000,
    timeout: options.timeout || 15000,
    onProxyReq: (proxyReq, req, res) => {
      fixRequestBody(proxyReq, req, res);
      if (typeof options.onProxyReq === 'function') {
        options.onProxyReq(proxyReq, req, res);
      }
    },
    onError: (err, req, res) => {
      console.error(`${label}代理错误:`, err);
      if (!res.headersSent) {
        res.status(503).json({ success: false, message: '后端服务不可用' });
      }
    }
  });
}

function withDefaultScheme(url, fallback = 'https') {
  if (!url) {
    return '';
  }

  const trimmed = String(url).trim();
  if (!trimmed) {
    return '';
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `${fallback}://${trimmed.replace(/^\/+/,'')}`;
}

async function fetchJsonWithTimeout(url, timeout = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json, text/plain, */*' },
      signal: controller.signal,
    });

    const text = await response.text();
    let data = null;

    try {
      data = text ? JSON.parse(text) : null;
    } catch (error) {
      data = { raw: text };
    }

    return { response, data, text };
  } finally {
    clearTimeout(timer);
  }
}

app.post('/proxy/location/test', express.json({ limit: '1mb' }), async (req, res) => {
  const { provider, apiKey, baseUrl, address } = req.body || {};
  const safeAddress = String(address || '').trim() || '北京市天安门';
  const startedAt = Date.now();

  if (!provider) {
    res.status(400).json({ success: false, message: '缺少 provider 参数' });
    return;
  }

  if (!apiKey) {
    res.status(400).json({ success: false, message: '缺少 apiKey 参数' });
    return;
  }

  try {
    let requestUrl = '';

    switch (provider) {
      case 'baidu': {
        const root = withDefaultScheme(baseUrl || 'https://api.map.baidu.com');
        const url = new URL('/geocoding/v3/', root);
        url.searchParams.set('address', safeAddress);
        url.searchParams.set('output', 'json');
        url.searchParams.set('ak', apiKey);
        requestUrl = url.toString();
        break;
      }
      case 'tencent': {
        const root = withDefaultScheme(baseUrl || 'https://apis.map.qq.com');
        const url = new URL('/ws/geocoder/v1/', root);
        url.searchParams.set('address', safeAddress);
        url.searchParams.set('key', apiKey);
        requestUrl = url.toString();
        break;
      }
      case 'tianditu': {
        const root = withDefaultScheme(baseUrl || 'https://api.tianditu.gov.cn');
        const url = new URL('/geocoder', root);
        url.searchParams.set('ds', JSON.stringify({ keyWord: safeAddress }));
        url.searchParams.set('tk', apiKey);
        requestUrl = url.toString();
        break;
      }
      default:
        res.status(400).json({ success: false, message: '不支持的地图服务提供商' });
        return;
    }

    const { response, data, text } = await fetchJsonWithTimeout(requestUrl, 12000);
    const latency = Date.now() - startedAt;

    if (!response.ok) {
      res.status(response.status).json({
        success: false,
        message: `地图服务请求失败: HTTP ${response.status}`,
        data: { provider, latency, response: data || text || null },
      });
      return;
    }

    let normalized = null;
    let remoteError = '';

    if (provider === 'baidu') {
      const result = data?.result?.location;
      if (Number.isFinite(result?.lat) && Number.isFinite(result?.lng)) {
        normalized = { lat: result.lat, lng: result.lng };
      } else if (data?.status !== 0) {
        remoteError = data?.message || data?.msg || `status=${data?.status}`;
      }
    } else if (provider === 'tencent') {
      const result = data?.result?.location;
      if (Number.isFinite(result?.lat) && Number.isFinite(result?.lng)) {
        normalized = { lat: result.lat, lng: result.lng };
      } else if (data?.status !== 0) {
        remoteError = data?.message || `status=${data?.status}`;
      }
    } else if (provider === 'tianditu') {
      const location = data?.location || data?.result?.location;
      const lon = Number(location?.lon ?? location?.lng);
      const lat = Number(location?.lat);
      if (Number.isFinite(lat) && Number.isFinite(lon)) {
        normalized = { lat, lng: lon };
      } else if (String(data?.status || '').toLowerCase() !== '0' && data?.status !== 0) {
        remoteError = data?.msg || data?.message || `status=${data?.status}`;
      }
    }

    if (!normalized) {
      res.status(400).json({
        success: false,
        message: remoteError || '地图服务返回结果中未找到有效坐标',
        data: { provider, latency, response: data || text || null },
      });
      return;
    }

    res.json({
      success: true,
      message: `成功解析地址，坐标: ${normalized.lat}, ${normalized.lng}`,
      data: {
        provider,
        latency,
        location: normalized,
      },
    });
  } catch (error) {
    const message = error?.name === 'AbortError'
      ? '地图服务请求超时，请稍后重试'
      : (error?.message || '地图服务请求失败');

    res.status(500).json({
      success: false,
      message,
    });
  }
});

app.use(express.static(__dirname, {







  etag: true,







  lastModified: true,







  maxAge: '1h',







  setHeaders: (res, filePath) => {







    if (filePath.endsWith('.html')) {







      res.setHeader('Cache-Control', 'no-store');







      return;







    }















    if (IMMUTABLE_ASSET_REGEX.test(filePath)) {







      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');







      return;







    }















    if (STATIC_ASSET_REGEX.test(filePath)) {







      res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');







    }







  },







}));















app.use('/frontend-api', express.static(path.join(__dirname, 'api'), {
  etag: true,
  lastModified: true,
  maxAge: '1h',
  setHeaders: (res, filePath) => {
    if (IMMUTABLE_ASSET_REGEX.test(filePath)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      return;
    }

    if (STATIC_ASSET_REGEX.test(filePath)) {
      res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
    }
  },
}));

app.get(['/', '/index.html'], (req, res) => {







  res.sendFile(path.join(__dirname, 'views', 'auth', 'login.html'));







});















app.get('/favicon.ico', (req, res) => {







  res.sendFile(path.join(__dirname, 'assets', 'icons', 'favicon.svg'));







});

















app.use('/api', createBackendProxy('API', {
  target: BACKEND_URL
}));







app.use('/user-media', createBackendProxy('媒体文件'));







app.use('/proxy', createBackendProxy('代理服务'));







app.use('/geocoding', createBackendProxy('地理编码'));







app.use('/reverse-geocoding', createBackendProxy('逆地理编码'));







app.use('/logs', createBackendProxy('日志'));

// 管理后台脚本别名路由
app.get('/pages/admin/app.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'admin', 'app.js'));
});

app.get('/pages/sub-admin/app.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'sub-admin', 'app.js'));
});















// 简化的路由配置 - 让 express.static 处理大部分文件







// 只需要配置不带 .html 后缀的路径和目录路径















// 用户路由







app.get('/user', (req, res) => {







  res.sendFile(path.join(__dirname, 'views', 'user', 'dashboard', 'index.html'));







});















app.get('/user/', (req, res) => {







  res.sendFile(path.join(__dirname, 'views', 'user', 'dashboard', 'index.html'));







});















// 管理员路由







app.get('/admin', (req, res) => {







  res.sendFile(path.join(__dirname, 'views', 'admin', 'admin.html'));







});















app.get('/admin/', (req, res) => {







  res.sendFile(path.join(__dirname, 'views', 'admin', 'admin.html'));







});















// 医院路由







app.get('/hospital', (req, res) => {







  res.sendFile(path.join(__dirname, 'views', 'hospital', 'hospital.html'));







});















app.get('/hospital/', (req, res) => {







  res.sendFile(path.join(__dirname, 'views', 'hospital', 'hospital.html'));







});















// 副管理员路由







app.get('/sub-admin', (req, res) => {







  res.sendFile(path.join(__dirname, 'views', 'sub-admin', 'sub-admin.html'));







});















app.get('/sub-admin/', (req, res) => {







  res.sendFile(path.join(__dirname, 'views', 'sub-admin', 'sub-admin.html'));







});















app.use((req, res) => {







  res.status(404).send(`







    <!DOCTYPE html>







    <html>







    <head>







      <meta charset="UTF-8">







      <title>404 - 页面未找到</title>







      <style>







        body { 







          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;







          display: flex; 







          justify-content: center; 







          align-items: center; 







          height: 100vh; 







          margin: 0;







          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);







          color: white;







        }







        .container { text-align: center; }







        h1 { font-size: 72px; margin: 0; }







        p { font-size: 24px; }







        a { color: white; text-decoration: underline; }







      </style>







    </head>







    <body>







      <div class="container">







        <h1>404</h1>







        <p>页面未找到</p>







        <a href="/">返回首页</a>







      </div>







    </body>







    </html>







  `);







});















app.use((err, req, res, next) => {







  console.error('前端服务器错误:', err);







  res.status(500).send('服务器内部错误');







});















app.listen(PORT, () => {







  console.log(`







╔══════════════════════════════════════════════════════════╗







║ 🚀 前端服务器已启动                                       ║







║                                                          ║







║  📡 端口: ${PORT}                                        ║







║  🌐 访问: http://localhost:${PORT}                       ║







║  🔗 后端: ${BACKEND_URL}                                 ║







║                                                          ║







║  ✨ 已启用:                                              ║







║     ✓ 静态文件服务                                        ║







║     ✓ API 代理到后端                                      ║







║     ✓ Gzip/Brotli 压缩                                    ║







║     ✓ 安全响应头                                          ║







╚══════════════════════════════════════════════════════════╝







  `);







});















process.on('SIGTERM', () => {







  console.log('收到SIGTERM信号，正在优雅关闭...');







  process.exit(0);







});








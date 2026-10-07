import '../env/load-env.js';

export const BACKEND_PORT = Number(process.env.BACKEND_PORT || process.env.PORT || 8899);
export const FRONTEND_PORT = Number(process.env.FRONTEND_PORT || 3080);
export const PORT = BACKEND_PORT;

const configuredOrigins = [
    process.env.APP_FRONTEND_URL,
    process.env.APP_URL,
    process.env.FRONTEND_URL,
    process.env.SITE_URL,
    process.env.WEB_URL,
    ...(process.env.ALLOWED_ORIGINS || '').split(','),
]
    .map(origin => String(origin || '').trim())
    .filter(Boolean);

const allowedOrigins = [...new Set(configuredOrigins)];

export const FRONTEND_URLS = allowedOrigins.length > 0
    ? allowedOrigins
    : [
        `http://localhost:${FRONTEND_PORT}`,
        'http://127.0.0.1:3080',
        'http://127.0.0.1:3081',
        'http://localhost:3081',
    ];
export const API_VERSION = '1.0.0';
export const ALLOWED_AI_PROVIDERS = ['deepseek', 'doubao', 'zhipu'];
export const AI_PROVIDER_HEALTH = Object.freeze({
    healthy: 'healthy',
    missing_key: 'missing_key',
});

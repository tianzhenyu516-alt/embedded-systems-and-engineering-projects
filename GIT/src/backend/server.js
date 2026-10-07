import './config/env/load-env.js';
import express from 'express';
import compression from 'compression';
import crypto from 'crypto';
import cors from 'cors';
import fetch from 'node-fetch';
import { createClient } from 'redis';
import { pool, testConnection } from './config/database/database.js';
import { createRedisMiddleware } from './middlewares/redis/redis-middleware.js';
import {
    PORT,
    FRONTEND_URLS,
    API_VERSION,
    ALLOWED_AI_PROVIDERS,
    AI_PROVIDER_HEALTH,
} from './config/app/server-config.js';
// import { geocodingRateLimiter } from './utils/rate-limit/rate-limiter.js';

// 环境变量已在模块加载前注入

const app = express();
let isDatabaseAvailable = false;

function sanitizeOptionalEnvValue(value) {
    const normalized = String(value || '').trim();
    if (!normalized) {
        return '';
    }

    const placeholderValues = new Set([
        'your_redis_password',
        'your-password',
        'changeme',
        'change-me',
        'placeholder',
    ]);

    return placeholderValues.has(normalized.toLowerCase()) ? '' : normalized;
}

const redisMiddleware = createRedisMiddleware({
    getClient: () => redisClient,
    isAvailable: () => redisAvailable,
});

process.on('unhandledRejection', (reason) => {
    console.error('[Process] 未处理的 Promise 拒绝:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('[Process] 未捕获异常:', error);
});

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || FRONTEND_URLS.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json({ limit: '1000mb' }));
app.use(express.urlencoded({ extended: true, limit: '1000mb' }));
app.use(redisMiddleware);

app.use(
    compression({
        level: 6,
        threshold: 1024,
        filter: (req, res) => {
            if (req.headers['x-no-compression']) {
                return false;
            }

            const requestPath = req.path || req.originalUrl || '';
            const disableCompressionForApi = requestPath === '/health'
                || requestPath === '/api/health'
                || requestPath.startsWith('/api/');

            if (disableCompressionForApi) {
                return false;
            }

            return compression.filter(req, res);
        },
    }),
);

app.use((req, res, next) => {
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('X-Frame-Options', 'SAMEORIGIN');
    res.set('X-XSS-Protection', '1; mode=block');
    res.set('X-DNS-Prefetch-Control', 'on');
    res.set('Connection', 'keep-alive');
    res.set('Keep-Alive', 'timeout=5, max=100');
    next();
});

app.get('/', (req, res) => {
    res.json({
        success: true,
        service: 'health-guardian-backend',
        message: '后端 API 服务运行正常，请通过前端页面访问系统。',
        frontend: FRONTEND_URLS[0] || 'https://www.example.invalid',
        apiBase: '/api',
        timestamp: new Date().toISOString(),
    });
});

app.get('/.well-known/appspecific/com.chrome.devtools.json', (req, res) => {
    res.status(204).end();
});

app.get('/health', (req, res) => {
    res.json({
        success: true,
        status: isDatabaseAvailable && redisAvailable ? 'ok' : 'degraded',
        service: 'health-guardian-backend',
        services: {
            database: isDatabaseAvailable ? 'connected' : 'disconnected',
            redis: redisAvailable ? 'connected' : 'disconnected',
        },
        timestamp: new Date().toISOString(),
    });
});

function isConfiguredSecret(value, placeholders = []) {
    const normalizedValue = String(value || '').trim();
    if (!normalizedValue) {
        return false;
    }

    const normalizedPlaceholders = new Set([
        'REDACTED',
        ...placeholders,
    ].map(item => String(item || '').trim()).filter(Boolean));

    if (normalizedPlaceholders.has(normalizedValue)) {
        return false;
    }

    return !/^your[-_a-z0-9]*api[-_a-z0-9]*key$/i.test(normalizedValue)
        && !/^replace-with-/i.test(normalizedValue);
}

function buildHealthApiResponse() {
    const aiProviders = dataStore.adminSettings.ai.providers;
    const aiProvidersStatus = {};
    const aiServicesStatus = {};

    for (const [provider, config] of Object.entries(aiProviders)) {
        const hasApiKey = isConfiguredSecret(config.apiKey);

        aiProvidersStatus[provider] = {
            enabled: Boolean(config.enabled),
            name: config.name,
            configured: hasApiKey,
            status: hasApiKey ? AI_PROVIDER_HEALTH.healthy : AI_PROVIDER_HEALTH.missing_key,
        };

        aiServicesStatus[provider] = {
            enabled: Boolean(config.enabled),
            name: config.name,
            hasApiKey: config.apiKey || '',
        };
    }

    const hasHealthyAiProvider = Object.values(aiProvidersStatus).some(provider => provider.status === AI_PROVIDER_HEALTH.healthy);

    return {
        status: isDatabaseAvailable ? 'healthy' : 'degraded',
        version: API_VERSION,
        services: {
            database: isDatabaseAvailable ? 'connected' : 'disconnected',
            redis: redisAvailable ? 'connected' : 'disconnected',
            ai: hasHealthyAiProvider ? 'available' : 'unavailable',
        },
        ai: {
            configured: hasHealthyAiProvider,
            providers: aiProvidersStatus,
        },
        aiServices: aiServicesStatus,
        timestamp: new Date().toISOString(),
    };
}

const dataStore = {
    users: [
        {
            id: 'user_001',
            username: 'testuser',
            password: '',
            email: 'contact@example.invalid',
            nickname: '测试用户',
            avatar: null,
            phone: '00000000000',
            gender: '男',
            birthDate: '1990-01-01',
            province: '北京市',
            city: '北京市',
            address: '朝阳区建国路88号',
            role: 'user',
            adminRole: null,
            status: 'active',
            createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date().toISOString(),
            lastLoginAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
            id: 'user_002',
            username: 'zhangwei',
            password: '',
            email: 'contact@example.invalid',
            nickname: '张伟',
            avatar: null,
            phone: '00000000000',
            gender: '男',
            birthDate: '1985-05-15',
            province: '上海市',
            city: '上海市',
            address: '浦东新区陆家嘴',
            role: 'user',
            adminRole: null,
            status: 'active',
            createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date().toISOString(),
            lastLoginAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        },
    ],
    hospitals: [
        {
            id: 'hospital_001',
            username: 'hospital1',
            password: '',
            name: '北京协和医院',
            province: '北京市',
            city: '北京市',
            address: '东城区帅府园1号',
            phone: '010-69156114',
            email: 'contact@example.invalid',
            level: '三甲',
            beds: 2000,
            lat: 39.913818,
            lng: 116.410528,
            rating: 4.9,
            reviewCount: 1520,
            features: ['内科', '外科', '妇产科', '儿科'],
            businessHours: '08:00-17:00',
            emergency: true,
            role: 'hospital',
            status: 'active',
            authCodeUsed: 'AUTH123',
            createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date().toISOString(),
            lastLoginAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
            id: 'hospital_002',
            username: 'hospital2',
            password: '',
            name: '北京大学人民医院',
            province: '北京市',
            city: '北京市',
            address: '西城区西直门南大街11号',
            phone: '010-88326666',
            email: 'contact@example.invalid',
            level: '三甲',
            beds: 1800,
            lat: 39.915374,
            lng: 116.358046,
            rating: 4.8,
            reviewCount: 1200,
            features: ['内科', '外科', '骨科', '心血管'],
            businessHours: '08:00-17:30',
            emergency: true,
            role: 'hospital',
            status: 'active',
            authCodeUsed: 'AUTH456',
            createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date().toISOString(),
            lastLoginAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
            id: 'hospital_003',
            username: 'hospital3',
            password: '',
            name: '北京朝阳医院',
            province: '北京市',
            city: '北京市',
            address: '朝阳区工人体育场南路8号',
            phone: '010-85231000',
            email: 'contact@example.invalid',
            level: '三甲',
            beds: 1600,
            lat: 39.921643,
            lng: 116.453038,
            rating: 4.7,
            reviewCount: 1000,
            features: ['呼吸科', '消化科', '急诊科'],
            businessHours: '00:00-24:00',
            emergency: true,
            role: 'hospital',
            status: 'active',
            authCodeUsed: 'AUTH789',
            createdAt: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date().toISOString(),
            lastLoginAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
            id: 'hospital_004',
            username: 'hospital4',
            password: '',
            name: '上海瑞金医院',
            province: '上海市',
            city: '上海市',
            address: '黄浦区瑞金二路197号',
            phone: '021-64370045',
            email: 'contact@example.invalid',
            level: '三甲',
            beds: 1900,
            lat: 31.213500,
            lng: 121.456000,
            rating: 4.8,
            reviewCount: 1300,
            features: ['内科', '外科', '心血管科'],
            businessHours: '08:00-17:30',
            emergency: true,
            role: 'hospital',
            status: 'active',
            authCodeUsed: 'AUTH012',
            createdAt: new Date(Date.now() - 70 * 24 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date().toISOString(),
            lastLoginAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
            id: 'hospital_005',
            username: 'hospital5',
            password: '',
            name: '复旦大学附属中山医院',
            province: '上海市',
            city: '上海市',
            address: '徐汇区枫林路180号',
            phone: '021-64041990',
            email: 'contact@example.invalid',
            level: '三甲',
            beds: 2000,
            lat: 31.195000,
            lng: 121.445000,
            rating: 4.9,
            reviewCount: 1450,
            features: ['心内科', '肝外科', '普外科'],
            businessHours: '08:00-17:00',
            emergency: true,
            role: 'hospital',
            status: 'active',
            authCodeUsed: 'AUTH345',
            createdAt: new Date(Date.now() - 80 * 24 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date().toISOString(),
            lastLoginAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
            id: 'hospital_006',
            username: 'hospital6',
            password: '',
            name: '广东省人民医院',
            province: '广东省',
            city: '广州市',
            address: '越秀区中山二路106号',
            phone: '020-83827812',
            email: 'contact@example.invalid',
            level: '三甲',
            beds: 2300,
            lat: 23.128000,
            lng: 113.272000,
            rating: 4.8,
            reviewCount: 1100,
            features: ['心内科', '心外科', '老年医学'],
            businessHours: '08:00-17:30',
            emergency: true,
            role: 'hospital',
            status: 'active',
            authCodeUsed: 'AUTH678',
            createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date().toISOString(),
            lastLoginAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
            id: 'hospital_007',
            username: 'hospital7',
            password: '',
            name: '中山大学附属第一医院',
            province: '广东省',
            city: '广州市',
            address: '越秀区中山二路58号',
            phone: '020-87755766',
            email: 'contact@example.invalid',
            level: '三甲',
            beds: 2500,
            lat: 23.129000,
            lng: 113.275000,
            rating: 4.9,
            reviewCount: 1600,
            features: ['肾内科', '普外科', '神经科'],
            businessHours: '08:00-17:00',
            emergency: true,
            role: 'hospital',
            status: 'active',
            authCodeUsed: 'AUTH901',
            createdAt: new Date(Date.now() - 55 * 24 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date().toISOString(),
            lastLoginAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
            id: 'hospital_008',
            username: 'hospital8',
            password: '',
            name: '浙江大学医学院附属第一医院',
            province: '浙江省',
            city: '杭州市',
            address: '上城区庆春路79号',
            phone: '0571-87236666',
            email: 'contact@example.invalid',
            level: '三甲',
            beds: 2200,
            lat: 30.263000,
            lng: 120.168000,
            rating: 4.8,
            reviewCount: 1250,
            features: ['传染病科', '肝胆胰外科', '血液病科'],
            businessHours: '08:00-17:30',
            emergency: true,
            role: 'hospital',
            status: 'active',
            authCodeUsed: 'AUTH234',
            createdAt: new Date(Date.now() - 65 * 24 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date().toISOString(),
            lastLoginAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
            id: 'hospital_009',
            username: 'hospital9',
            password: '',
            name: '四川大学华西医院',
            province: '四川省',
            city: '成都市',
            address: '武侯区国学巷37号',
            phone: '028-85422114',
            email: 'contact@example.invalid',
            level: '三甲',
            beds: 4500,
            lat: 30.657000,
            lng: 104.065000,
            rating: 4.9,
            reviewCount: 1700,
            features: ['骨科', '普外科', '神经外科'],
            businessHours: '08:00-17:00',
            emergency: true,
            role: 'hospital',
            status: 'active',
            authCodeUsed: 'AUTH567',
            createdAt: new Date(Date.now() - 75 * 24 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date().toISOString(),
            lastLoginAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
            id: 'hospital_010',
            username: 'hospital10',
            password: '',
            name: '武汉同济医院',
            province: '湖北省',
            city: '武汉市',
            address: '硚口区解放大道1095号',
            phone: '027-83662688',
            email: 'contact@example.invalid',
            level: '三甲',
            beds: 3000,
            lat: 30.587000,
            lng: 114.261000,
            rating: 4.8,
            reviewCount: 1350,
            features: ['妇产科', '泌尿外科', '心内科'],
            businessHours: '08:00-17:30',
            emergency: true,
            role: 'hospital',
            status: 'active',
            authCodeUsed: 'AUTH890',
            createdAt: new Date(Date.now() - 85 * 24 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date().toISOString(),
            lastLoginAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        },
    ],
    admins: [
        {
            id: 'admin_001',
            username: 'admin',
            password: '',
            email: 'contact@example.invalid',
            nickname: '系统管理员',
            phone: '400-123-4567',
            avatar: null,
            role: 'admin',
            province: null,
            permissions: ['all'],
            status: 'active',
            createdBy: 'system',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            lastLoginAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        },
        {
            id: 'subadmin_001',
            username: 'beijing_admin',
            password: '',
            email: 'contact@example.invalid',
            nickname: '北京管理员',
            phone: '010-12345678',
            avatar: null,
            role: 'sub',
            province: '北京市',
            permissions: ['users', 'hospitals'],
            status: 'active',
            createdBy: 'admin_001',
            createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date().toISOString(),
            lastLoginAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        },
        {
            id: 'subadmin_002',
            username: 'shanghai_admin',
            password: '',
            email: 'contact@example.invalid',
            nickname: '上海管理员',
            phone: '021-12345678',
            avatar: null,
            role: 'sub',
            province: '上海市',
            permissions: ['users', 'hospitals'],
            status: 'active',
            createdBy: 'admin_001',
            createdAt: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date().toISOString(),
            lastLoginAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
        },
        {
            id: 'subadmin_003',
            username: 'guangdong_admin',
            password: '',
            email: 'contact@example.invalid',
            nickname: '广东管理员',
            phone: '020-12345678',
            avatar: null,
            role: 'sub',
            province: '广东省',
            permissions: ['users', 'hospitals'],
            status: 'active',
            createdBy: 'admin_001',
            createdAt: new Date(Date.now() - 26 * 24 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date().toISOString(),
            lastLoginAt: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
        },
        {
            id: 'subadmin_004',
            username: 'zhejiang_admin',
            password: '',
            email: 'contact@example.invalid',
            nickname: '浙江管理员',
            phone: '0571-12345678',
            avatar: null,
            role: 'sub',
            province: '浙江省',
            permissions: ['users', 'hospitals'],
            status: 'active',
            createdBy: 'admin_001',
            createdAt: new Date(Date.now() - 24 * 24 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date().toISOString(),
            lastLoginAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        },
        {
            id: 'subadmin_005',
            username: 'jiangsu_admin',
            password: '',
            email: 'contact@example.invalid',
            nickname: '江苏管理员',
            phone: '025-12345678',
            avatar: null,
            role: 'sub',
            province: '江苏省',
            permissions: ['users', 'hospitals'],
            status: 'active',
            createdBy: 'admin_001',
            createdAt: new Date(Date.now() - 22 * 24 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date().toISOString(),
            lastLoginAt: new Date(Date.now() - 14 * 60 * 60 * 1000).toISOString(),
        },
        {
            id: 'subadmin_006',
            username: 'sichuan_admin',
            password: '',
            email: 'contact@example.invalid',
            nickname: '四川管理员',
            phone: '028-12345678',
            avatar: null,
            role: 'sub',
            province: '四川省',
            permissions: ['users', 'hospitals'],
            status: 'active',
            createdBy: 'admin_001',
            createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date().toISOString(),
            lastLoginAt: new Date(Date.now() - 16 * 60 * 60 * 1000).toISOString(),
        },
        {
            id: 'subadmin_007',
            username: 'hubei_admin',
            password: '',
            email: 'contact@example.invalid',
            nickname: '湖北管理员',
            phone: '027-12345678',
            avatar: null,
            role: 'sub',
            province: '湖北省',
            permissions: ['users', 'hospitals'],
            status: 'active',
            createdBy: 'admin_001',
            createdAt: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date().toISOString(),
            lastLoginAt: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
        },
        {
            id: 'subadmin_008',
            username: 'shandong_admin',
            password: '',
            email: 'contact@example.invalid',
            nickname: '山东管理员',
            phone: '0531-12345678',
            avatar: null,
            role: 'sub',
            province: '山东省',
            permissions: ['users', 'hospitals'],
            status: 'active',
            createdBy: 'admin_001',
            createdAt: new Date(Date.now() - 16 * 24 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date().toISOString(),
            lastLoginAt: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(),
        },
        {
            id: 'subadmin_009',
            username: 'henan_admin',
            password: '',
            email: 'contact@example.invalid',
            nickname: '河南管理员',
            phone: '0371-12345678',
            avatar: null,
            role: 'sub',
            province: '河南省',
            permissions: ['users', 'hospitals'],
            status: 'active',
            createdBy: 'admin_001',
            createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date().toISOString(),
            lastLoginAt: new Date(Date.now() - 22 * 60 * 60 * 1000).toISOString(),
        },
        {
            id: 'subadmin_010',
            username: 'fujian_admin',
            password: '',
            email: 'contact@example.invalid',
            nickname: '福建管理员',
            phone: '0591-12345678',
            avatar: null,
            role: 'sub',
            province: '福建省',
            permissions: ['users', 'hospitals'],
            status: 'active',
            createdBy: 'admin_001',
            createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date().toISOString(),
            lastLoginAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        },
        {
            id: 'subadmin_011',
            username: 'shanxi_admin',
            password: '',
            email: 'contact@example.invalid',
            nickname: '陕西管理员',
            phone: '029-12345678',
            avatar: null,
            role: 'sub',
            province: '陕西省',
            permissions: ['users', 'hospitals'],
            status: 'active',
            createdBy: 'admin_001',
            createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date().toISOString(),
            lastLoginAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        },
    ],
    authCodes: [
        {
            id: 'auth_001',
            code: 'AUTH123',
            province: '北京市',
            used: true,
            usedAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
            usedBy: 'hospital1',
            status: 'revoked',
            createdAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
            id: 'auth_002',
            code: 'AUTH456',
            province: '上海市',
            used: true,
            usedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
            usedBy: 'hospital2',
            status: 'revoked',
            createdAt: new Date(Date.now() - 70 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
            id: 'auth_003',
            code: 'AUTH789',
            province: '广东省',
            used: false,
            usedAt: null,
            usedBy: null,
            status: 'active',
            createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        },
    ],
    healthData: [
        {
            id: 'health_001',
            userId: 'user_001',
            date: '2026-04-11',
            heartRate: 72,
            bloodPressure: '120/80',
            bloodPressureSystolic: 120,
            bloodPressureDiastolic: 80,
            steps: 8500,
            sleepHours: 7.5,
            sleepDeepHours: 2.5,
            sleepLightHours: 4.0,
            sleepRemHours: 1.0,
            weight: 68.5,
            height: 175,
            bmi: 22.4,
            caloriesBurned: 450,
            caloriesIntake: 1800,
            waterIntake: 2000,
            temperature: 36.5,
            oxygenSaturation: 98,
            source: 'manual',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        },
        {
            id: 'health_002',
            userId: 'user_001',
            date: '2026-04-10',
            heartRate: 70,
            bloodPressure: '118/78',
            bloodPressureSystolic: 118,
            bloodPressureDiastolic: 78,
            steps: 9200,
            sleepHours: 8.0,
            sleepDeepHours: 3.0,
            sleepLightHours: 4.0,
            sleepRemHours: 1.0,
            weight: 68.5,
            height: 175,
            bmi: 22.4,
            caloriesBurned: 500,
            caloriesIntake: 1750,
            waterIntake: 1900,
            temperature: 36.6,
            oxygenSaturation: 98,
            source: 'manual',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        },
    ],
    appointments: [],
    notifications: [
        {
            id: 'notification_001',
            userId: 'user_001',
            title: '欢迎使用健康守护平台',
            content: '您已成功登录系统，后续可在此查看预约提醒、咨询消息与活动通知。',
            level: 'info',
            type: 'system',
            appointmentId: null,
            appointmentNumber: null,
            isRead: false,
            read: false,
            createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        },
    ],
    consultations: [
        {
            id: 'consult_001',
            hospitalId: 'hospital_001',
            hospitalName: '北京协和医院',
            userId: 'user_001',
            userName: '测试用户',
            doctor: '李医生',
            department: '内科',
            subject: '最近头痛伴随轻微发热，是否需要到院检查？',
            summary: '最近头痛伴随轻微发热，是否需要到院检查？',
            status: 'completed',
            rating: 5,
            feedback: '医生回复及时，建议明确。',
            hospitalLastReadAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
            userLastReadAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
            startTime: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
            endTime: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
            lastMessageAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
            updatedAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
        },
    ],
    consultationMessages: [
        {
            id: 'consult_msg_001',
            consultationId: 'consult_001',
            senderRole: 'user',
            senderId: 'user_001',
            senderName: '测试用户',
            content: '医生您好，我这两天头痛，还有一点低烧，需要尽快去医院吗？',
            type: 'text',
            createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
        },
        {
            id: 'consult_msg_002',
            consultationId: 'consult_001',
            senderRole: 'hospital',
            senderId: 'hospital_001',
            senderName: '北京协和医院',
            content: '建议先监测体温，如果持续发热或伴随明显乏力、咳嗽，请尽快到院就诊。',
            type: 'text',
            createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        },
    ],
    userMedia: [],
    operationLogs: [],
    userNotifications: [],
    sessions: new Map(),
    apiMonitoring: [],
    smartDevices: [],
    aiSettings: {
        enabled: true,
        provider: 'deepseek',
        apiKey: '',
        model: 'gpt-4',
        temperature: 0.7,
        maxTokens: 2000,
    },
    adminSettings: {
        ai: {
            providers: {
                deepseek: { enabled: true, name: 'DeepSeek', apiKey: '' },
                openai: { enabled: true, name: 'OpenAI', apiKey: '' }
            }
        },
        location: {
            providers: {
                amap: { enabled: true, name: '高德地图', apiKey: '' }
            }
        },
        smartDevices: {
            fitbit: { enabled: true, name: 'Fitbit', apiKey: '', apiSecret: '' }
        }
    },
    userSettings: {},
    aiModuleHistory: [],
    aiModuleQuestionTypes: [
        { id: 'qt_001', type_code: 'general', type_name: '健康咨询', api_name: '通用健康助手', promptHint: '提供一般健康建议' },
        { id: 'qt_002', type_code: 'diet', type_name: '饮食建议', api_name: '饮食助手', promptHint: '提供饮食与营养建议' },
        { id: 'qt_003', type_code: 'medication', type_name: '用药指导', api_name: '用药助手', promptHint: '提供安全用药建议' },
        { id: 'qt_004', type_code: 'exercise', type_name: '运动康复', api_name: '运动助手', promptHint: '提供运动与恢复建议' },
        { id: 'qt_005', type_code: 'mental', type_name: '心理支持', api_name: '心理助手', promptHint: '提供情绪与心理支持建议' },
    ],
    fitbitTokens: new Map(),
    fitbitAuthStates: new Map(),
    tuyaTokens: new Map(),
};

const featureConfig = {
    aiService: { enabled: true, name: 'AI健康服务', description: 'AI健康咨询、用药指导等功能' },
    smartDevice: { enabled: true, name: '智能设备连接', description: 'Fitbit等智能设备数据同步' },
    onlineHospital: { enabled: true, name: '在线医院', description: '在线预约、就诊服务' },
    healthDiet: { enabled: true, name: '健康饮食', description: '饮食计划、营养追踪' },
    healthData: { enabled: true, name: '健康数据', description: '健康数据可视化分析' },
};

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

async function initializeRedisMiddlewareClient() {
    if (redisAvailable || redisClient) {
        return;
    }

    const host = process.env.REDIS_HOST || '127.0.0.1';
    const port = Number(process.env.REDIS_PORT || 6379);
    const password = sanitizeOptionalEnvValue(process.env.REDIS_PASSWORD);

    const client = createClient({
        socket: {
            host,
            port,
            connectTimeout: 2000,
            reconnectStrategy: false,
        },
        password: password || undefined,
    });

    client.on('error', (error) => {
        console.error('[Redis] 连接错误:', error.message);
    });

    try {
        await client.connect();
        await client.ping();
        redisClient = client;
        redisAvailable = true;
        console.log(`✅ Redis 中间件已连接: ${host}:${port}`);
    } catch (error) {
        console.warn(`[Redis] 中间件连接失败，继续以降级模式运行: ${error.message}`);
        try {
            client.destroy();
        } catch {
            // ignore destroy error
        }
    }
}

function getSession(req) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return null;
    return dataStore.sessions.get(token) || null;
}

async function revokeSessionsByUserId(userId, role = null) {
    if (!userId) {
        return;
    }

    for (const [token, session] of dataStore.sessions.entries()) {
        if (session.userId === userId && (!role || session.role === role)) {
            dataStore.sessions.delete(token);
        }
    }

    const query = role
        ? 'DELETE FROM sessions WHERE user_id = $1 AND role = $2'
        : 'DELETE FROM sessions WHERE user_id = $1';
    const params = role ? [userId, role] : [userId];
    await pool.query(query, params);
}

async function persistMentalHealthChatRecord({ userId, userMessage, aiReply }) {
    if (!userId || !userMessage || !aiReply) {
        return null;
    }

    const result = await pool.query(
        `INSERT INTO mental_health_chat_history (id, user_id, user_message, ai_reply)
         VALUES ($1, $2, $3, $4)
         RETURNING id, user_id, user_message, ai_reply, created_at`,
        [
            `mh_chat_${generateId()}`,
            userId,
            userMessage,
            aiReply,
        ],
    );

    const row = result.rows[0];
    return {
        id: row.id,
        userId: row.user_id,
        userMessage: row.user_message,
        aiReply: row.ai_reply,
        timestamp: row.created_at,
    };
}

function successResponse(res, data, message = '操作成功') {
    res.json({
        success: true,
        data,
        message,
        timestamp: new Date().toISOString(),
    });
}

function mapNotificationRow(row) {
    if (!row) {
        return null;
    }

    return {
        id: row.id,
        userId: row.user_id,
        title: row.title,
        content: row.content,
        level: row.level || 'info',
        type: row.type || 'general',
        appointmentId: row.appointment_id || null,
        appointmentNumber: row.appointment_number || null,
        isRead: Boolean(row.is_read || row.read),
        read: Boolean(row.is_read || row.read),
        createdAt: row.created_at,
        updatedAt: row.updated_at || row.created_at,
    };
}

function errorResponse(res, errorCode, message, details = null, statusCode = 400) {
    res.status(statusCode).json({
        success: false,
        error: {
            code: errorCode,
            message,
            details,
            suggestion: null,
        },
        timestamp: new Date().toISOString(),
    });
}

function paginate(list, page = 1, pageSize = 30) {
    page = Math.max(1, parseInt(page) || 1);
    pageSize = Math.min(100, Math.max(1, parseInt(pageSize) || 30));
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const listSlice = list.slice(startIndex, endIndex);
    const total = list.length;
    const totalPages = Math.ceil(total / pageSize);
    return {
        list: listSlice,
        total,
        page,
        pageSize,
        totalPages,
    };
}

async function ensureDatabaseTables() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
            id VARCHAR(50) PRIMARY KEY,
            username VARCHAR(50) NOT NULL UNIQUE,
            password_hash VARCHAR(255) NOT NULL,
            email VARCHAR(100) UNIQUE,
            nickname VARCHAR(50),
            avatar TEXT,
            phone VARCHAR(20),
            gender VARCHAR(10),
            age INTEGER,
            height DECIMAL(5, 1),
            weight DECIMAL(5, 1),
            birth_date DATE,
            province VARCHAR(50),
            city VARCHAR(50),
            address TEXT,
            role VARCHAR(20) NOT NULL DEFAULT 'user',
            status VARCHAR(20) NOT NULL DEFAULT 'active',
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
            last_login_at TIMESTAMP WITH TIME ZONE
        )
    `);

    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS age INTEGER');
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS height DECIMAL(5, 1)');
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS weight DECIMAL(5, 1)');

    await pool.query(`
        CREATE TABLE IF NOT EXISTS hospitals (
            id VARCHAR(50) PRIMARY KEY,
            username VARCHAR(50) NOT NULL UNIQUE,
            password_hash VARCHAR(255) NOT NULL,
            name VARCHAR(100) NOT NULL,
            province VARCHAR(50) NOT NULL,
            city VARCHAR(50) NOT NULL,
            address TEXT,
            phone VARCHAR(20),
            email VARCHAR(100),
            avatar TEXT,
            level VARCHAR(20),
            beds INTEGER,
            lat DECIMAL(10, 7),
            lng DECIMAL(10, 7),
            rating DECIMAL(3, 1) DEFAULT 0.0,
            review_count INTEGER DEFAULT 0,
            features TEXT[],
            business_hours VARCHAR(50),
            emergency BOOLEAN DEFAULT false,
            role VARCHAR(20) NOT NULL DEFAULT 'hospital',
            status VARCHAR(20) NOT NULL DEFAULT 'active',
            auth_code_used VARCHAR(50),
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
            last_login_at TIMESTAMP WITH TIME ZONE
        )
    `);

    await pool.query('ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS avatar TEXT');
    await pool.query('ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS welcome_message TEXT');

    await pool.query(`
        CREATE TABLE IF NOT EXISTS admins (
            id VARCHAR(50) PRIMARY KEY,
            username VARCHAR(50) NOT NULL UNIQUE,
            password_hash VARCHAR(255) NOT NULL,
            email VARCHAR(100) UNIQUE,
            avatar TEXT,
            role VARCHAR(20) NOT NULL,
            province VARCHAR(50),
            permissions TEXT[],
            status VARCHAR(20) NOT NULL DEFAULT 'active',
            created_by VARCHAR(50),
            nickname VARCHAR(50),
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
            last_login_at TIMESTAMP WITH TIME ZONE,
            updated_by VARCHAR(50)
        )
    `);

    await pool.query('ALTER TABLE admins ADD COLUMN IF NOT EXISTS avatar TEXT');

    await pool.query(`
        CREATE TABLE IF NOT EXISTS auth_codes (
            id VARCHAR(50) PRIMARY KEY,
            code VARCHAR(50) NOT NULL UNIQUE,
            province VARCHAR(50) NOT NULL,
            used BOOLEAN DEFAULT false,
            used_at TIMESTAMP WITH TIME ZONE,
            used_by VARCHAR(50),
            status VARCHAR(20) NOT NULL DEFAULT 'active',
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS user_media (
            id VARCHAR(50) PRIMARY KEY,
            user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            url TEXT NOT NULL,
            filename VARCHAR(255),
            file_type VARCHAR(50),
            file_size INTEGER,
            mime_type VARCHAR(100),
            is_public BOOLEAN DEFAULT false,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS operation_logs (
            id VARCHAR(50) PRIMARY KEY,
            user_id VARCHAR(50),
            username VARCHAR(50),
            role VARCHAR(20),
            action VARCHAR(100) NOT NULL,
            module VARCHAR(100) NOT NULL,
            details TEXT,
            ip_address VARCHAR(50),
            user_agent TEXT,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS user_settings (
            user_id VARCHAR(50) PRIMARY KEY,
            settings_json JSONB NOT NULL DEFAULT '{}'::jsonb,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS sessions (
            token VARCHAR(255) PRIMARY KEY,
            user_id VARCHAR(50) NOT NULL,
            username VARCHAR(50) NOT NULL,
            role VARCHAR(20) NOT NULL,
            refresh_token VARCHAR(255),
            expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
            ip_address VARCHAR(50),
            user_agent TEXT
        )
    `);

    await pool.query('ALTER TABLE sessions ADD COLUMN IF NOT EXISTS refresh_token VARCHAR(255)');
    await pool.query('ALTER TABLE sessions ADD COLUMN IF NOT EXISTS ip_address VARCHAR(50)');
    await pool.query('ALTER TABLE sessions ADD COLUMN IF NOT EXISTS user_agent TEXT');
    await pool.query('ALTER TABLE sessions ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP');

    await pool.query(`
        CREATE TABLE IF NOT EXISTS mental_health_chat_history (
            id VARCHAR(50) PRIMARY KEY,
            user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            user_message TEXT NOT NULL,
            ai_reply TEXT NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_mental_health_chat_history_user_id
        ON mental_health_chat_history (user_id)
    `);

    await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_mental_health_chat_history_created_at
        ON mental_health_chat_history (created_at DESC)
    `);

    await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_mental_health_chat_history_user_created_at
        ON mental_health_chat_history (user_id, created_at DESC)
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS health_data (
            id VARCHAR(50) PRIMARY KEY,
            user_id VARCHAR(50) NOT NULL,
            date DATE NOT NULL,
            heart_rate INTEGER,
            blood_pressure_systolic INTEGER,
            blood_pressure_diastolic INTEGER,
            steps INTEGER,
            sleep_hours DECIMAL(4, 1),
            sleep_deep_hours DECIMAL(4, 1),
            sleep_light_hours DECIMAL(4, 1),
            sleep_rem_hours DECIMAL(4, 1),
            weight DECIMAL(5, 1),
            height INTEGER,
            bmi DECIMAL(4, 1),
            calories_burned INTEGER,
            calories_intake INTEGER,
            water_intake INTEGER,
            temperature DECIMAL(3, 1),
            oxygen_saturation INTEGER,
            source VARCHAR(20) DEFAULT 'manual',
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, date)
        )
    `);

    await pool.query('ALTER TABLE health_data ADD COLUMN IF NOT EXISTS legacy_steps_migrated BOOLEAN NOT NULL DEFAULT false');
    await pool.query('ALTER TABLE health_data ADD COLUMN IF NOT EXISTS legacy_steps_original_value INTEGER');
    await pool.query('ALTER TABLE appointments ADD COLUMN IF NOT EXISTS reminder_minutes INTEGER DEFAULT 30');

    await pool.query(`
        UPDATE health_data
        SET
            steps = GREATEST(1, ROUND(steps / 100.0)),
            legacy_steps_migrated = true,
            legacy_steps_original_value = steps,
            updated_at = CURRENT_TIMESTAMP
        WHERE steps IS NOT NULL
          AND steps > 720
          AND COALESCE(legacy_steps_migrated, false) = false
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS appointments (
            id VARCHAR(50) PRIMARY KEY,
            appointment_number VARCHAR(50) NOT NULL UNIQUE,
            user_id VARCHAR(50) NOT NULL,
            username VARCHAR(50),
            hospital_id VARCHAR(50) NOT NULL,
            hospital_name VARCHAR(100) NOT NULL,
            department VARCHAR(50) NOT NULL,
            doctor VARCHAR(50),
            appointment_time TIMESTAMP WITH TIME ZONE NOT NULL,
            patient_name VARCHAR(50) NOT NULL,
            patient_id VARCHAR(50),
            patient_phone VARCHAR(20) NOT NULL,
            symptoms TEXT,
            notes TEXT,
            emergency_contact TEXT,
            reminder_minutes INTEGER DEFAULT 30,
            status VARCHAR(20) NOT NULL DEFAULT 'pending',
            cancel_reason TEXT,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    `);
    await pool.query(`
        CREATE TABLE IF NOT EXISTS system_settings (
            id VARCHAR(50) PRIMARY KEY,
            setting_key VARCHAR(100) NOT NULL UNIQUE,
            setting_value TEXT,
            setting_type VARCHAR(20) DEFAULT 'string',
            description TEXT,
            category VARCHAR(50),
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_by VARCHAR(50)
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS smart_devices (
            id VARCHAR(50) PRIMARY KEY,
            user_id VARCHAR(50) NOT NULL,
            device_type VARCHAR(50) NOT NULL,
            device_name VARCHAR(100),
            access_token TEXT,
            refresh_token TEXT,
            device_id VARCHAR(100),
            connected_at TIMESTAMP WITH TIME ZONE,
            last_sync_at TIMESTAMP WITH TIME ZONE,
            status VARCHAR(20) DEFAULT 'disconnected',
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS oauth_states (
            state VARCHAR(100) PRIMARY KEY,
            provider VARCHAR(50) NOT NULL,
            user_id VARCHAR(50) NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    `);
}

async function getSystemSetting(settingKey, fallbackValue = null) {
    const result = await pool.query(
        'SELECT setting_value, setting_type, updated_at, updated_by FROM system_settings WHERE setting_key = $1 LIMIT 1',
        [settingKey],
    );

    if (result.rows.length === 0) {
        return fallbackValue;
    }

    const row = result.rows[0];
    if (row.setting_type === 'json') {
        return JSON.parse(row.setting_value || 'null');
    }

    return row.setting_value;
}

async function getSmartDeviceRecord(userId, deviceType) {
    const result = await pool.query(
        'SELECT * FROM smart_devices WHERE user_id = $1 AND device_type = $2 LIMIT 1',
        [userId, deviceType],
    );
    return result.rows[0] || null;
}

async function upsertUserSmartDevice({ userId, deviceType, deviceName, accessToken = null, refreshToken = null, deviceId = null, status = 'connected' }) {
    const result = await pool.query(
        `INSERT INTO smart_devices (id, user_id, device_type, device_name, access_token, refresh_token, device_id, connected_at, last_sync_at, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, $8)
         ON CONFLICT (id)
         DO UPDATE SET
           access_token = COALESCE(EXCLUDED.access_token, smart_devices.access_token),
           refresh_token = COALESCE(EXCLUDED.refresh_token, smart_devices.refresh_token),
           device_id = COALESCE(EXCLUDED.device_id, smart_devices.device_id),
           device_name = COALESCE(EXCLUDED.device_name, smart_devices.device_name),
           last_sync_at = CURRENT_TIMESTAMP,
           status = EXCLUDED.status,
           updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [
            `${userId}_${deviceType}`,
            userId,
            deviceType,
            deviceName || deviceType,
            accessToken,
            refreshToken,
            deviceId,
            status,
        ],
    );

    return result.rows[0];
}

async function deleteOauthState(state, provider = null) {
    if (provider) {
        await pool.query('DELETE FROM oauth_states WHERE state = $1 AND provider = $2', [state, provider]);
        return;
    }
    await pool.query('DELETE FROM oauth_states WHERE state = $1', [state]);
}

async function loadOauthState(state, provider) {
    const result = await pool.query(
        'SELECT * FROM oauth_states WHERE state = $1 AND provider = $2 LIMIT 1',
        [state, provider],
    );
    return result.rows[0] || null;
}

async function createOauthState(state, provider, userId) {
    await pool.query(
        `INSERT INTO oauth_states (state, provider, user_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (state)
         DO UPDATE SET provider = EXCLUDED.provider, user_id = EXCLUDED.user_id, created_at = CURRENT_TIMESTAMP`,
        [state, provider, userId],
    );
}

async function upsertSystemSetting({ settingKey, value, settingType = 'json', category, description = null, updatedBy = null }) {
    const serializedValue = settingType === 'json' ? JSON.stringify(value) : String(value ?? '');

    await pool.query(
        `INSERT INTO system_settings (id, setting_key, setting_value, setting_type, description, category, updated_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (setting_key)
         DO UPDATE SET
           setting_value = EXCLUDED.setting_value,
           setting_type = EXCLUDED.setting_type,
           description = EXCLUDED.description,
           category = EXCLUDED.category,
           updated_by = EXCLUDED.updated_by,
           updated_at = CURRENT_TIMESTAMP`,
        [`setting_${generateId()}`, settingKey, serializedValue, settingType, description, category, updatedBy],
    );
}
async function loadPersistedSessions() {
    const result = await pool.query(
        'SELECT token, user_id, username, role, refresh_token, expires_at, created_at FROM sessions WHERE expires_at > CURRENT_TIMESTAMP'
    );

    dataStore.sessions.clear();
    for (const row of result.rows) {
        dataStore.sessions.set(row.token, {
            userId: row.user_id,
            username: row.username,
            role: row.role,
            token: row.token,
            refreshToken: row.refresh_token,
            expiresAt: row.expires_at,
            createdAt: row.created_at,
        });
    }
}

async function syncUsersFromDatabase() {
    const result = await pool.query(`
        SELECT
            id,
            username,
            password_hash,
            email,
            nickname,
            avatar,
            phone,
            gender,
            age,
            height,
            weight,
            birth_date,
            province,
            city,
            address,
            role,
            status,
            created_at,
            updated_at,
            last_login_at
        FROM users
        ORDER BY created_at ASC
    `);

    if (result.rows.length === 0) {
        return;
    }

    dataStore.users = result.rows.map((row) => ({
        id: row.id,
        username: row.username,
        password: row.password_hash,
        email: row.email,
        nickname: row.nickname,
        avatar: row.avatar,
        phone: row.phone,
        gender: row.gender,
        age: row.age !== null ? Number(row.age) : null,
        height: row.height !== null ? Number(row.height) : null,
        weight: row.weight !== null ? Number(row.weight) : null,
        birthDate: row.birth_date,
        province: row.province,
        city: row.city,
        address: row.address,
        role: row.role,
        adminRole: null,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        lastLoginAt: row.last_login_at,
    }));
}

async function syncHospitalsFromDatabase() {
    const result = await pool.query(`
        SELECT * FROM hospitals ORDER BY created_at ASC
    `);

    if (result.rows.length === 0) {
        return;
    }

    const dbHospitals = result.rows.map((row) => ({
        id: row.id,
        username: row.username,
        password: row.password_hash,
        name: row.name,
        province: row.province,
        city: row.city,
        address: row.address,
        phone: row.phone,
        email: row.email,
        avatar: row.avatar,
        level: row.level,
        beds: row.beds,
        lat: row.lat !== null ? Number(row.lat) : null,
        lng: row.lng !== null ? Number(row.lng) : null,
        rating: row.rating !== null ? Number(row.rating) : 0,
        reviewCount: row.review_count || 0,
        features: row.features || [],
        businessHours: row.business_hours,
        emergency: row.emergency,
        role: row.role,
        status: row.status,
        authCodeUsed: row.auth_code_used,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        lastLoginAt: row.last_login_at,
    }));

    if (dbHospitals.length > 0) {
        dataStore.hospitals = dbHospitals;
    }
}

async function syncAdminsFromDatabase() {
    const result = await pool.query(`
        SELECT * FROM admins ORDER BY created_at ASC
    `);

    if (result.rows.length === 0) {
        return;
    }

    const existingAdmins = Array.isArray(dataStore.admins) ? dataStore.admins : [];
    const dbAdmins = result.rows.map((row) => ({
        id: row.id,
        username: row.username,
        password: row.password_hash,
        email: row.email,
        avatar: row.avatar,
        role: row.role,
        province: row.province,
        permissions: row.permissions || [],
        status: row.status,
        createdBy: row.created_by,
        nickname: row.nickname,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        lastLoginAt: row.last_login_at,
        updatedBy: row.updated_by,
    }));

    const mergedAdmins = [...existingAdmins];
    dbAdmins.forEach((admin) => {
        const existingIndex = mergedAdmins.findIndex((item) => item.username === admin.username);
        if (existingIndex >= 0) {
            mergedAdmins[existingIndex] = {
                ...mergedAdmins[existingIndex],
                ...admin,
            };
        } else {
            mergedAdmins.push(admin);
        }
    });

    dataStore.admins = mergedAdmins;
}

async function syncAuthCodesFromDatabase() {
    const result = await pool.query('SELECT * FROM auth_codes ORDER BY created_at DESC');

    if (result.rows.length === 0) {
        return;
    }

    dataStore.authCodes = result.rows.map((row) => ({
        id: row.id,
        code: row.code,
        province: row.province,
        used: row.used,
        usedAt: row.used_at,
        usedBy: row.used_by,
        status: row.status,
        createdAt: row.created_at,
    }));
}

async function syncSystemSettingsFromDatabase() {
    const [aiSettings, locationSettings, smartDevicesSettings] = await Promise.all([
        getSystemSetting('admin.ai-settings', dataStore.aiSettings),
        getSystemSetting('admin.location-settings', dataStore.adminSettings.location),
        getSystemSetting('admin.smart-devices-settings', dataStore.adminSettings.smartDevices),
    ]);

    if (aiSettings) {
        dataStore.aiSettings = aiSettings;
    }

    if (locationSettings) {
        dataStore.adminSettings.location = locationSettings;
    }

    if (smartDevicesSettings) {
        dataStore.adminSettings.smartDevices = smartDevicesSettings;
    }
}

function formatDateOnly(value) {
    if (!value) {
        return value;
    }

    if (typeof value === 'string') {
        return value.includes('T') ? value.split('T')[0] : value;
    }

    if (value instanceof Date) {
        const year = value.getFullYear();
        const month = String(value.getMonth() + 1).padStart(2, '0');
        const day = String(value.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    return String(value).split('T')[0];
}

function mapHealthRowToResponse(row) {
    if (!row) {
        return null;
    }

    const systolic = row.blood_pressure_systolic;
    const diastolic = row.blood_pressure_diastolic;
    const metadata = {};
    if (row.legacy_steps_migrated) {
        metadata.legacyStepsMigrated = true;
        metadata.legacyStepsOriginalValue = row.legacy_steps_original_value;
    }

    return {
        id: row.id,
        userId: row.user_id,
        date: formatDateOnly(row.date),
        heartRate: row.heart_rate,
        bloodPressure: systolic !== null && diastolic !== null ? `${systolic}/${diastolic}` : null,
        bloodPressureSystolic: systolic,
        bloodPressureDiastolic: diastolic,
        steps: row.steps,
        sleepHours: row.sleep_hours !== null ? Number(row.sleep_hours) : null,
        sleepDeepHours: row.sleep_deep_hours !== null ? Number(row.sleep_deep_hours) : null,
        sleepLightHours: row.sleep_light_hours !== null ? Number(row.sleep_light_hours) : null,
        sleepRemHours: row.sleep_rem_hours !== null ? Number(row.sleep_rem_hours) : null,
        weight: row.weight !== null ? Number(row.weight) : null,
        height: row.height,
        bmi: row.bmi !== null ? Number(row.bmi) : null,
        caloriesBurned: row.calories_burned,
        caloriesIntake: row.calories_intake,
        waterIntake: row.water_intake,
        temperature: row.temperature !== null ? Number(row.temperature) : null,
        oxygenSaturation: row.oxygen_saturation,
        source: row.source,
        metadata,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

function mapAppointmentRow(row) {
    if (!row) {
        return null;
    }

    const patientName = row.patient_name || row.username || '';
    const patientPhone = row.patient_phone || row.phone || '';

    return {
        id: row.id,
        appointmentNumber: row.appointment_number,
        userId: row.user_id,
        username: row.username,
        userName: patientName,
        userNickname: patientName,
        userPhone: patientPhone,
        hospitalId: row.hospital_id,
        hospitalName: row.hospital_name,
        department: row.department,
        doctor: row.doctor,
        appointmentTime: row.appointment_time,
        patientName,
        patientId: row.patient_id,
        patientPhone: patientPhone,
        symptoms: row.symptoms,
        notes: row.notes,
        emergencyContact: row.emergency_contact,
        reminderMinutes: row.reminder_minutes ?? 30,
        status: row.status,
        cancelReason: row.cancel_reason,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

function mapConsultationItem(item) {
    if (!item) {
        return null;
    }

    const hospitalRecord = dataStore.hospitals.find(hospital => hospital.id === item.hospitalId);
    const userRecord = dataStore.users.find(user => user.id === item.userId);
    const startTime = item.startTime || item.createdAt || item.updatedAt || item.lastMessageAt || new Date().toISOString();
    const endTime = item.endTime || item.endedAt || null;
    const duration = startTime && endTime
        ? Math.max(1, Math.round((new Date(endTime) - new Date(startTime)) / 60000))
        : item.duration || 0;

    return {
        id: item.id,
        hospitalId: item.hospitalId,
        hospitalName: item.hospitalName || '',
        hospitalAvatar: item.hospitalAvatar || hospitalRecord?.avatar || '',
        userId: item.userId,
        userName: item.userName,
        userAvatar: item.userAvatar || userRecord?.avatar || '',
        doctor: item.doctor || '',
        department: item.department || '',
        subject: item.subject || '',
        summary: item.summary || item.subject || '',
        status: item.status || 'consulting',
        rating: item.rating ?? null,
        feedback: item.feedback || '',
        startTime,
        endTime,
        duration,
        hasUnread: Boolean(item.hasUnread),
        unreadCount: Number(item.unreadCount || 0),
        hospitalLastReadAt: item.hospitalLastReadAt || null,
        userLastReadAt: item.userLastReadAt || null,
        lastMessageAt: item.lastMessageAt || item.updatedAt || startTime,
        updatedAt: item.updatedAt || item.lastMessageAt || startTime,
        messages: Array.isArray(item.messages) ? item.messages.map(mapConsultationMessage) : undefined,
    };
}

function countUnreadConsultationMessages(consultationId, senderRole, readAt = null) {
    const readTimestamp = readAt ? new Date(readAt).getTime() : 0;
    return dataStore.consultationMessages.filter(item => (
        item.consultationId === consultationId
        && item.senderRole === senderRole
        && new Date(item.createdAt).getTime() > readTimestamp
    )).length;
}

function mapConsultationMessage(item) {
    if (!item) {
        return null;
    }

    const timestamp = item.createdAt || new Date().toISOString();
    const sender = item.sender || (item.senderRole === 'hospital' ? 'hospital' : 'user');

    return {
        id: item.id,
        consultationId: item.consultationId,
        sender,
        senderRole: item.senderRole,
        senderId: item.senderId,
        senderName: item.senderName,
        content: item.content,
        type: item.type || 'text',
        createdAt: timestamp,
        timestamp,
    };
}

function pushUserNotification({
    userId,
    title,
    content,
    level = 'info',
    type = 'general',
    appointmentId = null,
    appointmentNumber = null,
}) {
    if (!userId || !title || !content) {
        return null;
    }

    const now = new Date().toISOString();
    const notification = {
        id: `notification_${generateId()}`,
        userId,
        title: String(title).trim(),
        content: String(content).trim(),
        level,
        type,
        appointmentId,
        appointmentNumber,
        isRead: false,
        read: false,
        createdAt: now,
        updatedAt: now,
    };

    dataStore.notifications.unshift(notification);
    return notification;
}

function buildHealthStats(healthHistory, period, start, end) {
    const stats = {
        period,
        startDate: start,
        endDate: end,
        count: healthHistory.length,
        heartRate: null,
        bloodPressure: null,
        steps: null,
        sleepHours: null,
        weight: null,
        bmi: null,
        caloriesBurned: null,
        waterIntake: null,
    };

    const heartRates = healthHistory.filter(d => d.heartRate !== null).map(d => d.heartRate);
    if (heartRates.length > 0) {
        stats.heartRate = {
            avg: parseFloat((heartRates.reduce((a, b) => a + b, 0) / heartRates.length).toFixed(1)),
            min: Math.min(...heartRates),
            max: Math.max(...heartRates),
            latest: heartRates[heartRates.length - 1],
        };
    }

    const systolicPressures = healthHistory.filter(d => d.bloodPressureSystolic !== null).map(d => d.bloodPressureSystolic);
    const diastolicPressures = healthHistory.filter(d => d.bloodPressureDiastolic !== null).map(d => d.bloodPressureDiastolic);
    const latestBPData = healthHistory.filter(d => d.bloodPressure).pop();
    if (systolicPressures.length > 0 || diastolicPressures.length > 0) {
        stats.bloodPressure = {
            systolicAvg: systolicPressures.length > 0 ? Math.round(systolicPressures.reduce((a, b) => a + b, 0) / systolicPressures.length) : null,
            diastolicAvg: diastolicPressures.length > 0 ? Math.round(diastolicPressures.reduce((a, b) => a + b, 0) / diastolicPressures.length) : null,
            latest: latestBPData?.bloodPressure || null,
        };
    }

    const steps = healthHistory.filter(d => d.steps !== null).map(d => d.steps);
    if (steps.length > 0) {
        stats.steps = {
            avg: Math.round(steps.reduce((a, b) => a + b, 0) / steps.length),
            min: Math.min(...steps),
            max: Math.max(...steps),
            total: steps.reduce((a, b) => a + b, 0),
            latest: steps[steps.length - 1],
        };
    }

    const sleepHours = healthHistory.filter(d => d.sleepHours !== null).map(d => d.sleepHours);
    if (sleepHours.length > 0) {
        stats.sleepHours = {
            avg: parseFloat((sleepHours.reduce((a, b) => a + b, 0) / sleepHours.length).toFixed(1)),
            min: Math.min(...sleepHours),
            max: Math.max(...sleepHours),
            latest: sleepHours[sleepHours.length - 1],
        };
    }

    const weights = healthHistory.filter(d => d.weight !== null).map(d => d.weight);
    if (weights.length > 0) {
        const change = weights.length >= 2 ? parseFloat((weights[weights.length - 1] - weights[0]).toFixed(1)) : 0;
        stats.weight = {
            avg: parseFloat((weights.reduce((a, b) => a + b, 0) / weights.length).toFixed(1)),
            min: Math.min(...weights),
            max: Math.max(...weights),
            latest: weights[weights.length - 1],
            change,
        };
    }

    const bmis = healthHistory.filter(d => d.bmi !== null).map(d => d.bmi);
    if (bmis.length > 0) {
        stats.bmi = {
            avg: parseFloat((bmis.reduce((a, b) => a + b, 0) / bmis.length).toFixed(1)),
            latest: bmis[bmis.length - 1],
        };
    }

    const caloriesBurned = healthHistory.filter(d => d.caloriesBurned !== null).map(d => d.caloriesBurned);
    if (caloriesBurned.length > 0) {
        stats.caloriesBurned = {
            avg: Math.round(caloriesBurned.reduce((a, b) => a + b, 0) / caloriesBurned.length),
            total: caloriesBurned.reduce((a, b) => a + b, 0),
            latest: caloriesBurned[caloriesBurned.length - 1],
        };
    }

    const waterIntake = healthHistory.filter(d => d.waterIntake !== null).map(d => d.waterIntake);
    if (waterIntake.length > 0) {
        stats.waterIntake = {
            avg: Math.round(waterIntake.reduce((a, b) => a + b, 0) / waterIntake.length),
            total: waterIntake.reduce((a, b) => a + b, 0),
            latest: waterIntake[waterIntake.length - 1],
        };
    }

    return stats;
}

app.get('/api/health', async (req, res) => {
    res.json(buildHealthApiResponse());
});

app.get('/api/auth/province-admins', async (req, res) => {
    const province = String(req.query.province || '').trim();

    if (!province) {
        return errorResponse(res, 'VALIDATION_ERROR', '省份不能为空', null, 422);
    }

    const normalizeAdmin = (admin) => ({
        id: admin.id,
        username: admin.username,
        nickname: admin.nickname || admin.username,
        email: admin.email || null,
        phone: admin.phone || null,
        province: admin.province || null,
        role: admin.role,
        avatar: admin.avatar || null,
        permissions: Array.isArray(admin.permissions) ? admin.permissions : [],
        status: admin.status || 'active',
    });

    try {
        const result = await pool.query(
            `SELECT *
             FROM admins
             WHERE status = 'active'
               AND (role = 'admin' OR (role = 'sub' AND province = $1))
             ORDER BY CASE WHEN role = 'sub' THEN 0 ELSE 1 END, created_at ASC`,
            [province],
        );

        const admins = result.rows.map((row) => normalizeAdmin({
            id: row.id,
            username: row.username,
            nickname: row.nickname,
            email: row.email,
            phone: row.phone,
            province: row.province,
            role: row.role,
            avatar: row.avatar,
            permissions: row.permissions,
            status: row.status,
        }));

        return res.json({
            success: true,
            data: admins,
            message: '获取省份管理员成功',
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error('从数据库读取省份管理员失败:', error.message);
        return errorResponse(res, 'DB_ERROR', '读取省份管理员失败', null, 500);
    }
});

app.get('/api/auth/role-hint', async (req, res) => {
    const username = String(req.query.username || '').trim();

    if (!username) {
        return errorResponse(res, 'VALIDATION_ERROR', '用户名不能为空', null, 422);
    }

    const roleNameMap = {
        user: '用户',
        hospital: '医院',
        admin: '管理员',
        sub: '副管理员',
    };

    if (!isDatabaseAvailable) {
        const matchedUser = dataStore.users.find(
            user => user.username === username && user.role === 'user' && user.status === 'active',
        );
        if (matchedUser) {
            return successResponse(res, {
                username,
                matched: true,
                role: 'user',
                roleName: roleNameMap.user,
            }, '已识别账号角色');
        }

        const matchedHospital = dataStore.hospitals.find(
            hospital => hospital.username === username && hospital.role === 'hospital' && hospital.status === 'active',
        );
        if (matchedHospital) {
            return successResponse(res, {
                username,
                matched: true,
                role: 'hospital',
                roleName: roleNameMap.hospital,
            }, '已识别账号角色');
        }

        const adminMatch = dataStore.admins.find(
            admin => admin.username === username && admin.status === 'active',
        );
        if (adminMatch) {
            const matchedRole = adminMatch.role === 'sub' ? 'sub' : 'admin';
            return successResponse(res, {
                username,
                matched: true,
                role: matchedRole,
                roleName: roleNameMap[matchedRole] || matchedRole,
            }, '已识别账号角色');
        }

        return successResponse(res, {
            username,
            matched: false,
            role: null,
            roleName: null,
        }, '未识别到账号角色');
    }

    try {
        const userResult = await pool.query(
            `SELECT role FROM users WHERE username = $1 AND status = 'active' LIMIT 1`,
            [username],
        );
        if (userResult.rows.length > 0) {
            const matchedRole = userResult.rows[0].role;
            return successResponse(res, {
                username,
                matched: true,
                role: matchedRole,
                roleName: roleNameMap[matchedRole] || matchedRole,
            }, '已识别账号角色');
        }

        const hospitalResult = await pool.query(
            `SELECT role FROM hospitals WHERE username = $1 AND status = 'active' LIMIT 1`,
            [username],
        );
        if (hospitalResult.rows.length > 0) {
            const matchedRole = hospitalResult.rows[0].role;
            return successResponse(res, {
                username,
                matched: true,
                role: matchedRole,
                roleName: roleNameMap[matchedRole] || matchedRole,
            }, '已识别账号角色');
        }

        const fallbackHospital = dataStore.hospitals.find(
            hospital => hospital.username === username && hospital.role === 'hospital' && hospital.status === 'active',
        );
        if (fallbackHospital) {
            return successResponse(res, {
                username,
                matched: true,
                role: 'hospital',
                roleName: roleNameMap.hospital,
            }, '已识别账号角色');
        }

        const adminMatch = dataStore.admins.find(
            admin => admin.username === username && admin.status === 'active',
        );
        if (adminMatch) {
            return successResponse(res, {
                username,
                matched: true,
                role: 'admin',
                roleName: roleNameMap.admin,
            }, '已识别账号角色');
        }

        return successResponse(res, {
            username,
            matched: false,
            role: null,
            roleName: null,
        }, '未识别到账号角色');
    } catch (error) {
        console.error('识别账号角色失败:', error.message);
        return errorResponse(res, 'DB_ERROR', '识别账号角色失败', null, 500);
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { username, password, role, rememberMe = false } = req.body;
    console.log('登录请求:', { username, role });

    let user = null;
    let userRole = role;
    let matchedAccountRole = null;

    if (!isDatabaseAvailable) {
        if (role === 'user') {
            const matchedUser = dataStore.users.find(
                item => item.username === username && item.role === 'user',
            );
            if (matchedUser) {
                matchedAccountRole = 'user';
                if (matchedUser.password === password) {
                    user = matchedUser;
                }
            }
        } else if (role === 'hospital') {
            const matchedHospital = dataStore.hospitals.find(
                item => item.username === username && item.role === 'hospital',
            );
            if (matchedHospital) {
                matchedAccountRole = 'hospital';
                if (matchedHospital.password === password) {
                    user = matchedHospital;
                }
            }
        } else if (role === 'admin') {
            const adminUser = dataStore.admins.find(
                item => item.username === username && (item.role === 'admin' || item.role === 'sub'),
            );
            if (adminUser) {
                matchedAccountRole = adminUser.role === 'sub' ? 'sub' : 'admin';
                if (adminUser.password === password) {
                    user = adminUser;
                    userRole = adminUser.role === 'sub' ? 'sub' : 'admin';
                }
            }
        } else if (role === 'sub') {
            const subAdminUser = dataStore.admins.find(
                item => item.username === username && item.role === 'sub',
            );
            if (subAdminUser) {
                matchedAccountRole = 'sub';
                if (subAdminUser.password === password) {
                    user = subAdminUser;
                    userRole = 'sub';
                }
            }
        }
    } else if (role === 'user') {
        try {
            const result = await pool.query(
                `SELECT id, username, password_hash, email, nickname, avatar, phone, gender, age, height, weight, birth_date, province, city, address, role, status, created_at, updated_at, last_login_at
                 FROM users WHERE username = $1 AND role = 'user'`,
                [username],
            );

            if (result.rows.length > 0) {
                const row = result.rows[0];
                matchedAccountRole = 'user';
                if (row.password_hash === password) {
                    user = {
                        id: row.id,
                        username: row.username,
                        password: row.password_hash,
                        email: row.email,
                        nickname: row.nickname,
                        avatar: row.avatar,
                        phone: row.phone,
                        gender: row.gender,
                        age: row.age !== null ? Number(row.age) : null,
                        height: row.height !== null ? Number(row.height) : null,
                        weight: row.weight !== null ? Number(row.weight) : null,
                        birthDate: row.birth_date,
                        province: row.province,
                        city: row.city,
                        address: row.address,
                        role: row.role,
                        adminRole: null,
                        status: row.status,
                        createdAt: row.created_at,
                        updatedAt: row.updated_at,
                        lastLoginAt: row.last_login_at,
                    };
                }
            }
        } catch (err) {
            console.error('读取用户登录信息失败:', err.message);
            return errorResponse(res, 'DB_ERROR', '读取用户信息失败', null, 500);
        }
    } else if (role === 'hospital') {
        try {
            const result = await pool.query(
                `SELECT * FROM hospitals WHERE username = $1 AND role = 'hospital'`,
                [username],
            );

            if (result.rows.length > 0) {
                const row = result.rows[0];
                matchedAccountRole = 'hospital';
                if (row.password_hash === password) {
                    user = {
                        id: row.id,
                        username: row.username,
                        password: row.password_hash,
                        name: row.name,
                        province: row.province,
                        city: row.city,
                        address: row.address,
                        phone: row.phone,
                        email: row.email,
                        level: row.level,
                        beds: row.beds,
                        lat: row.lat !== null ? Number(row.lat) : null,
                        lng: row.lng !== null ? Number(row.lng) : null,
                        rating: row.rating !== null ? Number(row.rating) : 0,
                        reviewCount: row.review_count || 0,
                        features: row.features || [],
                        businessHours: row.business_hours,
                        emergency: row.emergency,
                        role: row.role,
                        status: row.status,
                        authCodeUsed: row.auth_code_used,
                        createdAt: row.created_at,
                        updatedAt: row.updated_at,
                        lastLoginAt: row.last_login_at,
                    };
                }
            }

            if (!matchedAccountRole) {
                const fallbackHospital = dataStore.hospitals.find(
                    h => h.username === username && h.role === 'hospital',
                );
                if (fallbackHospital) {
                    matchedAccountRole = 'hospital';
                    if (fallbackHospital.password === password) {
                        user = fallbackHospital;
                    }
                }
            }
        } catch (err) {
            console.error('读取医院登录信息失败:', err.message);
            return errorResponse(res, 'DB_ERROR', '读取医院信息失败', null, 500);
        }
    } else if (role === 'admin') {
        const adminUser = dataStore.admins.find(
            a => a.username === username && (a.role === 'admin' || a.role === 'sub'),
        );
        if (adminUser) {
            matchedAccountRole = 'admin';
            if (adminUser.password === password) {
                user = adminUser;
                userRole = adminUser.role === 'sub' ? 'sub' : 'admin';
            }
        }
    } else if (role === 'sub') {
        const subAdminUser = dataStore.admins.find(a => a.username === username && a.role === 'sub');
        if (subAdminUser) {
            matchedAccountRole = 'sub';
            if (subAdminUser.password === password) {
                user = subAdminUser;
                userRole = 'sub';
            }
        }
    }

    if (!user) {
        if (!matchedAccountRole) {
            const matchedAdmin = dataStore.admins.find(a => a.username === username);
            if (matchedAdmin) {
                matchedAccountRole = matchedAdmin.role === 'sub' ? 'sub' : 'admin';
            } else if (!isDatabaseAvailable) {
                const matchedUser = dataStore.users.find(item => item.username === username);
                const matchedHospital = dataStore.hospitals.find(item => item.username === username);

                if (matchedUser) {
                    matchedAccountRole = matchedUser.role || 'user';
                } else if (matchedHospital) {
                    matchedAccountRole = matchedHospital.role || 'hospital';
                }
            } else {
                try {
                    const [matchedUserResult, matchedHospitalResult] = await Promise.all([
                        pool.query(`SELECT role FROM users WHERE username = $1 LIMIT 1`, [username]),
                        pool.query(`SELECT role FROM hospitals WHERE username = $1 LIMIT 1`, [username]),
                    ]);

                    if (matchedUserResult.rows.length > 0) {
                        matchedAccountRole = matchedUserResult.rows[0].role;
                    } else if (matchedHospitalResult.rows.length > 0) {
                        matchedAccountRole = matchedHospitalResult.rows[0].role;
                    }
                } catch (err) {
                    console.error('读取登录角色信息失败:', err.message);
                }
            }
        }

        if (matchedAccountRole && matchedAccountRole !== role) {
            const roleNameMap = {
                user: '用户',
                hospital: '医院',
                admin: '管理员',
                sub: '副管理员',
            };
            return errorResponse(
                res,
                'ROLE_MISMATCH',
                `账号角色不匹配，请选择“${roleNameMap[matchedAccountRole] || matchedAccountRole}”后再登录`,
                { expectedRole: matchedAccountRole, providedRole: role },
                400,
            );
        }

        return errorResponse(res, 'INVALID_CREDENTIALS', '用户名或密码错误', null, 401);
    }

    if (user.status === 'disabled') {
        return errorResponse(res, 'ACCOUNT_DISABLED', '账户已被禁用', null, 403);
    }

    const token = generateToken();
    const refreshToken = generateToken();
    const expiresIn = rememberMe ? 604800 : 86400;
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    const sessionData = {
        userId: user.id,
        username: user.username,
        role: userRole,
        province: user.province || null,
        token,
        refreshToken,
        expiresAt,
        createdAt: new Date().toISOString(),
    };

    if (isDatabaseAvailable) {
        try {
            await pool.query(
                `INSERT INTO sessions (token, user_id, username, role, refresh_token, expires_at, ip_address, user_agent)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [
                    token,
                    user.id,
                    user.username,
                    userRole,
                    refreshToken,
                    expiresAt,
                    req.ip || null,
                    req.headers['user-agent'] || null,
                ],
            );

            if (role === 'user') {
                await pool.query(
                    'UPDATE users SET last_login_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
                    [user.id],
                );
            } else if (role === 'hospital') {
                await pool.query(
                    'UPDATE hospitals SET last_login_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
                    [user.id],
                );
            }
        } catch (err) {
            console.error('保存会话失败:', err.message);
            return errorResponse(res, 'DB_ERROR', '登录会话保存失败', null, 500);
        }
    }

    dataStore.sessions.set(token, sessionData);
    user.lastLoginAt = new Date().toISOString();

    const userWithoutPassword = { ...user };
    delete userWithoutPassword.password;

    res.json({
        success: true,
        data: {
            user: userWithoutPassword,
            token,
            refreshToken,
            expiresIn,
            tokenType: 'Bearer',
        },
        message: '登录成功',
        timestamp: new Date().toISOString(),
    });
});

app.post('/api/auth/register', async (req, res) => {
    const {
        username,
        password,
        confirmPassword,
        email,
        nickname,
        phone,
        gender,
        birthDate,
        province,
        city,
        address
    } = req.body;

    const missingFields = [
        ['username', username],
        ['password', password],
        ['confirmPassword', confirmPassword],
        ['email', email],
    ]
        .filter(([, value]) => value === undefined || value === null || value === '')
        .map(([field]) => field);

    if (missingFields.length > 0) {
        return errorResponse(
            res,
            'VALIDATION_ERROR',
            `用户注册缺少必填字段: ${missingFields.join(', ')}`,
            { registrationType: 'user', missingFields },
            422,
        );
    }

    if (password !== confirmPassword) {
        return errorResponse(res, 'PASSWORD_MISMATCH', '用户注册两次密码输入不一致', null, 422);
    }

    if (username.length < 3 || username.length > 50) {
        return errorResponse(res, 'VALIDATION_ERROR', '用户注册用户名长度应为3-50个字符', null, 422);
    }

    const usernameRegex = /^[a-zA-Z][a-zA-Z0-9_]*$/;
    if (!usernameRegex.test(username)) {
        return errorResponse(res, 'VALIDATION_ERROR', '用户注册用户名只能包含字母、数字和下划线，且以字母开头', null, 422);
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return errorResponse(res, 'VALIDATION_ERROR', '用户注册邮箱格式不正确', null, 422);
    }

    if (password.length < 6 || password.length > 100) {
        return errorResponse(res, 'VALIDATION_ERROR', '用户注册密码长度应为6-100个字符', null, 422);
    }

    try {
        const existsResult = await pool.query(
            'SELECT id, username, email FROM users WHERE username = $1 OR email = $2 LIMIT 1',
            [username, email],
        );

        if (existsResult.rows.length > 0) {
            const existing = existsResult.rows[0];
            if (existing.username === username) {
                return errorResponse(res, 'USERNAME_EXISTS', '用户注册用户名已存在', { username: '该用户名已被注册', registrationType: 'user' }, 409);
            }
            if (existing.email === email) {
                return errorResponse(res, 'EMAIL_EXISTS', '用户注册邮箱已被注册', { registrationType: 'user' }, 409);
            }
        }

        const newUser = {
            id: `user_${generateId()}`,
            username,
            password,
            email,
            nickname: nickname || username,
            avatar: null,
            phone: phone || '',
            gender: gender || '保密',
            birthDate: birthDate || null,
            province: province || '',
            city: city || '',
            address: address || '',
            role: 'user',
            adminRole: null,
            status: 'active',
        };

        const result = await pool.query(
            `INSERT INTO users (
                id, username, password_hash, email, nickname, avatar, phone, gender,
                age, height, weight, birth_date, province, city, address, role, status, updated_at
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8,
                $9, $10, $11, $12, $13, $14, $15, $16, $17, CURRENT_TIMESTAMP
            ) RETURNING id, username, email, nickname, avatar, phone, gender, age, height, weight, birth_date, province, city, address, role, status, created_at, updated_at, last_login_at`,
            [
                newUser.id,
                newUser.username,
                newUser.password,
                newUser.email,
                newUser.nickname,
                newUser.avatar,
                newUser.phone,
                newUser.gender,
                null,
                null,
                null,
                newUser.birthDate,
                newUser.province,
                newUser.city,
                newUser.address,
                newUser.role,
                newUser.status,
            ],
        );

        const row = result.rows[0];
        const userWithoutPassword = {
            id: row.id,
            username: row.username,
            email: row.email,
            nickname: row.nickname,
            avatar: row.avatar,
            phone: row.phone,
            gender: row.gender,
            age: row.age !== null ? Number(row.age) : null,
            height: row.height !== null ? Number(row.height) : null,
            weight: row.weight !== null ? Number(row.weight) : null,
            birthDate: row.birth_date,
            province: row.province,
            city: row.city,
            address: row.address,
            role: row.role,
            status: row.status,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            lastLoginAt: row.last_login_at,
        };

        dataStore.users.push({ ...newUser, createdAt: row.created_at, updatedAt: row.updated_at, lastLoginAt: row.last_login_at });

        return res.status(201).json({
            success: true,
            data: userWithoutPassword,
            message: '用户注册成功，请登录',
            timestamp: new Date().toISOString(),
        });
    } catch (err) {
        console.error('用户注册失败:', err.message);
        return errorResponse(res, 'DB_ERROR', '注册失败', null, 500);
    }
});

app.post('/api/auth/register-hospital', async (req, res) => {
    let requestData = req.body;

    if (typeof requestData === 'string') {
        try {
            requestData = JSON.parse(requestData);
        } catch (error) {
            return errorResponse(res, 'VALIDATION_ERROR', '请求数据格式错误', null, 422);
        }
    }

    if (requestData && typeof requestData === 'object') {
        requestData = requestData.hospitalData || requestData.data || requestData.payload || requestData;
    }

    const {
        username,
        password,
        confirmPassword,
        hospitalName,
        authCode,
        province,
        city,
        address,
        phone,
        email,
        level,
        beds,
        lat,
        lng
    } = requestData || {};

    const missingFields = [
        ['username', username],
        ['password', password],
        ['confirmPassword', confirmPassword],
        ['hospitalName', hospitalName],
        ['authCode', authCode],
        ['province', province],
        ['email', email],
    ]
        .filter(([, value]) => value === undefined || value === null || value === '')
        .map(([field]) => field);

    if (missingFields.length > 0) {
        return errorResponse(
            res,
            'VALIDATION_ERROR',
            `缺少必填字段: ${missingFields.join(', ')}`,
            { missingFields },
            422,
        );
    }

    if (password !== confirmPassword) {
        return errorResponse(res, 'PASSWORD_MISMATCH', '两次密码输入不一致', null, 422);
    }

    if (hospitalName.length < 2 || hospitalName.length > 100) {
        return errorResponse(res, 'VALIDATION_ERROR', '医院名称长度应为2-100个字符', null, 422);
    }

    const validCode = dataStore.authCodes.find(c => c.code === authCode && !c.used && c.status === 'active');
    if (!validCode) {
        return errorResponse(res, 'INVALID_AUTH_CODE', '授权码无效或已使用', null, 400);
    }

    if (validCode.province && province) {
        const normalizeProvinceName = (value) => {
            if (!value || typeof value !== 'string') {
                return null;
            }

            return value
                .trim()
                .replace(/特别行政区$/u, '')
                .replace(/维吾尔自治区$/u, '')
                .replace(/壮族自治区$/u, '')
                .replace(/回族自治区$/u, '')
                .replace(/自治区$/u, '')
                .replace(/省$/u, '')
                .replace(/市$/u, '');
        };

        if (normalizeProvinceName(validCode.province) !== normalizeProvinceName(province)) {
            return errorResponse(res, 'PROVINCE_MISMATCH', '授权码省份与医院地址省份不匹配', null, 400);
        }
    }

    try {
        const exists = await pool.query(
            'SELECT id FROM hospitals WHERE username = $1 LIMIT 1',
            [username],
        );

        if (exists.rows.length > 0) {
            return errorResponse(res, 'USERNAME_EXISTS', '用户名已存在', null, 409);
        }

        const authCodeResult = await pool.query(
            `SELECT id, code, province, used, used_at, used_by, status
             FROM auth_codes
             WHERE code = $1
             LIMIT 1`,
            [authCode],
        );

        if (authCodeResult.rows.length === 0) {
            return errorResponse(res, 'INVALID_AUTH_CODE', '授权码无效或已使用', null, 400);
        }

        const authCodeRow = authCodeResult.rows[0];
        const authCodeStatus = typeof authCodeRow.status === 'string' ? authCodeRow.status.toLowerCase() : authCodeRow.status;
        const dbAuthCode = {
            id: authCodeRow.id,
            code: authCodeRow.code,
            province: authCodeRow.province,
            used: !!authCodeRow.used,
            usedAt: authCodeRow.used_at,
            usedBy: authCodeRow.used_by,
            status: authCodeStatus,
        };

        if (dbAuthCode.used || dbAuthCode.status !== 'active') {
            return errorResponse(res, 'INVALID_AUTH_CODE', '授权码无效或已使用', null, 400);
        }

        if (dbAuthCode.province && province) {
            const normalizeProvinceName = (value) => {
                if (!value || typeof value !== 'string') {
                    return null;
                }

                return value
                    .trim()
                    .replace(/特别行政区$/u, '')
                    .replace(/维吾尔自治区$/u, '')
                    .replace(/壮族自治区$/u, '')
                    .replace(/回族自治区$/u, '')
                    .replace(/自治区$/u, '')
                    .replace(/省$/u, '')
                    .replace(/市$/u, '');
            };

            if (normalizeProvinceName(dbAuthCode.province) !== normalizeProvinceName(province)) {
                return errorResponse(res, 'PROVINCE_MISMATCH', '授权码省份与医院地址省份不匹配', null, 400);
            }
        }

        const newHospital = {
            id: `hospital_${generateId()}`,
            username,
            password,
            name: hospitalName,
            province,
            city: city || province,
            address: address || province,
            phone: phone || null,
            email,
            level: level || '其他',
            beds: beds || 0,
            lat: lat || null,
            lng: lng || null,
            rating: 0,
            reviewCount: 0,
            features: [],
            businessHours: '08:00-17:00',
            emergency: false,
            role: 'hospital',
            status: 'active',
            authCodeUsed: authCode,
        };

        const result = await pool.query(
            `INSERT INTO hospitals (
                id, username, password_hash, name, province, city, address, phone, email,
                level, beds, lat, lng, rating, review_count, features, business_hours,
                emergency, role, status, auth_code_used, updated_at
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9,
                $10, $11, $12, $13, $14, $15, $16, $17,
                $18, $19, $20, $21, CURRENT_TIMESTAMP
            ) RETURNING *`,
            [
                newHospital.id,
                newHospital.username,
                newHospital.password,
                newHospital.name,
                newHospital.province,
                newHospital.city,
                newHospital.address,
                newHospital.phone,
                newHospital.email,
                newHospital.level,
                newHospital.beds,
                newHospital.lat,
                newHospital.lng,
                newHospital.rating,
                newHospital.reviewCount,
                newHospital.features,
                newHospital.businessHours,
                newHospital.emergency,
                newHospital.role,
                newHospital.status,
                newHospital.authCodeUsed,
            ],
        );

        const usedAt = new Date().toISOString();
        await pool.query(
            `UPDATE auth_codes
             SET used = true, used_at = $2, used_by = $3, status = 'revoked'
             WHERE id = $1`,
            [dbAuthCode.id, usedAt, username],
        );

        const localAuthCode = dataStore.authCodes.find(c => c.code === authCode);
        if (localAuthCode) {
            localAuthCode.used = true;
            localAuthCode.usedAt = usedAt;
            localAuthCode.usedBy = username;
            localAuthCode.status = 'revoked';
        }

        const row = result.rows[0];
        const hospitalWithoutPassword = {
            id: row.id,
            username: row.username,
            name: row.name,
            province: row.province,
            city: row.city,
            address: row.address,
            phone: row.phone,
            email: row.email,
            level: row.level,
            beds: row.beds,
            lat: row.lat,
            lng: row.lng,
            rating: row.rating,
            reviewCount: row.review_count,
            features: row.features,
            businessHours: row.business_hours,
            emergency: row.emergency,
            role: row.role,
            status: row.status,
            authCodeUsed: row.auth_code_used,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            lastLoginAt: row.last_login_at,
        };

        dataStore.hospitals.push({ ...newHospital, createdAt: row.created_at, updatedAt: row.updated_at, lastLoginAt: row.last_login_at });

        return res.status(201).json({
            success: true,
            data: hospitalWithoutPassword,
            message: '医院注册成功，请登录',
            timestamp: new Date().toISOString(),
        });
    } catch (err) {
        console.error('医院注册失败:', err.message);
        return errorResponse(res, 'DB_ERROR', '医院注册失败', null, 500);
    }
});

const normalizeChatHistoryContent = value => String(value || '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim();

const pickMentalChatField = (requestBody, fieldNames = []) => {
    if (!requestBody || typeof requestBody !== 'object') {
        return '';
    }

    for (const fieldName of fieldNames) {
        const value = requestBody?.[fieldName];
        if (typeof value === 'string' && normalizeChatHistoryContent(value)) {
            return value;
        }
    }

    return '';
};

const resolveMentalChatRequestBody = body => {
    if (!body) {
        return {};
    }

    if (typeof body === 'string') {
        try {
            const parsed = JSON.parse(body);
            return parsed && typeof parsed === 'object' ? parsed : {};
        } catch (error) {
            return {};
        }
    }

    return typeof body === 'object' ? body : {};
};

app.post('/api/mental-health-chat/history', async (req, res) => {
    const session = getSession(req);
    if (!session || session.role !== 'user') {
        return errorResponse(res, 'UNAUTHORIZED', '未授权，需要登录', null, 401);
    }

    const requestBody = resolveMentalChatRequestBody(req.body);
    const userMessage = normalizeChatHistoryContent(
        pickMentalChatField(requestBody, ['userMessage', 'message', 'user_message', 'question', 'prompt']),
    );
    const aiReply = normalizeChatHistoryContent(
        pickMentalChatField(requestBody, ['aiReply', 'reply', 'assistantMessage', 'assistant_message', 'answer', 'response']),
    );

    if (!userMessage || !aiReply) {
        console.warn('[mental-health-chat/history] 无效请求体:', {
            contentType: req.headers['content-type'],
            bodyType: typeof req.body,
            hasBody: Boolean(req.body),
            hasUserMessage: Boolean(userMessage),
            hasAiReply: Boolean(aiReply),
            bodyKeys: requestBody && typeof requestBody === 'object' ? Object.keys(requestBody) : [],
            userMessagePreview: userMessage.slice(0, 20),
            aiReplyPreview: aiReply.slice(0, 20),
        });
        return errorResponse(res, 'VALIDATION_ERROR', '聊天记录内容不能为空', null, 422);
    }

    try {
        const record = await persistMentalHealthChatRecord({
            userId: session.userId,
            userMessage,
            aiReply,
        });

        return successResponse(res, record, '心理聊天记录保存成功');
    } catch (err) {
        console.error('保存心理聊天记录失败:', err.message);
        return errorResponse(res, 'DB_ERROR', '保存心理聊天记录失败', null, 500);
    }
});

app.get('/api/mental-health-chat/history', async (req, res) => {
    const session = getSession(req);
    if (!session || session.role !== 'user') {
        return errorResponse(res, 'UNAUTHORIZED', '未授权，需要登录', null, 401);
    }

    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, Number.parseInt(req.query.pageSize, 10) || 100));
    const offset = (page - 1) * pageSize;

    try {
        const [countResult, result] = await Promise.all([
            pool.query(
                `SELECT COUNT(*)::int AS total
                 FROM mental_health_chat_history
                 WHERE user_id = $1`,
                [session.userId],
            ),
            pool.query(
                `SELECT id, user_id, user_message, ai_reply, created_at
                 FROM mental_health_chat_history
                 WHERE user_id = $1
                 ORDER BY created_at DESC
                 LIMIT $2 OFFSET $3`,
                [session.userId, pageSize, offset],
            ),
        ]);

        const records = result.rows.map(row => ({
            id: row.id,
            userId: row.user_id,
            userMessage: row.user_message,
            aiReply: row.ai_reply,
            timestamp: row.created_at,
        }));

        return successResponse(res, {
            records,
            pagination: {
                total: countResult.rows[0]?.total || 0,
                page,
                pageSize,
                totalPages: Math.ceil((countResult.rows[0]?.total || 0) / pageSize),
            },
        }, '获取心理聊天记录成功');
    } catch (err) {
        console.error('获取心理聊天记录失败:', err.message);
        return errorResponse(res, 'DB_ERROR', '获取心理聊天记录失败', null, 500);
    }
});

app.post('/api/auth/logout', async (req, res) => {
    const session = await getSession(req);
    if (session) {
        dataStore.sessions.delete(session.token);
        try {
            await pool.query('DELETE FROM sessions WHERE token = $1', [session.token]);
        } catch (err) {
            console.error('删除会话失败:', err.message);
            return errorResponse(res, 'DB_ERROR', '登出失败', null, 500);
        }
    }
    successResponse(res, null, '登出成功');
});

app.post('/api/auth/verify-reset', (req, res) => {
    const { username, email } = req.body;

    if (!username || !email) {
        return errorResponse(res, 'VALIDATION_ERROR', '用户名和邮箱不能为空', null, 422);
    }

    const user = dataStore.users.find(u => u.username === username && u.email === email);
    
    if (!user) {
        return errorResponse(res, 'USER_NOT_FOUND', '用户名与邮箱组合不匹配，请检查后重新输入', null, 404);
    }

    successResponse(res, { username, verified: true }, '验证成功，可以重置密码');
});

app.post('/api/auth/reset-password', (req, res) => {
    const { username, newPassword, confirmPassword } = req.body;

    if (!username || !newPassword || !confirmPassword) {
        return errorResponse(res, 'VALIDATION_ERROR', '必填字段不能为空', null, 422);
    }

    if (newPassword !== confirmPassword) {
        return errorResponse(res, 'PASSWORD_MISMATCH', '两次密码输入不一致', null, 422);
    }

    if (newPassword.length < 6 || newPassword.length > 100) {
        return errorResponse(res, 'VALIDATION_ERROR', '密码长度应为6-100个字符', null, 422);
    }

    const user = dataStore.users.find(u => u.username === username);
    
    if (!user) {
        return errorResponse(res, 'USER_NOT_FOUND', '用户不存在', null, 404);
    }

    user.password = newPassword;
    user.updatedAt = new Date().toISOString();

    successResponse(res, null, '密码重置成功，请使用新密码登录');
});

app.get('/api/users', (req, res) => {
    const session = getSession(req);
    if (!session || (session.role !== 'admin' && session.role !== 'sub')) {
        return errorResponse(res, 'FORBIDDEN', '权限不足', null, 403);
    }

    const { province, keyword, page = 1, pageSize = 30 } = req.query;
    let users = [...dataStore.users];

    if (session.role === 'sub' && session.province) {
        users = users.filter(u => u.province === session.province);
    }

    if (province) {
        users = users.filter(u => u.province === province);
    }

    if (keyword) {
        const keywordLower = keyword.toLowerCase();
        users = users.filter(u => 
            u.username.toLowerCase().includes(keywordLower) ||
            (u.nickname && u.nickname.toLowerCase().includes(keywordLower)) ||
            (u.email && u.email.toLowerCase().includes(keywordLower))
        );
    }

    const paginatedData = paginate(users, page, pageSize);
    paginatedData.list = paginatedData.list.map(u => {
        const { password, ...userWithoutPassword } = u;
        return userWithoutPassword;
    });

    successResponse(res, paginatedData);
});

app.get('/api/users/:userId', async (req, res) => {
    const session = getSession(req);
    if (!session) {
        return errorResponse(res, 'UNAUTHORIZED', '未授权，需要登录', null, 401);
    }

    const { userId } = req.params;
    if (session.role === 'user' && session.userId !== userId && session.username !== userId) {
        return errorResponse(res, 'FORBIDDEN', '无权查看该用户信息', null, 403);
    }

    if (session.role !== 'user' && session.role !== 'admin' && session.role !== 'sub') {
        return errorResponse(res, 'FORBIDDEN', '无权查看该用户信息', null, 403);
    }

    try {
        const result = await pool.query(
            `SELECT id, username, email, nickname, avatar, phone, gender, birth_date, province, city, address, role, status, created_at, updated_at, last_login_at
             FROM users WHERE id = $1 OR username = $1 LIMIT 1`,
            [userId],
        );

        if (result.rows.length === 0) {
            return errorResponse(res, 'NOT_FOUND', '用户不存在', null, 404);
        }

        const row = result.rows[0];
        return res.json({
            success: true,
            user: {
                id: row.id,
                username: row.username,
                email: row.email,
                nickname: row.nickname,
                avatar: row.avatar,
                phone: row.phone,
                gender: row.gender,
                birthDate: row.birth_date,
                province: row.province,
                city: row.city,
                address: row.address,
                role: row.role,
                status: row.status,
                createdAt: row.created_at,
                updatedAt: row.updated_at,
                lastLoginAt: row.last_login_at,
            },
            timestamp: new Date().toISOString(),
        });
    } catch (err) {
        console.error('读取用户资料失败:', err.message);
        return errorResponse(res, 'DB_ERROR', '读取用户资料失败', null, 500);
    }
});

app.put('/api/users/:userId', async (req, res) => {
    const session = getSession(req);
    if (!session) {
        return errorResponse(res, 'UNAUTHORIZED', '未授权，需要登录', null, 401);
    }

    const { userId } = req.params;
    const {
        nickname,
        phone,
        gender,
        birthDate,
        province,
        city,
        address,
        email,
        age,
        height,
        weight,
    } = req.body;

    if (session.role === 'user' && session.userId !== userId) {
        return errorResponse(res, 'FORBIDDEN', '权限不足', null, 403);
    }

    if (session.role !== 'user' && session.role !== 'admin' && session.role !== 'sub') {
        return errorResponse(res, 'FORBIDDEN', '权限不足', null, 403);
    }

    const resolvedAge = age !== undefined && age !== null && age !== '' ? Number(age) : null;
    const resolvedHeight = height !== undefined && height !== null && height !== '' ? Number(height) : null;
    const resolvedWeight = weight !== undefined && weight !== null && weight !== '' ? Number(weight) : null;

    if (email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return errorResponse(res, 'VALIDATION_ERROR', '邮箱格式不正确', null, 422);
        }
    }

    if (age !== undefined && age !== null && age !== '' && (!Number.isFinite(resolvedAge) || resolvedAge < 0 || resolvedAge > 150)) {
        return errorResponse(res, 'VALIDATION_ERROR', '年龄格式不正确', null, 422);
    }

    if (height !== undefined && height !== null && height !== '' && (!Number.isFinite(resolvedHeight) || resolvedHeight <= 0)) {
        return errorResponse(res, 'VALIDATION_ERROR', '身高格式不正确', null, 422);
    }

    if (weight !== undefined && weight !== null && weight !== '' && (!Number.isFinite(resolvedWeight) || resolvedWeight <= 0)) {
        return errorResponse(res, 'VALIDATION_ERROR', '体重格式不正确', null, 422);
    }

    if (gender && !['男', '女', '保密'].includes(gender)) {
        return errorResponse(res, 'VALIDATION_ERROR', '性别格式不正确', null, 422);
    }

    try {
        const result = await pool.query(
            `UPDATE users
             SET nickname = COALESCE($2, nickname),
                 phone = COALESCE($3, phone),
                 gender = COALESCE($4, gender),
                 birth_date = COALESCE($5, birth_date),
                 province = COALESCE($6, province),
                 city = COALESCE($7, city),
                 address = COALESCE($8, address),
                 email = COALESCE($9, email),
                 age = $10,
                 height = $11,
                 weight = $12,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $1
             RETURNING id, username, email, nickname, avatar, phone, gender, age, height, weight, birth_date, province, city, address, role, status, created_at, updated_at, last_login_at`,
            [
                userId,
                nickname ?? null,
                phone ?? null,
                gender ?? null,
                birthDate ?? null,
                province ?? null,
                city ?? null,
                address ?? null,
                email ?? null,
                resolvedAge,
                resolvedHeight,
                resolvedWeight,
            ],
        );

        if (result.rows.length === 0) {
            return errorResponse(res, 'NOT_FOUND', '用户不存在', null, 404);
        }

        const row = result.rows[0];
        const cachedUser = dataStore.users.find(u => u.id === userId);
        if (cachedUser) {
            if (nickname !== undefined) cachedUser.nickname = row.nickname;
            if (phone !== undefined) cachedUser.phone = row.phone;
            if (gender !== undefined) cachedUser.gender = row.gender;
            if (birthDate !== undefined) cachedUser.birthDate = row.birth_date;
            if (province !== undefined) cachedUser.province = row.province;
            if (city !== undefined) cachedUser.city = row.city;
            if (address !== undefined) cachedUser.address = row.address;
            if (email !== undefined) cachedUser.email = row.email;
            if (age !== undefined) cachedUser.age = row.age !== null ? Number(row.age) : null;
            if (height !== undefined) cachedUser.height = row.height !== null ? Number(row.height) : null;
            if (weight !== undefined) cachedUser.weight = row.weight !== null ? Number(row.weight) : null;
            cachedUser.updatedAt = row.updated_at;
        }

        return res.json({
            success: true,
            user: {
                id: row.id,
                username: row.username,
                email: row.email,
                nickname: row.nickname,
                avatar: row.avatar,
                phone: row.phone,
                gender: row.gender,
                age: row.age !== null ? Number(row.age) : null,
                height: row.height !== null ? Number(row.height) : null,
                weight: row.weight !== null ? Number(row.weight) : null,
                birthDate: row.birth_date,
                province: row.province,
                city: row.city,
                address: row.address,
                role: row.role,
                status: row.status,
                createdAt: row.created_at,
                updatedAt: row.updated_at,
                lastLoginAt: row.last_login_at,
            },
            message: '用户信息更新成功',
            timestamp: new Date().toISOString(),
        });
    } catch (err) {
        console.error('更新用户资料失败:', err.message);
        return errorResponse(res, 'DB_ERROR', '更新用户资料失败', null, 500);
    }
});

app.delete(['/users/me/account', '/api/users/me/account'], async (req, res) => {
    const session = getSession(req);
    if (!session) {
        return errorResponse(res, 'UNAUTHORIZED', '未授权，需要登录', null, 401);
    }

    if (session.role !== 'user') {
        return errorResponse(res, 'FORBIDDEN', '仅支持普通用户注销账号', null, 403);
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        await client.query('DELETE FROM sessions WHERE user_id = $1 OR token = $2', [session.userId, session.token]);
        await client.query('DELETE FROM user_settings WHERE user_id = $1', [session.userId]);
        await client.query('DELETE FROM smart_devices WHERE user_id = $1', [session.userId]);
        await client.query('DELETE FROM appointments WHERE user_id = $1', [session.userId]);
        await client.query('DELETE FROM health_data WHERE user_id = $1', [session.userId]);
        await client.query('DELETE FROM mental_health_chat_history WHERE user_id = $1', [session.userId]);

        const deleteUserResult = await client.query(
            'DELETE FROM users WHERE id = $1 RETURNING id, username',
            [session.userId],
        );

        if (deleteUserResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return errorResponse(res, 'NOT_FOUND', '用户不存在', null, 404);
        }

        await client.query('COMMIT');

        dataStore.sessions.delete(session.token);
        dataStore.users = dataStore.users.filter(user => user.id !== session.userId);
        dataStore.notifications = Array.isArray(dataStore.notifications)
            ? dataStore.notifications.filter(item => item.userId !== session.userId)
            : dataStore.notifications;
        dataStore.consultations = Array.isArray(dataStore.consultations)
            ? dataStore.consultations.filter(item => item.userId !== session.userId)
            : dataStore.consultations;
        dataStore.consultationMessages = Array.isArray(dataStore.consultationMessages)
            ? dataStore.consultationMessages.filter(item => item.senderId !== session.userId)
            : dataStore.consultationMessages;

        return successResponse(res, {
            id: deleteUserResult.rows[0].id,
            username: deleteUserResult.rows[0].username,
        }, '用户账号已注销');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('注销用户账号失败:', err.message);
        return errorResponse(res, 'DB_ERROR', '注销用户账号失败', null, 500);
    } finally {
        client.release();
    }
});

app.post('/api/users/change-password', async (req, res) => {
    const session = getSession(req);
    if (!session) {
        return errorResponse(res, 'UNAUTHORIZED', '未授权，需要登录', null, 401);
    }

    const { userId, currentPassword, newPassword, confirmPassword } = req.body;

    if (session.userId !== userId) {
        return errorResponse(res, 'FORBIDDEN', '权限不足', null, 403);
    }

    if (!currentPassword || !newPassword || !confirmPassword) {
        return errorResponse(res, 'VALIDATION_ERROR', '必填字段不能为空', null, 422);
    }

    if (newPassword !== confirmPassword) {
        return errorResponse(res, 'PASSWORD_MISMATCH', '两次密码输入不一致', null, 422);
    }

    if (newPassword.length < 6 || newPassword.length > 100) {
        return errorResponse(res, 'VALIDATION_ERROR', '密码长度应为6-100个字符', null, 422);
    }

    try {
        const result = await pool.query(
            'SELECT id, password_hash FROM users WHERE id = $1 LIMIT 1',
            [userId],
        );

        if (result.rows.length === 0) {
            return errorResponse(res, 'NOT_FOUND', '用户不存在', null, 404);
        }

        const user = result.rows[0];
        if (user.password_hash !== currentPassword) {
            return errorResponse(res, 'INVALID_CURRENT_PASSWORD', '当前密码错误', null, 400);
        }

        await pool.query(
            'UPDATE users SET password_hash = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
            [userId, newPassword],
        );

        const cachedUser = dataStore.users.find(u => u.id === userId);
        if (cachedUser) {
            cachedUser.password = newPassword;
            cachedUser.updatedAt = new Date().toISOString();
        }

        return successResponse(res, null, '密码修改成功，请使用新密码重新登录');
    } catch (err) {
        console.error('修改用户密码失败:', err.message);
        return errorResponse(res, 'DB_ERROR', '修改密码失败', null, 500);
    }
});

app.put('/api/users/:id', async (req, res) => {
    const session = getSession(req);
    if (!session) {
        return errorResponse(res, 'UNAUTHORIZED', '未授权，需要登录', null, 401);
    }

    const { id } = req.params;
    if (session.role !== 'user' || session.userId !== id) {
        return errorResponse(res, 'FORBIDDEN', '权限不足', null, 403);
    }

    const { nickname, email, gender, age, height, weight } = req.body;

    if (!nickname || !String(nickname).trim()) {
        return errorResponse(res, 'VALIDATION_ERROR', '用户名不能为空', null, 422);
    }

    if (email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return errorResponse(res, 'VALIDATION_ERROR', '邮箱格式不正确', null, 422);
        }
    }

    const resolvedAge = age !== undefined && age !== null && age !== '' ? Number(age) : null;
    const resolvedHeight = height !== undefined && height !== null && height !== '' ? Number(height) : null;
    const resolvedWeight = weight !== undefined && weight !== null && weight !== '' ? Number(weight) : null;

    if (age !== undefined && age !== null && age !== '' && (!Number.isFinite(resolvedAge) || resolvedAge < 0 || resolvedAge > 150)) {
        return errorResponse(res, 'VALIDATION_ERROR', '年龄格式不正确', null, 422);
    }

    if (height !== undefined && height !== null && height !== '' && (!Number.isFinite(resolvedHeight) || resolvedHeight <= 0)) {
        return errorResponse(res, 'VALIDATION_ERROR', '身高格式不正确', null, 422);
    }

    if (weight !== undefined && weight !== null && weight !== '' && (!Number.isFinite(resolvedWeight) || resolvedWeight <= 0)) {
        return errorResponse(res, 'VALIDATION_ERROR', '体重格式不正确', null, 422);
    }

    if (gender && !['男', '女', '保密'].includes(gender)) {
        return errorResponse(res, 'VALIDATION_ERROR', '性别格式不正确', null, 422);
    }

    try {
        const result = await pool.query(
            `UPDATE users
             SET nickname = $2,
                 email = $3,
                 gender = $4,
                 age = $5,
                 height = $6,
                 weight = $7,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $1
             RETURNING id, username, email, nickname, avatar, phone, gender, age, height, weight, birth_date, province, city, address, role, status, created_at, updated_at, last_login_at`,
            [
                id,
                String(nickname).trim(),
                email || null,
                gender || '保密',
                resolvedAge,
                resolvedHeight,
                resolvedWeight,
            ],
        );

        if (result.rows.length === 0) {
            return errorResponse(res, 'NOT_FOUND', '用户不存在', null, 404);
        }

        const row = result.rows[0];
        const cachedUser = dataStore.users.find(u => u.id === id);
        if (cachedUser) {
            cachedUser.nickname = row.nickname;
            cachedUser.email = row.email;
            cachedUser.gender = row.gender;
            cachedUser.age = row.age !== null ? Number(row.age) : null;
            cachedUser.height = row.height !== null ? Number(row.height) : null;
            cachedUser.weight = row.weight !== null ? Number(row.weight) : null;
            cachedUser.updatedAt = row.updated_at;
        }

        return successResponse(res, {
            id: row.id,
            username: row.username,
            email: row.email,
            nickname: row.nickname,
            avatar: row.avatar,
            phone: row.phone,
            gender: row.gender,
            age: row.age !== null ? Number(row.age) : null,
            height: row.height !== null ? Number(row.height) : null,
            weight: row.weight !== null ? Number(row.weight) : null,
            birthDate: row.birth_date,
            province: row.province,
            city: row.city,
            address: row.address,
            role: row.role,
            status: row.status,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            lastLoginAt: row.last_login_at,
        }, '个人信息更新成功');
    } catch (err) {
        console.error('更新用户信息失败:', err.message);
        return errorResponse(res, 'DB_ERROR', '更新用户信息失败', null, 500);
    }
});

app.post('/api/users/me/avatar', async (req, res) => {
    const session = getSession(req);
    if (!session) {
        return errorResponse(res, 'UNAUTHORIZED', '未授权，需要登录', null, 401);
    }

    const { avatar } = req.body;
    if (!avatar) {
        return errorResponse(res, 'VALIDATION_ERROR', '头像不能为空', null, 422);
    }

    if (session.role !== 'user') {
        return errorResponse(res, 'FORBIDDEN', '用户不存在', null, 404);
    }

    try {
        const result = await pool.query(
            'UPDATE users SET avatar = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING avatar, updated_at',
            [session.userId, avatar],
        );

        if (result.rows.length === 0) {
            return errorResponse(res, 'NOT_FOUND', '用户不存在', null, 404);
        }

        const cachedUser = dataStore.users.find(u => u.id === session.userId);
        if (cachedUser) {
            cachedUser.avatar = avatar;
            cachedUser.updatedAt = result.rows[0].updated_at;
        }

        return successResponse(res, {
            avatarUrl: result.rows[0].avatar,
            avatar: result.rows[0].avatar,
        }, '头像更新成功');
    } catch (err) {
        console.error('更新用户头像失败:', err.message);
        return errorResponse(res, 'DB_ERROR', '更新头像失败', null, 500);
    }
});

app.get('/api/health/data', async (req, res) => {
    const session = getSession(req);
    if (!session || session.role !== 'user') {
        return errorResponse(res, 'FORBIDDEN', '权限不足', null, 403);
    }

    const today = new Date().toISOString().split('T')[0];
    const { date = today } = req.query;

    try {
        const result = await pool.query(
            `SELECT * FROM health_data WHERE user_id = $1 AND date = $2`,
            [session.userId, date],
        );

        if (result.rows.length === 0) {
            return successResponse(res, {
                date,
                heartRate: null,
                bloodPressure: null,
                bloodPressureSystolic: null,
                bloodPressureDiastolic: null,
                steps: null,
                sleepHours: null,
                sleepDeepHours: null,
                sleepLightHours: null,
                sleepRemHours: null,
                weight: null,
                height: null,
                bmi: null,
                caloriesBurned: null,
                caloriesIntake: null,
                waterIntake: null,
                temperature: null,
                oxygenSaturation: null,
                source: 'manual',
                updatedAt: null,
            });
        }

        return successResponse(res, mapHealthRowToResponse(result.rows[0]));
    } catch (err) {
        console.error('读取健康数据失败:', err.message);
        return errorResponse(res, 'DB_ERROR', '读取健康数据失败', null, 500);
    }
});

app.post('/api/health/data', async (req, res) => {
    const session = getSession(req);
    if (!session || session.role !== 'user') {
        return errorResponse(res, 'FORBIDDEN', '权限不足', null, 403);
    }

    const today = new Date().toISOString().split('T')[0];
    const {
        date = today,
        heartRate,
        bloodPressure,
        bloodPressureSystolic,
        bloodPressureDiastolic,
        steps,
        sleepHours,
        sleepDeepHours,
        sleepLightHours,
        sleepRemHours,
        weight,
        height,
        caloriesBurned,
        caloriesIntake,
        waterIntake,
        temperature,
        oxygenSaturation,
    } = req.body;

    const resolvedSystolic = bloodPressureSystolic ?? (bloodPressure ? parseInt(String(bloodPressure).split('/')[0], 10) || null : null);
    const resolvedDiastolic = bloodPressureDiastolic ?? (bloodPressure ? parseInt(String(bloodPressure).split('/')[1], 10) || null : null);
    const resolvedWeight = weight !== undefined && weight !== null && weight !== '' ? Number(weight) : null;
    const resolvedHeight = height !== undefined && height !== null && height !== '' ? Number(height) : null;
    const bmi = resolvedWeight && resolvedHeight
        ? parseFloat((resolvedWeight / ((resolvedHeight / 100) * (resolvedHeight / 100))).toFixed(1))
        : null;

    try {
        const result = await pool.query(
            `INSERT INTO health_data (
                id, user_id, date, heart_rate, blood_pressure_systolic, blood_pressure_diastolic,
                steps, sleep_hours, sleep_deep_hours, sleep_light_hours, sleep_rem_hours,
                weight, height, bmi, calories_burned, calories_intake, water_intake,
                temperature, oxygen_saturation, source, updated_at
            )
            VALUES (
                $1, $2, $3, $4, $5, $6,
                $7, $8, $9, $10, $11,
                $12, $13, $14, $15, $16, $17,
                $18, $19, $20, CURRENT_TIMESTAMP
            )
            ON CONFLICT (user_id, date)
            DO UPDATE SET
                heart_rate = EXCLUDED.heart_rate,
                blood_pressure_systolic = EXCLUDED.blood_pressure_systolic,
                blood_pressure_diastolic = EXCLUDED.blood_pressure_diastolic,
                steps = EXCLUDED.steps,
                sleep_hours = EXCLUDED.sleep_hours,
                sleep_deep_hours = EXCLUDED.sleep_deep_hours,
                sleep_light_hours = EXCLUDED.sleep_light_hours,
                sleep_rem_hours = EXCLUDED.sleep_rem_hours,
                weight = EXCLUDED.weight,
                height = EXCLUDED.height,
                bmi = EXCLUDED.bmi,
                calories_burned = EXCLUDED.calories_burned,
                calories_intake = EXCLUDED.calories_intake,
                water_intake = EXCLUDED.water_intake,
                temperature = EXCLUDED.temperature,
                oxygen_saturation = EXCLUDED.oxygen_saturation,
                source = EXCLUDED.source,
                updated_at = CURRENT_TIMESTAMP
            RETURNING *`,
            [
                `health_${generateId()}`,
                session.userId,
                date,
                heartRate ?? null,
                resolvedSystolic,
                resolvedDiastolic,
                steps ?? null,
                sleepHours ?? null,
                sleepDeepHours ?? null,
                sleepLightHours ?? null,
                sleepRemHours ?? null,
                resolvedWeight,
                resolvedHeight,
                bmi,
                caloriesBurned ?? null,
                caloriesIntake ?? null,
                waterIntake ?? null,
                temperature ?? null,
                oxygenSaturation ?? null,
                'manual',
            ],
        );

        const healthData = mapHealthRowToResponse(result.rows[0]);
        return successResponse(res, {
            date: healthData.date,
            heartRate: healthData.heartRate,
            steps: healthData.steps,
            bmi: healthData.bmi,
            updatedAt: healthData.updatedAt,
        }, '健康数据保存成功');
    } catch (err) {
        console.error('保存健康数据失败:', err.message);
        return errorResponse(res, 'DB_ERROR', '保存健康数据失败', null, 500);
    }
});

app.get('/api/health/history', async (req, res) => {
    const session = getSession(req);
    if (!session || session.role !== 'user') {
        return errorResponse(res, 'FORBIDDEN', '权限不足', null, 403);
    }

    const { days = 7, startDate, endDate } = req.query;
    let query = 'SELECT * FROM health_data WHERE user_id = $1';
    const params = [session.userId];

    if (startDate && endDate) {
        query += ' AND date >= $2 AND date <= $3';
        params.push(startDate, endDate);
    } else {
        const today = new Date();
        const daysAgo = new Date(today.getTime() - (parseInt(days, 10) - 1) * 24 * 60 * 60 * 1000);
        const startDateStr = daysAgo.toISOString().split('T')[0];
        query += ' AND date >= $2';
        params.push(startDateStr);
    }

    query += ' ORDER BY date DESC';

    try {
        const result = await pool.query(query, params);
        const list = result.rows.map(mapHealthRowToResponse);
        return successResponse(res, {
            list,
            days: parseInt(days, 10),
            total: list.length,
        });
    } catch (err) {
        console.error('读取健康历史失败:', err.message);
        return errorResponse(res, 'DB_ERROR', '读取健康历史失败', null, 500);
    }
});

app.post('/api/health/migrate-legacy-steps', async (req, res) => {
    const session = getSession(req);
    if (!session || session.role !== 'user') {
        return errorResponse(res, 'FORBIDDEN', '权限不足', null, 403);
    }

    try {
        const result = await pool.query(
            `UPDATE health_data
             SET
                steps = GREATEST(1, ROUND(steps / 100.0)),
                legacy_steps_migrated = true,
                legacy_steps_original_value = steps,
                updated_at = CURRENT_TIMESTAMP
             WHERE user_id = $1
               AND steps IS NOT NULL
               AND steps > 720
               AND COALESCE(legacy_steps_migrated, false) = false`,
            [session.userId],
        );

        return successResponse(res, {
            updatedCount: result.rowCount || 0,
        }, '历史运动时长数据迁移成功');
    } catch (err) {
        console.error('迁移历史运动时长数据失败:', err.message);
        return errorResponse(res, 'DB_ERROR', '迁移历史运动时长数据失败', null, 500);
    }
});

app.get('/api/health/stats', async (req, res) => {
    const session = getSession(req);
    if (!session || session.role !== 'user') {
        return errorResponse(res, 'FORBIDDEN', '权限不足', null, 403);
    }

    const { period = 'week', startDate, endDate } = req.query;

    const today = new Date();
    let start;
    let end;

    if (startDate && endDate) {
        start = startDate;
        end = endDate;
    } else {
        end = today.toISOString().split('T')[0];
        let daysToSubtract;
        switch (period) {
            case 'week': daysToSubtract = 6; break;
            case 'month': daysToSubtract = 29; break;
            case 'quarter': daysToSubtract = 89; break;
            case 'year': daysToSubtract = 364; break;
            default: daysToSubtract = 6;
        }
        const startDateObj = new Date(today.getTime() - daysToSubtract * 24 * 60 * 60 * 1000);
        start = startDateObj.toISOString().split('T')[0];
    }

    try {
        const result = await pool.query(
            'SELECT * FROM health_data WHERE user_id = $1 AND date >= $2 AND date <= $3 ORDER BY date ASC',
            [session.userId, start, end],
        );

        const healthHistory = result.rows.map(mapHealthRowToResponse);
        return successResponse(res, buildHealthStats(healthHistory, period, start, end));
    } catch (err) {
        console.error('读取健康统计失败:', err.message);
        return errorResponse(res, 'DB_ERROR', '读取健康统计失败', null, 500);
    }
});

app.post('/api/appointments', async (req, res) => {
    const session = getSession(req);
    if (!session || session.role !== 'user') {
        return errorResponse(res, 'FORBIDDEN', '权限不足', null, 403);
    }

    const {
        hospitalId,
        hospitalName,
        department,
        doctor,
        appointmentTime,
        patientName,
        patientId,
        patientPhone,
        symptoms,
        notes,
        emergencyContact,
        reminderMinutes = 30,
    } = req.body;

    if (!hospitalId || !hospitalName || !department || !appointmentTime || !patientName || !patientPhone) {
        return errorResponse(res, 'VALIDATION_ERROR', '必填字段不能为空', null, 422);
    }

    const user = dataStore.users.find(u => u.id === session.userId);
    const hospital = dataStore.hospitals.find(h => h.id === hospitalId);

    if (!hospital) {
        return errorResponse(res, 'NOT_FOUND', '医院不存在', null, 404);
    }

    const appointmentNumber = `A${new Date().toISOString().slice(0, 10).replace(/-/g, '')}${String(Date.now()).slice(-6)}`;
    const newAppointment = {
        id: `appt_${generateId()}`,
        appointmentNumber,
        userId: session.userId,
        username: user?.username || '',
        hospitalId,
        hospitalName,
        department,
        doctor: doctor || '',
        appointmentTime,
        patientName,
        patientId: patientId || '',
        patientPhone,
        symptoms: symptoms || '',
        notes: notes || '',
        emergencyContact: emergencyContact || null,
        reminderMinutes: Number.isFinite(Number(reminderMinutes)) ? Number(reminderMinutes) : 30,
        status: 'pending',
    };

    try {
        const result = await pool.query(
            `INSERT INTO appointments (
                id, appointment_number, user_id, username, hospital_id, hospital_name,
                department, doctor, appointment_time, patient_name, patient_id,
                patient_phone, symptoms, notes, emergency_contact, reminder_minutes, status, updated_at
            ) VALUES (
                $1, $2, $3, $4, $5, $6,
                $7, $8, $9, $10, $11,
                $12, $13, $14, $15, $16, $17, CURRENT_TIMESTAMP
            ) RETURNING *`,
            [
                newAppointment.id,
                newAppointment.appointmentNumber,
                newAppointment.userId,
                newAppointment.username,
                newAppointment.hospitalId,
                newAppointment.hospitalName,
                newAppointment.department,
                newAppointment.doctor,
                newAppointment.appointmentTime,
                newAppointment.patientName,
                newAppointment.patientId,
                newAppointment.patientPhone,
                newAppointment.symptoms,
                newAppointment.notes,
                newAppointment.emergencyContact,
                newAppointment.reminderMinutes,
                newAppointment.status,
            ],
        );

        const appointment = mapAppointmentRow(result.rows[0]);
        return res.status(201).json({
            success: true,
            data: {
                id: appointment.id,
                status: appointment.status,
                appointmentNumber: appointment.appointmentNumber,
                createdAt: appointment.createdAt,
            },
            message: '预约创建成功，请等待医院确认',
            timestamp: new Date().toISOString(),
        });
    } catch (err) {
        console.error('创建预约失败:', err.message);
        return errorResponse(res, 'DB_ERROR', '创建预约失败', null, 500);
    }
});

app.get('/api/appointments/my', async (req, res) => {
    const session = getSession(req);
    if (!session || session.role !== 'user') {
        return errorResponse(res, 'FORBIDDEN', '权限不足', null, 403);
    }

    const { status, page = 1, pageSize = 30 } = req.query;

    try {
        const result = await pool.query(
            `SELECT * FROM appointments
             WHERE user_id = $1 AND ($2::text IS NULL OR status = $2)
             ORDER BY created_at DESC`,
            [session.userId, status || null],
        );

        const appointments = result.rows.map(mapAppointmentRow).map(a => ({
            ...a,
            canCancel: a.status === 'pending' || a.status === 'confirmed',
            canReschedule: a.status === 'pending' || a.status === 'confirmed',
        }));

        return successResponse(res, paginate(appointments, page, pageSize));
    } catch (err) {
        console.error('读取我的预约失败:', err.message);
        return errorResponse(res, 'DB_ERROR', '读取我的预约失败', null, 500);
    }
});

app.post('/api/consultations', async (req, res) => {
    const session = getSession(req);
    if (!session || session.role !== 'user') {
        return errorResponse(res, 'FORBIDDEN', '权限不足', null, 403);
    }

    const {
        hospitalId,
        hospitalName,
        doctor,
        department,
        subject,
        content,
    } = req.body || {};

    if (!hospitalId || !department) {
        return errorResponse(res, 'VALIDATION_ERROR', '医院、科室不能为空', null, 422);
    }

    const hospital = dataStore.hospitals.find(item => item.id === hospitalId && item.role === 'hospital');
    if (!hospital) {
        return errorResponse(res, 'NOT_FOUND', '医院不存在', null, 404);
    }

    const resolvedHospitalName = String(hospitalName || hospital.name || '').trim();
    const resolvedSubject = String(subject || '').trim();
    const initialMessageContent = String(content || resolvedSubject).trim();

    const user = dataStore.users.find(item => item.id === session.userId);
    const now = new Date().toISOString();
    const consultation = {
        id: `consult_${generateId()}`,
        hospitalId,
        hospitalName: resolvedHospitalName,
        userId: session.userId,
        userName: user?.nickname || user?.username || session.username || '用户',
        doctor: doctor || '',
        department,
        subject: resolvedSubject,
        summary: initialMessageContent || resolvedSubject,
        status: 'connecting',
        rating: null,
        feedback: '',
        hospitalLastReadAt: null,
        userLastReadAt: now,
        startTime: now,
        endTime: null,
        lastMessageAt: now,
        updatedAt: now,
    };

    const messages = [];
    if (initialMessageContent) {
        const initialMessage = {
            id: `consult_msg_${generateId()}`,
            consultationId: consultation.id,
            senderRole: 'user',
            senderId: session.userId,
            senderName: consultation.userName,
            content: initialMessageContent,
            type: 'text',
            createdAt: now,
        };
        dataStore.consultationMessages.push(initialMessage);
        messages.push(mapConsultationMessage(initialMessage));
    }

    const greetingContent = String(
        hospital.welcomeMessage
        || `您好，这里是${resolvedHospitalName}${department ? ` ${department}` : ''}，很高兴为您服务。请先描述一下您的情况，我们会尽快为您解答。`,
    ).trim();

    const greetingMessage = {
        id: `consult_msg_${generateId()}`,
        consultationId: consultation.id,
        senderRole: 'hospital',
        senderId: hospital.id,
        senderName: resolvedHospitalName,
        content: greetingContent,
        type: 'text',
        createdAt: new Date(Date.now() + 1).toISOString(),
    };
    dataStore.consultationMessages.push(greetingMessage);
    messages.push(mapConsultationMessage(greetingMessage));

    dataStore.consultations.push(consultation);
    pushUserNotification({
        userId: consultation.userId,
        title: '咨询已创建',
        content: `您向 ${consultation.hospitalName} 发起的“${consultation.subject || consultation.department || '在线咨询'}”已创建成功，医院将尽快回复。`,
        level: 'success',
        type: 'consultation-created',
    });

    return res.status(201).json({
        success: true,
        data: {
            consultation: mapConsultationItem({
                ...consultation,
                messages,
            }),
        },
        message: '咨询创建成功',
        timestamp: now,
    });
});

app.get('/api/consultations', async (req, res) => {
    const session = getSession(req);
    if (!session || !['user', 'hospital'].includes(session.role)) {
        return errorResponse(res, 'FORBIDDEN', '权限不足', null, 403);
    }

    const consultations = dataStore.consultations
        .filter(item => (session.role === 'user' ? item.userId === session.userId : item.hospitalId === session.userId))
        .map(item => {
            const messages = dataStore.consultationMessages
                .filter(message => message.consultationId === item.id)
                .map(mapConsultationMessage)
                .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

            const unreadCount = session.role === 'user'
                ? countUnreadConsultationMessages(item.id, 'hospital', item.userLastReadAt)
                : countUnreadConsultationMessages(item.id, 'user', item.hospitalLastReadAt);

            return mapConsultationItem({
                ...item,
                messages,
                unreadCount,
                hasUnread: unreadCount > 0,
                lastMessageAt: item.lastMessageAt || messages[messages.length - 1]?.createdAt,
            });
        })
        .sort((a, b) => {
            if (Number(b.hasUnread) !== Number(a.hasUnread)) {
                return Number(b.hasUnread) - Number(a.hasUnread);
            }
            return new Date(b.lastMessageAt) - new Date(a.lastMessageAt);
        });

    return successResponse(res, {
        list: consultations,
        consultations,
    });
});

app.get('/api/consultations/:consultationId', async (req, res) => {
    const session = getSession(req);
    if (!session || !['user', 'hospital'].includes(session.role)) {
        return errorResponse(res, 'FORBIDDEN', '权限不足', null, 403);
    }

    const { consultationId } = req.params;
    const consultation = dataStore.consultations.find(
        item => item.id === consultationId && (session.role === 'user' ? item.userId === session.userId : item.hospitalId === session.userId),
    );

    if (!consultation) {
        return errorResponse(res, 'NOT_FOUND', '咨询记录不存在', null, 404);
    }

    const messages = dataStore.consultationMessages
        .filter(item => item.consultationId === consultationId)
        .map(mapConsultationMessage)
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    const now = new Date().toISOString();
    if (session.role === 'user') {
        consultation.userLastReadAt = now;
    } else {
        consultation.hospitalLastReadAt = now;
    }

    return successResponse(res, {
        consultation: mapConsultationItem({
            ...consultation,
            messages,
            unreadCount: 0,
            hasUnread: false,
        }),
        messages,
    });
});

app.post('/api/consultations/:consultationId/messages', async (req, res) => {
    const session = getSession(req);
    if (!session || session.role !== 'user') {
        return errorResponse(res, 'FORBIDDEN', '权限不足', null, 403);
    }

    const { consultationId } = req.params;
    const { content, type = 'text' } = req.body || {};
    if (!content || !String(content).trim()) {
        return errorResponse(res, 'VALIDATION_ERROR', '消息内容不能为空', null, 422);
    }

    const consultation = dataStore.consultations.find(
        item => item.id === consultationId && item.userId === session.userId,
    );
    if (!consultation) {
        return errorResponse(res, 'NOT_FOUND', '咨询记录不存在', null, 404);
    }
    if (consultation.status === 'completed') {
        return errorResponse(res, 'BAD_REQUEST', '咨询已结束，无法继续发送消息', null, 400);
    }

    const senderName = consultation.userName || session.username || '用户';
    const now = new Date().toISOString();
    const message = {
        id: `consult_msg_${generateId()}`,
        consultationId,
        senderRole: 'user',
        senderId: session.userId,
        senderName,
        content: String(content).trim(),
        type,
        createdAt: now,
    };

    dataStore.consultationMessages.push(message);
    consultation.status = consultation.status === 'connecting' ? 'consulting' : consultation.status;
    consultation.summary = consultation.summary || message.content;
    consultation.userLastReadAt = now;
    consultation.lastMessageAt = now;
    consultation.updatedAt = now;

    return successResponse(res, {
        message: mapConsultationMessage(message),
        consultation: mapConsultationItem(consultation),
    }, '消息发送成功');
});

app.put('/api/consultations/:consultationId/status', async (req, res) => {
    const session = getSession(req);
    if (!session || session.role !== 'user') {
        return errorResponse(res, 'FORBIDDEN', '权限不足', null, 403);
    }

    const { consultationId } = req.params;
    const { status } = req.body || {};
    if (status !== 'completed') {
        return errorResponse(res, 'VALIDATION_ERROR', '无效的咨询状态', null, 422);
    }

    const consultation = dataStore.consultations.find(
        item => item.id === consultationId && item.userId === session.userId,
    );
    if (!consultation) {
        return errorResponse(res, 'NOT_FOUND', '咨询记录不存在', null, 404);
    }
    if (consultation.status === 'completed') {
        return errorResponse(res, 'BAD_REQUEST', '咨询已结束', null, 400);
    }

    const now = new Date().toISOString();
    consultation.status = 'completed';
    consultation.endTime = now;
    consultation.userLastReadAt = now;
    consultation.lastMessageAt = now;
    consultation.updatedAt = now;

    return successResponse(res, {
        consultation: mapConsultationItem(consultation),
    }, '咨询已结束');
});

app.put('/api/consultations/:consultationId/rating', async (req, res) => {
    const session = getSession(req);
    if (!session || session.role !== 'user') {
        return errorResponse(res, 'FORBIDDEN', '权限不足', null, 403);
    }

    const { consultationId } = req.params;
    const { rating, feedback } = req.body || {};
    const normalizedRating = Number(rating);
    if (!Number.isInteger(normalizedRating) || normalizedRating < 1 || normalizedRating > 5) {
        return errorResponse(res, 'VALIDATION_ERROR', '评分必须为1-5分', null, 422);
    }

    const consultation = dataStore.consultations.find(
        item => item.id === consultationId && item.userId === session.userId,
    );
    if (!consultation) {
        return errorResponse(res, 'NOT_FOUND', '咨询记录不存在', null, 404);
    }
    if (consultation.status !== 'completed') {
        return errorResponse(res, 'BAD_REQUEST', '咨询结束后才能评价', null, 400);
    }

    consultation.rating = normalizedRating;
    consultation.feedback = String(feedback || '').trim();
    consultation.updatedAt = new Date().toISOString();

    return successResponse(res, {
        consultation: mapConsultationItem(consultation),
    }, '评价成功');
});

app.post('/api/consultations/:consultationId/files', async (req, res) => {
    const session = getSession(req);
    if (!session || session.role !== 'user') {
        return errorResponse(res, 'FORBIDDEN', '权限不足', null, 403);
    }

    const { consultationId } = req.params;
    const consultation = dataStore.consultations.find(
        item => item.id === consultationId && item.userId === session.userId,
    );
    if (!consultation) {
        return errorResponse(res, 'NOT_FOUND', '咨询记录不存在', null, 404);
    }
    if (consultation.status === 'completed') {
        return errorResponse(res, 'BAD_REQUEST', '咨询已结束，无法上传文件', null, 400);
    }

    const filePayload = req.body?.file;
    const fileName = req.body?.filename || req.body?.name || 'consultation-file';
    const mimeType = req.body?.mimeType || req.body?.type || 'application/octet-stream';
    const fileType = mimeType.startsWith('image/') ? 'image' : 'file';

    if (!filePayload) {
        return errorResponse(res, 'VALIDATION_ERROR', '文件不能为空', null, 422);
    }

    const now = new Date().toISOString();
    const uploadedFile = {
        id: `consult_file_${generateId()}`,
        consultationId,
        url: typeof filePayload === 'string' ? filePayload : `uploaded://${consultationId}/${generateId()}`,
        filename: fileName,
        mimeType,
        fileType,
        createdAt: now,
    };

    consultation.userLastReadAt = now;
    consultation.lastMessageAt = now;
    consultation.updatedAt = now;

    return successResponse(res, {
        file: uploadedFile,
    }, '文件上传成功');
});

app.post('/api/messages', async (req, res) => {
    const session = getSession(req);
    if (!session || session.role !== 'hospital') {
        return errorResponse(res, 'FORBIDDEN', '权限不足', null, 403);
    }

    const { consultationId, content, type = 'text' } = req.body;
    if (!consultationId || !content || !String(content).trim()) {
        return errorResponse(res, 'VALIDATION_ERROR', '消息内容不能为空', null, 422);
    }

    const consultation = dataStore.consultations.find(
        item => item.id === consultationId && item.hospitalId === session.userId,
    );
    if (!consultation) {
        return errorResponse(res, 'NOT_FOUND', '咨询记录不存在', null, 404);
    }
    if (consultation.status === 'completed') {
        return errorResponse(res, 'BAD_REQUEST', '咨询已结束，无法继续回复', null, 400);
    }

    const hospital = dataStore.hospitals.find(item => item.id === session.userId);
    const now = new Date().toISOString();
    const message = {
        id: `consult_msg_${generateId()}`,
        consultationId,
        senderRole: 'hospital',
        senderId: session.userId,
        senderName: hospital?.name || session.username || '医院',
        content: String(content).trim(),
        type,
        createdAt: now,
    };

    dataStore.consultationMessages.push(message);
    consultation.status = consultation.status === 'connecting' ? 'consulting' : consultation.status;
    consultation.hospitalLastReadAt = now;
    consultation.lastMessageAt = now;
    consultation.updatedAt = now;
    pushUserNotification({
        userId: consultation.userId,
        title: '医院有新回复',
        content: `${message.senderName} 回复了您的在线咨询：${message.content.slice(0, 60)}${message.content.length > 60 ? '...' : ''}`,
        level: 'info',
        type: 'consultation-reply',
    });

    return res.json({
        success: true,
        message: mapConsultationMessage(message),
        consultation: mapConsultationItem(consultation),
        timestamp: now,
    });
});

app.get('/api/messages/poll', async (req, res) => {
    const session = getSession(req);
    if (!session || !['hospital', 'user'].includes(session.role)) {
        return errorResponse(res, 'FORBIDDEN', '权限不足', null, 403);
    }

    const { consultationId, since } = req.query;
    const consultation = consultationId
        ? dataStore.consultations.find(item => item.id === consultationId && (session.role === 'hospital' ? item.hospitalId === session.userId : item.userId === session.userId))
        : null;

    if (consultationId && !consultation) {
        return errorResponse(res, 'NOT_FOUND', '咨询记录不存在', null, 404);
    }

    const unreadSenderRole = session.role === 'hospital' ? 'user' : 'hospital';
    const readAtField = session.role === 'hospital' ? 'hospitalLastReadAt' : 'userLastReadAt';
    const countUnread = item => countUnreadConsultationMessages(item.id, unreadSenderRole, item[readAtField]);
    const visibleConsultations = consultation
        ? [consultation]
        : dataStore.consultations.filter(item => (session.role === 'hospital' ? item.hospitalId === session.userId : item.userId === session.userId));

    const sinceTimestamp = since ? new Date(String(since)).getTime() : NaN;
    const hasValidSince = Number.isFinite(sinceTimestamp);
    const messages = dataStore.consultationMessages
        .filter(item => visibleConsultations.some(record => record.id === item.consultationId))
        .filter(item => {
            if (hasValidSince) {
                return new Date(item.createdAt).getTime() > sinceTimestamp;
            }

            if (!consultationId) {
                return item.senderRole === unreadSenderRole;
            }

            return item.senderRole === unreadSenderRole && new Date(item.createdAt).getTime() > new Date(consultation[readAtField] || 0).getTime();
        })
        .map(mapConsultationMessage)
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    const unreadCount = visibleConsultations.reduce((total, item) => total + countUnread(item), 0);

    if (consultation && messages.length > 0) {
        consultation[readAtField] = new Date().toISOString();
        consultation.updatedAt = consultation.updatedAt || consultation[readAtField];
    }

    return res.json({
        success: true,
        hasNewMessages: messages.length > 0,
        unreadCount,
        messages,
        timestamp: new Date().toISOString(),
    });
});

app.get('/api/appointments/hospital', async (req, res) => {
    const session = getSession(req);
    if (!session || session.role !== 'hospital') {
        return errorResponse(res, 'FORBIDDEN', '权限不足', null, 403);
    }

    const { days = 30, status, department, page = 1, pageSize = 30 } = req.query;

    try {
        const result = await pool.query(
            `SELECT * FROM appointments
             WHERE hospital_id = $1
               AND ($2::text IS NULL OR status = $2)
               AND ($3::text IS NULL OR department = $3)
               AND created_at >= CURRENT_TIMESTAMP - ($4::int * INTERVAL '1 day')
             ORDER BY created_at DESC`,
            [session.userId, status || null, department || null, parseInt(days, 10) || 30],
        );

        const appointments = result.rows.map(mapAppointmentRow);
        const paginatedData = paginate(appointments, page, pageSize);
        const stats = {
            pending: appointments.filter(a => a.status === 'pending').length,
            confirmed: appointments.filter(a => a.status === 'confirmed').length,
            completed: appointments.filter(a => a.status === 'completed').length,
            cancelled: appointments.filter(a => a.status === 'cancelled').length,
        };

        return successResponse(res, {
            appointments: paginatedData.list,
            total: paginatedData.total,
            stats,
        });
    } catch (err) {
        console.error('读取医院预约失败:', err.message);
        return errorResponse(res, 'DB_ERROR', '读取医院预约失败', null, 500);
    }
});

app.put('/api/appointments/:appointmentId/reminder', async (req, res) => {
    const session = getSession(req);
    if (!session || session.role !== 'user') {
        return errorResponse(res, 'FORBIDDEN', '权限不足', null, 403);
    }

    const { appointmentId } = req.params;
    const { reminderMinutes } = req.body;
    const normalizedReminderMinutes = Number(reminderMinutes);

    if (!Number.isInteger(normalizedReminderMinutes) || ![15, 30, 60, 120, 1440].includes(normalizedReminderMinutes)) {
        return errorResponse(res, 'VALIDATION_ERROR', '无效的提醒时间', null, 422);
    }

    try {
        const result = await pool.query('SELECT * FROM appointments WHERE id = $1', [appointmentId]);
        if (result.rows.length === 0) {
            return errorResponse(res, 'NOT_FOUND', '预约不存在', null, 404);
        }

        const appointment = mapAppointmentRow(result.rows[0]);
        if (appointment.userId !== session.userId) {
            return errorResponse(res, 'FORBIDDEN', '权限不足', null, 403);
        }

        const updated = await pool.query(
            `UPDATE appointments
             SET reminder_minutes = $2, updated_at = CURRENT_TIMESTAMP
             WHERE id = $1
             RETURNING *`,
            [appointmentId, normalizedReminderMinutes],
        );

        const updatedAppointment = mapAppointmentRow(updated.rows[0]);
        pushUserNotification({
            userId: updatedAppointment.userId,
            title: '预约提醒已更新',
            content: `您在 ${updatedAppointment.hospitalName} ${updatedAppointment.department}${updatedAppointment.doctor ? ` · ${updatedAppointment.doctor}` : ''} 的提醒时间已更新为提前 ${normalizedReminderMinutes >= 1440 ? '1天' : normalizedReminderMinutes >= 60 ? `${normalizedReminderMinutes / 60}小时` : `${normalizedReminderMinutes}分钟`}。`,
            level: 'info',
            type: 'appointment-reminder',
            appointmentId: updatedAppointment.id,
            appointmentNumber: updatedAppointment.appointmentNumber,
        });
        return successResponse(res, {
            id: updatedAppointment.id,
            reminderMinutes: updatedAppointment.reminderMinutes,
            updatedAt: updatedAppointment.updatedAt,
        }, '预约提醒保存成功');
    } catch (err) {
        console.error('保存预约提醒失败:', err.message);
        return errorResponse(res, 'DB_ERROR', '保存预约提醒失败', null, 500);
    }
});

app.put('/api/appointments/:appointmentId/status', async (req, res) => {
    const session = getSession(req);
    if (!session) {
        return errorResponse(res, 'UNAUTHORIZED', '未授权，需要登录', null, 401);
    }

    const { appointmentId } = req.params;
    const { status, reason } = req.body;

    if (!status || !['confirmed', 'completed', 'cancelled'].includes(status)) {
        return errorResponse(res, 'VALIDATION_ERROR', '无效的状态', null, 422);
    }

    try {
        const result = await pool.query('SELECT * FROM appointments WHERE id = $1', [appointmentId]);
        if (result.rows.length === 0) {
            return errorResponse(res, 'NOT_FOUND', '预约不存在', null, 404);
        }

        const appointment = mapAppointmentRow(result.rows[0]);

        if (session.role === 'user') {
            if (appointment.userId !== session.userId) {
                return errorResponse(res, 'FORBIDDEN', '权限不足', null, 403);
            }
            if (status !== 'cancelled') {
                return errorResponse(res, 'FORBIDDEN', '用户只能取消预约', null, 403);
            }
            if (appointment.status === 'completed' || appointment.status === 'cancelled') {
                return errorResponse(res, 'BAD_REQUEST', '预约已为最终状态，不可变更', null, 400);
            }
        } else if (session.role === 'hospital') {
            if (appointment.hospitalId !== session.userId) {
                return errorResponse(res, 'FORBIDDEN', '权限不足', null, 403);
            }
            if (appointment.status === 'completed' || appointment.status === 'cancelled') {
                return errorResponse(res, 'BAD_REQUEST', '预约已为最终状态，不可变更', null, 400);
            }
            if (status === 'confirmed' && appointment.status !== 'pending') {
                return errorResponse(res, 'BAD_REQUEST', '只有待确认的预约可以确认', null, 400);
            }
            if (status === 'completed' && appointment.status !== 'confirmed') {
                return errorResponse(res, 'BAD_REQUEST', '只有已确认的预约可以完成', null, 400);
            }
        } else {
            return errorResponse(res, 'FORBIDDEN', '权限不足', null, 403);
        }

        const updated = await pool.query(
            `UPDATE appointments
             SET status = $2, cancel_reason = $3, updated_at = CURRENT_TIMESTAMP
             WHERE id = $1
             RETURNING *`,
            [appointmentId, status, reason || null],
        );

        const updatedAppointment = mapAppointmentRow(updated.rows[0]);
        if (status === 'confirmed') {
            pushUserNotification({
                userId: updatedAppointment.userId,
                title: '预约已确认',
                content: `您在 ${updatedAppointment.hospitalName} 的预约已确认，就诊时间为 ${new Date(updatedAppointment.appointmentTime).toLocaleString('zh-CN')}${updatedAppointment.doctor ? `，接诊医生：${updatedAppointment.doctor}` : ''}。`,
                level: 'success',
                type: 'appointment-confirmed',
                appointmentId: updatedAppointment.id,
                appointmentNumber: updatedAppointment.appointmentNumber,
            });
        } else if (status === 'completed') {
            pushUserNotification({
                userId: updatedAppointment.userId,
                title: '预约已完成',
                content: `您在 ${updatedAppointment.hospitalName} 的预约已完成，祝您早日康复。`,
                level: 'info',
                type: 'appointment-completed',
                appointmentId: updatedAppointment.id,
                appointmentNumber: updatedAppointment.appointmentNumber,
            });
        } else if (status === 'cancelled') {
            pushUserNotification({
                userId: updatedAppointment.userId,
                title: '预约已取消',
                content: `您在 ${updatedAppointment.hospitalName} 的预约已取消${reason ? `，原因：${reason}` : '。'}`,
                level: 'warning',
                type: 'appointment-cancelled',
                appointmentId: updatedAppointment.id,
                appointmentNumber: updatedAppointment.appointmentNumber,
            });
        }
        return successResponse(res, {
            id: updatedAppointment.id,
            status: updatedAppointment.status,
            updatedAt: updatedAppointment.updatedAt,
        }, '预约状态更新成功');
    } catch (err) {
        console.error('更新预约状态失败:', err.message);
        return errorResponse(res, 'DB_ERROR', '更新预约状态失败', null, 500);
    }
});

app.put('/api/appointments/:appointmentId', async (req, res) => {
    const session = getSession(req);
    if (!session || session.role !== 'user') {
        return errorResponse(res, 'FORBIDDEN', '权限不足', null, 403);
    }

    const { appointmentId } = req.params;
    const { appointmentTime } = req.body;

    if (!appointmentTime) {
        return errorResponse(res, 'VALIDATION_ERROR', '预约时间不能为空', null, 422);
    }

    try {
        const result = await pool.query('SELECT * FROM appointments WHERE id = $1', [appointmentId]);
        if (result.rows.length === 0) {
            return errorResponse(res, 'NOT_FOUND', '预约不存在', null, 404);
        }

        const appointment = mapAppointmentRow(result.rows[0]);

        if (appointment.userId !== session.userId) {
            return errorResponse(res, 'FORBIDDEN', '权限不足', null, 403);
        }

        if (appointment.status !== 'pending' && appointment.status !== 'confirmed') {
            return errorResponse(res, 'BAD_REQUEST', '当前预约状态不可改签', null, 400);
        }

        const updated = await pool.query(
            `UPDATE appointments
             SET appointment_time = $2, updated_at = CURRENT_TIMESTAMP
             WHERE id = $1
             RETURNING *`,
            [appointmentId, appointmentTime],
        );

        const updatedAppointment = mapAppointmentRow(updated.rows[0]);
        return successResponse(res, {
            appointment: updatedAppointment,
        }, '预约改签成功');
    } catch (err) {
        console.error('改签预约失败:', err.message);
        return errorResponse(res, 'DB_ERROR', '改签预约失败', null, 500);
    }
});

app.delete('/api/appointments/:appointmentId', async (req, res) => {
    const session = getSession(req);
    if (!session) {
        return errorResponse(res, 'UNAUTHORIZED', '未授权，需要登录', null, 401);
    }

    const { appointmentId } = req.params;

    try {
        const result = await pool.query('SELECT * FROM appointments WHERE id = $1', [appointmentId]);
        if (result.rows.length === 0) {
            return errorResponse(res, 'NOT_FOUND', '预约不存在', null, 404);
        }

        const appointment = mapAppointmentRow(result.rows[0]);

        if (session.role === 'user') {
            if (appointment.userId !== session.userId) {
                return errorResponse(res, 'FORBIDDEN', '权限不足', null, 403);
            }
        } else if (session.role !== 'admin') {
            return errorResponse(res, 'FORBIDDEN', '权限不足', null, 403);
        }

        await pool.query('DELETE FROM appointments WHERE id = $1', [appointmentId]);
        return successResponse(res, null, '预约删除成功');
    } catch (err) {
        console.error('删除预约失败:', err.message);
        return errorResponse(res, 'DB_ERROR', '删除预约失败', null, 500);
    }
});

app.get('/api/notifications', (req, res) => {
    const session = getSession(req);
    if (!session || session.role !== 'user') {
        return errorResponse(res, 'FORBIDDEN', '权限不足', null, 403);
    }

    const limit = Math.max(1, Math.min(Number(req.query.limit || 100), 200));
    const notifications = dataStore.notifications
        .filter(item => item.userId === session.userId)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, limit);

    return successResponse(res, notifications);
});

app.post('/api/notifications', (req, res) => {
    const session = getSession(req);
    if (!session || session.role !== 'user') {
        return errorResponse(res, 'FORBIDDEN', '权限不足', null, 403);
    }

    const { title, content, level = 'info', type = 'general', appointmentId = null, appointmentNumber = null } = req.body || {};

    if (!title || !content) {
        return errorResponse(res, 'VALIDATION_ERROR', '通知标题和内容不能为空', null, 422);
    }

    const notification = {
        id: `notification_${generateId()}`,
        userId: session.userId,
        title: String(title).trim(),
        content: String(content).trim(),
        level,
        type,
        appointmentId,
        appointmentNumber,
        isRead: false,
        read: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };

    dataStore.notifications.unshift(notification);
    return successResponse(res, notification, '通知创建成功');
});

app.put('/api/notifications/read-all', (req, res) => {
    const session = getSession(req);
    if (!session || session.role !== 'user') {
        return errorResponse(res, 'FORBIDDEN', '权限不足', null, 403);
    }

    dataStore.notifications = dataStore.notifications.map(item => (
        item.userId === session.userId
            ? { ...item, isRead: true, read: true, updatedAt: new Date().toISOString() }
            : item
    ));

    return successResponse(res, { success: true }, '全部通知已标记为已读');
});

app.put('/api/notifications/:notificationId/read', (req, res) => {
    const session = getSession(req);
    if (!session || session.role !== 'user') {
        return errorResponse(res, 'FORBIDDEN', '权限不足', null, 403);
    }

    const { notificationId } = req.params;
    const notificationIndex = dataStore.notifications.findIndex(item => item.id === notificationId && item.userId === session.userId);

    if (notificationIndex === -1) {
        return errorResponse(res, 'NOT_FOUND', '通知不存在', null, 404);
    }

    dataStore.notifications[notificationIndex] = {
        ...dataStore.notifications[notificationIndex],
        isRead: true,
        read: true,
        updatedAt: new Date().toISOString(),
    };

    return successResponse(res, dataStore.notifications[notificationIndex], '通知已标记为已读');
});

app.delete('/api/notifications/:notificationId', (req, res) => {
    const session = getSession(req);
    if (!session || session.role !== 'user') {
        return errorResponse(res, 'FORBIDDEN', '权限不足', null, 403);
    }

    const { notificationId } = req.params;
    const notificationIndex = dataStore.notifications.findIndex(item => item.id === notificationId && item.userId === session.userId);

    if (notificationIndex === -1) {
        return errorResponse(res, 'NOT_FOUND', '通知不存在', null, 404);
    }

    dataStore.notifications.splice(notificationIndex, 1);
    return successResponse(res, { success: true }, '通知删除成功');
});

app.get('/api/hospitals', async (req, res) => {
    const { province, city, level, keyword, lat, lng, radius = 10, sortBy = 'distance', page = 1, pageSize = 30 } = req.query;

    try {
        const result = await pool.query('SELECT * FROM hospitals WHERE role = $1', ['hospital']);
        let hospitals = result.rows.map((row) => ({
            id: row.id,
            username: row.username,
            name: row.name,
            avatar: row.avatar,
            province: row.province,
            city: row.city,
            address: row.address,
            phone: row.phone,
            email: row.email,
            level: row.level,
            beds: row.beds,
            lat: row.lat !== null ? Number(row.lat) : null,
            lng: row.lng !== null ? Number(row.lng) : null,
            rating: row.rating !== null ? Number(row.rating) : 0,
            reviewCount: row.review_count || 0,
            departments: row.features || [],
            features: row.features || [],
            businessHours: row.business_hours,
            emergency: row.emergency,
            role: row.role,
            status: row.status,
            authCodeUsed: row.auth_code_used,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            lastLoginAt: row.last_login_at,
        }));

        if (province) {
            hospitals = hospitals.filter(h => h.province === province);
        }

        if (city) {
            hospitals = hospitals.filter(h => h.city === city);
        }

        if (level) {
            hospitals = hospitals.filter(h => h.level === level);
        }

        if (keyword) {
            const keywordLower = keyword.toLowerCase();
            hospitals = hospitals.filter(h => {
                const departments = Array.isArray(h.departments) && h.departments.length > 0
                    ? h.departments
                    : Array.isArray(h.features)
                        ? h.features
                        : [];

                return h.name.toLowerCase().includes(keywordLower)
                    || h.address.toLowerCase().includes(keywordLower)
                    || departments.some(department => String(department || '').toLowerCase().includes(keywordLower));
            });
        }

        if (lat && lng) {
            const currentLat = parseFloat(lat);
            const currentLng = parseFloat(lng);
            const radiusKm = parseFloat(radius);

            hospitals = hospitals.map(h => {
                const distance = h.lat !== null && h.lng !== null
                    ? Math.sqrt(Math.pow(h.lat - currentLat, 2) + Math.pow(h.lng - currentLng, 2)) * 111
                    : null;
                return { ...h, distance };
            });
            hospitals = hospitals.filter(h => h.distance !== null && h.distance <= radiusKm);
        }

        if (sortBy === 'rating') {
            hospitals.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        } else if (sortBy === 'name') {
            hospitals.sort((a, b) => a.name.localeCompare(b.name));
        } else if (sortBy === 'distance' && lat && lng) {
            hospitals.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));
        }

        const paginatedData = paginate(hospitals, page, pageSize);
        paginatedData.list = paginatedData.list.map(h => ({
            ...h,
            estimatedTime: h.distance ? Math.round(h.distance * 6) : null,
        }));

        return successResponse(res, paginatedData);
    } catch (err) {
        console.error('读取医院列表失败:', err.message);
        return errorResponse(res, 'DB_ERROR', '读取医院列表失败', null, 500);
    }
});

app.get('/api/admin/users', async (req, res) => {
    const session = getSession(req);
    if (!session || (session.role !== 'admin' && session.role !== 'sub')) {
        return errorResponse(res, 'FORBIDDEN', '权限不足', null, 403);
    }

    const { province, status, keyword, startDate, endDate, page = 1, pageSize = 30 } = req.query;

    try {
        const result = await pool.query('SELECT id, username, email, nickname, avatar, phone, gender, age, height, weight, birth_date, province, city, address, role, status, created_at, updated_at, last_login_at FROM users ORDER BY created_at DESC');
        let users = result.rows.map((row) => ({
            id: row.id,
            username: row.username,
            email: row.email,
            nickname: row.nickname,
            avatar: row.avatar,
            phone: row.phone,
            gender: row.gender,
            age: row.age !== null ? Number(row.age) : null,
            height: row.height !== null ? Number(row.height) : null,
            weight: row.weight !== null ? Number(row.weight) : null,
            birthDate: row.birth_date,
            province: row.province,
            city: row.city,
            address: row.address,
            role: row.role,
            status: row.status,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            lastLoginAt: row.last_login_at,
        }));

        if (session.role === 'sub' && session.province) {
            users = users.filter(u => u.province === session.province);
        }

        if (province) {
            users = users.filter(u => u.province === province);
        }

        if (status) {
            users = users.filter(u => u.status === status);
        }

        if (keyword) {
            const keywordLower = keyword.toLowerCase();
            users = users.filter(u =>
                u.username.toLowerCase().includes(keywordLower) ||
                (u.nickname && u.nickname.toLowerCase().includes(keywordLower)) ||
                (u.email && u.email.toLowerCase().includes(keywordLower))
            );
        }

        if (startDate) {
            users = users.filter(u => u.createdAt >= startDate);
        }

        if (endDate) {
            users = users.filter(u => u.createdAt <= `${endDate}T23:59:59.999Z`);
        }

        return successResponse(res, paginate(users, page, pageSize));
    } catch (err) {
        console.error('读取后台用户列表失败:', err.message);
        return errorResponse(res, 'DB_ERROR', '读取用户列表失败', null, 500);
    }
});

app.delete('/api/admin/users/:userId', async (req, res) => {
    const session = getSession(req);
    if (!session || session.role !== 'admin') {
        return errorResponse(res, 'FORBIDDEN', '权限不足', null, 403);
    }

    const { userId } = req.params;
    const { deleteData = false } = req.query;

    try {
        const result = await pool.query('SELECT id FROM users WHERE id = $1', [userId]);
        if (result.rows.length === 0) {
            return errorResponse(res, 'NOT_FOUND', '用户不存在', null, 404);
        }

        if (deleteData === 'true' || deleteData === true) {
            await pool.query('DELETE FROM health_data WHERE user_id = $1', [userId]);
            await pool.query('DELETE FROM appointments WHERE user_id = $1', [userId]);
        }

        await revokeSessionsByUserId(userId, 'user');
        await pool.query('DELETE FROM users WHERE id = $1', [userId]);
        dataStore.users = dataStore.users.filter(u => u.id !== userId);
        return successResponse(res, null, '用户删除成功');
    } catch (err) {
        console.error('删除用户失败:', err.message);
        return errorResponse(res, 'DB_ERROR', '删除用户失败', null, 500);
    }
});

app.get('/api/admin/hospitals', async (req, res) => {
    const session = getSession(req);
    if (!session || (session.role !== 'admin' && session.role !== 'sub')) {
        return errorResponse(res, 'FORBIDDEN', '权限不足', null, 403);
    }

    const { province, status, keyword, page = 1, pageSize = 30 } = req.query;

    try {
        const result = await pool.query('SELECT * FROM hospitals ORDER BY created_at DESC');
        let hospitals = result.rows.map((row) => ({
            id: row.id,
            username: row.username,
            name: row.name,
            avatar: row.avatar,
            province: row.province,
            city: row.city,
            address: row.address,
            phone: row.phone,
            email: row.email,
            level: row.level,
            beds: row.beds,
            lat: row.lat !== null ? Number(row.lat) : null,
            lng: row.lng !== null ? Number(row.lng) : null,
            rating: row.rating !== null ? Number(row.rating) : 0,
            reviewCount: row.review_count || 0,
            features: row.features || [],
            businessHours: row.business_hours,
            emergency: row.emergency,
            role: row.role,
            status: row.status,
            authCodeUsed: row.auth_code_used,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            lastLoginAt: row.last_login_at,
        }));

        if (session.role === 'sub' && session.province) {
            hospitals = hospitals.filter(h => h.province === session.province);
        }

        if (province) {
            hospitals = hospitals.filter(h => h.province === province);
        }

        if (status) {
            hospitals = hospitals.filter(h => h.status === status);
        }

        if (keyword) {
            const keywordLower = keyword.toLowerCase();
            hospitals = hospitals.filter(h =>
                h.name.toLowerCase().includes(keywordLower) ||
                h.username.toLowerCase().includes(keywordLower)
            );
        }

        return successResponse(res, paginate(hospitals, page, pageSize));
    } catch (err) {
        console.error('读取后台医院列表失败:', err.message);
        return errorResponse(res, 'DB_ERROR', '读取医院列表失败', null, 500);
    }
});

app.delete('/api/admin/hospitals/:hospitalId', async (req, res) => {
    const session = getSession(req);
    if (!session || session.role !== 'admin') {
        return errorResponse(res, 'FORBIDDEN', '权限不足', null, 403);
    }

    const { hospitalId } = req.params;

    try {
        const result = await pool.query('SELECT id FROM hospitals WHERE id = $1', [hospitalId]);
        if (result.rows.length === 0) {
            return errorResponse(res, 'NOT_FOUND', '医院不存在', null, 404);
        }

        await revokeSessionsByUserId(hospitalId, 'hospital');
        await pool.query('DELETE FROM hospitals WHERE id = $1', [hospitalId]);
        dataStore.hospitals = dataStore.hospitals.filter(h => h.id !== hospitalId);
        return successResponse(res, null, '医院删除成功');
    } catch (err) {
        console.error('删除医院失败:', err.message);
        return errorResponse(res, 'DB_ERROR', '删除医院失败', null, 500);
    }
});

app.get('/api/admin/admins', async (req, res) => {
    const session = getSession(req);
    if (!session || (session.role !== 'admin' && session.role !== 'sub')) {
        return errorResponse(res, 'FORBIDDEN', '权限不足', null, 403);
    }

    const { role, province, page = 1, pageSize = 30 } = req.query;

    try {
        const result = await pool.query('SELECT * FROM admins ORDER BY created_at DESC');
        let admins = result.rows.map((row) => ({
            id: row.id,
            username: row.username,
            email: row.email,
            role: row.role,
            province: row.province,
            permissions: row.permissions || [],
            status: row.status,
            createdBy: row.created_by,
            nickname: row.nickname,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            lastLoginAt: row.last_login_at,
            updatedBy: row.updated_by,
        }));

        if (session.role === 'sub' && session.province) {
            admins = admins.filter(a => a.province === session.province);
        }

        if (role) {
            admins = admins.filter(a => a.role === role);
        }

        if (province) {
            admins = admins.filter(a => a.province === province);
        }

        return successResponse(res, paginate(admins, page, pageSize));
    } catch (err) {
        console.error('读取管理员列表失败:', err.message);
        return errorResponse(res, 'DB_ERROR', '读取管理员列表失败', null, 500);
    }
});

app.post('/api/admin/admins', async (req, res) => {
    const session = getSession(req);
    if (!session || session.role !== 'admin') {
        return errorResponse(res, 'FORBIDDEN', '权限不足', null, 403);
    }

    const { username, password, email, role, province, permissions, nickname, createdBy } = req.body;

    if (!username || !password || !role) {
        return errorResponse(res, 'VALIDATION_ERROR', '必填字段不能为空', null, 422);
    }

    if (role === 'sub' && !province) {
        return errorResponse(res, 'VALIDATION_ERROR', '副管理员必须指定省份', null, 422);
    }

    try {
        const exists = await pool.query('SELECT id FROM admins WHERE username = $1 LIMIT 1', [username]);
        if (exists.rows.length > 0) {
            return errorResponse(res, 'USERNAME_EXISTS', '用户名已存在', null, 409);
        }

        const newAdmin = {
            id: `admin_${generateId()}`,
            username,
            password,
            email: email || null,
            role,
            province: province || null,
            permissions: permissions || (role === 'admin' ? ['all'] : []),
            status: 'active',
            createdBy: createdBy || session.userId,
            nickname: nickname || null,
        };

        const result = await pool.query(
            `INSERT INTO admins (
                id, username, password_hash, email, role, province, permissions, status, created_by, nickname, updated_at
             ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP
             ) RETURNING *`,
            [
                newAdmin.id,
                newAdmin.username,
                newAdmin.password,
                newAdmin.email,
                newAdmin.role,
                newAdmin.province,
                newAdmin.permissions,
                newAdmin.status,
                newAdmin.createdBy,
                newAdmin.nickname,
            ],
        );

        const row = result.rows[0];
        const adminWithoutPassword = {
            id: row.id,
            username: row.username,
            email: row.email,
            role: row.role,
            province: row.province,
            permissions: row.permissions || [],
            status: row.status,
            createdBy: row.created_by,
            nickname: row.nickname,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            lastLoginAt: row.last_login_at,
            updatedBy: row.updated_by,
        };

        dataStore.admins.push({ ...newAdmin, createdAt: row.created_at, updatedAt: row.updated_at, lastLoginAt: row.last_login_at, updatedBy: row.updated_by });
        return res.status(201).json({ success: true, data: adminWithoutPassword, message: '管理员创建成功', timestamp: new Date().toISOString() });
    } catch (err) {
        console.error('创建管理员失败:', err.message);
        return errorResponse(res, 'DB_ERROR', '创建管理员失败', null, 500);
    }
});

app.put('/api/admin/admins/:adminId', async (req, res) => {
    const session = getSession(req);
    if (!session || session.role !== 'admin') {
        return errorResponse(res, 'FORBIDDEN', '权限不足', null, 403);
    }

    const { adminId } = req.params;
    const { email, province, permissions } = req.body;

    try {
        const result = await pool.query(
            `UPDATE admins
             SET email = COALESCE($2, email),
                 province = COALESCE($3, province),
                 permissions = COALESCE($4, permissions),
                 updated_at = CURRENT_TIMESTAMP,
                 updated_by = $5
             WHERE id = $1 OR username = $1
             RETURNING id, updated_at`,
            [adminId, email ?? null, province ?? null, permissions ?? null, session.userId],
        );

        if (result.rows.length === 0) {
            return errorResponse(res, 'NOT_FOUND', '管理员不存在', null, 404);
        }

        return successResponse(res, {
            id: result.rows[0].id,
            updatedAt: result.rows[0].updated_at,
        }, '管理员更新成功');
    } catch (err) {
        console.error('更新管理员失败:', err.message);
        return errorResponse(res, 'DB_ERROR', '更新管理员失败', null, 500);
    }
});

app.put('/api/admin/sub-admins/:adminId', async (req, res) => {
    const session = getSession(req);
    if (!session || session.role !== 'admin') {
        return errorResponse(res, 'FORBIDDEN', '权限不足', null, 403);
    }

    const { adminId } = req.params;
    const { email, province, permissions, nickname, password } = req.body;

    try {
        const result = await pool.query(
            `UPDATE admins
             SET email = COALESCE($2, email),
                 province = COALESCE($3, province),
                 permissions = COALESCE($4, permissions),
                 nickname = COALESCE($5, nickname),
                 password_hash = COALESCE($6, password_hash),
                 updated_at = CURRENT_TIMESTAMP,
                 updated_by = $7
             WHERE (id = $1 OR username = $1) AND role = 'sub'
             RETURNING *`,
            [adminId, email ?? null, province ?? null, permissions ?? null, nickname ?? null, password ?? null, session.userId],
        );

        if (result.rows.length === 0) {
            return errorResponse(res, 'NOT_FOUND', '副管理员不存在', null, 404);
        }

        const row = result.rows[0];
        return successResponse(res, {
            admin: {
                id: row.id,
                username: row.username,
                email: row.email,
                role: row.role,
                province: row.province,
                permissions: row.permissions || [],
                status: row.status,
                createdBy: row.created_by,
                nickname: row.nickname,
                createdAt: row.created_at,
                updatedAt: row.updated_at,
                lastLoginAt: row.last_login_at,
                updatedBy: row.updated_by,
            },
        }, '副管理员更新成功');
    } catch (err) {
        console.error('更新副管理员失败:', err.message);
        return errorResponse(res, 'DB_ERROR', '更新副管理员失败', null, 500);
    }
});

app.delete('/api/admin/admins/:adminId', async (req, res) => {
    const session = getSession(req);
    if (!session || session.role !== 'admin') {
        return errorResponse(res, 'FORBIDDEN', '权限不足', null, 403);
    }

    const { adminId } = req.params;

    if (adminId === session.userId || adminId === session.username) {
        return errorResponse(res, 'BAD_REQUEST', '不能删除自己的账号', null, 400);
    }

    try {
        const result = await pool.query('SELECT id FROM admins WHERE id = $1 OR username = $1', [adminId]);
        if (result.rows.length === 0) {
            return errorResponse(res, 'NOT_FOUND', '管理员不存在', null, 404);
        }

        await pool.query('DELETE FROM admins WHERE id = $1 OR username = $1', [adminId]);
        dataStore.admins = dataStore.admins.filter(a => a.id !== adminId && a.username !== adminId);
        return successResponse(res, null, '管理员删除成功');
    } catch (err) {
        console.error('删除管理员失败:', err.message);
        return errorResponse(res, 'DB_ERROR', '删除管理员失败', null, 500);
    }
});

app.get('/api/admin/dashboard', async (req, res) => {
    const session = getSession(req);
    if (!session || (session.role !== 'admin' && session.role !== 'sub')) {
        return errorResponse(res, 'FORBIDDEN', '权限不足', null, 403);
    }

    try {
        const [
            usersCount,
            activeUsersCount,
            newUsersTodayCount,
            hospitalsCount,
            activeHospitalsCount,
            pendingAppointmentsCount,
            appointmentsCount,
            healthRecordsCount,
            subAdminsCount,
            authCodesCount,
        ] = await Promise.all([
            pool.query('SELECT COUNT(*)::int AS count FROM users'),
            pool.query("SELECT COUNT(*)::int AS count FROM users WHERE status = 'active'"),
            pool.query("SELECT COUNT(*)::int AS count FROM users WHERE created_at >= CURRENT_DATE"),
            pool.query('SELECT COUNT(*)::int AS count FROM hospitals'),
            pool.query("SELECT COUNT(*)::int AS count FROM hospitals WHERE status = 'active'"),
            pool.query("SELECT COUNT(*)::int AS count FROM appointments WHERE status = 'pending'"),
            pool.query('SELECT COUNT(*)::int AS count FROM appointments'),
            pool.query('SELECT COUNT(*)::int AS count FROM health_data'),
            pool.query("SELECT COUNT(*)::int AS count FROM admins WHERE role = 'sub'"),
            pool.query('SELECT COUNT(*)::int AS count FROM auth_codes'),
        ]);

        const totalUsers = usersCount.rows[0].count;
        const totalHospitals = hospitalsCount.rows[0].count;
        const totalAppointments = appointmentsCount.rows[0].count;
        const totalHealthRecords = healthRecordsCount.rows[0].count;
        const totalSubAdmins = subAdminsCount.rows[0].count;
        const totalAuthCodes = authCodesCount.rows[0].count;
        const totalDataCount = totalUsers
            + totalHospitals
            + totalAppointments
            + totalHealthRecords
            + totalSubAdmins
            + totalAuthCodes;

        const data = {
            totalUsers,
            activeUsers: activeUsersCount.rows[0].count,
            newUsersToday: newUsersTodayCount.rows[0].count,
            totalHospitals,
            activeHospitals: activeHospitalsCount.rows[0].count,
            pendingAppointments: pendingAppointmentsCount.rows[0].count,
            totalAppointments,
            totalHealthRecords,
            subAdminsCount: totalSubAdmins,
            todayRequests: Math.floor(Math.random() * 1500) + 500,
            totalData: `${totalDataCount} 条`,
            totalDataCount,
            systemStatus: {
                database: 'healthy',
                cache: 'healthy',
                ai: 'available'
            }
        };

        return successResponse(res, data);
    } catch (err) {
        console.error('读取后台统计失败:', err.message);
        return errorResponse(res, 'DB_ERROR', '读取后台统计失败', null, 500);
    }
});

app.post('/api/admin/auth-codes/generate', async (req, res) => {
    const session = getSession(req);
    if (!session || session.role !== 'admin') {
        return errorResponse(res, 'FORBIDDEN', '权限不足', null, 403);
    }

    const { province, count = 1 } = req.body;
    const newAuthCodes = [];

    try {
        for (let i = 0; i < count; i++) {
            const newCode = {
                id: `auth_${generateId()}`,
                code: `AUTH${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
                province: province || '',
                used: false,
                usedAt: null,
                usedBy: null,
                status: 'active',
            };

            const result = await pool.query(
                `INSERT INTO auth_codes (id, code, province, used, used_at, used_by, status)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 RETURNING *`,
                [newCode.id, newCode.code, newCode.province, newCode.used, newCode.usedAt, newCode.usedBy, newCode.status],
            );

            const row = result.rows[0];
            const mapped = {
                id: row.id,
                code: row.code,
                province: row.province,
                used: row.used,
                usedAt: row.used_at,
                usedBy: row.used_by,
                status: row.status,
                createdAt: row.created_at,
            };
            dataStore.authCodes.unshift(mapped);
            newAuthCodes.push(mapped);
        }

        return res.status(201).json({
            success: true,
            data: { authCodes: newAuthCodes },
            message: `成功生成${count}个授权码`,
            timestamp: new Date().toISOString(),
        });
    } catch (err) {
        console.error('生成授权码失败:', err.message);
        return errorResponse(res, 'DB_ERROR', '生成授权码失败', null, 500);
    }
});

app.post('/api/admin/auth-codes', async (req, res) => {
    const session = getSession(req);
    if (!session) {
        return errorResponse(res, 'UNAUTHORIZED', '未授权，需要登录', null, 401);
    }

    if (session.role !== 'admin' && session.role !== 'sub') {
        return errorResponse(res, 'FORBIDDEN', '权限不足', null, 403);
    }

    const { province } = req.body;
    let targetProvince = province || '';

    try {
        if (session.role === 'sub') {
            const adminResult = await pool.query(
                'SELECT province FROM admins WHERE id = $1 OR username = $2 LIMIT 1',
                [session.userId, session.username],
            );
            const currentAdmin = adminResult.rows[0];
            if (!currentAdmin || !currentAdmin.province) {
                return errorResponse(res, 'FORBIDDEN', '未设置管理省份，无法生成授权码', null, 403);
            }

            if (targetProvince && targetProvince !== currentAdmin.province) {
                return errorResponse(res, 'FORBIDDEN', '只能为当前管理省份生成授权码', null, 403);
            }

            targetProvince = currentAdmin.province;
        }

        const newCode = {
            id: `auth_${generateId()}`,
            code: `AUTH${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
            province: targetProvince,
            used: false,
            usedAt: null,
            usedBy: null,
            status: 'active',
        };

        const result = await pool.query(
            `INSERT INTO auth_codes (id, code, province, used, used_at, used_by, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [newCode.id, newCode.code, newCode.province, newCode.used, newCode.usedAt, newCode.usedBy, newCode.status],
        );

        const row = result.rows[0];
        const mapped = {
            id: row.id,
            code: row.code,
            province: row.province,
            used: row.used,
            usedAt: row.used_at,
            usedBy: row.used_by,
            status: row.status,
            createdAt: row.created_at,
        };
        dataStore.authCodes.unshift(mapped);

        return res.status(201).json({
            success: true,
            data: mapped,
            timestamp: new Date().toISOString(),
        });
    } catch (err) {
        console.error('创建授权码失败:', err.message);
        return errorResponse(res, 'DB_ERROR', '创建授权码失败', null, 500);
    }
});

app.get('/api/admin/auth-codes', async (req, res) => {
    const session = getSession(req);
    if (!session || (session.role !== 'admin' && session.role !== 'sub')) {
        return errorResponse(res, 'FORBIDDEN', '权限不足', null, 403);
    }

    const { province, used, status, page = 1, pageSize = 30 } = req.query;

    try {
        const result = await pool.query('SELECT * FROM auth_codes ORDER BY created_at DESC');

        const hospitalResult = await pool.query(
            'SELECT username, name, province, auth_code_used, created_at FROM hospitals WHERE auth_code_used IS NOT NULL AND auth_code_used <> \'\''
        );
        const authCodeMap = new Map(result.rows.map(row => [row.code, row]));
        const staleLinks = hospitalResult.rows.filter(hospital => {
            const linkedCode = authCodeMap.get(hospital.auth_code_used);
            if (!linkedCode) {
                return false;
            }
            if (province && linkedCode.province !== province && hospital.province !== province) {
                return false;
            }
            const statusValue = typeof linkedCode.status === 'string' ? linkedCode.status.toLowerCase() : linkedCode.status;
            return !linkedCode.used || statusValue === 'active' || !linkedCode.used_at || !linkedCode.used_by;
        });

        for (const hospital of staleLinks) {
            const linkedCode = authCodeMap.get(hospital.auth_code_used);
            const usedAt = linkedCode.used_at || hospital.created_at || new Date().toISOString();
            const usedBy = linkedCode.used_by || hospital.username || hospital.name || null;

            await pool.query(
                `UPDATE auth_codes
                 SET used = true, used_at = $2, used_by = $3, status = 'revoked'
                 WHERE id = $1`,
                [linkedCode.id, usedAt, usedBy],
            );

            linkedCode.used = true;
            linkedCode.used_at = usedAt;
            linkedCode.used_by = usedBy;
            linkedCode.status = 'revoked';

            const cachedCode = dataStore.authCodes.find(code => code.code === linkedCode.code);
            if (cachedCode) {
                cachedCode.used = true;
                cachedCode.usedAt = usedAt;
                cachedCode.usedBy = usedBy;
                cachedCode.status = 'revoked';
            }
        }

        let authCodes = result.rows.map((row) => ({
            id: row.id,
            code: row.code,
            province: row.province,
            used: row.used,
            usedAt: row.used_at,
            usedBy: row.used_by,
            status: row.status,
            createdAt: row.created_at,
        }));

        if (province) authCodes = authCodes.filter(c => c.province === province);
        if (used !== undefined) authCodes = authCodes.filter(c => c.used === (used === 'true'));
        if (status) authCodes = authCodes.filter(c => c.status === status);

        const paginatedData = paginate(authCodes, page, pageSize);
        const stats = {
            total: authCodes.length,
            used: authCodes.filter(c => c.used).length,
            unused: authCodes.filter(c => !c.used).length,
            revoked: authCodes.filter(c => c.status === 'revoked').length,
        };

        return successResponse(res, { ...paginatedData, stats });
    } catch (err) {
        console.error('读取授权码失败:', err.message);
        return errorResponse(res, 'DB_ERROR', '读取授权码失败', null, 500);
    }
});

app.post('/api/admin/auth-codes/repair-used-status', async (req, res) => {
    const session = getSession(req);
    if (!session || (session.role !== 'admin' && session.role !== 'sub')) {
        return errorResponse(res, 'FORBIDDEN', '权限不足', null, 403);
    }

    let { province } = req.body || {};

    try {
        if (session.role === 'sub') {
            const adminResult = await pool.query(
                'SELECT province FROM admins WHERE id = $1 OR username = $2 LIMIT 1',
                [session.userId, session.username],
            );
            const currentAdmin = adminResult.rows[0];
            if (!currentAdmin || !currentAdmin.province) {
                return errorResponse(res, 'FORBIDDEN', '未设置管理省份，无法修复授权码状态', null, 403);
            }

            if (province && province !== currentAdmin.province) {
                return errorResponse(res, 'FORBIDDEN', '只能修复当前管理省份的授权码', null, 403);
            }

            province = currentAdmin.province;
        }

        const [authCodeResult, hospitalResult] = await Promise.all([
            pool.query('SELECT id, code, province, used, used_at, used_by, status FROM auth_codes'),
            pool.query('SELECT id, username, name, province, auth_code_used, created_at FROM hospitals WHERE auth_code_used IS NOT NULL AND auth_code_used <> \'\''),
        ]);

        const authCodeMap = new Map(authCodeResult.rows.map(row => [row.code, row]));
        const staleLinks = hospitalResult.rows.filter(hospital => {
            const linkedCode = authCodeMap.get(hospital.auth_code_used);
            if (!linkedCode) {
                return false;
            }
            if (province && linkedCode.province !== province && hospital.province !== province) {
                return false;
            }
            const status = typeof linkedCode.status === 'string' ? linkedCode.status.toLowerCase() : linkedCode.status;
            return !linkedCode.used || status === 'active' || !linkedCode.used_at || !linkedCode.used_by;
        });

        if (staleLinks.length === 0) {
            return successResponse(res, {
                repairedCount: 0,
                repairedCodes: [],
            }, '没有需要修复的授权码状态');
        }

        const repairedCodes = [];

        for (const hospital of staleLinks) {
            const linkedCode = authCodeMap.get(hospital.auth_code_used);
            const usedAt = linkedCode.used_at || hospital.created_at || new Date().toISOString();
            const usedBy = linkedCode.used_by || hospital.username || hospital.name || null;

            await pool.query(
                `UPDATE auth_codes
                 SET used = true, used_at = $2, used_by = $3, status = 'revoked'
                 WHERE id = $1`,
                [linkedCode.id, usedAt, usedBy],
            );

            repairedCodes.push(linkedCode.code);

            const cachedCode = dataStore.authCodes.find(code => code.code === linkedCode.code);
            if (cachedCode) {
                cachedCode.used = true;
                cachedCode.usedAt = usedAt;
                cachedCode.usedBy = usedBy;
                cachedCode.status = 'revoked';
            }
        }

        return successResponse(res, {
            repairedCount: repairedCodes.length,
            repairedCodes,
        }, `已修复${repairedCodes.length}个授权码状态`);
    } catch (err) {
        console.error('修复授权码状态失败:', err.message);
        return errorResponse(res, 'DB_ERROR', '修复授权码状态失败', null, 500);
    }
});

app.delete('/api/admin/auth-codes/:authCodeId', async (req, res) => {
    const session = getSession(req);
    if (!session || session.role !== 'admin') {
        return errorResponse(res, 'FORBIDDEN', '权限不足', null, 403);
    }

    const { authCodeId } = req.params;

    try {
        const result = await pool.query(
            'SELECT * FROM auth_codes WHERE id = $1 OR code = $1 LIMIT 1',
            [authCodeId],
        );

        if (result.rows.length === 0) {
            return errorResponse(res, 'NOT_FOUND', '授权码不存在', null, 404);
        }

        const authCode = result.rows[0];

        if (authCode.used) {
            await pool.query(
                'UPDATE auth_codes SET status = $2 WHERE id = $1',
                [authCode.id, 'revoked'],
            );
            dataStore.authCodes = dataStore.authCodes.map(c => c.id === authCode.id ? { ...c, status: 'revoked' } : c);
            return successResponse(res, null, '授权码已撤销');
        }

        await pool.query('DELETE FROM auth_codes WHERE id = $1', [authCode.id]);
        dataStore.authCodes = dataStore.authCodes.filter(c => c.id !== authCode.id);
        return successResponse(res, null, '授权码删除成功');
    } catch (err) {
        console.error('删除授权码失败:', err.message);
        return errorResponse(res, 'DB_ERROR', '删除授权码失败', null, 500);
    }
});

app.post('/api/admin/auth-codes/delete-used', async (req, res) => {
    const session = getSession(req);
    if (!session || session.role !== 'admin') {
        return errorResponse(res, 'FORBIDDEN', '权限不足', null, 403);
    }

    const { province, deleteHospitals = false } = req.body;

    try {
        const result = await pool.query('SELECT * FROM auth_codes WHERE used = true');
        let authCodesToDelete = result.rows;

        if (province) {
            authCodesToDelete = authCodesToDelete.filter(c => c.province === province);
        }

        const deletedCount = authCodesToDelete.length;
        const usedCodes = authCodesToDelete.map(c => c.code);

        if (deleteHospitals && usedCodes.length > 0) {
            await pool.query('DELETE FROM hospitals WHERE auth_code_used = ANY($1)', [usedCodes]);
            dataStore.hospitals = dataStore.hospitals.filter(h => !usedCodes.includes(h.authCodeUsed));
        }

        if (authCodesToDelete.length > 0) {
            const authIds = authCodesToDelete.map(c => c.id);
            await pool.query('DELETE FROM auth_codes WHERE id = ANY($1)', [authIds]);
            dataStore.authCodes = dataStore.authCodes.filter(c => !authIds.includes(c.id));
        }

        return successResponse(res, { deletedCount }, `已删除${deletedCount}个已使用的授权码`);
    } catch (err) {
        console.error('批量删除授权码失败:', err.message);
        return errorResponse(res, 'DB_ERROR', '批量删除授权码失败', null, 500);
    }
});

app.post('/user-media/upload', async (req, res) => {
    const session = getSession(req);
    if (!session) {
        return errorResponse(res, 'UNAUTHORIZED', '未授权，需要登录', null, 401);
    }

    const { file, fileType = 'other', isPublic = false, originalName } = req.body;

    if (!file) {
        return errorResponse(res, 'VALIDATION_ERROR', '文件不能为空', null, 422);
    }

    const newMedia = {
        id: `media_${generateId()}`,
        userId: session.userId,
        url: file,
        filename: originalName || `file_${Date.now()}.jpg`,
        fileType,
        size: Buffer.from(file).length,
        mimeType: 'image/jpeg',
        isPublic,
    };

    try {
        const result = await pool.query(
            `INSERT INTO user_media (id, user_id, url, filename, file_type, file_size, mime_type, is_public)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING *`,
            [
                newMedia.id,
                newMedia.userId,
                newMedia.url,
                newMedia.filename,
                newMedia.fileType,
                newMedia.size,
                newMedia.mimeType,
                newMedia.isPublic,
            ],
        );

        const row = result.rows[0];
        const mapped = {
            id: row.id,
            userId: row.user_id,
            url: row.url,
            filename: row.filename,
            fileType: row.file_type,
            size: row.file_size,
            mimeType: row.mime_type,
            isPublic: row.is_public,
            createdAt: row.created_at,
        };
        dataStore.userMedia.push(mapped);

        return res.status(201).json({
            success: true,
            data: mapped,
            timestamp: new Date().toISOString(),
        });
    } catch (err) {
        console.error('上传媒体记录失败:', err.message);
        return errorResponse(res, 'DB_ERROR', '上传媒体记录失败', null, 500);
    }
});

app.post('/user-media/avatar', async (req, res) => {
    const session = getSession(req);
    if (!session) {
        return errorResponse(res, 'UNAUTHORIZED', '未授权，需要登录', null, 401);
    }

    const { avatar } = req.body;
    if (!avatar) {
        return errorResponse(res, 'VALIDATION_ERROR', '头像不能为空', null, 422);
    }

    try {
        if (session.role === 'user') {
            const result = await pool.query(
                'UPDATE users SET avatar = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING avatar, updated_at',
                [session.userId, avatar],
            );
            if (result.rows.length === 0) {
                return errorResponse(res, 'NOT_FOUND', '用户不存在', null, 404);
            }
            const cachedUser = dataStore.users.find(u => u.id === session.userId);
            if (cachedUser) {
                cachedUser.avatar = avatar;
                cachedUser.updatedAt = result.rows[0].updated_at;
            }
            return successResponse(res, {
                avatarUrl: result.rows[0].avatar,
                avatar: result.rows[0].avatar,
            }, '头像更新成功');
        }

        if (session.role === 'hospital') {
            const result = await pool.query(
                'UPDATE hospitals SET avatar = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING avatar, updated_at',
                [session.userId, avatar],
            );
            if (result.rows.length === 0) {
                return errorResponse(res, 'NOT_FOUND', '医院不存在', null, 404);
            }
            const cachedHospital = dataStore.hospitals.find(h => h.id === session.userId);
            if (cachedHospital) {
                cachedHospital.avatar = result.rows[0].avatar;
                cachedHospital.updatedAt = result.rows[0].updated_at;
            }
            return successResponse(res, {
                avatarUrl: result.rows[0].avatar,
                avatar: result.rows[0].avatar,
            }, '头像更新成功');
        }

        if (session.role === 'admin' || session.role === 'sub') {
            const result = await pool.query(
                'UPDATE admins SET avatar = $2, updated_at = CURRENT_TIMESTAMP, updated_by = $3 WHERE id = $1 RETURNING avatar, updated_at',
                [session.userId, avatar, session.userId],
            );
            if (result.rows.length === 0) {
                return errorResponse(res, 'NOT_FOUND', '管理员不存在', null, 404);
            }
            const cachedAdmin = dataStore.admins.find(a => a.id === session.userId);
            if (cachedAdmin) {
                cachedAdmin.avatar = result.rows[0].avatar;
                cachedAdmin.updatedAt = result.rows[0].updated_at;
                cachedAdmin.updatedBy = session.userId;
            }
            return successResponse(res, {
                avatarUrl: result.rows[0].avatar,
                avatar: result.rows[0].avatar,
            }, '头像更新成功');
        }

        return errorResponse(res, 'NOT_FOUND', '用户不存在', null, 404);
    } catch (err) {
        console.error('更新头像失败:', err.message);
        return errorResponse(res, 'DB_ERROR', '更新头像失败', null, 500);
    }
});

app.post('/user-media/photo', async (req, res) => {
    const session = getSession(req);
    if (!session || session.role !== 'user') {
        return errorResponse(res, 'FORBIDDEN', '权限不足', null, 403);
    }

    const { photo, originalName, isPublic = false, category = 'medical' } = req.body;

    if (!photo) {
        return errorResponse(res, 'VALIDATION_ERROR', '照片不能为空', null, 422);
    }

    try {
        const result = await pool.query(
            `INSERT INTO user_media (id, user_id, url, filename, file_type, file_size, mime_type, is_public)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING *`,
            [
                `photo_${generateId()}`,
                session.userId,
                photo,
                originalName || `photo_${Date.now()}.jpg`,
                category,
                Buffer.from(photo).length,
                'image/jpeg',
                isPublic,
            ],
        );

        const row = result.rows[0];
        const newMedia = {
            id: row.id,
            userId: row.user_id,
            url: row.url,
            filename: row.filename,
            fileType: row.file_type,
            size: row.file_size,
            mimeType: row.mime_type,
            isPublic: row.is_public,
            createdAt: row.created_at,
        };
        dataStore.userMedia.push(newMedia);

        return successResponse(res, newMedia);
    } catch (err) {
        console.error('上传照片记录失败:', err.message);
        return errorResponse(res, 'DB_ERROR', '上传照片记录失败', null, 500);
    }
});

app.get('/user-media', async (req, res) => {
    const session = getSession(req);
    if (!session) {
        return errorResponse(res, 'UNAUTHORIZED', '未授权，需要登录', null, 401);
    }

    const { fileType, page = 1, pageSize = 30 } = req.query;

    try {
        const result = await pool.query(
            'SELECT * FROM user_media WHERE user_id = $1 ORDER BY created_at DESC',
            [session.userId],
        );

        let media = result.rows.map((row) => ({
            id: row.id,
            userId: row.user_id,
            url: row.url,
            filename: row.filename,
            fileType: row.file_type,
            size: row.file_size,
            mimeType: row.mime_type,
            isPublic: row.is_public,
            createdAt: row.created_at,
        }));

        if (fileType) {
            media = media.filter(m => m.fileType === fileType);
        }

        const paginatedData = paginate(media, page, pageSize);
        return successResponse(res, {
            media: paginatedData.list,
            total: paginatedData.total,
            page: paginatedData.page,
            pageSize: paginatedData.pageSize,
        });
    } catch (err) {
        console.error('读取媒体列表失败:', err.message);
        return errorResponse(res, 'DB_ERROR', '读取媒体列表失败', null, 500);
    }
});

app.get('/user-media/:mediaId', async (req, res) => {
    const session = getSession(req);
    if (!session) {
        return errorResponse(res, 'UNAUTHORIZED', '未授权，需要登录', null, 401);
    }

    const { mediaId } = req.params;

    try {
        const result = await pool.query(
            'SELECT * FROM user_media WHERE id = $1 AND user_id = $2 LIMIT 1',
            [mediaId, session.userId],
        );

        if (result.rows.length === 0) {
            return errorResponse(res, 'NOT_FOUND', '媒体文件不存在', null, 404);
        }

        const row = result.rows[0];
        return successResponse(res, {
            id: row.id,
            userId: row.user_id,
            url: row.url,
            filename: row.filename,
            fileType: row.file_type,
            size: row.file_size,
            mimeType: row.mime_type,
            isPublic: row.is_public,
            createdAt: row.created_at,
        });
    } catch (err) {
        console.error('读取媒体详情失败:', err.message);
        return errorResponse(res, 'DB_ERROR', '读取媒体详情失败', null, 500);
    }
});

app.delete('/user-media/:mediaId', async (req, res) => {
    const session = getSession(req);
    if (!session) {
        return errorResponse(res, 'UNAUTHORIZED', '未授权，需要登录', null, 401);
    }

    const { mediaId } = req.params;

    try {
        const deleted = await pool.query(
            'DELETE FROM user_media WHERE id = $1 AND user_id = $2 RETURNING id',
            [mediaId, session.userId],
        );

        if (deleted.rows.length === 0) {
            return errorResponse(res, 'NOT_FOUND', '媒体文件不存在', null, 404);
        }

        dataStore.userMedia = dataStore.userMedia.filter(m => !(m.id === mediaId && m.userId === session.userId));
        return successResponse(res, null, '媒体文件删除成功');
    } catch (err) {
        console.error('删除媒体文件失败:', err.message);
        return errorResponse(res, 'DB_ERROR', '删除媒体文件失败', null, 500);
    }
});

app.get(['/admin/api-monitoring/status', '/api/admin/api-monitoring/status'], (req, res) => {
    const session = getSession(req);
    if (!session || session.role !== 'admin') {
        return errorResponse(res, 'FORBIDDEN', '权限不足', null, 403);
    }

    const data = [
        {
            serviceType: 'smart-device',
            serviceName: '智能设备API',
            status: 'normal',
            responseTime: 120,
            statusCode: 200,
            lastChecked: new Date().toISOString(),
            errorMessage: null,
            uptime: 99.8,
        },
        {
            serviceType: 'ai',
            serviceName: 'AI服务',
            status: 'normal',
            responseTime: 250,
            statusCode: 200,
            lastChecked: new Date().toISOString(),
            errorMessage: null,
            uptime: 99.5,
        },
        {
            serviceType: 'geocoding',
            serviceName: '地理编码API',
            status: 'normal',
            responseTime: 80,
            statusCode: 200,
            lastChecked: new Date().toISOString(),
            errorMessage: null,
            uptime: 99.9,
        },
    ];

    successResponse(res, data);
});

app.post(['/admin/api-monitoring/check-all', '/api/admin/api-monitoring/check-all'], (req, res) => {
    const session = getSession(req);
    if (!session || session.role !== 'admin') {
        return errorResponse(res, 'FORBIDDEN', '权限不足', null, 403);
    }

    const data = [
        {
            serviceType: 'smart-device',
            status: 'normal',
            responseTime: 115,
            lastChecked: new Date().toISOString(),
        },
        {
            serviceType: 'ai',
            status: 'normal',
            responseTime: 240,
            lastChecked: new Date().toISOString(),
        },
        {
            serviceType: 'geocoding',
            status: 'normal',
            responseTime: 75,
            lastChecked: new Date().toISOString(),
        },
    ];

    successResponse(res, data, '所有服务检查完成');
});

app.post(['/admin/api-monitoring/check/:serviceType', '/api/admin/api-monitoring/check/:serviceType'], (req, res) => {
    const session = getSession(req);
    if (!session || session.role !== 'admin') {
        return errorResponse(res, 'FORBIDDEN', '权限不足', null, 403);
    }

    const { serviceType } = req.params;
    const data = {
        serviceType,
        status: 'normal',
        responseTime: Math.floor(Math.random() * 200) + 50,
        statusCode: 200,
        lastChecked: new Date().toISOString(),
    };

    successResponse(res, data);
});

app.get(['/admin/api-monitoring/history/:serviceType', '/api/admin/api-monitoring/history/:serviceType'], (req, res) => {
    const session = getSession(req);
    if (!session || session.role !== 'admin') {
        return errorResponse(res, 'FORBIDDEN', '权限不足', null, 403);
    }

    const { days = 7 } = req.query;
    const data = [];

    for (let i = 0; i < days; i++) {
        data.push({
            status: 'normal',
            response_time: Math.floor(Math.random() * 200) + 50,
            status_code: 200,
            checked_at: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
        });
    }

    successResponse(res, data);
});

// AI API 配置
const AI_PROVIDER_CONFIGS = {
    deepseek: {
        baseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
        apiKey: process.env.DEEPSEEK_API_KEY || '',
        defaultModel: 'deepseek-chat',
    },
    doubao: {
        baseUrl: process.env.DOUBAO_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3',
        apiKey: process.env.DOUBAO_API_KEY || '',
        defaultModel: 'doubao-seed-2-0-pro-260215',
    },
    zhipu: {
        baseUrl: process.env.ZHI_PU_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4',
        apiKey: process.env.ZHI_PU_API_KEY || '',
        defaultModel: 'glm-4',
    },
};

const AI_MODEL_ALIASES = {
    deepseek: {
        default: 'deepseek-chat',
        chat: 'deepseek-chat',
        'gpt-4': 'deepseek-chat',
        'gpt-4o': 'deepseek-chat',
        'deepseek-chat': 'deepseek-chat',
        'deepseek-reasoner': 'deepseek-reasoner',
        'deepseek-r1': 'deepseek-reasoner',
    },
    doubao: {
        default: 'doubao-seed-2-0-pro-260215',
        chat: 'doubao-seed-2-0-pro-260215',
        doubao: 'doubao-seed-2-0-pro-260215',
        'gpt-4': 'doubao-seed-2-0-pro-260215',
        'gpt-4o': 'doubao-seed-2-0-pro-260215',
        'doubao-seed-2-0-pro-260215': 'doubao-seed-2-0-pro-260215',
        'doubao-1.5-pro-32k': 'Doubao-1.5-pro-32k',
        'doubao-1.5-lite-32k': 'Doubao-1.5-lite-32k',
        'doubao-seed-1.6': 'Doubao-Seed-1.6',
    },
    zhipu: {
        default: 'glm-4',
        chat: 'glm-4',
        zhipu: 'glm-4',
        'gpt-4': 'glm-4',
        'gpt-4o': 'glm-4',
        'glm-4': 'glm-4',
        'glm-3-turbo': 'glm-3-turbo',
    },
};


const AI_PROXY_TIMEOUT = Number(process.env.AI_PROXY_TIMEOUT || 12000);
const AI_PROXY_CACHE_TTL = Number(process.env.AI_PROXY_CACHE_TTL || 120000);
const AI_PROXY_STALE_TTL = Number(process.env.AI_PROXY_STALE_TTL || 600000);
const AI_REDIS_CACHE_PREFIX = process.env.AI_REDIS_CACHE_PREFIX || 'ai:gateway:cache:';
const AI_REDIS_CIRCUIT_PREFIX = process.env.AI_REDIS_CIRCUIT_PREFIX || 'ai:gateway:circuit:';
const AI_REDIS_LOCK_PREFIX = process.env.AI_REDIS_LOCK_PREFIX || 'ai:gateway:lock:';
const AI_REDIS_URL = (() => {
    const explicitUrl = String(process.env.REDIS_URL || '').trim();
    if (explicitUrl) {
        return explicitUrl;
    }

    const host = String(process.env.REDIS_HOST || '').trim();
    const port = Number(process.env.REDIS_PORT || 6379);
    const password = sanitizeOptionalEnvValue(process.env.REDIS_PASSWORD);

    if (!host) {
        return '';
    }

    const auth = password ? `:${encodeURIComponent(password)}@` : '';
    return `redis://${auth}${host}:${port}`;
})();
const AI_REDIS_LOCK_TTL = Number(process.env.AI_REDIS_LOCK_TTL || (AI_PROXY_TIMEOUT + 3000));
const AI_REDIS_LOCK_RENEW_INTERVAL = Number(process.env.AI_REDIS_LOCK_RENEW_INTERVAL || Math.max(1000, Math.floor(AI_REDIS_LOCK_TTL / 3)));
const AI_CIRCUIT_BREAKER_THRESHOLD = Number(process.env.AI_CIRCUIT_BREAKER_THRESHOLD || 3);
const AI_CIRCUIT_BREAKER_COOLDOWN = Number(process.env.AI_CIRCUIT_BREAKER_COOLDOWN || 30000);
const aiResponseCache = new Map();
const aiInflightRequests = new Map();
const aiCircuitBreakers = new Map();
let redisClient = null;
let redisAvailable = false;
let redisConnectErrorLogged = false;
const aiGatewayMetrics = {
    totalRequests: 0,
    freshCacheHits: 0,
    staleCacheHits: 0,
    cacheMisses: 0,
    inflightHits: 0,
    inflightLeaders: 0,
    distributedLockHits: 0,
    distributedLockLeaders: 0,
    distributedLockRenewals: 0,
    distributedLockRenewFailures: 0,
    distributedLockWaitTimeouts: 0,
    redisFreshHits: 0,
    redisStaleHits: 0,
    redisWrites: 0,
    redisWriteFailures: 0,
    upstreamCalls: 0,
    upstreamSuccess: 0,
    upstreamFailures: 0,
    upstreamTimeouts: 0,
    circuitOpenRejects: 0,
};

function normalizeAiMessages(messages = []) {
    return messages.map(item => ({
        role: item?.role || 'user',
        content: typeof item?.content === 'string' ? item.content.trim() : '',
    }));
}

function buildAiCacheKey({ provider, model, temperature, maxTokens, messages }) {
    const normalizedMessages = normalizeAiMessages(messages);
    return JSON.stringify({
        provider,
        model,
        temperature,
        maxTokens,
        messages: normalizedMessages,
    });
}

function getAiRedisCacheKey(cacheKey) {
    return `${AI_REDIS_CACHE_PREFIX}${crypto.createHash('sha256').update(cacheKey).digest('hex')}`;
}

function getAiRedisLockKey(cacheKey) {
    return `${AI_REDIS_LOCK_PREFIX}${crypto.createHash('sha256').update(cacheKey).digest('hex')}`;
}

function buildAiCacheEnvelope(data) {
    const now = Date.now();
    return {
        data,
        expiresAt: now + AI_PROXY_CACHE_TTL,
        staleUntil: now + AI_PROXY_STALE_TTL,
    };
}

function readMemoryAiCache(cacheKey, allowStale = false) {
    const cached = aiResponseCache.get(cacheKey);
    if (!cached) {
        return null;
    }
    const now = Date.now();
    if (cached.expiresAt > now) {
        return {
            data: cached.data,
            state: 'fresh',
            source: 'memory',
        };
    }
    if (allowStale && cached.staleUntil > now) {
        return {
            data: cached.data,
            state: 'stale',
            source: 'memory',
        };
    }
    aiResponseCache.delete(cacheKey);
    return null;
}

function writeMemoryAiCache(cacheKey, envelope) {
    aiResponseCache.set(cacheKey, envelope);

    if (aiResponseCache.size > 200) {
        const now = Date.now();
        for (const [key, value] of aiResponseCache.entries()) {
            if (value.staleUntil <= now) {
                aiResponseCache.delete(key);
            }
        }
        if (aiResponseCache.size > 200) {
            const oldestKey = aiResponseCache.keys().next().value;
            if (oldestKey) {
                aiResponseCache.delete(oldestKey);
            }
        }
    }
}

async function initializeRedisCache() {
    if (!AI_REDIS_URL) {
        console.log('[AI网关] 未配置 REDIS_URL，使用内存缓存');
        return;
    }

    try {
        redisClient = createClient({
            url: AI_REDIS_URL,
            socket: {
                connectTimeout: 2000,
                reconnectStrategy: false,
            },
        });
        redisClient.on('error', error => {
            redisAvailable = false;
            if (!redisConnectErrorLogged) {
                redisConnectErrorLogged = true;
                console.error('[AI网关] Redis连接异常，降级为内存缓存:', error.message);
            }
        });
        redisClient.on('ready', () => {
            redisAvailable = true;
            redisConnectErrorLogged = false;
            console.log('[AI网关] Redis缓存已就绪');
        });
        await redisClient.connect();
        redisAvailable = true;
        redisConnectErrorLogged = false;
    } catch (error) {
        redisAvailable = false;
        if (redisClient) {
            try {
                redisClient.destroy();
            } catch {
                // ignore destroy error
            }
        }
        redisClient = null;
        console.error('[AI网关] Redis初始化失败，降级为内存缓存:', error.message);
    }
}

async function readRedisAiCache(cacheKey, allowStale = false) {
    if (!redisAvailable || !redisClient) {
        return null;
    }

    try {
        const raw = await redisClient.get(getAiRedisCacheKey(cacheKey));
        if (!raw) {
            return null;
        }
        const cached = JSON.parse(raw);
        const now = Date.now();
        if (cached.expiresAt > now) {
            aiGatewayMetrics.redisFreshHits += 1;
            return {
                data: cached.data,
                state: 'fresh',
                source: 'redis',
            };
        }
        if (allowStale && cached.staleUntil > now) {
            aiGatewayMetrics.redisStaleHits += 1;
            return {
                data: cached.data,
                state: 'stale',
                source: 'redis',
            };
        }
        await redisClient.del(getAiRedisCacheKey(cacheKey));
        return null;
    } catch (error) {
        redisAvailable = false;
        console.error('[AI网关] Redis读取失败，降级为内存缓存:', error.message);
        return null;
    }
}

async function writeRedisAiCache(cacheKey, envelope) {
    if (!redisAvailable || !redisClient) {
        return;
    }

    try {
        await redisClient.set(
            getAiRedisCacheKey(cacheKey),
            JSON.stringify(envelope),
            {
                PX: AI_PROXY_STALE_TTL,
            },
        );
        aiGatewayMetrics.redisWrites += 1;
    } catch (error) {
        aiGatewayMetrics.redisWriteFailures += 1;
        redisAvailable = false;
        console.error('[AI网关] Redis写入失败，降级为内存缓存:', error.message);
    }
}

async function getCachedAiResponse(cacheKey, allowStale = false) {
    const memoryCached = readMemoryAiCache(cacheKey, allowStale);
    if (memoryCached) {
        return memoryCached;
    }

    const redisCached = await readRedisAiCache(cacheKey, allowStale);
    if (redisCached) {
        writeMemoryAiCache(cacheKey, buildAiCacheEnvelope(redisCached.data));
        return redisCached;
    }

    return null;
}

async function setCachedAiResponse(cacheKey, data) {
    const envelope = buildAiCacheEnvelope(data);
    writeMemoryAiCache(cacheKey, envelope);
    await writeRedisAiCache(cacheKey, envelope);
}

function getInflightAiRequest(cacheKey) {
    if (!cacheKey) {
        return null;
    }
    const entry = aiInflightRequests.get(cacheKey);
    if (!entry) {
        return null;
    }
    if (entry.expiresAt <= Date.now()) {
        aiInflightRequests.delete(cacheKey);
        return null;
    }
    return entry;
}

function createInflightAiRequest(cacheKey) {
    if (!cacheKey) {
        return null;
    }
    const existing = getInflightAiRequest(cacheKey);
    if (existing) {
        return existing;
    }

    let resolve;
    const promise = new Promise(res => {
        resolve = res;
    });

    const entry = {
        promise,
        resolve,
        expiresAt: Date.now() + AI_PROXY_TIMEOUT + 2000,
    };
    aiInflightRequests.set(cacheKey, entry);
    return entry;
}

function settleInflightAiRequest(cacheKey, result, error = null) {
    if (!cacheKey) {
        return;
    }
    const entry = aiInflightRequests.get(cacheKey);
    if (!entry) {
        return;
    }
    aiInflightRequests.delete(cacheKey);
    entry.resolve({
        ok: !error,
        data: error ? null : result,
        error: error ? {
            message: error.message,
            code: error.code || null,
        } : null,
    });
}

async function releaseDistributedLockIfHeld(cacheKey, ownerId, hasLock, renewHandle = null) {
    if (renewHandle?.timer) {
        clearInterval(renewHandle.timer);
    }
    if (!hasLock) {
        return;
    }
    await releaseRedisAiLock(cacheKey, ownerId);
}

async function renewRedisAiLock(cacheKey, ownerId) {
    if (!cacheKey || !ownerId || !redisAvailable || !redisClient) {
        return false;
    }

    try {
        const lockKey = getAiRedisLockKey(cacheKey);
        const currentOwner = await redisClient.get(lockKey);
        if (currentOwner !== ownerId) {
            return false;
        }
        await redisClient.pExpire(lockKey, AI_REDIS_LOCK_TTL);
        aiGatewayMetrics.distributedLockRenewals += 1;
        return true;
    } catch (error) {
        aiGatewayMetrics.distributedLockRenewFailures += 1;
        redisAvailable = false;
        console.error('[AI网关] Redis续约分布式锁失败，降级为单机去重:', error.message);
        return false;
    }
}

function startRedisAiLockRenewal(cacheKey, ownerId, hasLock) {
    if (!hasLock || !cacheKey || !ownerId) {
        return null;
    }

    const handle = {
        active: true,
        timer: null,
    };

    handle.timer = setInterval(async () => {
        if (!handle.active) {
            return;
        }
        const renewed = await renewRedisAiLock(cacheKey, ownerId);
        if (!renewed) {
            handle.active = false;
            if (handle.timer) {
                clearInterval(handle.timer);
            }
        }
    }, AI_REDIS_LOCK_RENEW_INTERVAL);

    return handle;
}

async function tryAcquireRedisAiLock(cacheKey, ownerId) {
    if (!cacheKey || !ownerId || !redisAvailable || !redisClient) {
        return false;
    }

    try {
        const result = await redisClient.set(
            getAiRedisLockKey(cacheKey),
            ownerId,
            {
                NX: true,
                PX: AI_REDIS_LOCK_TTL,
            },
        );
        return result === 'OK';
    } catch (error) {
        redisAvailable = false;
        console.error('[AI网关] Redis获取分布式锁失败，降级为单机去重:', error.message);
        return false;
    }
}

async function releaseRedisAiLock(cacheKey, ownerId) {
    if (!cacheKey || !ownerId || !redisAvailable || !redisClient) {
        return;
    }

    try {
        const lockKey = getAiRedisLockKey(cacheKey);
        const currentOwner = await redisClient.get(lockKey);
        if (currentOwner === ownerId) {
            await redisClient.del(lockKey);
        }
    } catch (error) {
        redisAvailable = false;
        console.error('[AI网关] Redis释放分布式锁失败，降级为单机去重:', error.message);
    }
}

async function waitForDistributedAiResult(cacheKey, allowStale = false, maxWaitMs = AI_PROXY_TIMEOUT + 2000) {
    const startedAt = Date.now();
    while (Date.now() - startedAt < maxWaitMs) {
        const cached = await getCachedAiResponse(cacheKey, allowStale);
        if (cached) {
            return cached;
        }
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    aiGatewayMetrics.distributedLockWaitTimeouts += 1;
    return null;
}

function createTimeoutController(timeout = AI_PROXY_TIMEOUT) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    return { controller, timer };
}

function getAiRedisCircuitKey(provider) {
    return `${AI_REDIS_CIRCUIT_PREFIX}${provider}`;
}

function readMemoryAiCircuitState(provider) {
    const key = typeof provider === 'string' ? provider.trim() : '';
    if (!key) {
        return null;
    }
    let state = aiCircuitBreakers.get(key);
    if (!state) {
        state = {
            failures: 0,
            openUntil: 0,
            lastFailureAt: null,
        };
        aiCircuitBreakers.set(key, state);
    }
    if (state.openUntil && state.openUntil <= Date.now()) {
        state.openUntil = 0;
        state.failures = 0;
    }
    return state;
}

function syncMemoryAiCircuitState(provider, state) {
    const key = typeof provider === 'string' ? provider.trim() : '';
    if (!key) {
        return null;
    }
    const normalizedState = {
        failures: Number(state?.failures || 0),
        openUntil: Number(state?.openUntil || 0),
        lastFailureAt: state?.lastFailureAt || null,
    };
    aiCircuitBreakers.set(key, normalizedState);
    return normalizedState;
}

async function readRedisAiCircuitState(provider) {
    if (!redisAvailable || !redisClient) {
        return null;
    }

    try {
        const raw = await redisClient.get(getAiRedisCircuitKey(provider));
        if (!raw) {
            return null;
        }
        return JSON.parse(raw);
    } catch (error) {
        redisAvailable = false;
        console.error('[AI网关] Redis读取熔断状态失败，降级为内存熔断:', error.message);
        return null;
    }
}

async function writeRedisAiCircuitState(provider, state) {
    if (!redisAvailable || !redisClient) {
        return;
    }

    try {
        const ttlMs = state?.openUntil && state.openUntil > Date.now()
            ? Math.max(AI_CIRCUIT_BREAKER_COOLDOWN, state.openUntil - Date.now())
            : AI_CIRCUIT_BREAKER_COOLDOWN;
        await redisClient.set(
            getAiRedisCircuitKey(provider),
            JSON.stringify(state),
            {
                PX: ttlMs,
            },
        );
    } catch (error) {
        redisAvailable = false;
        console.error('[AI网关] Redis写入熔断状态失败，降级为内存熔断:', error.message);
    }
}

async function getAiCircuitState(provider) {
    const memoryState = readMemoryAiCircuitState(provider);
    const redisState = await readRedisAiCircuitState(provider);
    const now = Date.now();

    if (redisState) {
        const normalizedRedisState = syncMemoryAiCircuitState(provider, redisState);
        if (normalizedRedisState.openUntil && normalizedRedisState.openUntil <= now) {
            normalizedRedisState.openUntil = 0;
            normalizedRedisState.failures = 0;
            await writeRedisAiCircuitState(provider, normalizedRedisState);
        }
        return normalizedRedisState;
    }

    return memoryState;
}

async function isAiCircuitOpen(provider) {
    const state = await getAiCircuitState(provider);
    return Boolean(state && state.openUntil > Date.now());
}

async function recordAiCircuitSuccess(provider) {
    const state = syncMemoryAiCircuitState(provider, {
        failures: 0,
        openUntil: 0,
        lastFailureAt: null,
    });
    await writeRedisAiCircuitState(provider, state);
}

async function recordAiCircuitFailure(provider) {
    const currentState = await getAiCircuitState(provider);
    if (!currentState) {
        return false;
    }
    const nextState = {
        ...currentState,
        failures: Number(currentState.failures || 0) + 1,
        lastFailureAt: Date.now(),
    };
    if (nextState.failures >= AI_CIRCUIT_BREAKER_THRESHOLD) {
        nextState.openUntil = Date.now() + AI_CIRCUIT_BREAKER_COOLDOWN;
    }
    syncMemoryAiCircuitState(provider, nextState);
    await writeRedisAiCircuitState(provider, nextState);
    return nextState.openUntil > Date.now();
}

async function getAiGatewayMetricsSnapshot() {
    const providerSet = new Set([
        ...Object.keys(AI_PROVIDER_CONFIGS || {}),
        ...aiCircuitBreakers.keys(),
    ]);
    const circuitBreakers = {};
    for (const provider of providerSet) {
        const state = await getAiCircuitState(provider);
        if (!state) {
            continue;
        }
        circuitBreakers[provider] = {
            failures: state.failures,
            open: state.openUntil > Date.now(),
            openUntil: state.openUntil || null,
            lastFailureAt: state.lastFailureAt,
        };
    }
    return {
        ...aiGatewayMetrics,
        cacheEntries: aiResponseCache.size,
        redisEnabled: Boolean(AI_REDIS_URL),
        redisAvailable,
        circuitBreakers,
    };
}

function normalizeRequestedAiModel(provider, requestedModel) {
    const normalizedProvider = typeof provider === 'string' ? provider.trim() : '';
    const config = AI_PROVIDER_CONFIGS[normalizedProvider] || {};
    const aliasMap = AI_MODEL_ALIASES[normalizedProvider] || {};
    const fallbackModel = aliasMap.default || config.defaultModel || requestedModel || '';

    if (typeof requestedModel !== 'string') {
        return fallbackModel;
    }

    const trimmedModel = requestedModel.trim();
    if (!trimmedModel) {
        return fallbackModel;
    }

    const normalizedModel = trimmedModel.toLowerCase();
    if (aliasMap[trimmedModel] || aliasMap[normalizedModel]) {
        return aliasMap[trimmedModel] || aliasMap[normalizedModel];
    }

    for (const [candidateProvider, candidateAliases] of Object.entries(AI_MODEL_ALIASES)) {
        if (!candidateAliases || candidateProvider === normalizedProvider) {
            continue;
        }

        if (candidateAliases[trimmedModel] || candidateAliases[normalizedModel]) {
            return fallbackModel;
        }
    }

    const supportedModels = new Set(
        Object.values(aliasMap).filter(value => typeof value === 'string' && value.trim()),
    );

    if (supportedModels.size > 0 && !supportedModels.has(trimmedModel)) {
        return fallbackModel;
    }

    return trimmedModel;
}

function getAiProviderFallbackOrder(primaryProvider) {
    const normalizedPrimaryProvider = typeof primaryProvider === 'string' ? primaryProvider.trim() : '';
    if (!normalizedPrimaryProvider || !ALLOWED_AI_PROVIDERS.includes(normalizedPrimaryProvider)) {
        return [...ALLOWED_AI_PROVIDERS];
    }
    return [
        normalizedPrimaryProvider,
        ...ALLOWED_AI_PROVIDERS.filter(provider => provider !== normalizedPrimaryProvider),
    ];
}

function isAiProviderReady(provider) {
    const config = AI_PROVIDER_CONFIGS[provider] || {};
    return Boolean(
        config
        && isConfiguredSecret(config.apiKey, [
            'REDACTED',
            'REDACTED',
            'REDACTED',
            'your-wenxin-api-key',
            'your-doubao-api-key',
            'your-zhipu-api-key',
            'REDACTED',
        ])
    );
}

function shouldTryNextAiProvider(status, errorMessage = '', errorCode = '') {
    const normalizedMessage = String(errorMessage || '').toLowerCase();
    const normalizedCode = String(errorCode || '').toUpperCase();

    if (normalizedCode === 'AI_CIRCUIT_OPEN' || normalizedCode === 'AI_TIMEOUT' || normalizedCode === 'AI_EMPTY_CONTENT') {
        return true;
    }

    if (status === 401 || status === 403 || status === 408 || status === 409 || status === 425 || status === 429) {
        return true;
    }

    if (status >= 500) {
        return true;
    }

    return normalizedMessage.includes('model')
        || normalizedMessage.includes('endpoint')
        || normalizedMessage.includes('does not exist')
        || normalizedMessage.includes('not exist')
        || normalizedMessage.includes('无效')
        || normalizedMessage.includes('expired')
        || normalizedMessage.includes('insufficient')
        || normalizedMessage.includes('quota')
        || normalizedMessage.includes('rate limit')
        || normalizedMessage.includes('timeout')
        || normalizedMessage.includes('network')
        || normalizedMessage.includes('连接');
}

async function requestAiUpstreamOnce({ provider, model, messages, temperature, maxTokens, stream, traceId }) {
    const config = AI_PROVIDER_CONFIGS[provider] || {};
    const requestModel = normalizeRequestedAiModel(provider, model);
    const requestData = {
        model: requestModel,
        messages,
        temperature,
        max_tokens: Math.min(Number(maxTokens) || 1000, 1200),
        stream: Boolean(stream),
    };
    const apiUrl = `${config.baseUrl}/chat/completions`;
    const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
        Connection: 'keep-alive',
        'X-Trace-Id': traceId,
    };
    const requestMeta = {
        provider,
        model: requestModel,
        stream: Boolean(stream),
        messageCount: Array.isArray(messages) ? messages.length : 0,
        maxTokens: requestData.max_tokens,
    };
    const { controller, timer } = createTimeoutController();
    const startedAt = Date.now();
    let aiResponse;
    let upstreamResponseAt = null;

    try {
        aiGatewayMetrics.upstreamCalls += 1;
        console.log('[AI服务] 开始请求上游AI', {
            traceId,
            ...requestMeta,
        });
        aiResponse = await fetch(apiUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify(requestData),
            signal: controller.signal,
        });
        upstreamResponseAt = Date.now();
        console.log('[AI服务] 上游AI已响应', {
            traceId,
            ...requestMeta,
            status: aiResponse.status,
            upstreamCost: upstreamResponseAt - startedAt,
        });
        return {
            provider,
            requestModel,
            requestData,
            requestMeta,
            aiResponse,
            startedAt,
            upstreamResponseAt,
        };
    } catch (error) {
        if (error.name === 'AbortError') {
            aiGatewayMetrics.upstreamTimeouts += 1;
            aiGatewayMetrics.upstreamFailures += 1;
            const opened = await recordAiCircuitFailure(provider);
            console.error('[AI服务] 上游AI请求超时', {
                traceId,
                ...requestMeta,
                timeout: AI_PROXY_TIMEOUT,
                elapsed: Date.now() - startedAt,
                circuitOpened: opened,
            });
            const timeoutError = new Error(`AI服务响应超时（>${AI_PROXY_TIMEOUT}ms）`);
            timeoutError.code = 'AI_TIMEOUT';
            timeoutError.status = 504;
            timeoutError.provider = provider;
            timeoutError.requestModel = requestModel;
            throw timeoutError;
        }

        aiGatewayMetrics.upstreamFailures += 1;
        const opened = await recordAiCircuitFailure(provider);
        console.error('[AI服务] 上游AI请求失败', {
            traceId,
            ...requestMeta,
            message: error.message,
            circuitOpened: opened,
        });
        error.provider = provider;
        error.requestModel = requestModel;
        throw error;
    } finally {
        clearTimeout(timer);
    }
}

function extractStreamDelta(payload) {
    if (!payload || typeof payload !== 'object') {
        return '';
    }
    const choice = Array.isArray(payload.choices) ? payload.choices[0] : null;
    if (!choice) {
        return '';
    }
    if (typeof choice.delta?.content === 'string') {
        return choice.delta.content;
    }
    if (Array.isArray(choice.delta?.content)) {
        return choice.delta.content
            .map(item => {
                if (typeof item === 'string') {
                    return item;
                }
                if (typeof item?.text === 'string') {
                    return item.text;
                }
                if (typeof item?.content === 'string') {
                    return item.content;
                }
                return '';
            })
            .join('');
    }
    if (typeof choice.message?.content === 'string') {
        return choice.message.content;
    }
    if (Array.isArray(choice.message?.content)) {
        return choice.message.content
            .map(item => {
                if (typeof item === 'string') {
                    return item;
                }
                if (typeof item?.text === 'string') {
                    return item.text;
                }
                if (typeof item?.content === 'string') {
                    return item.content;
                }
                return '';
            })
            .join('');
    }
    if (typeof choice.text === 'string') {
        return choice.text;
    }
    return '';
}

function extractAiResponseContent(payload) {
    if (!payload || typeof payload !== 'object') {
        return '';
    }

    const collectText = value => {
        if (typeof value === 'string') {
            return value;
        }
        if (Array.isArray(value)) {
            return value
                .map(item => {
                    if (typeof item === 'string') {
                        return item;
                    }
                    if (typeof item?.text === 'string') {
                        return item.text;
                    }
                    if (typeof item?.content === 'string') {
                        return item.content;
                    }
                    return '';
                })
                .join('');
        }
        return '';
    };

    const choice = Array.isArray(payload.choices) ? payload.choices[0] : null;
    const messageContent = collectText(choice?.message?.content);
    if (messageContent.trim()) {
        return messageContent.trim();
    }

    const deltaContent = collectText(choice?.delta?.content);
    if (deltaContent.trim()) {
        return deltaContent.trim();
    }

    const directContent = collectText(payload.content);
    if (directContent.trim()) {
        return directContent.trim();
    }

    if (typeof choice?.text === 'string' && choice.text.trim()) {
        return choice.text.trim();
    }
    if (typeof payload.text === 'string' && payload.text.trim()) {
        return payload.text.trim();
    }
    if (typeof payload.output_text === 'string' && payload.output_text.trim()) {
        return payload.output_text.trim();
    }
    if (typeof payload.response === 'string' && payload.response.trim()) {
        return payload.response.trim();
    }
    if (typeof payload.result === 'string' && payload.result.trim()) {
        return payload.result.trim();
    }

    const reasoningContent = collectText(choice?.message?.reasoning_content)
        || collectText(choice?.reasoning_content)
        || collectText(payload.reasoning_content)
        || collectText(payload.reasoning);
    if (reasoningContent.trim()) {
        return reasoningContent.trim();
    }

    return '';
}


app.get(['/proxy/ai/providers', '/api/proxy/ai/providers'], async (req, res) => {
    const providers = await Promise.all(ALLOWED_AI_PROVIDERS.map(async provider => {
        const config = AI_PROVIDER_CONFIGS[provider] || {};
        const hasApiKey = !!(config.apiKey && config.apiKey.trim());
        return {
            provider,
            enabled: true,
            configured: hasApiKey,
            status: hasApiKey ? AI_PROVIDER_HEALTH.healthy : AI_PROVIDER_HEALTH.missing_key,
            baseUrl: config.baseUrl || '',
            defaultModel: config.defaultModel || '',
            circuitOpen: await isAiCircuitOpen(provider),
        };
    }));

    return successResponse(res, {
        allowedProviders: ALLOWED_AI_PROVIDERS,
        defaultProvider: ALLOWED_AI_PROVIDERS[0] || 'deepseek',
        providers,
        gateway: await getAiGatewayMetricsSnapshot(),
    });
});

app.get(['/proxy/ai/metrics', '/api/proxy/ai/metrics'], async (req, res) => {
    return successResponse(res, await getAiGatewayMetricsSnapshot());
});

app.post(['/proxy/ai/test', '/api/proxy/ai/test'], async (req, res) => {
    const { provider = 'deepseek', apiKey, baseUrl } = req.body || {};
    const normalizedProvider = typeof provider === 'string' ? provider.trim() : '';

    if (!normalizedProvider || !ALLOWED_AI_PROVIDERS.includes(normalizedProvider)) {
        return errorResponse(
            res,
            'INVALID_PROVIDER',
            `不支持的AI提供商: ${provider || 'unknown'}。仅支持: ${ALLOWED_AI_PROVIDERS.join(', ')}`,
            { allowedProviders: ALLOWED_AI_PROVIDERS },
            400,
        );
    }

    const baseConfig = AI_PROVIDER_CONFIGS[normalizedProvider] || {};
    const resolvedApiKey = typeof apiKey === 'string' && apiKey.trim()
        ? apiKey.trim()
        : (baseConfig.apiKey || '').trim();
    const resolvedBaseUrl = typeof baseUrl === 'string' && baseUrl.trim()
        ? baseUrl.trim().replace(/\/$/, '')
        : (baseConfig.baseUrl || '').trim().replace(/\/$/, '');

    if (!resolvedApiKey) {
        return errorResponse(res, 'VALIDATION_ERROR', 'API Key 不能为空', null, 422);
    }

    if (!resolvedBaseUrl) {
        return errorResponse(res, 'VALIDATION_ERROR', 'Base URL 不能为空', null, 422);
    }

    const requestModel = baseConfig.defaultModel;
    const requestData = {
        model: requestModel,
        messages: [{ role: 'user', content: '你好' }],
        max_tokens: 10,
    };

    const startedAt = Date.now();

    try {
        const response = await fetch(`${resolvedBaseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${resolvedApiKey}`,
            },
            body: JSON.stringify(requestData),
        });

        if (!response.ok) {
            let errorMessage = `HTTP ${response.status}`;
            try {
                const errorData = await response.json();
                if (errorData.error) {
                    errorMessage = errorData.error.message || errorData.error.code || errorMessage;
                } else if (errorData.message) {
                    errorMessage = errorData.message;
                }
            } catch (error) {
                // ignore parse error
            }
            return errorResponse(res, 'AI_TEST_FAILED', errorMessage, null, response.status);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '';
        return successResponse(res, {
            provider: normalizedProvider,
            model: requestModel,
            latency: Date.now() - startedAt,
            content,
        }, 'AI 连接测试成功');
    } catch (error) {
        return errorResponse(res, 'AI_TEST_FAILED', `AI测试失败: ${error.message}`, null, 500);
    }
});

app.post(['/proxy/ai', '/api/proxy/ai'], (req, res) => {
    void (async () => {
        const { messages, provider = 'deepseek', model, temperature = 0.7, maxTokens = 1000, stream = false } = req.body;
    const normalizedProvider = typeof provider === 'string' ? provider.trim() : '';
    const traceId = req.headers['x-trace-id'] || `trace_${generateId()}`;
    let cacheKey = null;
    let distributedLockOwner = null;
    let hasDistributedLock = false;
    let distributedLockRenewHandle = null;

    aiGatewayMetrics.totalRequests += 1;
    res.set('X-Trace-Id', traceId);
    res.set('X-Gateway-Layer', 'core-api-gateway');

    if (!normalizedProvider || !ALLOWED_AI_PROVIDERS.includes(normalizedProvider)) {
        return errorResponse(
            res,
            'INVALID_PROVIDER',
            `不支持的AI提供商: ${provider || 'unknown'}。仅支持: ${ALLOWED_AI_PROVIDERS.join(', ')}`,
            { allowedProviders: ALLOWED_AI_PROVIDERS },
            400,
        );
    }

    if (!messages || !Array.isArray(messages)) {
        console.log(`[AI服务] 请求验证失败: messages必须是数组`);
        return errorResponse(res, 'VALIDATION_ERROR', 'messages必须是数组', null, 422);
    }

    try {
        const config = AI_PROVIDER_CONFIGS[normalizedProvider];
        if (!config || !isConfiguredSecret(config.apiKey, ['REDACTED', 'REDACTED', 'REDACTED', 'your-wenxin-api-key', 'your-doubao-api-key', 'your-zhipu-api-key', 'REDACTED'])) {
            console.log(`[AI服务] API密钥未配置 - 提供商: ${normalizedProvider}`);
            return errorResponse(res, 'AI_NOT_CONFIGURED', `AI提供商 ${normalizedProvider} 未配置API密钥`, null, 503);
        }

        const enableStream = Boolean(stream);
        const providerOrder = getAiProviderFallbackOrder(normalizedProvider);
        const availableProviders = [];
        const skippedProviders = [];

        for (const providerName of providerOrder) {
            if (!isAiProviderReady(providerName)) {
                skippedProviders.push({ provider: providerName, reason: 'API密钥未配置' });
                continue;
            }

            if (await isAiCircuitOpen(providerName)) {
                skippedProviders.push({ provider: providerName, reason: '熔断中' });
                continue;
            }

            availableProviders.push(providerName);
        }

        if (!availableProviders.length) {
            console.log('[AI服务] 没有可用的AI提供商', {
                traceId,
                requestedProvider: normalizedProvider,
                skippedProviders,
            });
            return errorResponse(
                res,
                'AI_NO_AVAILABLE_PROVIDER',
                '当前没有可用的 AI 提供商，请检查后端 AI 配置或稍后重试。',
                {
                    traceId,
                    requestedProvider: normalizedProvider,
                    skippedProviders,
                },
                503,
            );
        }

        const requestModel = normalizeRequestedAiModel(availableProviders[0], model);
        const requestData = {
            model: requestModel,
            messages,
            temperature,
            max_tokens: Math.min(Number(maxTokens) || 1000, 1200),
            stream: enableStream,
        };
        const enableCache = !enableStream && messages.length <= 12;
        cacheKey = enableCache
            ? buildAiCacheKey({
                provider: availableProviders[0],
                model: requestModel,
                temperature,
                maxTokens: requestData.max_tokens,
                messages,
            })
            : null;
        const cachedEntry = cacheKey ? await getCachedAiResponse(cacheKey, true) : null;
        const inflightCandidate = enableCache ? getInflightAiRequest(cacheKey) : null;
        distributedLockOwner = enableCache && !enableStream ? `${traceId}:${process.pid}` : null;

        res.set('X-AI-Provider', normalizedProvider);
        res.set('X-AI-Model', requestModel);

        if (cachedEntry?.state === 'fresh') {
            aiGatewayMetrics.freshCacheHits += 1;
            res.set('X-AI-Cache', 'HIT');
            res.set('X-AI-Cache-Source', cachedEntry.source || 'memory');
            return successResponse(res, cachedEntry.data);
        }

        if (inflightCandidate && !enableStream) {
            aiGatewayMetrics.inflightHits += 1;
            res.set('X-AI-Cache', 'INFLIGHT_WAIT');
            const sharedResult = await inflightCandidate.promise;
            if (sharedResult?.ok) {
                return successResponse(res, sharedResult.data, '复用网关进行中的上游请求');
            }
            console.warn('[AI服务] 进行中请求返回失败结果，当前请求继续回源:', {
                traceId,
                message: sharedResult?.error?.message || 'unknown inflight error',
                code: sharedResult?.error?.code || null,
            });
        }

        if (cachedEntry?.state === 'stale') {
            res.set('X-AI-Cache', 'STALE_CANDIDATE');
            res.set('X-AI-Cache-Source', cachedEntry.source || 'memory');
        }

        aiGatewayMetrics.cacheMisses += 1;
        res.set('X-AI-Cache', enableCache ? 'MISS' : 'BYPASS');

        if (enableCache && !enableStream) {
            hasDistributedLock = await tryAcquireRedisAiLock(cacheKey, distributedLockOwner);
            if (hasDistributedLock) {
                aiGatewayMetrics.distributedLockLeaders += 1;
                res.set('X-AI-Distributed-Lock', 'LEADER');
                distributedLockRenewHandle = startRedisAiLockRenewal(cacheKey, distributedLockOwner, hasDistributedLock);
            } else if (redisAvailable) {
                aiGatewayMetrics.distributedLockHits += 1;
                res.set('X-AI-Distributed-Lock', 'FOLLOWER');
                const sharedCachedEntry = await waitForDistributedAiResult(cacheKey, true);
                if (sharedCachedEntry?.state === 'fresh') {
                    res.set('X-AI-Cache', 'DISTRIBUTED_WAIT_HIT');
                    res.set('X-AI-Cache-Source', sharedCachedEntry.source || 'memory');
                    return successResponse(res, sharedCachedEntry.data, '复用分布式共享上游结果');
                }
                if (sharedCachedEntry?.state === 'stale') {
                    res.set('X-AI-Cache', 'DISTRIBUTED_WAIT_STALE');
                    res.set('X-AI-Cache-Source', sharedCachedEntry.source || 'memory');
                    return successResponse(res, sharedCachedEntry.data, '等待分布式结果超时后命中陈旧缓存');
                }
            }
        }

        const inflightEntry = enableCache && !enableStream ? createInflightAiRequest(cacheKey) : null;
        if (inflightEntry) {
            aiGatewayMetrics.inflightLeaders += 1;
            res.set('X-AI-Inflight', 'LEADER');
        }

        const getAiProxyFailureStatus = status => {
            if (status === 401 || status === 403) {
                return 502;
            }
            return status;
        };

        const mapUpstreamAiError = (providerName, status, errorMessage = '') => {
            const normalizedMessage = String(errorMessage || '').toLowerCase();

            if (status === 401 || status === 403) {
                if (providerName === 'deepseek') {
                    return {
                        code: 'AI_PROVIDER_AUTH_INVALID',
                        message: 'DeepSeek API 密钥无效或已过期，请检查后端配置。',
                    };
                }
                if (providerName === 'doubao') {
                    return {
                        code: 'AI_PROVIDER_AUTH_INVALID',
                        message: '豆包 API 密钥格式错误、无效或已过期，请检查后端配置。',
                    };
                }
                if (providerName === 'zhipu') {
                    return {
                        code: 'AI_PROVIDER_AUTH_INVALID',
                        message: '智谱 AI 令牌无效或已过期，请检查后端配置。',
                    };
                }
                return {
                    code: 'AI_PROVIDER_AUTH_INVALID',
                    message: `${providerName} API 鉴权失败，请检查后端配置。`,
                };
            }

            if (
                normalizedMessage.includes('model')
                || normalizedMessage.includes('endpoint')
                || normalizedMessage.includes('does not exist')
                || normalizedMessage.includes('not exist')
                || normalizedMessage.includes('模型')
            ) {
                return {
                    code: 'AI_PROVIDER_MODEL_INVALID',
                    message: `${providerName} 模型不可用，系统已自动切换备用服务，请检查该服务商模型权限。`,
                };
            }

            return {
                code: 'AI_SERVICE_ERROR',
                message: String(errorMessage || `HTTP ${status}`),
            };
        };

        let attemptResult = null;
        const providerFailures = [];

        for (const providerName of availableProviders) {
            try {
                const candidateResult = await requestAiUpstreamOnce({
                    provider: providerName,
                    model,
                    messages,
                    temperature,
                    maxTokens,
                    stream: enableStream,
                    traceId,
                });

                const candidateContent = enableStream
                    ? null
                    : extractAiResponseContent(await candidateResult.aiResponse.clone().json());

                if (!candidateResult.aiResponse.ok || (!enableStream && !candidateContent)) {
                    aiGatewayMetrics.upstreamFailures += 1;
                    const opened = await recordAiCircuitFailure(providerName);
                    let errorMessage = `HTTP ${candidateResult.aiResponse.status}`;
                    try {
                        const errorData = await candidateResult.aiResponse.clone().json();
                        if (!candidateResult.aiResponse.ok) {
                            if (errorData.error) {
                                errorMessage = errorData.error.message || errorData.error.code || errorMessage;
                            } else if (errorData.message) {
                                errorMessage = errorData.message;
                            }
                        } else if (!candidateContent) {
                            errorMessage = 'AI返回空内容';
                        }
                    } catch (_error) {
                        if (!candidateResult.aiResponse.ok) {
                            // ignore parse error
                        } else if (!candidateContent) {
                            errorMessage = 'AI返回空内容';
                        }
                    }

                    console.error(`[AI服务] API调用失败: ${errorMessage}`, {
                        traceId,
                        provider: providerName,
                        circuitOpened: opened,
                    });

                    providerFailures.push({
                        provider: providerName,
                        message: errorMessage,
                        code: !candidateResult.aiResponse.ok ? 'AI_UPSTREAM_ERROR' : 'AI_EMPTY_CONTENT',
                        status: candidateResult.aiResponse.status || null,
                    });

                    if (shouldTryNextAiProvider(candidateResult.aiResponse.status, errorMessage, !candidateResult.aiResponse.ok ? 'AI_UPSTREAM_ERROR' : 'AI_EMPTY_CONTENT')) {
                        continue;
                    }

                    attemptResult = candidateResult;
                    break;
                }

                attemptResult = candidateResult;
                break;
            } catch (error) {
                providerFailures.push({
                    provider: providerName,
                    message: error.message || 'unknown error',
                    code: error.code || '',
                    status: error.status || null,
                });

                if (!shouldTryNextAiProvider(error.status, error.message, error.code)) {
                    settleInflightAiRequest(cacheKey, null, error);
                    await releaseDistributedLockIfHeld(cacheKey, distributedLockOwner, hasDistributedLock, distributedLockRenewHandle);
                    throw error;
                }
            }
        }

        if (!attemptResult) {
            const lastFailure = providerFailures[providerFailures.length - 1] || null;
            if (cachedEntry?.state === 'stale') {
                aiGatewayMetrics.staleCacheHits += 1;
                res.set('X-AI-Cache', 'STALE_ERROR_FALLBACK');
                res.set('X-AI-Cache-Source', cachedEntry.source || 'memory');
                settleInflightAiRequest(cacheKey, cachedEntry.data);
                await releaseDistributedLockIfHeld(cacheKey, distributedLockOwner, hasDistributedLock, distributedLockRenewHandle);
                return successResponse(res, cachedEntry.data, '所有上游失败，返回陈旧缓存');
            }

            const failureMessage = lastFailure?.message || '所有 AI 提供商调用失败';
            const failureStatus = lastFailure?.status || 503;
            const failureCode = lastFailure?.code || 'AI_ALL_PROVIDERS_FAILED';
            settleInflightAiRequest(cacheKey, null, new Error(failureMessage));
            await releaseDistributedLockIfHeld(cacheKey, distributedLockOwner, hasDistributedLock, distributedLockRenewHandle);
            return errorResponse(
                res,
                failureCode,
                `AI服务调用失败：${failureMessage}`,
                {
                    traceId,
                    requestedProvider: normalizedProvider,
                    attemptedProviders: availableProviders,
                    providerFailures,
                },
                getAiProxyFailureStatus(failureStatus),
            );
        }

        const {
            provider: responseProvider,
            requestModel: responseModel,
            requestMeta,
            aiResponse,
            startedAt,
            upstreamResponseAt,
        } = attemptResult;

        res.set('X-AI-Provider', responseProvider);
        res.set('X-AI-Model', responseModel);
        if (responseProvider !== normalizedProvider) {
            res.set('X-AI-Provider-Fallback', normalizedProvider);
        }

        if (enableStream) {
            if (!aiResponse.ok) {
                aiGatewayMetrics.upstreamFailures += 1;
                const opened = await recordAiCircuitFailure(responseProvider);
                let errorMessage = `HTTP ${aiResponse.status}`;
                try {
                    const errorData = await aiResponse.json();
                    console.error(`[AI服务] 流式API错误响应:`, errorData);
                    if (errorData.error) {
                        errorMessage = errorData.error.message || errorData.error.code || errorMessage;
                    } else if (errorData.message) {
                        errorMessage = errorData.message;
                    }
                } catch (e) {
                    console.error(`[AI服务] 解析流式错误响应失败:`, e);
                }
                console.error(`[AI服务] 流式API调用失败: ${errorMessage}`, {
                    traceId,
                    circuitOpened: opened,
                });
                if (cachedEntry?.state === 'stale') {
                    aiGatewayMetrics.staleCacheHits += 1;
                    res.set('X-AI-Cache', 'STALE_STREAM_FALLBACK');
                    res.set('X-AI-Cache-Source', cachedEntry.source || 'memory');
                    settleInflightAiRequest(cacheKey, cachedEntry.data);
                    await releaseDistributedLockIfHeld(cacheKey, distributedLockOwner, hasDistributedLock, distributedLockRenewHandle);
                    return successResponse(res, cachedEntry.data, '流式上游失败，返回陈旧缓存');
                }
                const mappedError = mapUpstreamAiError(responseProvider, aiResponse.status, errorMessage);
                const streamError = new Error(mappedError.message);
                streamError.code = mappedError.code;
                settleInflightAiRequest(cacheKey, null, streamError);
                await releaseDistributedLockIfHeld(cacheKey, distributedLockOwner, hasDistributedLock, distributedLockRenewHandle);
                return errorResponse(res, mappedError.code, mappedError.message, { traceId }, getAiProxyFailureStatus(aiResponse.status));
            }

            res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
            res.setHeader('Cache-Control', 'no-cache, no-transform');
            res.setHeader('Connection', 'keep-alive');
            res.setHeader('X-Accel-Buffering', 'no');
            res.flushHeaders?.();

            const reader = aiResponse.body?.getReader?.();
            const nodeStream = !reader && aiResponse.body ? aiResponse.body : null;
            const decoder = new TextDecoder('utf-8');
            let buffer = '';
            let fullContent = '';
            const emitBufferedFallback = async () => {
                let fallbackPayload = null;
                let fallbackContent = '';

                try {
                    fallbackPayload = await aiResponse.clone().json();
                    fallbackContent = extractAiResponseContent(fallbackPayload);
                } catch (_jsonError) {
                    try {
                        const rawText = await aiResponse.clone().text();
                        fallbackContent = String(rawText || '').trim();
                    } catch (_textError) {
                        fallbackContent = '';
                    }
                }

                if (!fallbackContent) {
                    const unavailableError = new Error('AI流式响应不可用');
                    unavailableError.code = 'AI_STREAM_ERROR';
                    throw unavailableError;
                }

                fullContent = fallbackContent;
                if (fallbackContent) {
                    res.write(`data: ${JSON.stringify({ type: 'delta', content: fallbackContent })}\n\n`);
                }

                const response = {
                    content: fallbackContent,
                    usage: fallbackPayload?.usage
                        ? {
                            promptTokens: fallbackPayload.usage?.prompt_tokens || 0,
                            completionTokens: fallbackPayload.usage?.completion_tokens || 0,
                            totalTokens: fallbackPayload.usage?.total_tokens || 0,
                        }
                        : null,
                    provider: responseProvider,
                    model: responseModel,
                    latency: Date.now() - startedAt,
                };
                await recordAiCircuitSuccess(responseProvider);
                aiGatewayMetrics.upstreamSuccess += 1;
                settleInflightAiRequest(cacheKey, response);
                await releaseDistributedLockIfHeld(cacheKey, distributedLockOwner, hasDistributedLock, distributedLockRenewHandle);
                res.write(`data: ${JSON.stringify({ type: 'done', data: response })}\n\n`);
                console.log('[AI服务] 上游未返回可读流，已回退为缓冲响应', {
                    traceId,
                    ...requestMeta,
                    status: aiResponse.status,
                    totalCost: Date.now() - startedAt,
                    contentLength: fallbackContent.length,
                });
                return res.end();
            };
            if (!reader && !nodeStream) {
                return await emitBufferedFallback();
            }

            const processChunk = chunk => {
                buffer += decoder.decode(chunk, { stream: true });
                const parts = buffer.split('\n');
                buffer = parts.pop() || '';

                for (const rawLine of parts) {
                    const line = rawLine.trim();
                    if (!line || !line.startsWith('data:')) {
                        continue;
                    }
                    const payloadText = line.slice(5).trim();
                    if (!payloadText || payloadText === '[DONE]') {
                        continue;
                    }
                    try {
                        const payload = JSON.parse(payloadText);
                        const delta = extractStreamDelta(payload);
                        if (delta) {
                            fullContent += delta;
                            res.write(`data: ${JSON.stringify({ type: 'delta', content: delta })}\n\n`);
                        }
                    } catch (streamError) {
                        console.error('[AI服务] 解析流式分片失败:', streamError);
                    }
                }
            };

            try {
                if (reader) {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) {
                            break;
                        }
                        processChunk(value);
                    }
                } else {
                    for await (const chunk of nodeStream) {
                        processChunk(chunk);
                    }
                }

                const response = {
                    content: fullContent,
                    usage: null,
                    provider: responseProvider,
                    model: responseModel,
                    latency: Date.now() - startedAt,
                };
                await recordAiCircuitSuccess(responseProvider);
                aiGatewayMetrics.upstreamSuccess += 1;
                settleInflightAiRequest(cacheKey, response);
                await releaseDistributedLockIfHeld(cacheKey, distributedLockOwner, hasDistributedLock, distributedLockRenewHandle);
                res.write(`data: ${JSON.stringify({ type: 'done', data: response })}\n\n`);
                console.log('[AI服务] 流式请求处理成功', {
                    traceId,
                    ...requestMeta,
                    status: aiResponse.status,
                    upstreamCost: upstreamResponseAt ? upstreamResponseAt - startedAt : null,
                    streamCost: upstreamResponseAt ? Date.now() - upstreamResponseAt : null,
                    totalCost: Date.now() - startedAt,
                    contentLength: fullContent.length,
                });
                return res.end();
            } catch (streamError) {
                console.error(`[AI服务] 流式传输失败:`, streamError);
                settleInflightAiRequest(cacheKey, null, streamError);
                await releaseDistributedLockIfHeld(cacheKey, distributedLockOwner, hasDistributedLock, distributedLockRenewHandle);
                res.write(`data: ${JSON.stringify({ type: 'error', message: streamError.message || '流式响应中断' })}\n\n`);
                return res.end();
            }
        }

        if (!aiResponse.ok) {
            const lastFailure = providerFailures[providerFailures.length - 1] || null;
            const mappedError = mapUpstreamAiError(
                responseProvider,
                aiResponse.status,
                lastFailure?.message || `HTTP ${aiResponse.status}`,
            );
            const serviceError = new Error(mappedError.message);
            serviceError.code = mappedError.code;
            settleInflightAiRequest(cacheKey, null, serviceError);
            await releaseDistributedLockIfHeld(cacheKey, distributedLockOwner, hasDistributedLock, distributedLockRenewHandle);
            return errorResponse(res, mappedError.code, mappedError.message, { traceId }, getAiProxyFailureStatus(aiResponse.status));
        }

        const aiData = await aiResponse.json();
        const parsedAt = Date.now();
        const content = extractAiResponseContent(aiData);
        if (!content) {
            const emptyContentError = new Error('AI返回空内容');
            emptyContentError.code = 'AI_EMPTY_CONTENT';
            settleInflightAiRequest(cacheKey, null, emptyContentError);
            await releaseDistributedLockIfHeld(cacheKey, distributedLockOwner, hasDistributedLock, distributedLockRenewHandle);
            return errorResponse(res, 'AI_EMPTY_CONTENT', 'AI 返回空内容，请稍后重试或检查备用服务配置。', { traceId, provider: responseProvider }, 502);
        }
        const usage = {
            promptTokens: aiData.usage?.prompt_tokens || 0,
            completionTokens: aiData.usage?.completion_tokens || 0,
            totalTokens: aiData.usage?.total_tokens || 0,
        };

        const response = {
            content,
            usage,
            provider: responseProvider,
            model: responseModel,
            latency: parsedAt - startedAt,
        };

        if (enableCache && cacheKey) {
            await setCachedAiResponse(cacheKey, response);
        }
        await recordAiCircuitSuccess(responseProvider);
        aiGatewayMetrics.upstreamSuccess += 1;
        settleInflightAiRequest(cacheKey, response);
        await releaseDistributedLockIfHeld(cacheKey, distributedLockOwner, hasDistributedLock, distributedLockRenewHandle);
        console.log('[AI服务] 请求处理成功', {
            traceId,
            ...requestMeta,
            status: aiResponse.status,
            upstreamCost: upstreamResponseAt ? upstreamResponseAt - startedAt : null,
            parseCost: upstreamResponseAt ? parsedAt - upstreamResponseAt : null,
            totalCost: parsedAt - startedAt,
            promptTokens: usage.promptTokens,
            completionTokens: usage.completionTokens,
            totalTokens: usage.totalTokens,
            cache: enableCache ? 'MISS' : 'BYPASS',
        });
        return successResponse(res, response);
    } catch (error) {
        settleInflightAiRequest(cacheKey, null, error);
        await releaseDistributedLockIfHeld(cacheKey, distributedLockOwner, hasDistributedLock, distributedLockRenewHandle);
        console.error(`[AI服务] 内部错误:`, error);
        if (res.headersSent) {
            if (!res.writableEnded) {
                try {
                    res.write(`data: ${JSON.stringify({ type: 'error', message: error.message || 'AI服务调用失败' })}\n\n`);
                } catch (_writeError) {
                    // ignore stream write failure
                }
                res.end();
            }
            return undefined;
        }
        return errorResponse(res, 'INTERNAL_ERROR', 'AI服务调用失败: ' + error.message, null, 500);
    }
    })().catch((error) => {
        console.error('[AI服务] 路由包装器捕获未处理异常:', error);
        if (!res.headersSent) {
            return errorResponse(res, 'INTERNAL_ERROR', 'AI服务调用失败: ' + error.message, null, 500);
        }
        if (!res.writableEnded) {
            res.end();
        }
        return undefined;
    });
});

// 地理编码API配置
const GEOCODING_CONFIGS = {
    amap: {
        apiKey: process.env.AMAP_API_KEY || '',
        baseUrl: process.env.AMAP_BASE_URL || 'https://restapi.amap.com/v3',
    },
    baidu: {
        apiKey: process.env.BAIDU_MAP_API_KEY || '',
        baseUrl: process.env.BAIDU_MAP_BASE_URL || 'https://api.map.baidu.com',
    },
    tianditu: {
        apiKey: process.env.TIANDITU_API_KEY || '',
        baseUrl: process.env.TIANDITU_BASE_URL || 'https://api.tianditu.gov.cn',
    },
    tencent: {
        apiKey: process.env.TENCENT_MAP_API_KEY || '',
        baseUrl: process.env.TENCENT_MAP_BASE_URL || 'https://apis.map.qq.com',
    },
};

const MAP_PROVIDER_PRIORITY = ['amap', 'tencent', 'baidu', 'tianditu'];
const MAP_PLACEHOLDER_KEYS = ['your-amap-api-key', 'your-baidu-map-api-key', 'your-tianditu-api-key', 'your-tencent-map-api-key'];

function getPreferredMapProviders(provider) {
    const normalizedProvider = typeof provider === 'string' ? provider.trim() : '';
    if (!normalizedProvider || !MAP_PROVIDER_PRIORITY.includes(normalizedProvider)) {
        return [...MAP_PROVIDER_PRIORITY];
    }
    return [normalizedProvider, ...MAP_PROVIDER_PRIORITY.filter(item => item !== normalizedProvider)];
}

function getMapProviderConfig(provider) {
    const config = GEOCODING_CONFIGS[provider];
    if (!config || !isConfiguredSecret(config.apiKey, MAP_PLACEHOLDER_KEYS)) {
        return null;
    }
    return config;
}

function buildMockGeocodingResponse(address, provider = 'amap') {
    return {
        lat: 39.91,
        lng: 116.41,
        formattedAddress: address,
        province: '北京市',
        city: '北京市',
        district: '东城区',
        provider,
    };
}

function buildMockReverseGeocodingResponse(lat, lng, provider = 'amap') {
    return {
        formattedAddress: `位置 (${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)})`,
        province: '未知',
        city: '未知',
        district: '未知',
        lat: Number(lat),
        lng: Number(lng),
        provider,
    };
}

app.post(['/geocoding', '/api/geocoding'], async (req, res) => {
    const { address, provider = 'amap' } = req.body;

    if (!address) {
        return errorResponse(res, 'VALIDATION_ERROR', '地址不能为空', null, 422);
    }

    const providersToTry = getPreferredMapProviders(provider);
    const failures = [];

    for (const providerName of providersToTry) {
        const config = getMapProviderConfig(providerName);
        if (!config) {
            failures.push({ provider: providerName, message: 'API密钥未配置' });
            continue;
        }

        try {
            console.log(`[地理编码] 调用地理编码API - 提供商: ${providerName}, 地址: ${address}`);

            let response;
            switch (providerName) {
                case 'amap':
                    response = await geocodeAmap(config, address);
                    break;
                case 'tencent':
                    response = await geocodeTencent(config, address);
                    break;
                case 'baidu':
                    response = await geocodeBaidu(config, address);
                    break;
                case 'tianditu':
                    response = await geocodeTianditu(config, address);
                    break;
                default:
                    continue;
            }

            console.log(`[地理编码] 成功解析地址 - 提供商: ${providerName}, 坐标: ${response.lat}, ${response.lng}`);
            return successResponse(res, response);
        } catch (error) {
            failures.push({ provider: providerName, message: error.message || '地理编码失败' });
            console.warn(`[地理编码] 提供商失败，尝试下一个: ${providerName}`, error.message || error);
        }
    }

    if (failures.length > 0) {
        console.warn('[地理编码] 所有提供商均失败，回退模拟数据:', failures);
    }

    return successResponse(res, buildMockGeocodingResponse(address, providersToTry[0] || 'amap'), '地理编码服务不可用，已返回模拟结果');
});

// 高德地图地理编码
async function geocodeAmap(config, address) {
    const geocodingUrl = `${config.baseUrl}/geocode/geo?address=${encodeURIComponent(address)}&key=${config.apiKey}`;
    const geocodingResponse = await fetch(geocodingUrl);
    
    if (!geocodingResponse.ok) {
        throw new Error(`高德地图API调用失败: ${geocodingResponse.status}`);
    }

    const geocodingData = await geocodingResponse.json();
    
    if (geocodingData.status !== '1' || !geocodingData.geocodes || geocodingData.geocodes.length === 0) {
        throw new Error(geocodingData.info || '地理编码失败');
    }

    const geocode = geocodingData.geocodes[0];
    const [lng, lat] = geocode.location.split(',').map(Number);

    return {
        lat,
        lng,
        formattedAddress: geocode.formatted_address,
        province: geocode.province,
        city: geocode.city,
        district: geocode.district,
        provider: 'amap',
    };
}

// 百度地图地理编码
async function geocodeBaidu(config, address) {
    const geocodingUrl = `${config.baseUrl}/geocoding/v3/?address=${encodeURIComponent(address)}&output=json&ak=${config.apiKey}`;
    const geocodingResponse = await fetch(geocodingUrl);
    
    if (!geocodingResponse.ok) {
        throw new Error(`百度地图API调用失败: ${geocodingResponse.status}`);
    }

    const geocodingData = await geocodingResponse.json();
    
    if (geocodingData.status !== 0 || !geocodingData.result) {
        throw new Error(geocodingData.message || '地理编码失败');
    }

    const result = geocodingData.result;
    const location = result.location;
    const addressComponent = result.addressComponent;

    return {
        lat: location.lat,
        lng: location.lng,
        formattedAddress: result.formatted_address,
        province: addressComponent.province,
        city: addressComponent.city,
        district: addressComponent.district,
        provider: 'baidu',
    };
}

// 天地图地理编码
async function geocodeTianditu(config, address) {
    const geocodingUrl = `${config.baseUrl}/geocoder?ds=${encodeURIComponent(JSON.stringify({ keyWord: address }))}&tk=${config.apiKey}`;
    const geocodingResponse = await fetch(geocodingUrl);
    
    if (!geocodingResponse.ok) {
        throw new Error(`天地图API调用失败: ${geocodingResponse.status}`);
    }

    const geocodingData = await geocodingResponse.json();
    
    if (geocodingData.status !== '0' || !geocodingData.result || !geocodingData.result.location) {
        throw new Error('地理编码失败');
    }

    const location = geocodingData.result.location;
    const addressComponent = geocodingData.result.addressComponent || {};

    return {
        lat: location.lat,
        lng: location.lon,
        formattedAddress: geocodingData.result.formatted_address || address,
        province: addressComponent.province || '',
        city: addressComponent.city || '',
        district: addressComponent.district || '',
        provider: 'tianditu',
    };
}

// 腾讯地图地理编码
async function geocodeTencent(config, address) {
    const geocodingUrl = `${config.baseUrl}/ws/geocoder/v1/?address=${encodeURIComponent(address)}&key=${config.apiKey}`;
    const geocodingResponse = await fetch(geocodingUrl);
    
    if (!geocodingResponse.ok) {
        throw new Error(`腾讯地图API调用失败: ${geocodingResponse.status}`);
    }

    const geocodingData = await geocodingResponse.json();
    
    if (geocodingData.status !== 0 || !geocodingData.result) {
        throw new Error(geocodingData.message || '地理编码失败');
    }

    const result = geocodingData.result;
    const location = result.location;
    const addressComponent = result.address_component;

    return {
        lat: location.lat,
        lng: location.lng,
        formattedAddress: result.address || address,
        province: addressComponent.province,
        city: addressComponent.city,
        district: addressComponent.district,
        provider: 'tencent',
    };
}

// 反向地理编码：坐标转地址
app.post(['/reverse-geocoding', '/api/reverse-geocoding'], async (req, res) => {
    const { lat, lng, provider = 'amap' } = req.body;
    const parsedLat = Number(lat);
    const parsedLng = Number(lng);

    if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLng)) {
        return errorResponse(res, 'VALIDATION_ERROR', '经纬度不能为空', null, 422);
    }

    const providersToTry = getPreferredMapProviders(provider);
    const failures = [];

    for (const providerName of providersToTry) {
        const config = getMapProviderConfig(providerName);
        if (!config) {
            failures.push({ provider: providerName, message: 'API密钥未配置' });
            continue;
        }

        try {
            console.log(`[反向地理编码] 调用反向地理编码API - 提供商: ${providerName}, 坐标: ${parsedLat}, ${parsedLng}`);

            let response;
            switch (providerName) {
                case 'amap':
                    response = await reverseGeocodeAmap(config, parsedLat, parsedLng);
                    break;
                case 'tencent':
                    response = await reverseGeocodeTencent(config, parsedLat, parsedLng);
                    break;
                case 'baidu':
                    response = await reverseGeocodeBaidu(config, parsedLat, parsedLng);
                    break;
                case 'tianditu':
                    response = await reverseGeocodeTianditu(config, parsedLat, parsedLng);
                    break;
                default:
                    continue;
            }

            console.log(`[反向地理编码] 成功解析坐标 - 提供商: ${providerName}, 地址: ${response.formattedAddress}`);
            return successResponse(res, response);
        } catch (error) {
            failures.push({ provider: providerName, message: error.message || '反向地理编码失败' });
            console.warn(`[反向地理编码] 提供商失败，尝试下一个: ${providerName}`, error.message || error);
        }
    }

    console.warn('[反向地理编码] 所有提供商均失败，回退模拟数据:', failures);
    return successResponse(
        res,
        buildMockReverseGeocodingResponse(parsedLat, parsedLng, providersToTry[0] || 'amap'),
        '反向地理编码服务不可用，已返回模拟结果',
    );
});

// 高德地图反向地理编码
async function reverseGeocodeAmap(config, lat, lng) {
    const url = `${config.baseUrl}/geocode/regeo?location=${lng},${lat}&key=${config.apiKey}&extensions=base`;
    const response = await fetch(url);
    
    if (!response.ok) {
        throw new Error(`高德地图反向地理编码调用失败: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.status !== '1' || !data.regeocode) {
        throw new Error(data.info || '反向地理编码失败');
    }

    const regeocode = data.regeocode;
    const addressComponent = regeocode.addressComponent || {};

    return {
        formattedAddress: regeocode.formatted_address || `位置 (${lat}, ${lng})`,
        province: addressComponent.province || '',
        city: addressComponent.city || '',
        district: addressComponent.district || '',
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        provider: 'amap',
    };
}

// 百度地图反向地理编码
async function reverseGeocodeBaidu(config, lat, lng) {
    const url = `${config.baseUrl}/reverse_geocoding/v3/?location=${lat},${lng}&output=json&ak=${config.apiKey}`;
    const response = await fetch(url);
    
    if (!response.ok) {
        throw new Error(`百度地图反向地理编码调用失败: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.status !== 0 || !data.result) {
        throw new Error(data.message || '反向地理编码失败');
    }

    const result = data.result;
    const addressComponent = result.addressComponent || {};

    return {
        formattedAddress: result.formatted_address || `位置 (${lat}, ${lng})`,
        province: addressComponent.province || '',
        city: addressComponent.city || '',
        district: addressComponent.district || '',
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        provider: 'baidu',
    };
}

// 天地图反向地理编码
async function reverseGeocodeTianditu(config, lat, lng) {
    const url = `${config.baseUrl}/geocoder?postJson=${encodeURIComponent(JSON.stringify({ lon: lng, lat: lat, ver: 1 }))}&tk=${config.apiKey}`;
    const response = await fetch(url);
    
    if (!response.ok) {
        throw new Error(`天地图反向地理编码调用失败: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.status !== '0' || !data.result) {
        throw new Error('反向地理编码失败');
    }

    const result = data.result;

    return {
        formattedAddress: result.formatted_address || `位置 (${lat}, ${lng})`,
        province: result.province || '',
        city: result.city || '',
        district: result.district || '',
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        provider: 'tianditu',
    };
}

// 腾讯地图反向地理编码
async function reverseGeocodeTencent(config, lat, lng) {
    const url = `${config.baseUrl}/ws/geocoder/v1/?location=${lat},${lng}&key=${config.apiKey}`;
    const response = await fetch(url);
    
    if (!response.ok) {
        throw new Error(`腾讯地图反向地理编码调用失败: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.status !== 0 || !data.result) {
        throw new Error(data.message || '反向地理编码失败');
    }

    const result = data.result;
    const addressComponent = result.address_component || {};

    return {
        formattedAddress: result.address || `位置 (${lat}, ${lng})`,
        province: addressComponent.province || '',
        city: addressComponent.city || '',
        district: addressComponent.district || '',
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        provider: 'tencent',
    };
}

app.get(['/geocoding/stats', '/api/geocoding/stats'], (req, res) => {
    const session = getSession(req);
    if (!session || session.role !== 'admin') {
        return errorResponse(res, 'FORBIDDEN', '权限不足', null, 403);
    }

    const data = {
        concurrentRequests: 2,
        maxConcurrent: 5,
        queueLength: 0,
        totalRequestsToday: 150,
        totalRequestsThisMonth: 4500,
    };

    successResponse(res, data);
});

app.post(['/logs/operation', '/api/logs/operation'], async (req, res) => {
    const session = getSession(req);
    if (!session) {
        return errorResponse(res, 'UNAUTHORIZED', '未授权，需要登录', null, 401);
    }

    const { action, module, details } = req.body;

    if (!action || !module) {
        return errorResponse(res, 'VALIDATION_ERROR', 'action和module不能为空', null, 422);
    }

    const logEntry = {
        id: `log_${generateId()}`,
        action,
        module,
        details,
        userId: session.userId,
        username: session.username,
        role: session.role,
        ipAddress: req.ip,
        userAgent: req.get('user-agent') || '',
    };

    try {
        const result = await pool.query(
            `INSERT INTO operation_logs (id, user_id, username, role, action, module, details, ip_address, user_agent)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING id, created_at`,
            [
                logEntry.id,
                logEntry.userId,
                logEntry.username,
                logEntry.role,
                logEntry.action,
                logEntry.module,
                logEntry.details ?? null,
                logEntry.ipAddress,
                logEntry.userAgent,
            ],
        );

        return res.status(201).json({
            success: true,
            data: { id: result.rows[0].id, timestamp: result.rows[0].created_at },
            timestamp: new Date().toISOString(),
        });
    } catch (err) {
        console.error('写入操作日志失败:', err.message);
        return errorResponse(res, 'DB_ERROR', '写入操作日志失败', null, 500);
    }
});

app.get(['/logs/operation/my', '/api/logs/operation/my'], async (req, res) => {
    const session = getSession(req);
    if (!session) {
        return errorResponse(res, 'UNAUTHORIZED', '未授权，需要登录', null, 401);
    }

    const { module, action, startDate, endDate, page = 1, pageSize = 30 } = req.query;

    try {
        const result = await pool.query(
            'SELECT * FROM operation_logs WHERE user_id = $1 ORDER BY created_at DESC',
            [session.userId],
        );

        let logs = result.rows.map((row) => ({
            id: row.id,
            action: row.action,
            module: row.module,
            details: row.details,
            userId: row.user_id,
            username: row.username,
            role: row.role,
            ipAddress: row.ip_address,
            userAgent: row.user_agent,
            timestamp: row.created_at,
        }));

        if (module) logs = logs.filter(l => l.module === module);
        if (action) logs = logs.filter(l => l.action === action);
        if (startDate) logs = logs.filter(l => l.timestamp >= startDate);
        if (endDate) logs = logs.filter(l => l.timestamp <= endDate + 'T23:59:59.999Z');

        const paginatedData = paginate(logs, page, pageSize);
        return successResponse(res, paginatedData);
    } catch (err) {
        console.error('读取操作日志失败:', err.message);
        return errorResponse(res, 'DB_ERROR', '读取操作日志失败', null, 500);
    }
});

app.get(['/admin/smart-devices', '/api/admin/smart-devices'], async (req, res) => {
    const session = getSession(req);
    if (!session || session.role !== 'admin') {
        return errorResponse(res, 'FORBIDDEN', '权限不足', null, 403);
    }

    try {
        const result = await pool.query(
            'SELECT * FROM smart_devices WHERE user_id = $1 ORDER BY created_at ASC',
            [session.userId],
        );

        const devices = result.rows.map((row) => ({
            id: row.id,
            name: row.device_name,
            type: row.device_type,
            enabled: row.status !== 'disconnected',
            config: {
                ...dataStore.adminSettings.smartDevices[row.device_type],
                apiSecret: '',
                accessSecret: '',
            },
            deviceId: row.device_id,
            status: row.status,
            connectedAt: row.connected_at,
            lastSyncAt: row.last_sync_at,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        }));

        return successResponse(res, { devices });
    } catch (err) {
        console.error('读取智能设备失败:', err.message);
        return errorResponse(res, 'DB_ERROR', '读取智能设备失败', null, 500);
    }
});

app.post(['/admin/smart-devices', '/api/admin/smart-devices'], async (req, res) => {
    const session = getSession(req);
    if (!session || session.role !== 'admin') {
        return errorResponse(res, 'FORBIDDEN', '权限不足', null, 403);
    }

    const { name, type, enabled, config } = req.body;

    if (!name || !type) {
        return errorResponse(res, 'VALIDATION_ERROR', 'name和type不能为空', null, 422);
    }

    const normalizedConfig = {
        ...(dataStore.adminSettings.smartDevices[type] || {}),
        ...(config || {}),
        name,
        enabled: enabled !== undefined ? enabled : true,
    };

    try {
        await upsertSystemSetting({
            settingKey: 'admin.smart-devices-settings',
            value: {
                ...dataStore.adminSettings.smartDevices,
                [type]: normalizedConfig,
            },
            settingType: 'json',
            category: 'admin',
            description: '后台智能设备配置',
            updatedBy: session.userId,
        });

        const result = await pool.query(
            `INSERT INTO smart_devices (id, user_id, device_type, device_name, device_id, connected_at, last_sync_at, status)
             VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, $6)
             ON CONFLICT (id)
             DO UPDATE SET
               device_name = EXCLUDED.device_name,
               device_id = EXCLUDED.device_id,
               connected_at = COALESCE(smart_devices.connected_at, CURRENT_TIMESTAMP),
               last_sync_at = CURRENT_TIMESTAMP,
               status = EXCLUDED.status,
               updated_at = CURRENT_TIMESTAMP
             RETURNING *`,
            [type, session.userId, type, name, type, enabled !== undefined && !enabled ? 'disconnected' : 'connected'],
        );

        dataStore.adminSettings.smartDevices[type] = normalizedConfig;
        const row = result.rows[0];
        const newDevice = {
            id: row.id,
            name: row.device_name,
            type: row.device_type,
            enabled: row.status !== 'disconnected',
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };

        return res.status(201).json({
            success: true,
            data: newDevice,
            message: '智能设备添加成功',
            timestamp: new Date().toISOString(),
        });
    } catch (err) {
        console.error('添加智能设备失败:', err.message);
        return errorResponse(res, 'DB_ERROR', '添加智能设备失败', null, 500);
    }
});

app.put(['/admin/smart-devices/:deviceId', '/api/admin/smart-devices/:deviceId'], async (req, res) => {
    const session = getSession(req);
    if (!session || session.role !== 'admin') {
        return errorResponse(res, 'FORBIDDEN', '权限不足', null, 403);
    }

    const { deviceId } = req.params;
    const { name, enabled, config } = req.body;

    const currentConfig = dataStore.adminSettings.smartDevices[deviceId];
    if (!currentConfig) {
        return errorResponse(res, 'NOT_FOUND', '智能设备不存在', null, 404);
    }

    const nextConfig = { ...currentConfig };
    if (name !== undefined) nextConfig.name = name;
    if (enabled !== undefined) nextConfig.enabled = enabled;
    if (config !== undefined) Object.assign(nextConfig, config);

    try {
        await upsertSystemSetting({
            settingKey: 'admin.smart-devices-settings',
            value: {
                ...dataStore.adminSettings.smartDevices,
                [deviceId]: nextConfig,
            },
            settingType: 'json',
            category: 'admin',
            description: '后台智能设备配置',
            updatedBy: session.userId,
        });

        const updated = await pool.query(
            `UPDATE smart_devices
             SET device_name = COALESCE($3, device_name),
                 last_sync_at = CURRENT_TIMESTAMP,
                 status = COALESCE($4, status),
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $1 AND user_id = $2
             RETURNING *`,
            [deviceId, session.userId, name ?? null, enabled !== undefined ? (enabled ? 'connected' : 'disconnected') : null],
        );

        if (updated.rows.length === 0) {
            return errorResponse(res, 'NOT_FOUND', '智能设备不存在', null, 404);
        }

        dataStore.adminSettings.smartDevices[deviceId] = nextConfig;

        const devices = Object.entries(dataStore.adminSettings.smartDevices).map(([type, deviceConfig]) => ({
            id: type,
            name: deviceConfig.name,
            type,
            enabled: deviceConfig.enabled,
            config: { ...deviceConfig, apiSecret: '', accessSecret: '' },
            updatedAt: new Date().toISOString(),
        }));

        return successResponse(res, { devices }, '智能设备更新成功');
    } catch (err) {
        console.error('更新智能设备失败:', err.message);
        return errorResponse(res, 'DB_ERROR', '更新智能设备失败', null, 500);
    }
});

app.delete(['/admin/smart-devices/:deviceId', '/api/admin/smart-devices/:deviceId'], async (req, res) => {
    const session = getSession(req);
    if (!session || session.role !== 'admin') {
        return errorResponse(res, 'FORBIDDEN', '权限不足', null, 403);
    }

    const { deviceId } = req.params;
    if (!dataStore.adminSettings.smartDevices[deviceId]) {
        return errorResponse(res, 'NOT_FOUND', '智能设备不存在', null, 404);
    }

    try {
        await pool.query('DELETE FROM smart_devices WHERE id = $1 AND user_id = $2', [deviceId, session.userId]);

        const nextSettings = { ...dataStore.adminSettings.smartDevices };
        delete nextSettings[deviceId];

        await upsertSystemSetting({
            settingKey: 'admin.smart-devices-settings',
            value: nextSettings,
            settingType: 'json',
            category: 'admin',
            description: '后台智能设备配置',
            updatedBy: session.userId,
        });

        dataStore.adminSettings.smartDevices = nextSettings;
        return successResponse(res, null, '智能设备删除成功');
    } catch (err) {
        console.error('删除智能设备失败:', err.message);
        return errorResponse(res, 'DB_ERROR', '智能设备删除失败', null, 500);
    }
});

app.get(['/admin/ai-settings', '/api/admin/ai-settings'], async (req, res) => {
    const session = getSession(req);
    if (!session || session.role !== 'admin') {
        return errorResponse(res, 'FORBIDDEN', '权限不足', null, 403);
    }

    try {
        const settings = await getSystemSetting('admin.ai-settings', dataStore.aiSettings);
        if (settings) {
            dataStore.aiSettings = settings;
        }
        return successResponse(res, dataStore.aiSettings);
    } catch (err) {
        console.error('读取AI设置失败:', err.message);
        return errorResponse(res, 'DB_ERROR', '读取AI设置失败', null, 500);
    }
});

app.put(['/admin/ai-settings', '/api/admin/ai-settings'], async (req, res) => {
    const session = getSession(req);
    if (!session || session.role !== 'admin') {
        return errorResponse(res, 'FORBIDDEN', '权限不足', null, 403);
    }

    dataStore.aiSettings = {
        ...dataStore.aiSettings,
        ...req.body,
        updatedAt: new Date().toISOString(),
    };

    try {
        await upsertSystemSetting({
            settingKey: 'admin.ai-settings',
            value: dataStore.aiSettings,
            settingType: 'json',
            category: 'admin',
            description: '后台AI设置',
            updatedBy: session.userId,
        });

        return successResponse(res, dataStore.aiSettings, 'AI设置更新成功');
    } catch (err) {
        console.error('更新AI设置失败:', err.message);
        return errorResponse(res, 'DB_ERROR', '更新AI设置失败', null, 500);
    }
});

app.get(['/admin/location-settings', '/api/admin/location-settings'], async (req, res) => {
    const session = getSession(req);
    if (!session || session.role !== 'admin') {
        return errorResponse(res, 'FORBIDDEN', '权限不足', null, 403);
    }

    try {
        const settings = await getSystemSetting('admin.location-settings', dataStore.adminSettings.location);
        if (settings) {
            dataStore.adminSettings.location = settings;
        }
        return successResponse(res, dataStore.adminSettings.location);
    } catch (err) {
        console.error('读取地理位置设置失败:', err.message);
        return errorResponse(res, 'DB_ERROR', '读取地理位置设置失败', null, 500);
    }
});

app.put(['/admin/location-settings', '/api/admin/location-settings'], async (req, res) => {
    const session = getSession(req);
    if (!session || session.role !== 'admin') {
        return errorResponse(res, 'FORBIDDEN', '权限不足', null, 403);
    }

    dataStore.adminSettings.location = {
        ...dataStore.adminSettings.location,
        ...req.body,
        updatedAt: new Date().toISOString(),
    };

    try {
        await upsertSystemSetting({
            settingKey: 'admin.location-settings',
            value: dataStore.adminSettings.location,
            settingType: 'json',
            category: 'admin',
            description: '后台地理位置设置',
            updatedBy: session.userId,
        });

        return successResponse(res, dataStore.adminSettings.location, '地理位置设置更新成功');
    } catch (err) {
        console.error('更新地理位置设置失败:', err.message);
        return errorResponse(res, 'DB_ERROR', '更新地理位置设置失败', null, 500);
    }
});

app.put(['/admin/account/password', '/api/admin/account/password'], async (req, res) => {
    const session = getSession(req);
    if (!session || (session.role !== 'admin' && session.role !== 'sub')) {
        return errorResponse(res, 'FORBIDDEN', '权限不足', null, 403);
    }

    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
        return errorResponse(res, 'VALIDATION_ERROR', '当前密码和新密码不能为空', null, 422);
    }

    try {
        const result = await pool.query(
            'SELECT id, password_hash FROM admins WHERE id = $1 OR username = $2 LIMIT 1',
            [session.userId, session.username],
        );
        if (result.rows.length === 0) {
            return errorResponse(res, 'NOT_FOUND', '管理员不存在', null, 404);
        }

        const admin = result.rows[0];
        if (admin.password_hash !== currentPassword) {
            return errorResponse(res, 'INVALID_CURRENT_PASSWORD', '当前密码错误', null, 400);
        }

        const updated = await pool.query(
            'UPDATE admins SET password_hash = $2, updated_at = CURRENT_TIMESTAMP, updated_by = $3 WHERE id = $1 RETURNING updated_at',
            [admin.id, newPassword, session.userId],
        );

        const cachedAdmin = dataStore.admins.find(a => a.id === admin.id || a.username === session.username);
        if (cachedAdmin) {
            cachedAdmin.password = newPassword;
            cachedAdmin.updatedAt = updated.rows[0].updated_at;
            cachedAdmin.updatedBy = session.userId;
        }

        return successResponse(res, { updatedAt: updated.rows[0].updated_at }, '管理员密码更新成功');
    } catch (err) {
        console.error('更新管理员密码失败:', err.message);
        return errorResponse(res, 'DB_ERROR', '管理员密码更新失败', null, 500);
    }
});

app.put(['/admin/account/profile', '/api/admin/account/profile'], async (req, res) => {
    const session = getSession(req);
    if (!session || (session.role !== 'admin' && session.role !== 'sub')) {
        return errorResponse(res, 'FORBIDDEN', '权限不足', null, 403);
    }

    const { email, nickname, province, permissions } = req.body;

    try {
        const updated = await pool.query(
            `UPDATE admins
             SET email = COALESCE($2, email),
                 nickname = COALESCE($3, nickname),
                 province = CASE WHEN $6 = 'admin' THEN COALESCE($4, province) ELSE province END,
                 permissions = CASE WHEN $6 = 'admin' THEN COALESCE($5, permissions) ELSE permissions END,
                 updated_at = CURRENT_TIMESTAMP,
                 updated_by = $1
             WHERE id = $1 OR username = $7
             RETURNING *`,
            [
                session.userId,
                email ?? null,
                nickname ?? null,
                province ?? null,
                permissions ?? null,
                session.role,
                session.username,
            ],
        );

        if (updated.rows.length === 0) {
            return errorResponse(res, 'NOT_FOUND', '管理员不存在', null, 404);
        }

        const row = updated.rows[0];
        const cachedAdmin = dataStore.admins.find(a => a.id === row.id || a.username === row.username);
        if (cachedAdmin) {
            cachedAdmin.email = row.email;
            cachedAdmin.nickname = row.nickname;
            cachedAdmin.province = row.province;
            cachedAdmin.permissions = row.permissions || [];
            cachedAdmin.updatedAt = row.updated_at;
            cachedAdmin.updatedBy = row.updated_by;
        }

        return successResponse(res, {
            id: row.id,
            username: row.username,
            email: row.email,
            role: row.role,
            province: row.province,
            permissions: row.permissions || [],
            status: row.status,
            createdBy: row.created_by,
            nickname: row.nickname,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            lastLoginAt: row.last_login_at,
            updatedBy: row.updated_by,
        }, '管理员信息更新成功');
    } catch (err) {
        console.error('更新管理员资料失败:', err.message);
        return errorResponse(res, 'DB_ERROR', '管理员信息更新失败', null, 500);
    }
});

app.get([
    '/hospital/profile',
    '/api/hospital/profile',
    '/hospital/account/profile',
    '/api/hospital/account/profile',
], async (req, res) => {
    const session = getSession(req);
    if (!session || session.role !== 'hospital') {
        return errorResponse(res, 'FORBIDDEN', '权限不足', null, 403);
    }

    try {
        const result = await pool.query('SELECT * FROM hospitals WHERE id = $1 OR username = $2 LIMIT 1', [session.userId, session.username]);
        if (result.rows.length === 0) {
            return errorResponse(res, 'NOT_FOUND', '医院不存在', null, 404);
        }
        const row = result.rows[0];
        return successResponse(res, {
            id: row.id,
            username: row.username,
            name: row.name,
            province: row.province,
            city: row.city,
            address: row.address,
            phone: row.phone,
            email: row.email,
            avatar: row.avatar,
            welcomeMessage: row.welcome_message || '',
            level: row.level,
            beds: row.beds,
            lat: row.lat !== null ? Number(row.lat) : null,
            lng: row.lng !== null ? Number(row.lng) : null,
            rating: row.rating !== null ? Number(row.rating) : 0,
            reviewCount: row.review_count || 0,
            departments: row.features || [],
            features: row.features || [],
            businessHours: row.business_hours,
            emergency: row.emergency,
            role: row.role,
            status: row.status,
            authCodeUsed: row.auth_code_used,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            lastLoginAt: row.last_login_at,
        });
    } catch (err) {
        console.error('读取医院资料失败:', err.message);
        return errorResponse(res, 'DB_ERROR', '读取医院资料失败', null, 500);
    }
});

app.put([
    '/hospital/profile',
    '/api/hospital/profile',
    '/hospital/account/profile',
    '/api/hospital/account/profile',
], async (req, res) => {
    const session = getSession(req);
    if (!session || session.role !== 'hospital') {
        return errorResponse(res, 'FORBIDDEN', '权限不足', null, 403);
    }

    const {
        name,
        address,
        phone,
        email,
        level,
        beds,
        lat,
        lng,
        businessHours,
        emergency,
        welcomeMessage,
        departments,
        features,
    } = req.body;
    const normalizedDepartments = Array.isArray(departments)
        ? departments.map(item => String(item || '').trim()).filter(Boolean)
        : Array.isArray(features)
            ? features.map(item => String(item || '').trim()).filter(Boolean)
            : null;

    try {
        const updated = await pool.query(
            `UPDATE hospitals
             SET name = COALESCE($2, name),
                 address = COALESCE($3, address),
                 phone = COALESCE($4, phone),
                 email = COALESCE($5, email),
                 level = COALESCE($6, level),
                 beds = COALESCE($7, beds),
                 lat = COALESCE($8, lat),
                 lng = COALESCE($9, lng),
                 business_hours = COALESCE($10, business_hours),
                 emergency = COALESCE($11, emergency),
                 welcome_message = COALESCE($12, welcome_message),
                 features = COALESCE($13, features),
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $1 OR username = $14
             RETURNING *`,
            [
                session.userId,
                name ?? null,
                address ?? null,
                phone ?? null,
                email ?? null,
                level ?? null,
                beds ?? null,
                lat ?? null,
                lng ?? null,
                businessHours ?? null,
                emergency ?? null,
                welcomeMessage ?? null,
                normalizedDepartments,
                session.username,
            ],
        );

        if (updated.rows.length === 0) {
            return errorResponse(res, 'NOT_FOUND', '医院不存在', null, 404);
        }

        const row = updated.rows[0];
        const cachedHospital = dataStore.hospitals.find(h => h.id === row.id || h.username === row.username);
        if (cachedHospital) {
            cachedHospital.name = row.name;
            cachedHospital.address = row.address;
            cachedHospital.phone = row.phone;
            cachedHospital.email = row.email;
            cachedHospital.level = row.level;
            cachedHospital.beds = row.beds;
            cachedHospital.lat = row.lat !== null ? Number(row.lat) : null;
            cachedHospital.lng = row.lng !== null ? Number(row.lng) : null;
            cachedHospital.businessHours = row.business_hours;
            cachedHospital.emergency = row.emergency;
            cachedHospital.welcomeMessage = row.welcome_message || '';
            cachedHospital.features = row.features || [];
            cachedHospital.departments = row.features || [];
            cachedHospital.updatedAt = row.updated_at;
        }

        return successResponse(res, {
            id: row.id,
            name: row.name,
            phone: row.phone,
            email: row.email,
            welcomeMessage: row.welcome_message || '',
            departments: row.features || [],
            features: row.features || [],
            updatedAt: row.updated_at,
        }, '医院信息更新成功');
    } catch (err) {
        console.error('更新医院资料失败:', err.message);
        return errorResponse(res, 'DB_ERROR', '更新医院资料失败', null, 500);
    }
});

app.delete(['/hospital/account/profile', '/api/hospital/account/profile'], async (req, res) => {
    const session = getSession(req);
    if (!session || session.role !== 'hospital') {
        return errorResponse(res, 'FORBIDDEN', '权限不足', null, 403);
    }

    try {
        const deleted = await pool.query(
            `DELETE FROM hospitals
             WHERE id = $1 OR username = $2
             RETURNING id, username, auth_code_used`,
            [session.userId, session.username],
        );

        if (deleted.rows.length === 0) {
            return errorResponse(res, 'NOT_FOUND', '医院不存在', null, 404);
        }

        const row = deleted.rows[0];
        const hospitalIndex = dataStore.hospitals.findIndex(h => h.id === row.id || h.username === row.username);
        if (hospitalIndex !== -1) {
            dataStore.hospitals.splice(hospitalIndex, 1);
        }

        if (row.auth_code_used) {
            const authCode = dataStore.authCodes.find(item => item.code === row.auth_code_used);
            if (authCode) {
                authCode.used = false;
                authCode.usedAt = null;
                authCode.usedBy = null;
                authCode.status = 'active';
            }
        }

        dataStore.sessions.delete(session.token);
        await deleteSessionByToken(session.token);

        return successResponse(res, {
            id: row.id,
            username: row.username,
        }, '医院账号已注销');
    } catch (err) {
        console.error('注销医院账号失败:', err.message);
        return errorResponse(res, 'DB_ERROR', '注销医院账号失败', null, 500);
    }
});

app.put(['/hospital/account/password', '/api/hospital/account/password'], async (req, res) => {
    const session = getSession(req);
    if (!session || session.role !== 'hospital') {
        return errorResponse(res, 'FORBIDDEN', '权限不足', null, 403);
    }

    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
        return errorResponse(res, 'VALIDATION_ERROR', '当前密码和新密码不能为空', null, 422);
    }

    try {
        const result = await pool.query(
            'SELECT id, password_hash FROM hospitals WHERE id = $1 OR username = $2 LIMIT 1',
            [session.userId, session.username],
        );
        if (result.rows.length === 0) {
            return errorResponse(res, 'NOT_FOUND', '医院不存在', null, 404);
        }

        const hospital = result.rows[0];
        if (hospital.password_hash !== currentPassword) {
            return errorResponse(res, 'INVALID_CURRENT_PASSWORD', '当前密码错误', null, 400);
        }

        const updated = await pool.query(
            'UPDATE hospitals SET password_hash = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING updated_at',
            [hospital.id, newPassword],
        );

        const cachedHospital = dataStore.hospitals.find(h => h.id === hospital.id || h.username === session.username);
        if (cachedHospital) {
            cachedHospital.password = newPassword;
            cachedHospital.updatedAt = updated.rows[0].updated_at;
        }

        return successResponse(res, { updatedAt: updated.rows[0].updated_at }, '医院密码更新成功');
    } catch (err) {
        console.error('更新医院密码失败:', err.message);
        return errorResponse(res, 'DB_ERROR', '医院密码更新失败', null, 500);
    }
});

const FITBIT_CONFIG = {
    clientId: process.env.FITBIT_CLIENT_ID || '',
    clientSecret: process.env.FITBIT_CLIENT_SECRET || '',
    redirectUri: process.env.FITBIT_REDIRECT_URI || `http://localhost:${process.env.BACKEND_PORT || 8899}/api/fitbit/callback`,
    scope: 'activity heartrate sleep profile weight',
    apiBaseUrl: 'https://api.fitbit.com/1',
    authUrl: 'https://www.fitbit.com/oauth2/authorize',
    tokenUrl: 'https://api.fitbit.com/oauth2/token',
};

// 辅助函数：刷新访问令牌
async function refreshFitbitTokens(userId) {
    const tokenData = await getSmartDeviceRecord(userId, 'fitbit');
    if (!tokenData || !tokenData.refresh_token) {
        return null;
    }

    try {
        const authString = Buffer.from(`${FITBIT_CONFIG.clientId}:${FITBIT_CONFIG.clientSecret}`).toString('base64');
        const response = await fetch(FITBIT_CONFIG.tokenUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${authString}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: tokenData.refresh_token,
            }),
        });

        if (!response.ok) {
            console.error('[Fitbit] 刷新令牌失败:', response.status);
            await pool.query("UPDATE smart_devices SET status = 'disconnected', access_token = NULL, refresh_token = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1", [`${userId}_fitbit`]);
            return null;
        }

        const newTokens = await response.json();
        const row = await upsertUserSmartDevice({
            userId,
            deviceType: 'fitbit',
            deviceName: 'Fitbit',
            accessToken: newTokens.access_token,
            refreshToken: newTokens.refresh_token,
            deviceId: newTokens.user_id,
            status: 'connected',
        });

        return {
            accessToken: row.access_token,
            refreshToken: row.refresh_token,
            expiresAt: row.last_sync_at ? (new Date(row.last_sync_at).getTime() + (newTokens.expires_in * 1000)) : Date.now() + (newTokens.expires_in * 1000),
            userId: row.device_id,
        };
    } catch (error) {
        console.error('[Fitbit] 刷新令牌异常:', error);
        await pool.query("UPDATE smart_devices SET status = 'error', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [`${userId}_fitbit`]);
        return null;
    }
}

// 辅助函数：获取有效的访问令牌
async function getValidFitbitToken(userId) {
    const tokenData = await getSmartDeviceRecord(userId, 'fitbit');
    if (!tokenData || !tokenData.access_token) {
        return null;
    }

    const lastSyncTime = tokenData.last_sync_at ? new Date(tokenData.last_sync_at).getTime() : 0;
    if (Date.now() > lastSyncTime + 55 * 60 * 1000) {
        return await refreshFitbitTokens(userId);
    }

    return {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt: lastSyncTime + 60 * 60 * 1000,
        userId: tokenData.device_id,
    };
}

// Fitbit OAuth 2.0 授权链接
app.get('/api/fitbit/auth', async (req, res) => {
    const session = getSession(req);
    if (!session || session.role !== 'user') {
        return errorResponse(res, 'FORBIDDEN', '权限不足', null, 403);
    }

    try {
        // 检查是否已配置 Fitbit
        if (!FITBIT_CONFIG.clientId || !FITBIT_CONFIG.clientSecret || 
            FITBIT_CONFIG.clientId === 'your-fitbit-client-id' || 
            FITBIT_CONFIG.clientSecret === 'your-fitbit-client-secret') {
            console.log('[Fitbit] OAuth配置未完成，返回模拟数据');
            successResponse(res, { authUrl: null, isConnected: false, needsConfig: true });
            return;
        }

        // 生成随机状态码防止 CSRF
        const state = crypto.randomBytes(32).toString('hex');
        await createOauthState(state, 'fitbit', session.userId);

        // 构建授权 URL
        const authParams = new URLSearchParams({
            response_type: 'code',
            client_id: FITBIT_CONFIG.clientId,
            redirect_uri: FITBIT_CONFIG.redirectUri,
            scope: FITBIT_CONFIG.scope,
            state,
        });

        const authUrl = `${FITBIT_CONFIG.authUrl}?${authParams.toString()}`;
        successResponse(res, { authUrl, isConnected: false });
    } catch (error) {
        console.error('[Fitbit] 生成授权链接失败:', error);
        errorResponse(res, 'INTERNAL_ERROR', '生成授权链接失败', null, 500);
    }
});

// Fitbit OAuth 2.0 回调
app.get('/api/fitbit/callback', async (req, res) => {
    const { code, state, error } = req.query;

    if (error) {
        console.error('[Fitbit] 用户拒绝授权:', error);
        return res.redirect(`${process.env.FRONTEND_URL || `http://localhost:${process.env.FRONTEND_PORT || 3080}`}?fitbit_auth=error&error=${error}`);
    }

    // 验证状态码
    const stateData = await loadOauthState(state, 'fitbit');
    if (!stateData || Date.now() - new Date(stateData.created_at).getTime() > 10 * 60 * 1000) {
        await deleteOauthState(state, 'fitbit');
        return res.redirect(`${process.env.FRONTEND_URL || `http://localhost:${process.env.FRONTEND_PORT || 3080}`}?fitbit_auth=error&error=invalid_state`);
    }

    await deleteOauthState(state, 'fitbit');

    try {
        // 交换访问令牌
        const authString = Buffer.from(`${FITBIT_CONFIG.clientId}:${FITBIT_CONFIG.clientSecret}`).toString('base64');
        const tokenResponse = await fetch(FITBIT_CONFIG.tokenUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${authString}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code,
                redirect_uri: FITBIT_CONFIG.redirectUri,
            }),
        });

        if (!tokenResponse.ok) {
            console.error('[Fitbit] 交换令牌失败:', tokenResponse.status);
            return res.redirect(`${process.env.FRONTEND_URL || `http://localhost:${process.env.FRONTEND_PORT || 3080}`}?fitbit_auth=error&error=token_exchange_failed`);
        }

        const tokens = await tokenResponse.json();
        await upsertUserSmartDevice({
            userId: stateData.user_id,
            deviceType: 'fitbit',
            deviceName: 'Fitbit',
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            deviceId: tokens.user_id,
            status: 'connected',
        });

        console.log('[Fitbit] OAuth授权成功');
        res.redirect(`${process.env.FRONTEND_URL || `http://localhost:${process.env.FRONTEND_PORT || 3080}`}?fitbit_auth=success`);
    } catch (error) {
        console.error('[Fitbit] OAuth回调异常:', error);
        res.redirect(`${process.env.FRONTEND_URL || `http://localhost:${process.env.FRONTEND_PORT || 3080}`}?fitbit_auth=error&error=internal_error`);
    }
});

// 检查 Fitbit 连接状态
app.get('/api/fitbit/status', async (req, res) => {
    const session = getSession(req);
    if (!session || session.role !== 'user') {
        return errorResponse(res, 'FORBIDDEN', '权限不足', null, 403);
    }

    try {
        if (!FITBIT_CONFIG.clientId || !FITBIT_CONFIG.clientSecret || 
            FITBIT_CONFIG.clientId === 'your-fitbit-client-id' || 
            FITBIT_CONFIG.clientSecret === 'your-fitbit-client-secret') {
            successResponse(res, { isConnected: false, needsConfig: true });
            return;
        }

        const tokenData = await getValidFitbitToken(session.userId);
        successResponse(res, { isConnected: !!tokenData, fitbitUserId: tokenData?.userId });
    } catch (error) {
        console.error('[Fitbit] 检查连接状态失败:', error);
        errorResponse(res, 'INTERNAL_ERROR', '检查连接状态失败', null, 500);
    }
});

// 断开 Fitbit 连接
app.post('/api/fitbit/disconnect', async (req, res) => {
    const session = getSession(req);
    if (!session || session.role !== 'user') {
        return errorResponse(res, 'FORBIDDEN', '权限不足', null, 403);
    }

    try {
        await pool.query("UPDATE smart_devices SET status = 'disconnected', access_token = NULL, refresh_token = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1", [`${session.userId}_fitbit`]);
        successResponse(res, { success: true });
    } catch (error) {
        console.error('[Fitbit] 断开连接失败:', error);
        errorResponse(res, 'INTERNAL_ERROR', '断开连接失败', null, 500);
    }
});

// Fitbit API 代理端点
app.all('/api/fitbit/*', async (req, res) => {
    const session = getSession(req);
    if (!session || session.role !== 'user') {
        return errorResponse(res, 'FORBIDDEN', '权限不足', null, 403);
    }

    try {
        // 检查是否配置了 OAuth
        if (!FITBIT_CONFIG.clientId || !FITBIT_CONFIG.clientSecret || 
            FITBIT_CONFIG.clientId === 'your-fitbit-client-id' || 
            FITBIT_CONFIG.clientSecret === 'your-fitbit-client-secret') {
            console.log('[Fitbit] OAuth配置未完成，返回模拟数据');
            const mockResponse = {
                activities: [
                    { activityId: 90013, activityParentId: 17, calories: 0, description: 'Walk', details: { steps: 0 }, name: 'Walk', startTime: '2026-04-12T09:00:00.000' }
                ],
                goals: { calories: 2000, distance: 5, floors: 10, steps: 10000 },
                summary: {
                    activityCalories: 0,
                    caloriesBMR: 1800,
                    caloriesOut: 1800,
                    distances: [{ activity: 'total', distance: 0 }],
                    floors: 0,
                    steps: 8500
                }
            };
            successResponse(res, mockResponse);
            return;
        }

        // 获取有效的访问令牌
        const tokenData = await getValidFitbitToken(session.userId);
        if (!tokenData) {
            return errorResponse(res, 'UNAUTHORIZED', 'Fitbit未连接', null, 401);
        }

        // 构建 Fitbit API URL
        const fitbitPath = req.originalUrl.replace('/api/fitbit', '');
        const apiUrl = `${FITBIT_CONFIG.apiBaseUrl}${fitbitPath}`;

        console.log(`[Fitbit] 调用API: ${req.method} ${apiUrl}`);

        // 转发请求到 Fitbit API
        const headers = {
            'Authorization': `Bearer ${tokenData.accessToken}`,
            'Accept': 'application/json',
        };

        const options = {
            method: req.method,
            headers,
        };

        if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
            options.headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(req.body);
        }

        const fitbitResponse = await fetch(apiUrl, options);

        if (!fitbitResponse.ok) {
            let errorMessage = `Fitbit API Error: ${fitbitResponse.status}`;
            try {
                const errorData = await fitbitResponse.json();
                console.error('[Fitbit] API错误响应:', errorData);
                if (errorData.errors && errorData.errors.length > 0) {
                    errorMessage = errorData.errors[0].message;
                }
            } catch (e) {
                console.error('[Fitbit] 解析错误响应失败:', e);
            }
            return errorResponse(res, 'FITBIT_API_ERROR', errorMessage, null, fitbitResponse.status);
        }

        const fitbitData = await fitbitResponse.json();
        successResponse(res, fitbitData);
    } catch (error) {
        console.error('[Fitbit] 调用API异常:', error);
        errorResponse(res, 'INTERNAL_ERROR', 'Fitbit服务调用失败: ' + error.message, null, 500);
    }
});

// 涂鸦智能设备 API 配置
const TUYA_CONFIG = {
    clientId: process.env.TUYA_CLIENT_ID || '',
    clientSecret: process.env.TUYA_CLIENT_SECRET || '',
    region: process.env.TUYA_REGION || 'cn',
    baseUrl: process.env.TUYA_BASE_URL || 'https://openapi.tuyacn.com',
};

// 辅助函数：获取涂鸦访问令牌
async function getTuyaAccessToken(userId) {
    let tokenData = await getSmartDeviceRecord(userId, 'tuya');
    
    // 如果没有令牌或令牌已过期，获取新令牌
    const lastSyncTime = tokenData?.last_sync_at ? new Date(tokenData.last_sync_at).getTime() : 0;
    if (!tokenData?.access_token || Date.now() > lastSyncTime + 59 * 60 * 1000) {
        try {
            const timestamp = Date.now();
            const stringToSign = `${TUYA_CONFIG.clientId}${timestamp}`;
            const sign = crypto.createHmac('sha256', TUYA_CONFIG.clientSecret)
                .update(stringToSign)
                .digest('hex')
                .toUpperCase();

            const tokenUrl = `${TUYA_CONFIG.baseUrl}/v1.0/token?grant_type=1`;
            const response = await fetch(tokenUrl, {
                method: 'GET',
                headers: {
                    'client_id': TUYA_CONFIG.clientId,
                    'sign': sign,
                    't': timestamp.toString(),
                    'sign_method': 'HMAC-SHA256',
                },
            });

            if (!response.ok) {
                throw new Error(`获取涂鸦令牌失败: ${response.status}`);
            }

            const data = await response.json();
            if (!data.success) {
                throw new Error(data.msg || '获取涂鸦令牌失败');
            }

            tokenData = await upsertUserSmartDevice({
                userId,
                deviceType: 'tuya',
                deviceName: 'Tuya',
                accessToken: data.result.access_token,
                refreshToken: null,
                deviceId: null,
                status: 'connected',
            });
        } catch (error) {
            console.error('[涂鸦] 获取令牌失败:', error);
            throw error;
        }
    }

    return tokenData.access_token;
}

// 辅助函数：调用涂鸦API
async function callTuyaApi(userId, method, path, body = null) {
    const accessToken = await getTuyaAccessToken(userId);
    const timestamp = Date.now();
    const nonce = crypto.randomBytes(16).toString('hex');
    
    let stringToSign = `${method}\n`;
    stringToSign += `${crypto.createHash('sha256').update(body ? JSON.stringify(body) : '').digest('hex')}\n`;
    stringToSign += `\n${path}\n`;
    
    const sign = crypto.createHmac('sha256', TUYA_CONFIG.clientSecret)
        .update(`${TUYA_CONFIG.clientId}${accessToken}${timestamp}${nonce}${stringToSign}`)
        .digest('hex')
        .toUpperCase();

    const headers = {
        'client_id': TUYA_CONFIG.clientId,
        'access_token': accessToken,
        'sign': sign,
        't': timestamp.toString(),
        'sign_method': 'HMAC-SHA256',
        'nonce': nonce,
    };

    if (body) {
        headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(`${TUYA_CONFIG.baseUrl}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
        throw new Error(`涂鸦API调用失败: ${response.status}`);
    }

    return await response.json();
}

// 涂鸦智能设备 API 路由
app.get('/api/tuya/devices', async (req, res) => {
    const session = getSession(req);
    if (!session || session.role !== 'user') {
        return errorResponse(res, 'FORBIDDEN', '权限不足', null, 403);
    }

    try {
        if (!TUYA_CONFIG.clientId || !TUYA_CONFIG.clientSecret) {
            console.log('[涂鸦] API未配置，返回模拟数据');
            const mockDevices = [
                { id: 'device_001', name: '智能手环', productName: '智能手环', online: true, status: 'online' },
                { id: 'device_002', name: '智能体重秤', productName: '智能体重秤', online: true, status: 'online' },
            ];
            return successResponse(res, { devices: mockDevices });
        }

        const data = await callTuyaApi(session.userId, 'GET', '/v1.0/users/' + session.userId + '/devices');
        successResponse(res, data.result);
    } catch (error) {
        console.error('[涂鸦] 获取设备列表失败:', error);
        errorResponse(res, 'INTERNAL_ERROR', '获取设备列表失败: ' + error.message, null, 500);
    }
});

app.get('/api/tuya/devices/:deviceId/status', async (req, res) => {
    const session = getSession(req);
    if (!session || session.role !== 'user') {
        return errorResponse(res, 'FORBIDDEN', '权限不足', null, 403);
    }

    try {
        if (!TUYA_CONFIG.clientId || !TUYA_CONFIG.clientSecret) {
            console.log('[涂鸦] API未配置，返回模拟数据');
            const mockStatus = {
                deviceId: req.params.deviceId,
                status: [
                    { code: 'heart_rate', value: 72 },
                    { code: 'steps', value: 8500 },
                    { code: 'weight', value: 68.5 },
                ],
            };
            return successResponse(res, mockStatus);
        }

        const data = await callTuyaApi(session.userId, 'GET', `/v1.0/devices/${req.params.deviceId}/status`);
        successResponse(res, data.result);
    } catch (error) {
        console.error('[涂鸦] 获取设备状态失败:', error);
        errorResponse(res, 'INTERNAL_ERROR', '获取设备状态失败: ' + error.message, null, 500);
    }
});

app.post('/api/tuya/devices/:deviceId/commands', async (req, res) => {
    const session = getSession(req);
    if (!session || session.role !== 'user') {
        return errorResponse(res, 'FORBIDDEN', '权限不足', null, 403);
    }

    try {
        if (!TUYA_CONFIG.clientId || !TUYA_CONFIG.clientSecret) {
            console.log('[涂鸦] API未配置，返回模拟数据');
            return successResponse(res, { success: true });
        }

        const data = await callTuyaApi(session.userId, 'POST', `/v1.0/devices/${req.params.deviceId}/commands`, req.body);
        successResponse(res, data.result);
    } catch (error) {
        console.error('[涂鸦] 发送设备命令失败:', error);
        errorResponse(res, 'INTERNAL_ERROR', '发送设备命令失败: ' + error.message, null, 500);
    }
});

app.get('/api/admin/notifications', (req, res) => {
    const session = getSession(req);
    if (!session || (session.role !== 'admin' && session.role !== 'sub')) {
        return errorResponse(res, 'FORBIDDEN', '权限不足', null, 403);
    }
    const { limit = 100 } = req.query;
    const notifications = [
        { id: 'notif_001', title: '系统通知', content: '欢迎使用健康守护平台', level: 'info', type: 'general', isRead: false, read: false, createdAt: new Date().toISOString() }
    ];
    successResponse(res, notifications.slice(0, parseInt(limit)));
});

app.post('/api/admin/notifications', (req, res) => {
    const session = getSession(req);
    if (!session || (session.role !== 'admin' && session.role !== 'sub')) {
        return errorResponse(res, 'FORBIDDEN', '权限不足', null, 403);
    }
    const newNotification = {
        id: `notif_${generateId()}`,
        ...req.body,
        isRead: false,
        read: false,
        createdAt: new Date().toISOString()
    };
    res.status(201).json({ success: true, data: newNotification, timestamp: new Date().toISOString() });
});

app.put('/api/admin/notifications/:notificationId/read', (req, res) => {
    const session = getSession(req);
    if (!session || (session.role !== 'admin' && session.role !== 'sub')) {
        return errorResponse(res, 'FORBIDDEN', '权限不足', null, 403);
    }
    successResponse(res, { success: true }, '通知已标记为已读');
});

app.put('/api/admin/notifications/read-all', (req, res) => {
    const session = getSession(req);
    if (!session || (session.role !== 'admin' && session.role !== 'sub')) {
        return errorResponse(res, 'FORBIDDEN', '权限不足', null, 403);
    }
    successResponse(res, { success: true }, '所有通知已标记为已读');
});

app.delete('/api/admin/notifications/:notificationId', (req, res) => {
    const session = getSession(req);
    if (!session || (session.role !== 'admin' && session.role !== 'sub')) {
        return errorResponse(res, 'FORBIDDEN', '权限不足', null, 403);
    }
    successResponse(res, null, '通知删除成功');
});

app.get('/api/admin/me/settings', (req, res) => {
    const session = getSession(req);
    if (!session || (session.role !== 'admin' && session.role !== 'sub')) {
        return errorResponse(res, 'FORBIDDEN', '权限不足', null, 403);
    }
    successResponse(res, { theme: 'light', notifications: true, language: 'zh-CN' });
});

app.get('/api/admin/admins/:adminId', async (req, res) => {
    const session = getSession(req);
    if (!session || (session.role !== 'admin' && session.role !== 'sub')) {
        return errorResponse(res, 'FORBIDDEN', '权限不足', null, 403);
    }
    const { adminId } = req.params;

    try {
        const result = await pool.query(
            'SELECT * FROM admins WHERE id = $1 OR username = $1 LIMIT 1',
            [adminId],
        );
        if (result.rows.length === 0) {
            return errorResponse(res, 'NOT_FOUND', '管理员不存在', null, 404);
        }
        const row = result.rows[0];
        return successResponse(res, {
            id: row.id,
            username: row.username,
            email: row.email,
            role: row.role,
            province: row.province,
            permissions: row.permissions || [],
            status: row.status,
            createdBy: row.created_by,
            nickname: row.nickname,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            lastLoginAt: row.last_login_at,
            updatedBy: row.updated_by,
        });
    } catch (err) {
        console.error('读取管理员详情失败:', err.message);
        return errorResponse(res, 'DB_ERROR', '读取管理员详情失败', null, 500);
    }
});

app.get('/api/admin/system-status', (req, res) => {
    const session = getSession(req);
    if (!session || (session.role !== 'admin' && session.role !== 'sub')) {
        return errorResponse(res, 'FORBIDDEN', '权限不足', null, 403);
    }
    successResponse(res, {
        cpu: 30 + Math.floor(Math.random() * 40),
        memory: 40 + Math.floor(Math.random() * 30),
        disk: 50 + Math.floor(Math.random() * 20),
        uptime: 86400 * Math.floor(Math.random() * 7),
        activeUsers: 10 + Math.floor(Math.random() * 50),
        requestsPerSecond: 5 + Math.floor(Math.random() * 20),
    });
});

app.get('/api/ai-module/question-types', (req, res) => {
    successResponse(res, dataStore.aiModuleQuestionTypes);
});

app.post('/api/ai-module/process', (req, res) => {
    const { question, type_code } = req.body;

    if (!question || !String(question).trim()) {
        return errorResponse(res, 'VALIDATION_ERROR', '问题不能为空', null, 422);
    }

    const questionText = String(question).trim();
    const matchedType = type_code
        ? dataStore.aiModuleQuestionTypes.find(item => item.type_code === type_code)
        : null;

    const autoDetectedType = matchedType || (() => {
        const q = questionText.toLowerCase();
        if (q.includes('药') || q.includes('服用')) return dataStore.aiModuleQuestionTypes.find(item => item.type_code === 'medication');
        if (q.includes('吃') || q.includes('饮食') || q.includes('营养')) return dataStore.aiModuleQuestionTypes.find(item => item.type_code === 'diet');
        if (q.includes('运动') || q.includes('锻炼') || q.includes('康复')) return dataStore.aiModuleQuestionTypes.find(item => item.type_code === 'exercise');
        if (q.includes('焦虑') || q.includes('失眠') || q.includes('情绪') || q.includes('压力')) return dataStore.aiModuleQuestionTypes.find(item => item.type_code === 'mental');
        return dataStore.aiModuleQuestionTypes.find(item => item.type_code === 'general');
    })();

    const apiConfig = {
        api_name: autoDetectedType?.api_name || '通用健康助手',
        provider: dataStore.aiSettings.provider || 'deepseek',
        model: dataStore.aiSettings.model || 'gpt-4',
    };

    const answer = `已收到您的问题：${questionText}。建议您结合自身情况参考${apiConfig.api_name}的意见；如果症状持续、加重或涉及处方用药，请及时咨询医生。`;

    const historyItem = {
        id: `aim_${generateId()}`,
        user_question: questionText,
        type_code: autoDetectedType?.type_code || null,
        type_name: autoDetectedType?.type_name || '未分类',
        api_name: apiConfig.api_name,
        is_success: true,
        created_at: new Date().toISOString(),
        answer,
    };

    dataStore.aiModuleHistory.unshift(historyItem);
    if (dataStore.aiModuleHistory.length > 100) {
        dataStore.aiModuleHistory = dataStore.aiModuleHistory.slice(0, 100);
    }

    successResponse(res, {
        questionType: autoDetectedType || null,
        apiConfig,
        result: {
            data: {
                content: answer,
            },
        },
    });
});

app.get('/api/ai-module/history', (req, res) => {
    const limit = Math.max(1, Math.min(50, parseInt(req.query.limit, 10) || 10));
    successResponse(res, dataStore.aiModuleHistory.slice(0, limit));
});

app.get('/api/users/me/profile', async (req, res) => {
    const session = getSession(req);
    if (!session || session.role !== 'user') {
        return errorResponse(res, 'FORBIDDEN', '权限不足', null, 403);
    }

    try {
        const result = await pool.query(
            `SELECT id, username, email, nickname, avatar, phone, gender, age, height, weight, birth_date, province, city, address, role, status, created_at, updated_at, last_login_at
             FROM users
             WHERE id = $1
             LIMIT 1`,
            [session.userId],
        );

        if (result.rows.length === 0) {
            return errorResponse(res, 'NOT_FOUND', '用户不存在', null, 404);
        }

        const row = result.rows[0];
        return successResponse(res, {
            id: row.id,
            username: row.username,
            email: row.email,
            nickname: row.nickname,
            avatar: row.avatar,
            phone: row.phone,
            gender: row.gender,
            age: row.age !== null ? Number(row.age) : null,
            height: row.height !== null ? Number(row.height) : null,
            weight: row.weight !== null ? Number(row.weight) : null,
            birthDate: row.birth_date,
            province: row.province,
            city: row.city,
            address: row.address,
            role: row.role,
            status: row.status,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            lastLoginAt: row.last_login_at,
        });
    } catch (err) {
        console.error('读取当前用户信息失败:', err.message);
        return errorResponse(res, 'DB_ERROR', '读取当前用户信息失败', null, 500);
    }
});

app.put('/api/users/me/profile', async (req, res) => {
    const session = getSession(req);
    if (!session || session.role !== 'user') {
        return errorResponse(res, 'FORBIDDEN', '权限不足', null, 403);
    }

    const {
        nickname,
        email = null,
        gender = null,
        age = null,
        height = null,
        weight = null,
    } = req.body || {};

    const trimmedNickname = String(nickname || '').trim();
    const normalizedEmail = email === null || email === undefined || email === '' ? null : String(email).trim();
    const normalizedGender = gender === null || gender === undefined || gender === '' ? null : String(gender).trim();
    const normalizedAge = age === null || age === undefined || age === '' ? null : Number(age);
    const normalizedHeight = height === null || height === undefined || height === '' ? null : Number(height);
    const normalizedWeight = weight === null || weight === undefined || weight === '' ? null : Number(weight);

    if (!trimmedNickname) {
        return errorResponse(res, 'VALIDATION_ERROR', '用户名不能为空', null, 422);
    }

    if (normalizedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        return errorResponse(res, 'VALIDATION_ERROR', '邮箱格式不正确', null, 422);
    }

    if (normalizedGender && !['男', '女', '保密'].includes(normalizedGender)) {
        return errorResponse(res, 'VALIDATION_ERROR', '性别取值无效', null, 422);
    }

    if (normalizedAge !== null && (!Number.isFinite(normalizedAge) || normalizedAge < 0 || normalizedAge > 150)) {
        return errorResponse(res, 'VALIDATION_ERROR', '年龄取值无效', null, 422);
    }

    if (normalizedHeight !== null && (!Number.isFinite(normalizedHeight) || normalizedHeight <= 0)) {
        return errorResponse(res, 'VALIDATION_ERROR', '身高取值无效', null, 422);
    }

    if (normalizedWeight !== null && (!Number.isFinite(normalizedWeight) || normalizedWeight <= 0)) {
        return errorResponse(res, 'VALIDATION_ERROR', '体重取值无效', null, 422);
    }

    try {
        const duplicateEmailResult = normalizedEmail
            ? await pool.query(
                'SELECT id FROM users WHERE email = $1 AND id <> $2 LIMIT 1',
                [normalizedEmail, session.userId],
            )
            : { rows: [] };

        if (duplicateEmailResult.rows.length > 0) {
            return errorResponse(res, 'EMAIL_EXISTS', '该邮箱已被其他账号使用', null, 409);
        }

        const result = await pool.query(
            `UPDATE users
             SET nickname = $2,
                 email = $3,
                 gender = $4,
                 age = $5,
                 height = $6,
                 weight = $7,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $1
             RETURNING id, username, email, nickname, avatar, phone, gender, age, height, weight, birth_date, province, city, address, role, status, created_at, updated_at, last_login_at`,
            [
                session.userId,
                trimmedNickname,
                normalizedEmail,
                normalizedGender,
                normalizedAge,
                normalizedHeight,
                normalizedWeight,
            ],
        );

        if (result.rows.length === 0) {
            return errorResponse(res, 'NOT_FOUND', '用户不存在', null, 404);
        }

        const row = result.rows[0];
        const updatedUser = {
            id: row.id,
            username: row.username,
            email: row.email,
            nickname: row.nickname,
            avatar: row.avatar,
            phone: row.phone,
            gender: row.gender,
            age: row.age !== null ? Number(row.age) : null,
            height: row.height !== null ? Number(row.height) : null,
            weight: row.weight !== null ? Number(row.weight) : null,
            birthDate: row.birth_date,
            province: row.province,
            city: row.city,
            address: row.address,
            role: row.role,
            status: row.status,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            lastLoginAt: row.last_login_at,
        };

        const cachedUserIndex = dataStore.users.findIndex(user => user.id === session.userId);
        if (cachedUserIndex !== -1) {
            dataStore.users[cachedUserIndex] = {
                ...dataStore.users[cachedUserIndex],
                ...updatedUser,
            };
        }

        return successResponse(res, updatedUser, '个人信息更新成功');
    } catch (err) {
        console.error('更新个人信息失败:', err.message);
        return errorResponse(res, 'DB_ERROR', '更新个人信息失败', null, 500);
    }
});

app.get('/api/admin/public-settings', (req, res) => {
    successResponse(res, { settings: { aiEnabled: true, smartDeviceEnabled: true, onlineHospitalEnabled: true } });
});

// 用户设置 API
app.get('/api/settings/pull/:userId', async (req, res) => {
    const session = getSession(req);
    if (!session) {
        return errorResponse(res, 'UNAUTHORIZED', '未授权，需要登录', null, 401);
    }

    const { userId } = req.params;
    if (session.userId !== userId && session.username !== userId) {
        return errorResponse(res, 'FORBIDDEN', '权限不足', null, 403);
    }

    if (!isDatabaseAvailable) {
        const localSettings = dataStore.userSettings[userId] || null;
        return successResponse(res, {
            settings: localSettings?.settings || null,
            updatedAt: localSettings?.updatedAt || null,
        }, localSettings ? '获取用户设置成功' : '未找到用户设置');
    }

    try {
        const result = await pool.query(
            'SELECT settings_json, updated_at FROM user_settings WHERE user_id = $1',
            [userId],
        );

        if (result.rows.length === 0) {
            return successResponse(res, { settings: null }, '未找到用户设置');
        }

        const row = result.rows[0];
        return successResponse(res, {
            settings: row.settings_json,
            updatedAt: row.updated_at,
        }, '获取用户设置成功');
    } catch (err) {
        console.error('读取用户设置失败:', err.message);
        return errorResponse(res, 'DB_ERROR', '读取用户设置失败', null, 500);
    }
});

app.post('/api/settings/push/:userId', async (req, res) => {
    const session = getSession(req);
    if (!session) {
        return errorResponse(res, 'UNAUTHORIZED', '未授权，需要登录', null, 401);
    }

    const { userId } = req.params;
    if (session.userId !== userId && session.username !== userId) {
        return errorResponse(res, 'FORBIDDEN', '权限不足', null, 403);
    }

    const { settings } = req.body;
    if (!settings) {
        return errorResponse(res, 'VALIDATION_ERROR', '设置数据不能为空', null, 422);
    }

    if (!isDatabaseAvailable) {
        dataStore.userSettings[userId] = {
            settings,
            updatedAt: new Date().toISOString(),
        };
        return successResponse(res, { settings }, '设置保存成功');
    }

    try {
        await pool.query(
            `INSERT INTO user_settings (user_id, settings_json, updated_at)
             VALUES ($1, $2::jsonb, CURRENT_TIMESTAMP)
             ON CONFLICT (user_id)
             DO UPDATE SET settings_json = EXCLUDED.settings_json, updated_at = CURRENT_TIMESTAMP`,
            [userId, JSON.stringify(settings)],
        );

        return successResponse(res, { settings }, '设置保存成功');
    } catch (err) {
        console.error('保存用户设置失败:', err.message);
        return errorResponse(res, 'DB_ERROR', '保存用户设置失败', null, 500);
    }
});

async function seedDefaultUsers() {
    const defaultUsers = [
        {
            id: 'user_001',
            username: 'testuser',
            password: '',
            email: 'contact@example.invalid',
            nickname: '测试用户',
            avatar: null,
            phone: '00000000000',
            gender: '男',
            age: null,
            height: null,
            weight: null,
            birthDate: '1990-01-01',
            province: '北京市',
            city: '北京市',
            address: '朝阳区建国路88号',
            role: 'user',
            status: 'active',
        },
        {
            id: 'user_002',
            username: 'zhangwei',
            password: '',
            email: 'contact@example.invalid',
            nickname: '张伟',
            avatar: null,
            phone: '00000000000',
            gender: '男',
            age: null,
            height: null,
            weight: null,
            birthDate: '1985-05-15',
            province: '上海市',
            city: '上海市',
            address: '浦东新区陆家嘴',
            role: 'user',
            status: 'active',
        },
    ];

    for (const user of defaultUsers) {
        await pool.query(
            `INSERT INTO users (
                id, username, password_hash, email, nickname, avatar, phone, gender,
                age, height, weight, birth_date, province, city, address, role, status, created_at, updated_at, last_login_at
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8,
                $9, $10, $11, $12, $13, $14, $15, $16, $17,
                CURRENT_TIMESTAMP - INTERVAL '30 day', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP - INTERVAL '2 day'
            )
            ON CONFLICT (username)
            DO NOTHING`,
            [
                user.id,
                user.username,
                user.password,
                user.email,
                user.nickname,
                user.avatar,
                user.phone,
                user.gender,
                user.age,
                user.height,
                user.weight,
                user.birthDate,
                user.province,
                user.city,
                user.address,
                user.role,
                user.status,
            ],
        );
    }
}

async function seedDefaultHospitals() {
    const defaultHospitals = [
        {
            id: 'hospital_001',
            username: 'hospital1',
            password: '',
            name: '北京协和医院',
            province: '北京市',
            city: '北京市',
            address: '东城区帅府园1号',
            phone: '010-69156114',
            email: 'contact@example.invalid',
            level: '三甲',
            beds: 2000,
            lat: 39.913818,
            lng: 116.410528,
            rating: 4.9,
            reviewCount: 1520,
            features: ['内科', '外科', '妇产科', '儿科'],
            businessHours: '08:00-17:00',
            emergency: true,
            role: 'hospital',
            status: 'active',
            authCodeUsed: 'AUTH123',
        },
        {
            id: 'hospital_002',
            username: 'hospital2',
            password: '',
            name: '北京大学人民医院',
            province: '北京市',
            city: '北京市',
            address: '西城区西直门南大街11号',
            phone: '010-88326666',
            email: 'contact@example.invalid',
            level: '三甲',
            beds: 1800,
            lat: 39.915374,
            lng: 116.358046,
            rating: 4.8,
            reviewCount: 1200,
            features: ['内科', '外科', '骨科', '心血管'],
            businessHours: '08:00-17:30',
            emergency: true,
            role: 'hospital',
            status: 'active',
            authCodeUsed: 'AUTH456',
        },
    ];

    for (const hospital of defaultHospitals) {
        await pool.query(
            `INSERT INTO hospitals (
                id, username, password_hash, name, province, city, address, phone, email,
                level, beds, lat, lng, rating, review_count, features, business_hours,
                emergency, role, status, auth_code_used, created_at, updated_at, last_login_at
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9,
                $10, $11, $12, $13, $14, $15, $16, $17,
                $18, $19, $20, $21,
                CURRENT_TIMESTAMP - INTERVAL '30 day', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP - INTERVAL '2 day'
            )
            ON CONFLICT (username)
            DO NOTHING`,
            [
                hospital.id,
                hospital.username,
                hospital.password,
                hospital.name,
                hospital.province,
                hospital.city,
                hospital.address,
                hospital.phone,
                hospital.email,
                hospital.level,
                hospital.beds,
                hospital.lat,
                hospital.lng,
                hospital.rating,
                hospital.reviewCount,
                hospital.features,
                hospital.businessHours,
                hospital.emergency,
                hospital.role,
                hospital.status,
                hospital.authCodeUsed,
            ],
        );
    }
}

async function seedDefaultAdmins() {
    const defaultAdmins = [
        {
            id: 'admin_001',
            username: 'admin',
            password: '',
            email: 'contact@example.invalid',
            avatar: null,
            role: 'admin',
            province: null,
            permissions: ['all'],
            status: 'active',
            createdBy: 'system',
            nickname: '系统管理员',
            updatedBy: 'system',
        },
        {
            id: 'subadmin_001',
            username: 'beijing_admin',
            password: '',
            email: 'contact@example.invalid',
            avatar: null,
            role: 'sub',
            province: '北京市',
            permissions: ['users', 'hospitals'],
            status: 'active',
            createdBy: 'admin_001',
            nickname: '北京管理员',
            updatedBy: 'admin_001',
        },
    ];

    for (const admin of defaultAdmins) {
        await pool.query(
            `INSERT INTO admins (
                id, username, password_hash, email, avatar, role, province, permissions,
                status, created_by, nickname, created_at, updated_at, last_login_at, updated_by
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8,
                $9, $10, $11,
                CURRENT_TIMESTAMP - INTERVAL '30 day', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP - INTERVAL '1 day', $12
            )
            ON CONFLICT (username)
            DO NOTHING`,
            [
                admin.id,
                admin.username,
                admin.password,
                admin.email,
                admin.avatar,
                admin.role,
                admin.province,
                admin.permissions,
                admin.status,
                admin.createdBy,
                admin.nickname,
                admin.updatedBy,
            ],
        );
    }
}

async function seedDefaultAuthCodes() {
    const defaultAuthCodes = [
        {
            id: 'auth_001',
            code: 'AUTH123',
            province: '北京市',
            used: true,
            usedBy: 'hospital1',
            status: 'revoked',
        },
        {
            id: 'auth_002',
            code: 'AUTH456',
            province: '上海市',
            used: true,
            usedBy: 'hospital2',
            status: 'revoked',
        },
        {
            id: 'auth_003',
            code: 'AUTH789',
            province: '广东省',
            used: false,
            usedBy: null,
            status: 'active',
        },
    ];

    for (const authCode of defaultAuthCodes) {
        await pool.query(
            `INSERT INTO auth_codes (id, code, province, used, used_at, used_by, status, created_at)
             VALUES (
                $1, $2, $3, $4,
                CASE WHEN $4 THEN CURRENT_TIMESTAMP - INTERVAL '30 day' ELSE NULL END,
                $5,
                $6,
                CURRENT_TIMESTAMP - INTERVAL '60 day'
             )
             ON CONFLICT (code)
             DO NOTHING`,
            [
                authCode.id,
                authCode.code,
                authCode.province,
                authCode.used,
                authCode.usedBy,
                authCode.status,
            ],
        );
    }
}

async function seedDefaultData() {
    await seedDefaultUsers();
    await seedDefaultHospitals();
    await seedDefaultAdmins();
    await seedDefaultAuthCodes();
}

async function startServer() {
    console.log('正在启动服务器...');
    
    // 测试数据库连接
    isDatabaseAvailable = await testConnection();
    console.log('[Startup] testConnection completed', { isDatabaseAvailable });

    await initializeRedisCache();
    console.log('[Startup] initializeRedisCache completed', { redisAvailable });

    await initializeRedisMiddlewareClient();
    console.log('[Startup] initializeRedisMiddlewareClient completed', { redisAvailable });

    if (!isDatabaseAvailable) {
        console.warn('⚠️  数据库连接失败，但服务器仍将启动（使用内存存储）');
    } else {
        console.log('[Startup] ensureDatabaseTables begin');
        await ensureDatabaseTables();
        console.log('[Startup] ensureDatabaseTables completed');

        console.log('[Startup] seedDefaultData begin');
        await seedDefaultData();
        console.log('[Startup] seedDefaultData completed');

        console.log('[Startup] syncUsersFromDatabase begin');
        await syncUsersFromDatabase();
        console.log('[Startup] syncUsersFromDatabase completed');

        console.log('[Startup] syncHospitalsFromDatabase begin');
        await syncHospitalsFromDatabase();
        console.log('[Startup] syncHospitalsFromDatabase completed');

        console.log('[Startup] syncAdminsFromDatabase begin');
        await syncAdminsFromDatabase();
        console.log('[Startup] syncAdminsFromDatabase completed');

        console.log('[Startup] syncAuthCodesFromDatabase begin');
        await syncAuthCodesFromDatabase();
        console.log('[Startup] syncAuthCodesFromDatabase completed');

        console.log('[Startup] syncSystemSettingsFromDatabase begin');
        await syncSystemSettingsFromDatabase();
        console.log('[Startup] syncSystemSettingsFromDatabase completed');

        console.log('[Startup] loadPersistedSessions begin');
        await loadPersistedSessions();
        console.log('[Startup] loadPersistedSessions completed');
    }
    
    const server = app.listen(PORT, () => {
        console.log(`✅ 服务器已启动: http://localhost:${PORT}`);
        console.log(`📦 API 版本: ${API_VERSION}`);
    });

    server.on('error', (error) => {
        if (error?.code === 'EADDRINUSE') {
            console.error(`❌ 端口 ${PORT} 已被占用，请先停止现有后端进程，或修改 PORT/BACKEND_PORT 后再启动。`);
            return;
        }

        console.error('[Server] 启动失败:', error);
    });
}

startServer();
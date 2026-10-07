// 导入必要的模块
import { initHealthGuardian, healthDataManager } from '../health-guardian/index.js';
import { getNearbyHospitals } from '../../../api/user/online-hospital/hospital-service.js';
import * as healthyDiet from '../healthy-diet/index.js';
import aiServices from '../ai-services/index.js';

const AMAP_HTTP_ASSET_PREFIX = 'http://webapi.amap.com/';
const AMAP_HTTPS_ASSET_PREFIX = 'https://webapi.amap.com/';

function rewriteAmapAssetUrl(value) {
    return typeof value === 'string' && value.includes(AMAP_HTTP_ASSET_PREFIX)
        ? value.replaceAll(AMAP_HTTP_ASSET_PREFIX, AMAP_HTTPS_ASSET_PREFIX)
        : value;
}

function forceAmapHttpsAssets() {
    if (window.__amapHttpsAssetObserverInitialized) {
        return;
    }

    const patchNode = node => {
        if (!node || node.nodeType !== Node.ELEMENT_NODE) {
            return;
        }

        if (node.tagName === 'STYLE' && node.textContent?.includes(AMAP_HTTP_ASSET_PREFIX)) {
            node.textContent = rewriteAmapAssetUrl(node.textContent);
        }

        if (node.hasAttribute('style')) {
            const currentStyle = node.getAttribute('style');
            const nextStyle = rewriteAmapAssetUrl(currentStyle);
            if (nextStyle !== currentStyle) {
                node.setAttribute('style', nextStyle);
            }
        }

        for (const attributeName of ['src', 'href']) {
            const attributeValue = node.getAttribute(attributeName);
            const nextValue = rewriteAmapAssetUrl(attributeValue);
            if (nextValue !== attributeValue) {
                node.setAttribute(attributeName, nextValue);
            }
        }

        node.querySelectorAll?.('*').forEach(child => {
            patchNode(child);
        });
    };

    document.querySelectorAll('style, [style], img[src], link[href]').forEach(node => {
        patchNode(node);
    });

    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            if (mutation.type === 'characterData' && mutation.target?.parentElement?.tagName === 'STYLE') {
                patchNode(mutation.target.parentElement);
                return;
            }

            if (mutation.type === 'attributes') {
                patchNode(mutation.target);
                return;
            }

            mutation.addedNodes.forEach(node => {
                patchNode(node);
            });
        });
    });

    observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ['style', 'src', 'href'],
    });

    window.__amapHttpsAssetObserverInitialized = true;
    window.__amapHttpsAssetObserver = observer;
}

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, char => {
        const entityMap = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;',
        };
        return entityMap[char] || char;
    });
}

function renderTextParagraphs(text = '') {
    return String(text || '')
        .split(/\n+/)
        .map(item => item.trim())
        .filter(Boolean)
        .map(item => `<p>${escapeHtml(item)}</p>`)
        .join('');
}

function renderHealthConsultationSection(title, items = [], accentClass = '') {
    if (!Array.isArray(items) || items.length === 0) {
        return '';
    }

    return `
        <section class="consultation-result-section ${accentClass}">
            <div class="consultation-result-section__header">
                <span class="consultation-result-section__dot"></span>
                <h5>${escapeHtml(title)}</h5>
            </div>
            <ul class="consultation-result-list">
                ${items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}
            </ul>
        </section>
    `;
}

function renderHealthConsultationResultContent(healthIssue, response, consultationResult = null) {
    const analysis = consultationResult?.analysis || response || '';
    const possibleCauses = Array.isArray(consultationResult?.possibleCauses)
        ? consultationResult.possibleCauses
        : [];
    const suggestions = Array.isArray(consultationResult?.suggestions)
        ? consultationResult.suggestions
        : [];

    return `
        <div class="consultation-response consultation-response--structured">
            <section class="consultation-qa-card consultation-qa-card--question">
                <div class="consultation-qa-card__badge">您的描述</div>
                <div class="consultation-qa-card__content">
                    ${renderTextParagraphs(healthIssue)}
                </div>
            </section>
            <section class="consultation-qa-card consultation-qa-card--answer">
                <div class="consultation-qa-card__badge">AI 分析</div>
                <div class="consultation-qa-card__content consultation-qa-card__content--analysis">
                    ${renderTextParagraphs(analysis)}
                </div>
            </section>
            ${renderHealthConsultationSection('可能原因', possibleCauses, 'consultation-result-section--cause')}
            ${renderHealthConsultationSection('建议处理', suggestions, 'consultation-result-section--suggestion')}
        </div>
    `;
}

function getHospitalDepartments(hospital) {
    if (Array.isArray(hospital?.departments) && hospital.departments.length > 0) {
        return hospital.departments;
    }

    if (Array.isArray(hospital?.features) && hospital.features.length > 0) {
        return hospital.features;
    }

    return ['在线咨询'];
}

function getHospitalDepartmentDetails(hospital) {
    if (Array.isArray(hospital?.departmentDetails) && hospital.departmentDetails.length > 0) {
        return hospital.departmentDetails;
    }

    return getHospitalDepartments(hospital).map(department => ({
        name: department,
        description: '暂无公开科室简介',
        doctors: [],
    }));
}

forceAmapHttpsAssets();

/*
旧逻辑已停用：
- showUnifiedRecordForm 曾通过 window 暴露给旧的手动测试入口
- getTodayLatestData / formatBloodPressure 曾用于旧独立 AI 页面健康快照拼装
当前主页面流程已不再依赖这组旧入口，因此移除对应导入与挂载。
*/

const AMAP_SDK_PLUGINS = ['AMap.PlaceSearch', 'AMap.Geolocation', 'AMap.Marker'];
const DEFAULT_AMAP_CONFIG = {
    webKey: '',
    securityKey: '',
};
const HTML2CANVAS_SDK_URL = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
const JSPDF_SDK_URL = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
let amapLoaderPromise = null;
let pdfLibraryLoaderPromise = null;
let onlineHospitalInitialized = false;

function getAmapConfig() {
    try {
        const adminSettings = JSON.parse(localStorage.getItem('admin_settings') || '{}');
        const amapConfig = adminSettings?.apiSettings?.location?.providers?.amap
            || adminSettings?.location?.providers?.amap
            || {};
        const webKey = (amapConfig.webKey || amapConfig.apiKey || '').trim();
        const securityKey = (amapConfig.securityKey || '').trim();

        return {
            webKey: webKey || DEFAULT_AMAP_CONFIG.webKey,
            securityKey: securityKey || DEFAULT_AMAP_CONFIG.securityKey,
        };
    } catch (error) {
        console.error('读取高德地图配置失败:', error);
        return { ...DEFAULT_AMAP_CONFIG };
    }
}

function getAmapSdkUrl() {
    const { webKey, securityKey } = getAmapConfig();

    if (!webKey) {
        throw new Error('未配置高德地图 Web Key');
    }

    if (securityKey) {
        window._AMapSecurityConfig = {
            securityJsCode: securityKey,
        };
    } else {
        delete window._AMapSecurityConfig;
    }

    return `https://webapi.amap.com/maps?v=2.0&key=${webKey}&plugin=${AMAP_SDK_PLUGINS.join(',')}`;
}

function loadExternalScriptOnce(src, globalName) {
    if (globalName && typeof window[globalName] !== 'undefined') {
        return Promise.resolve(window[globalName]);
    }

    const existingScript = document.querySelector(`script[src="${src}"]`);
    if (existingScript) {
        return new Promise((resolve, reject) => {
            const handleLoad = () => resolve(globalName ? window[globalName] : true);
            const handleError = () => reject(new Error(`脚本加载失败: ${src}`));
            existingScript.addEventListener('load', handleLoad, { once: true });
            existingScript.addEventListener('error', handleError, { once: true });

            if (!globalName || typeof window[globalName] !== 'undefined') {
                resolve(globalName ? window[globalName] : true);
            }
        });
    }

    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.defer = true;
        script.onload = () => resolve(globalName ? window[globalName] : true);
        script.onerror = () => reject(new Error(`脚本加载失败: ${src}`));
        document.head.appendChild(script);
    });
}

function ensureAMapSdk() {
    if (window.AMap) {
        return Promise.resolve(window.AMap);
    }
    if (!amapLoaderPromise) {
        amapLoaderPromise = Promise.resolve()
            .then(() => getAmapSdkUrl())
            .then(url => loadExternalScriptOnce(url, 'AMap'))
            .catch(error => {
                amapLoaderPromise = null;
                throw error;
            });
    }
    return amapLoaderPromise;
}

function ensurePdfLibraries() {
    const hasHtml2Canvas = typeof window.html2canvas !== 'undefined';
    const hasJsPdf = typeof window.jspdf !== 'undefined' && window.jspdf?.jsPDF;
    if (hasHtml2Canvas && hasJsPdf) {
        return Promise.resolve();
    }
    if (!pdfLibraryLoaderPromise) {
        pdfLibraryLoaderPromise = Promise.all([
            hasHtml2Canvas ? Promise.resolve() : loadExternalScriptOnce(HTML2CANVAS_SDK_URL),
            hasJsPdf ? Promise.resolve() : loadExternalScriptOnce(JSPDF_SDK_URL),
        ]).then(() => undefined).catch(error => {
            pdfLibraryLoaderPromise = null;
            throw error;
        });
    }
    return pdfLibraryLoaderPromise;
}

/*
旧逻辑已停用：
- buildAIHealthSnapshot
- syncAIServiceHealthSnapshot
- window.showUnifiedRecordForm
这些逻辑原本服务于旧独立 AI 页面/手动测试入口，当前正式首页流程未再引用。
保留说明，避免后续重复接回已停用入口。
*/

// ================================================
// 高德地图相关变量
// ================================================
let placeSearch = null;
let amapReady = false;

// 等待高德地图API加载完成
function waitForAMap(timeout = 10000) {
    return new Promise((resolve, reject) => {
        ensureAMapSdk()
            .then(() => {
                const startTime = Date.now();

                const checkAMap = () => {
                    if (window.AMap) {
                        console.log('✅ 高德地图API已加载');
                        amapReady = true;
                        resolve();
                        return;
                    }

                    if (Date.now() - startTime >= timeout) {
                        reject(new Error('高德地图API加载超时'));
                        return;
                    }

                    console.log('⏳ 等待高德地图API加载...');
                    setTimeout(checkAMap, 200);
                };

                checkAMap();
            })
            .catch(reject);
    });
}

// 初始化高德地图PlaceSearch
async function initAMapPlaceSearch() {
    await waitForAMap();
    
    if (!placeSearch) {
        placeSearch = new AMap.PlaceSearch({
            pageSize: 50,  // 增加每页数量
            pageIndex: 1,
            extensions: 'all',
            autoFitView: true,
            type: '',  // 暂时不限制类型，让搜索更灵活
            citylimit: false  // 不限制城市
        });
        console.log('✅ PlaceSearch初始化完成');
    }
    
    return placeSearch;
}

// 获取已注册医院账户列表
const REGISTERED_HOSPITALS_CACHE_KEY = 'registered_hospital_accounts';
let registeredHospitalAccountsCache = null;

function getStoredRegisteredHospitalAccounts() {
    const storageKeys = [REGISTERED_HOSPITALS_CACHE_KEY, 'hospitals'];

    for (const storageKey of storageKeys) {
        try {
            const hospitals = JSON.parse(localStorage.getItem(storageKey) || '[]');
            if (Array.isArray(hospitals) && hospitals.length > 0) {
                return hospitals;
            }
        } catch (error) {
            console.error(`读取已注册医院数据失败(${storageKey}):`, error);
        }
    }

    return [];
}

async function syncRegisteredHospitalAccounts(forceRefresh = false) {
    if (!forceRefresh && Array.isArray(registeredHospitalAccountsCache)) {
        return registeredHospitalAccountsCache;
    }

    const apiBaseUrl = window.API_BASE_URL || '/api';
    const requestUrl = `${apiBaseUrl.replace(/\/$/, '')}/hospitals?page=1&pageSize=200&sortBy=name`;

    try {
        const response = await fetch(requestUrl, {
            method: 'GET',
            credentials: 'include',
            headers: {
                Accept: 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const payload = await response.json();
        const hospitals = Array.isArray(payload?.data?.list)
            ? payload.data.list
            : Array.isArray(payload?.data?.hospitals)
                ? payload.data.hospitals
                : Array.isArray(payload?.list)
                    ? payload.list
                    : [];

        registeredHospitalAccountsCache = hospitals;
        localStorage.setItem(REGISTERED_HOSPITALS_CACHE_KEY, JSON.stringify(hospitals));
        return hospitals;
    } catch (error) {
        console.warn('同步已注册医院数据失败，改用本地缓存:', error);
        const storedHospitals = getStoredRegisteredHospitalAccounts();
        registeredHospitalAccountsCache = storedHospitals;
        return storedHospitals;
    }
}

function getRegisteredHospitalAccounts() {
    if (Array.isArray(registeredHospitalAccountsCache)) {
        return registeredHospitalAccountsCache;
    }

    const hospitals = getStoredRegisteredHospitalAccounts();
    registeredHospitalAccountsCache = hospitals;
    return hospitals;
}

function findRegisteredHospitalMatch(hospital) {
    const registeredHospitals = getRegisteredHospitalAccounts();

    return registeredHospitals.find(registeredHospital => {
        const sameId = registeredHospital.id && hospital.id && String(registeredHospital.id) === String(hospital.id);
        const sameName = registeredHospital.name && hospital.name && registeredHospital.name.trim() === hospital.name.trim();
        const samePhone = registeredHospital.phone && hospital.phone && registeredHospital.phone.trim() === hospital.phone.trim();
        const sameAddress = registeredHospital.address && hospital.address && (
            hospital.address.includes(registeredHospital.address) || registeredHospital.address.includes(hospital.address)
        );

        return sameId || sameName || (samePhone && sameAddress);
    }) || null;
}

function hydrateHospitalRegistrationData(hospital) {
    if (!hospital) {
        return hospital;
    }

    const registeredHospital = findRegisteredHospitalMatch(hospital);
    if (!registeredHospital) {
        return hospital;
    }

    const departments = Array.isArray(registeredHospital.departments) && registeredHospital.departments.length > 0
        ? registeredHospital.departments
        : Array.isArray(registeredHospital.features) ? registeredHospital.features : [];

    return {
        ...hospital,
        id: registeredHospital.id || hospital.id,
        isRegistered: true,
        departments: departments.length > 0 ? departments : hospital.departments,
        features: departments.length > 0 ? departments : (hospital.features || hospital.departments || []),
        departmentDetails: Array.isArray(registeredHospital.departmentDetails) && registeredHospital.departmentDetails.length > 0
            ? registeredHospital.departmentDetails
            : hospital.departmentDetails,
        businessHours: registeredHospital.businessHours || hospital.businessHours,
        phone: registeredHospital.phone || hospital.phone,
        level: registeredHospital.level || hospital.level,
    };
}

// 判断当前医院是否已在系统中注册
function isHospitalRegistered(hospital) {
    return Boolean(findRegisteredHospitalMatch(hospital));
}

// 格式化医院距离，统一保留 1 位小数
function formatHospitalDistance(distance) {
    const distanceNumber = Number(distance);
    if (!Number.isFinite(distanceNumber)) {
        return '0.0';
    }
    return distanceNumber.toFixed(1);
}

const HOSPITAL_LIST_CACHE_PREFIX = 'online_hospital_cache';
const HOSPITAL_LIST_CACHE_DURATION = 10 * 60 * 1000;
const SAME_LOCATION_THRESHOLD_KM = 0.1;

function getCurrentAccountCacheKey() {
    try {
        const loginInfo = JSON.parse(sessionStorage.getItem('loginInfo') || '{}');
        const role = loginInfo.role || 'guest';
        const user = loginInfo.user || {};
        const identity = user.id || user.username || loginInfo.username || 'anonymous';
        return `${HOSPITAL_LIST_CACHE_PREFIX}_${role}_${identity}`;
    } catch (error) {
        return `${HOSPITAL_LIST_CACHE_PREFIX}_guest_anonymous`;
    }
}

function saveHospitalListCache(position, hospitals) {
    try {
        const cacheKey = getCurrentAccountCacheKey();
        localStorage.setItem(cacheKey, JSON.stringify({
            timestamp: Date.now(),
            position,
            hospitals,
        }));
    } catch (error) {
        console.error('保存医院缓存失败:', error);
    }
}

function getHospitalListCache() {
    try {
        const cacheKey = getCurrentAccountCacheKey();
        const rawCache = localStorage.getItem(cacheKey);
        if (!rawCache) {
            return null;
        }

        const cache = JSON.parse(rawCache);
        if (!cache?.timestamp || !cache?.position || !Array.isArray(cache?.hospitals)) {
            return null;
        }

        if (Date.now() - cache.timestamp > HOSPITAL_LIST_CACHE_DURATION) {
            localStorage.removeItem(cacheKey);
            return null;
        }

        return cache;
    } catch (error) {
        console.error('读取医院缓存失败:', error);
        return null;
    }
}

function isSameHospitalLocation(positionA, positionB) {
    if (!positionA || !positionB) {
        return false;
    }

    return calculateDistance(
        Number(positionA.latitude),
        Number(positionA.longitude),
        Number(positionB.latitude),
        Number(positionB.longitude)
    ) <= SAME_LOCATION_THRESHOLD_KM;
}

// 标准化医院数据结构，避免不同数据源字段不一致导致页面报错
function normalizeHospitalData(hospital, index = 0) {
    const departments = Array.isArray(hospital.departments) && hospital.departments.length > 0
        ? hospital.departments
        : Array.isArray(hospital.features) ? hospital.features : [];
    const features = departments;
    const distanceNumber = Number(hospital.distance) || 0;

    const departmentDetails = Array.isArray(hospital.departmentDetails) && hospital.departmentDetails.length > 0
        ? hospital.departmentDetails
        : departments.map(dept => ({
            name: dept,
            description: '暂无公开科室简介',
            doctors: []
        }));

    const registered = typeof hospital.isRegistered === 'boolean'
        ? hospital.isRegistered
        : isHospitalRegistered(hospital);

    return {
        id: String(hospital.id || `hospital_${index}`),
        name: hospital.name || '未知医院',
        address: hospital.address || '地址未知',
        province: hospital.province || '',
        city: hospital.city || '',
        latitude: Number(hospital.latitude) || 0,
        longitude: Number(hospital.longitude) || 0,
        rating: hospital.rating != null && hospital.rating !== '' ? Number(hospital.rating) : null,
        level: hospital.level || '综合医院',
        departments,
        departmentDetails,
        features,
        phone: hospital.phone || '暂无',
        businessHours: hospital.businessHours != null && hospital.businessHours !== '' ? hospital.businessHours : null,
        distance: Number(distanceNumber.toFixed(1)) || 0,
        estimatedTime: Number(hospital.estimatedTime) || 0,
        emergency: Boolean(hospital.emergency),
        isRegistered: registered,
        description: hospital.description || '',
        beds: hospital.beds || '暂无公开信息',
        guide: hospital.guide || {
            registration: '暂无公开挂号指引，请电话咨询医院。',
            parking: '暂无公开停车信息，请以医院现场指引为准。',
            transportation: hospital.address || '建议使用地图导航前往医院。'
        }
    };
}

function mergeHospitalResults(amapHospitals = [], registeredHospitals = []) {
    const mergedHospitals = Array.isArray(amapHospitals) ? [...amapHospitals] : [];

    const isSameHospital = (left, right) => {
        const sameId = left.id && right.id && String(left.id) === String(right.id);
        const sameName = left.name && right.name && left.name.trim() === right.name.trim();
        const samePhone = left.phone && right.phone && left.phone.trim() === right.phone.trim();
        const sameAddress = left.address && right.address && (
            left.address.includes(right.address) || right.address.includes(left.address)
        );

        return sameId || sameName || (samePhone && sameAddress);
    };

    registeredHospitals.forEach(registeredHospital => {
        const existingHospital = mergedHospitals.find(hospital => isSameHospital(hospital, registeredHospital));

        if (existingHospital) {
            existingHospital.id = registeredHospital.id || existingHospital.id;
            existingHospital.phone = registeredHospital.phone || existingHospital.phone;
            existingHospital.businessHours = registeredHospital.businessHours || existingHospital.businessHours;
            existingHospital.level = registeredHospital.level || existingHospital.level;
            existingHospital.rating = registeredHospital.rating ?? existingHospital.rating;
            existingHospital.departments = registeredHospital.departments?.length
                ? registeredHospital.departments
                : existingHospital.departments;
            existingHospital.departmentDetails = registeredHospital.departmentDetails?.length
                ? registeredHospital.departmentDetails
                : existingHospital.departmentDetails;
            existingHospital.features = registeredHospital.features?.length
                ? registeredHospital.features
                : existingHospital.features;
            existingHospital.description = registeredHospital.description || existingHospital.description;
            existingHospital.beds = registeredHospital.beds || existingHospital.beds;
            existingHospital.guide = registeredHospital.guide || existingHospital.guide;
            existingHospital.isRegistered = true;
            return;
        }

        mergedHospitals.push(registeredHospital);
    });

    return mergedHospitals.sort((a, b) => {
        if (Boolean(a.isRegistered) !== Boolean(b.isRegistered)) {
            return a.isRegistered ? -1 : 1;
        }

        const aDistance = Number.isFinite(a.distance) ? a.distance : Infinity;
        const bDistance = Number.isFinite(b.distance) ? b.distance : Infinity;
        return aDistance - bDistance;
    });
}

function buildRegisteredHospitalResults(latitude, longitude, radiusKm = Infinity) {
    return getRegisteredHospitalAccounts()
        .map((hospital, index) => {
            const lat = Number(hospital.lat ?? hospital.latitude);
            const lng = Number(hospital.lng ?? hospital.longitude);
            const distance = Number.isFinite(lat) && Number.isFinite(lng)
                ? calculateDistanceSimple(latitude, longitude, lat, lng)
                : Infinity;

            return normalizeHospitalData({
                ...hospital,
                id: hospital.id,
                name: hospital.name || hospital.hospitalName,
                address: `${hospital.province || ''}${hospital.city || ''}${hospital.address || ''}`,
                latitude: Number.isFinite(lat) ? lat : 0,
                longitude: Number.isFinite(lng) ? lng : 0,
                businessHours: hospital.businessHours || '08:00-17:00',
                distance,
                estimatedTime: Number.isFinite(distance) ? estimateTimeByDistance(distance) : 0,
                isRegistered: true,
            }, index);
        })
        .filter(hospital => Number.isFinite(hospital.distance) && hospital.distance <= radiusKm);
}

// 使用高德地图搜索附近医院 - 包含多种搜索策略
async function searchNearbyHospitalsWithAMap(latitude, longitude, radius = 1500) {
    console.log('📍 使用高德地图搜索附近医院:', { latitude, longitude, radius });

    const radiusKm = Math.max(1, Number(radius || 1500) / 1000);
    const registeredHospitals = buildRegisteredHospitalResults(latitude, longitude, radiusKm);

    try {
        await initAMapPlaceSearch();
    } catch (error) {
        console.warn('⚠️ 高德地图初始化失败，切换到后端医院接口:', error.message || error);
        return getNearbyHospitalsWithFallback(latitude, longitude, radius);
    }
    
    // 定义多种搜索策略
    const searchStrategies = [
        { keyword: '医院', radius: 5000, type: '医疗卫生' },
        { keyword: '医院', radius: 10000, type: '' },
        { keyword: '诊所', radius: 5000, type: '医疗卫生' },
        { keyword: '卫生院', radius: 10000, type: '医疗卫生' }
    ];

    let hasRateLimitError = false;
    
    // 尝试每种搜索策略
    for (let i = 0; i < searchStrategies.length; i++) {
        const strategy = searchStrategies[i];
        console.log(`🔄 尝试搜索策略 ${i + 1}/${searchStrategies.length}:`, strategy);
        
        try {
            // 更新 PlaceSearch 的类型配置
            if (placeSearch.setType) {
                placeSearch.setType(strategy.type || '');
            }
            
            const result = await new Promise((resolve, reject) => {
                placeSearch.searchNearBy(
                    strategy.keyword,
                    [longitude, latitude],
                    strategy.radius,
                    function(status, result) {
                        console.log(`🔍 策略 ${i + 1} 搜索状态:`, status);

                        if (status === 'complete' && result?.poiList?.pois?.length > 0) {
                            resolve(result);
                            return;
                        }

                        const errorInfo = typeof result === 'string'
                            ? result
                            : (result?.info || '搜索失败或无数据');
                        const error = new Error(errorInfo);
                        error.status = status;
                        error.info = errorInfo;
                        reject(error);
                    }
                );
            });
            
            // 成功获取到数据
            const hospitals = result.poiList.pois.map((poi, index) => {
                const distance = calculateDistanceSimple(
                    latitude, longitude,
                    poi.location.lat, poi.location.lng
                );
                
                return normalizeHospitalData({
                    id: poi.id || `hospital_${index}`,
                    name: poi.name,
                    address: poi.address || '地址未知',
                    latitude: poi.location.lat,
                    longitude: poi.location.lng,
                    rating: poi.rating || null,
                    level: parseHospitalLevel(poi.type || ''),
                    features: [],
                    phone: poi.tel || '',
                    businessHours: '',
                    distance: distance,
                    estimatedTime: estimateTimeByDistance(distance),
                    emergency: false
                }, index);
            });
            
            const mergedHospitals = mergeHospitalResults(hospitals, registeredHospitals);
            console.log(`✅ 策略 ${i + 1} 成功，找到`, mergedHospitals.length, '家医院');
            return mergedHospitals;
            
        } catch (error) {
            if (error.info === 'CUQPS_HAS_EXCEEDED_THE_LIMIT') {
                hasRateLimitError = true;
                console.warn('⚠️ 高德搜索触发限流，停止继续请求，切换到后端医院接口');
                break;
            }

            if (error.info === '搜索失败或无数据') {
                console.log(`ℹ️ 策略 ${i + 1} 未搜索到结果，继续尝试下一个策略`);
            } else {
                console.warn(`⚠️ 策略 ${i + 1} 搜索异常: ${error.info}`);
            }
            continue;
        }
    }

    if (hasRateLimitError) {
        console.warn('⚠️ 高德接口当前限流，优先切换到后端医院接口');
    } else {
        console.warn('⚠️ 高德地图搜索未返回有效结果，优先切换到后端医院接口');
    }

    return getNearbyHospitalsWithFallback(latitude, longitude, radius);
}

// 后端医院接口降级方案
async function getNearbyHospitalsWithFallback(latitude, longitude, radius = 1500) {
    const radiusKm = Math.max(1, Number(radius || 1500) / 1000);
    const registeredHospitals = buildRegisteredHospitalResults(latitude, longitude, radiusKm);

    try {
        const hospitals = await getNearbyHospitals(latitude, longitude, radiusKm, 'driving');

        if (Array.isArray(hospitals) && hospitals.length > 0) {
            const normalizedHospitals = hospitals.map((hospital, index) => normalizeHospitalData(hospital, index));
            const mergedHospitals = mergeHospitalResults(normalizedHospitals, registeredHospitals);
            console.log('✅ 后端医院接口降级成功，找到', mergedHospitals.length, '家医院');
            return mergedHospitals;
        }
    } catch (error) {
        console.warn('⚠️ 后端医院接口降级失败，继续使用模拟医院数据:', error.message || error);
    }

    if (registeredHospitals.length > 0) {
        console.log('✅ 使用已注册医院数据作为降级结果，找到', registeredHospitals.length, '家医院');
        return registeredHospitals.filter(hospital => Number.isFinite(hospital.distance));
    }

    console.warn('⚠️ 已切换到模拟医院数据');
    return getMockHospitals(latitude, longitude);
}

// 获取模拟医院数据（降级方案）
function getMockHospitals(latitude, longitude) {
    console.log('📋 使用模拟医院数据');
    
    const mockHospitals = [
        {
            id: 'hospital_1',
            name: '西安市中心医院',
            address: '陕西省西安市新城区西一路161号',
            latitude: 34.2550,
            longitude: 108.9540,
            rating: 4.5,
            level: '三级甲等',
            features: ['24小时急诊', '医保定点', '专家门诊'],
            phone: '029-87268355',
            businessHours: '全天24小时',
            distance: 0,
            estimatedTime: 0,
            emergency: true
        },
        {
            id: 'hospital_2',
            name: '西安交通大学第一附属医院',
            address: '陕西省西安市雁塔区雁塔西路277号',
            latitude: 34.2230,
            longitude: 108.9340,
            rating: 4.8,
            level: '三级甲等',
            features: ['三甲医院', '医保定点', '教学医院'],
            phone: '029-85323333',
            businessHours: '8:00-17:00',
            distance: 0,
            estimatedTime: 5,
            emergency: true
        },
        {
            id: 'hospital_3',
            name: '陕西省人民医院',
            address: '陕西省西安市碑林区友谊西路256号',
            latitude: 34.2480,
            longitude: 108.9400,
            rating: 4.6,
            level: '三级甲等',
            features: ['三甲医院', '医保定点', '全科医疗'],
            phone: '029-85251331',
            businessHours: '8:00-17:30',
            distance: 0,
            estimatedTime: 8,
            emergency: true
        },
        {
            id: 'hospital_4',
            name: '西安高新医院',
            address: '陕西省西安市雁塔区团结南路16号',
            latitude: 34.2050,
            longitude: 108.8860,
            rating: 4.3,
            level: '三级甲等',
            features: ['国际医疗', '高端体检', 'VIP服务'],
            phone: '029-88332120',
            businessHours: '8:30-17:00',
            distance: 0,
            estimatedTime: 12,
            emergency: false
        },
        {
            id: 'hospital_5',
            name: '西安市红会医院',
            address: '陕西省西安市碑林区南稍门友谊东路555号',
            latitude: 34.2400,
            longitude: 108.9500,
            rating: 4.4,
            level: '三级甲等',
            features: ['骨科专科', '医保定点', '康复治疗'],
            phone: '029-88418000',
            businessHours: '8:00-17:00',
            distance: 0,
            estimatedTime: 10,
            emergency: false
        }
    ];
    
    // 计算模拟医院与用户位置的距离
    mockHospitals.forEach(hospital => {
        const distance = calculateDistanceSimple(
            latitude, longitude,
            hospital.latitude, hospital.longitude
        );
        hospital.distance = distance;
        hospital.estimatedTime = estimateTimeByDistance(distance);
    });
    
    // 按距离排序
    mockHospitals.sort((a, b) => a.distance - b.distance);

    const normalizedHospitals = mockHospitals.map((hospital, index) => normalizeHospitalData(hospital, index));
    
    console.log('✅ 模拟数据加载完成，提供', normalizedHospitals.length, '家医院');
    return normalizedHospitals;
}

// 简单距离计算（单位：公里）
function calculateDistanceSimple(lat1, lng1, lat2, lng2) {
    const R = 6371; // 地球半径（公里）
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// 根据距离估算时间（单位：分钟）
function estimateTimeByDistance(distanceKm) {
    // 假设平均速度30公里/小时
    const speedKmh = 30;
    return Math.round((distanceKm / speedKmh) * 60);
}

// 解析医院等级
function parseHospitalLevel(typeStr) {
    if (typeStr.includes('三甲') || typeStr.includes('三级甲等')) return '三级甲等';
    if (typeStr.includes('三乙') || typeStr.includes('三级乙等')) return '三级乙等';
    if (typeStr.includes('二甲') || typeStr.includes('二级甲等')) return '二级甲等';
    if (typeStr.includes('二乙') || typeStr.includes('二级乙等')) return '二级乙等';
    if (typeStr.includes('一甲') || typeStr.includes('一级甲等')) return '一级甲等';
    return '综合医院';
}

// 错误处理和用户反馈工具
const ErrorHandler = {
    // 显示错误消息
    showError(message) {
        console.error('Error:', message);
        showNotification(message, 'error');
    },

    // 显示成功消息
    showSuccess(message) {
        showNotification(message, 'success');
    },

    // 显示警告消息
    showWarning(message) {
        showNotification(message, 'warning');
    },

    // 显示信息消息
    showInfo(message) {
        showNotification(message, 'info');
    },

    // 处理API错误
    handleApiError(error, defaultMessage = '操作失败，请稍后再试') {
        console.error('API Error:', error);
        const message = error.message || defaultMessage;
        this.showError(message);
    },

    // 验证表单输入
    validateForm(formData, rules) {
        const errors = {};

        for (const [field, fieldRules] of Object.entries(rules)) {
            const value = formData[field];

            for (const rule of fieldRules) {
                if (rule.required && !value) {
                    errors[field] = rule.message || '此字段为必填项';
                    break;
                }

                if (rule.minLength && value.length < rule.minLength) {
                    errors[field] = rule.message || `最少需要 ${rule.minLength} 个字符`;
                    break;
                }

                if (rule.maxLength && value.length > rule.maxLength) {
                    errors[field] = rule.message || `最多允许 ${rule.maxLength} 个字符`;
                    break;
                }

                if (rule.pattern && !rule.pattern.test(value)) {
                    errors[field] = rule.message || '格式不正确';
                    break;
                }

                if (rule.min !== undefined && parseFloat(value) < rule.min) {
                    errors[field] = rule.message || `最小值为 ${rule.min}`;
                    break;
                }

                if (rule.max !== undefined && parseFloat(value) > rule.max) {
                    errors[field] = rule.message || `最大值为 ${rule.max}`;
                    break;
                }
            }
        }

        return {
            isValid: Object.keys(errors).length === 0,
            errors,
        };
    },
};

// 安全的DOM操作工具
const DOMUtils = {
    // 安全地获取元素
    getElement(id) {
        const element = document.getElementById(id);
        if (!element) {
            console.warn(`Element with id "${id}" not found`);
        }
        return element;
    },

    // 安全地设置文本内容
    setText(element, text) {
        if (element) {
            element.textContent = text;
        }
    },

    // 安全地设置HTML内容
    setHTML(element, html) {
        if (element) {
            element.innerHTML = html;
        }
    },

    // 安全地添加事件监听器
    addEventListener(element, event, handler) {
        if (element) {
            element.addEventListener(event, handler);
        }
    },

    // 安全地移除事件监听器
    removeEventListener(element, event, handler) {
        if (element) {
            element.removeEventListener(event, handler);
        }
    },

    // 安全地显示/隐藏元素
    setVisible(element, visible) {
        if (element) {
            element.style.display = visible ? '' : 'none';
        }
    },
};

// 健康问题内容识别工具
const HealthContentValidator = {
    // 健康相关关键词（正面）
    healthKeywords: [
        // 身体部位和系统
        '头', '头痛', '头晕', '眩晕', '眼', '耳', '鼻', '喉', '口', '牙', '齿', '颈', '肩', '背', '腰', '胸', '腹', '胃', '肠',
        '肝', '肾', '肺', '心', '心脏', '血管', '血液', '骨', '关节', '肌肉', '皮肤', '毛发', '指甲', '手', '脚', '腿', '臂',
        
        // 常见症状
        '痛', '疼', '酸', '麻', '胀', '痒', '热', '冷', '发烧', '发热', '感冒', '咳嗽', '打喷嚏', '流鼻涕',
        '鼻塞', '呼吸困难', '气短', '胸闷', '心悸', '心慌', '恶心', '呕吐', '腹泻', '便秘', '消化不良',
        '食欲不振', '失眠', '睡眠', '疲劳', '乏力', '虚弱', '出汗', '盗汗', '水肿', '浮肿', '皮疹',
        '过敏', '发炎', '感染', '出血', '淤血', '淤青', '扭伤', '拉伤', '骨折', '烫伤', '烧伤',
        '红肿', '瘙痒', '疼痛', '酸痛', '麻木', '僵硬', '抽筋', '痉挛', '抽搐', '震颤',
        
        // 疾病和病症
        '高血压', '低血压', '糖尿病', '心脏病', '冠心病', '中风', '脑梗', '脑出血', '哮喘', '支气管炎',
        '肺炎', '胃炎', '胃溃疡', '肠炎', '肝炎', '肾炎', '肾结石', '胆结石', '关节炎', '痛风', '风湿',
        '骨质疏松', '贫血', '白血病', '癌症', '肿瘤', '抑郁', '焦虑', '精神', '心理', '老年痴呆',
        '帕金森', '癫痫', '偏头痛', '近视', '远视', '老花眼', '白内障', '青光眼', '耳鸣', '耳聋',
        '湿疹', '皮炎', '痤疮', '痔疮', '便秘', '腹泻', '胃炎', '肠炎', '脂肪肝', '肝硬化',
        
        // 健康相关行为和问题
        '减肥', '增重', '饮食', '营养', '维生素', '矿物质', '补充剂', '运动', '锻炼', '健身', '久坐',
        '熬夜', '作息', '戒烟', '戒酒', '压力', '紧张', '放松', '冥想', '瑜伽', '健身', '跑步', '游泳',
        
        // 医疗相关
        '医生', '医院', '检查', '体检', '化验', 'CT', 'MRI', 'X光', 'B超', '心电图', '血压', '血糖',
        '血脂', '胆固醇', '尿酸', '血红蛋白', '血小板', '白细胞', '红细胞', '治疗', '手术', '康复',
        '护理', '理疗', '针灸', '按摩', '中药', '西药', '药物', '药品', '副作用', '剂量', '服用',
        '停药', '换药', '处方', '医保', '报销', '挂号', '预约', '复诊', '随访',
        '体检', '检查', '诊断', '治疗', '康复', '护理', '保健', '养生', '调理',
        
        // 常见问候和咨询
        '您好', '你好', '请问', '咨询', '问一下', '想了解', '如何', '怎么', '怎么办', '有没有',
        '正常吗', '正常', '异常', '不正常', '健康', '不健康', '身体', '不舒服', '难受', '不适',
        '症状', '情况', '问题', '状况', '表现', '反应', '感觉', '感受', '体验'
    ],
    
    // 非健康相关关键词（负面）
    nonHealthKeywords: [
        '购物', '商城', '网购', '订单', '支付', '付款', '退款', '退货',
        '游戏', '娱乐', '电影', '电视剧', '音乐', '明星', '八卦', '综艺',
        '工作', '职业', '职场', '薪水', '工资', '面试', '简历', '招聘',
        '学习', '考试', '作业', '论文', '成绩', '学校', '专业', '课程',
        '旅游', '出行', '机票', '酒店', '景点', '度假', '旅行', '游玩',
        '投资', '理财', '股票', '基金', '期货', '加密货币', '比特币', '赚钱',
        '政治', '选举', '政府', '政策', '法律', '法规', '国家', '政党',
        '军事', '战争', '武器', '军队', '国防', '兵力',
        '宗教', '信仰', '神学', '迷信', '邪教',
        '色情', '性', '成人', '黄色',
        '赌博', '彩票', '博彩', '赌球',
        '诈骗', '欺诈', '骗局', '传销',
        '广告', '推销', '营销', '推广', '销售',
        '买房', '卖房', '租房', '房产', '房价',
        '买车', '卖车', '汽车', '车型',
        '快递', '物流', '配送', '收货',
        '聊天', '交友', '约会', '恋爱', '社交'
    ],
    
    // 检查输入是否为健康相关内容
    validateContent(input) {
        if (!input || !input.trim()) {
            return {
                isValid: true,
                isEmpty: true,
                message: ''
            };
        }
        
        const lowerInput = input.toLowerCase();
        const cleanInput = input.replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, '');
        
        // 检查是否包含健康关键词
        let hasHealthKeyword = false;
        for (const keyword of this.healthKeywords) {
            if (cleanInput.includes(keyword)) {
                hasHealthKeyword = true;
                break;
            }
        }
        
        // 检查是否包含非健康关键词
        let hasNonHealthKeyword = false;
        for (const keyword of this.nonHealthKeywords) {
            if (cleanInput.includes(keyword)) {
                hasNonHealthKeyword = true;
                break;
            }
        }
        
        // 混合内容处理规则
        if (hasHealthKeyword && hasNonHealthKeyword) {
            return {
                isValid: false,
                isMixed: true,
                message: '您的输入包含健康相关内容，但也有无关信息。请专注于健康问题，删除无关内容后再次尝试。'
            };
        }
        
        if (hasHealthKeyword) {
            return {
                isValid: true,
                message: ''
            };
        }
        
        // 如果没有明显的健康关键词，但内容较短，可能是简单的问候或模糊问题
        if (input.length < 10) {
            return {
                isValid: true,
                isShort: true,
                message: ''
            };
        }
        
        return {
            isValid: false,
            message: '请输入与健康相关的问题，例如症状描述、疾病咨询、用药指导等。'
        };
    },
    
    // 获取提示信息
    getValidationMessage(validationResult) {
        if (validationResult.isValid) {
            return '';
        }
        return validationResult.message || '请输入与健康相关的内容，如症状描述、疾病咨询等。';
    }
};

// 防抖函数
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// 节流函数
function throttle(func, limit) {
    let inThrottle;
    return function (...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => (inThrottle = false), limit);
        }
    };
}

// 模块化组织代码
const UserRolePage = {
    // 初始化页面
    init() {
        try {
            this.apiService = window.apiService || (window.APIService ? new window.APIService() : null);
            if (!this.apiService) {
                throw new Error('API服务未初始化');
            }
            window.apiService = this.apiService;
            this.setupNavbar();
            this.setupMobileMenu();
            this.loadUserAvatar();
            this.setupAvatarSync();
            this.setupAvatarMenu();
            this.setupNotificationCenter();
            this.setupPageContent();
            renderHomeProfileReminder();
            console.log('UserRolePage initialized successfully');
        } catch (error) {
            ErrorHandler.handleApiError(error, '页面初始化失败');
        }
    },

    // 加载用户头像
    loadUserAvatar() {
        try {
            const loginInfo = JSON.parse(sessionStorage.getItem('loginInfo'));
            if (loginInfo && loginInfo.user && loginInfo.user.avatar) {
                const avatarDiv = document.querySelector('.avatar');
                if (avatarDiv) {
                    avatarDiv.style.backgroundImage = `url(${loginInfo.user.avatar})`;
                }
            }
        } catch (error) {
            console.error('加载用户头像失败:', error);
        }
    },

    // 设置头像同步监听
    setupAvatarSync() {
        // 使用 BroadcastChannel 监听头像更新
        if (typeof BroadcastChannel !== 'undefined') {
            const channel = new BroadcastChannel('avatar_sync');
            channel.onmessage = event => {
                if (event.data && event.data.type === 'AVATAR_UPDATED') {
                    this.updateAvatarDisplay(event.data.avatar);
                }
            };
        }

        const refreshProfileReminder = () => {
            renderHomeProfileReminder();
        };

        window.addEventListener('profileCompletionUpdated', refreshProfileReminder);

        // 兼容性备份：监听 localStorage 变化
        window.addEventListener('storage', e => {
            if (e.key === 'avatarUpdate' && e.newValue) {
                try {
                    const data = JSON.parse(e.newValue);
                    if (data && data.avatar) {
                        this.updateAvatarDisplay(data.avatar);
                    }
                } catch (error) {
                    console.error('解析头像更新数据失败:', error);
                }
            }

            if (e.key === 'profileCompletionUpdatedAt') {
                refreshProfileReminder();
            }
        });
    },

    // 更新头像显示
    updateAvatarDisplay(avatarData) {
        const avatarDiv = document.querySelector('.avatar');
        if (avatarDiv) {
            avatarDiv.style.backgroundImage = `url(${avatarData})`;
        }
        // 同时更新 sessionStorage
        try {
            const loginInfo = JSON.parse(sessionStorage.getItem('loginInfo'));
            if (loginInfo && loginInfo.user) {
                loginInfo.user.avatar = avatarData;
                sessionStorage.setItem('loginInfo', JSON.stringify(loginInfo));
            }
        } catch (error) {
            console.error('更新 sessionStorage 头像失败:', error);
        }
    },

    // 设置移动菜单
    setupMobileMenu() {
        const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
        const navButtons = document.querySelector('.nav-buttons');

        if (mobileMenuToggle && navButtons) {
            mobileMenuToggle.addEventListener('click', () => {
                mobileMenuToggle.classList.toggle('active');
                navButtons.classList.toggle('active');

                const isExpanded = navButtons.classList.contains('active');
                mobileMenuToggle.setAttribute('aria-expanded', isExpanded);
            });

            // 点击导航按钮时关闭菜单
            const navButtonElements = navButtons.querySelectorAll('.nav-button');
            navButtonElements.forEach(button => {
                button.addEventListener('click', () => {
                    mobileMenuToggle.classList.remove('active');
                    navButtons.classList.remove('active');
                    mobileMenuToggle.setAttribute('aria-expanded', 'false');
                });
            });

            // 点击页面其他地方关闭菜单
            document.addEventListener('click', e => {
                if (!e.target.closest('.navbar-container')) {
                    mobileMenuToggle.classList.remove('active');
                    navButtons.classList.remove('active');
                    mobileMenuToggle.setAttribute('aria-expanded', 'false');
                }
            });
        }
    },

    // 设置导航栏
    setupNavbar() {
        const navButtons = document.querySelectorAll('.nav-button');
        navButtons.forEach(button => {
            button.addEventListener('click', e => {
                this.handleNavClick(e);
            });
        });
    },

    // 处理导航按钮点击
    handleNavClick(e) {
        const button = e.currentTarget;

        document.querySelectorAll('.nav-button').forEach(btn => {
            btn.classList.remove('active');
        });

        button.classList.add('active');

        const pageId = button.dataset.page;
        this.showPage(pageId);

        // API调用：导航切换 - 后续添加
        // 这里可以添加页面切换时的API调用逻辑
    },

    // 显示指定页面
    showPage(pageId, isRestore = false) {
        console.log('切换到页面:', pageId, '是否是恢复:', isRestore);
        if (pageId === 'hospital') {
            ensureOnlineHospitalInitialized();
        }
        
        // 更新导航按钮状态
        const navButtons = document.querySelectorAll('.nav-button');
        navButtons.forEach(btn => {
            if (btn.dataset.page === pageId) {
                btn.classList.add('active');
                btn.setAttribute('aria-selected', 'true');
                btn.setAttribute('tabindex', '0');
            } else {
                btn.classList.remove('active');
                btn.setAttribute('aria-selected', 'false');
                btn.setAttribute('tabindex', '-1');
            }
        });
        
        // 隐藏所有页面
        document.querySelectorAll('.page-content').forEach(page => {
            page.classList.remove('active');
        });

        // 显示目标页面
        const targetPage = document.getElementById(`${pageId}-page`);
        if (targetPage) {
            targetPage.classList.add('active');
        }

        if (pageId === 'ai') {
            requestAnimationFrame(() => {
                ensureMentalHealthChatVisible();
            });
        }

        // 保存当前页面状态（如果不是恢复操作）
        if (!isRestore && window.StatePersistor) {
            window.StatePersistor.saveCurrentPage(pageId);
        }

        // 只有在不是恢复操作时才滚动到顶部
        if (!isRestore) {
            if (window.getPageScrollManager) {
                const scrollManager = window.getPageScrollManager();
                if (scrollManager) {
                    scrollManager.scrollToTop({
                        pageName: pageId
                    });
                }
            } else {
                // 降级方案
                window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
            }
        }
    },

    // 设置头像菜单
    setupAvatarMenu() {
        const avatarButton = document.getElementById('avatar-button');
        const avatarMenu = document.getElementById('avatar-menu');
        const notificationPanel = document.getElementById('notification-panel');
        const notificationButton = document.getElementById('notification-button');

        if (!avatarButton || !avatarMenu) {
            return;
        }

        avatarButton.addEventListener('click', e => {
            e.stopPropagation();
            avatarMenu.classList.toggle('show');
            avatarButton.setAttribute('aria-expanded', avatarMenu.classList.contains('show') ? 'true' : 'false');
            notificationPanel?.classList.remove('show');
            if (notificationPanel) {
                notificationPanel.style.display = 'none';
            }
            notificationButton?.setAttribute('aria-expanded', 'false');
        });

        document.addEventListener('click', () => {
            avatarMenu.classList.remove('show');
            avatarButton.setAttribute('aria-expanded', 'false');
        });

        avatarMenu.addEventListener('click', e => {
            e.stopPropagation();
        });

        this.setupMenuItemClick();
    },

    async setupNotificationCenter() {
        const notificationButton = document.getElementById('notification-button');
        const notificationPanel = document.getElementById('notification-panel');
        const closeButton = document.getElementById('close-notification-panel');
        const markAllButton = document.getElementById('mark-all-notifications-read');

        if (!notificationButton || !notificationPanel || !this.apiService) {
            return;
        }

        notificationButton.style.display = '';
        notificationPanel.style.display = 'none';

        notificationButton.addEventListener('click', async event => {
            event.stopPropagation();
            const isVisible = notificationPanel.classList.contains('show');
            document.getElementById('avatar-menu')?.classList.remove('show');
            document.getElementById('avatar-button')?.setAttribute('aria-expanded', 'false');

            if (isVisible) {
                this.hideNotificationPanel();
                return;
            }

            notificationPanel.style.display = 'block';
            requestAnimationFrame(() => {
                notificationPanel.classList.add('show');
            });
            notificationButton.setAttribute('aria-expanded', 'true');
            await this.refreshNotifications();
        });

        closeButton?.addEventListener('click', () => {
            this.hideNotificationPanel();
        });

        markAllButton?.addEventListener('click', async () => {
            try {
                await this.apiService.markAllUserNotificationsRead();
                window.dispatchEvent(new CustomEvent('userNotificationUpdated'));
                await this.refreshNotifications();
                showNotification('已全部标记为已读', 'success');
            } catch (error) {
                console.error('标记全部已读失败:', error);
                showNotification('标记失败，请稍后重试', 'error');
            }
        });

        notificationPanel.addEventListener('click', event => {
            event.stopPropagation();
        });

        document.addEventListener('click', event => {
            if (!event.target.closest('.avatar-container')) {
                this.hideNotificationPanel();
            }
        });

        window.addEventListener('storage', event => {
            const notificationStorageKey = this.apiService.getUserNotificationsStorageKey?.();
            if (notificationStorageKey && event.key === notificationStorageKey) {
                this.refreshNotifications();
            }
        });

        window.addEventListener('userNotificationUpdated', () => {
            this.refreshNotifications();
        });

        await this.refreshNotifications();
    },

    hideNotificationPanel() {
        const notificationPanel = document.getElementById('notification-panel');
        const notificationButton = document.getElementById('notification-button');
        if (notificationPanel) {
            notificationPanel.classList.remove('show');
            notificationPanel.style.display = 'none';
        }
        notificationButton?.setAttribute('aria-expanded', 'false');
    },

    async refreshNotifications() {
        if (!this.apiService) {
            return;
        }

        try {
            const response = await this.apiService.listUserNotifications(100);
            const notifications = Array.isArray(response) ? response : (response?.items || []);
            this.renderNotificationList(notifications);
            this.updateNotificationBadge(notifications);
        } catch (error) {
            console.error('加载通知失败:', error);
            const listElement = document.getElementById('notification-panel-list');
            if (listElement) {
                listElement.innerHTML = '<div class="loading">消息加载失败，请稍后重试。</div>';
            }
        }
    },

    updateNotificationBadge(notifications = []) {
        const badge = document.getElementById('notification-badge');
        if (!badge) {
            return;
        }

        const unreadCount = notifications.filter(item => !item.read && !item.isRead).length;
        if (unreadCount > 0) {
            badge.style.display = 'inline-flex';
            badge.textContent = unreadCount > 99 ? '99+' : String(unreadCount);
            return;
        }

        badge.style.display = 'none';
        badge.textContent = '0';
    },

    escapeNotificationHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    },

    getNotificationTypeMeta(notification = {}) {
        const typeMetaMap = {
            'system-test': { label: '测试通知', className: 'is-test' },
            'appointment-reminder': { label: '预约创建', className: 'is-appointment' },
            'appointment-reminder-updated': { label: '提醒更新', className: 'is-reminder' },
            'appointment-rescheduled': { label: '预约改签', className: 'is-rescheduled' },
            'appointment-cancelled': { label: '预约取消', className: 'is-cancelled' },
            'appointment-upcoming': { label: '到诊提醒', className: 'is-upcoming' },
        };

        return typeMetaMap[notification.type] || { label: '系统消息', className: 'is-generic' };
    },

    async openAppointmentFromNotification(notification) {
        const appointmentId = notification?.appointmentId;
        if (!appointmentId) {
            return;
        }

        this.hideNotificationPanel();
        this.showPage('hospital');
        ensureOnlineHospitalInitialized();

        window.pendingAppointmentHighlightId = String(appointmentId);
        if (typeof loadAppointmentRecords === 'function') {
            await loadAppointmentRecords();
        }
        if (typeof highlightAppointmentRecord === 'function') {
            highlightAppointmentRecord(String(appointmentId));
        }
    },

    renderNotificationList(notifications = []) {
        const listElement = document.getElementById('notification-panel-list');
        if (!listElement) {
            return;
        }

        if (notifications.length === 0) {
            listElement.innerHTML = '<div class="loading">暂无消息，新的测试通知会展示在这里。</div>';
            return;
        }

        listElement.innerHTML = notifications
            .map(notification => {
                const isRead = Boolean(notification.read || notification.isRead);
                const message = notification.content || notification.message || '暂无内容';
                const time = notification.createdAt || notification.timestamp || new Date().toISOString();
                const typeMeta = this.getNotificationTypeMeta(notification);
                const canOpenAppointment = Boolean(notification.appointmentId);
                return `
                    <article class="notification-item ${isRead ? 'is-read' : 'is-unread'} ${canOpenAppointment ? 'is-clickable' : ''}" data-notification-id="${notification.id}" data-appointment-id="${this.escapeNotificationHtml(notification.appointmentId || '')}" tabindex="${canOpenAppointment ? '0' : '-1'}" role="${canOpenAppointment ? 'button' : 'article'}" aria-label="${canOpenAppointment ? '打开关联预约' : '通知消息'}">
                        <div class="notification-item-main">
                            <div class="notification-item-header">
                                <h4>${this.escapeNotificationHtml(notification.title || '系统消息')}</h4>
                                <div class="notification-item-badges">
                                    <span class="notification-type-badge ${typeMeta.className}">${typeMeta.label}</span>
                                    ${isRead ? '<span class="notification-item-tag">已读</span>' : '<span class="notification-item-tag is-highlight">未读</span>'}
                                </div>
                            </div>
                            <p class="notification-item-text">${this.escapeNotificationHtml(message)}</p>
                            <p class="notification-item-time">${new Date(time).toLocaleString('zh-CN')}${canOpenAppointment ? ' · 点击可查看对应预约' : ''}</p>
                        </div>
                        <div class="notification-item-actions">
                            ${canOpenAppointment ? '<button class="notification-action-button" data-action="open" type="button">查看预约</button>' : ''}
                            ${isRead ? '' : '<button class="notification-action-button" data-action="read" type="button">标记已读</button>'}
                            <button class="notification-action-button is-danger" data-action="delete" type="button">删除</button>
                        </div>
                    </article>
                `;
            })
            .join('');

        listElement.querySelectorAll('.notification-item.is-clickable').forEach(item => {
            const openAppointment = async () => {
                const notificationId = item.dataset.notificationId;
                const appointmentId = item.dataset.appointmentId;
                const notification = notifications.find(entry => String(entry.id) === String(notificationId));
                if (!notification || !appointmentId) {
                    return;
                }

                if (!notification.read && !notification.isRead) {
                    try {
                        await this.apiService.markUserNotificationRead(notificationId);
                    } catch (error) {
                        console.error('打开预约前标记已读失败:', error);
                    }
                }

                await this.openAppointmentFromNotification(notification);
                await this.refreshNotifications();
            };

            item.addEventListener('click', async event => {
                if (event.target.closest('.notification-action-button')) {
                    return;
                }
                await openAppointment();
            });

            item.addEventListener('keydown', async event => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    await openAppointment();
                }
            });
        });

        listElement.querySelectorAll('.notification-action-button').forEach(button => {
            button.addEventListener('click', async event => {
                event.stopPropagation();
                const action = event.currentTarget.dataset.action;
                const notificationId = event.currentTarget.closest('.notification-item')?.dataset.notificationId;
                if (!notificationId) {
                    return;
                }

                try {
                    if (action === 'open') {
                        const notification = notifications.find(entry => String(entry.id) === String(notificationId));
                        if (notification) {
                            if (!notification.read && !notification.isRead) {
                                await this.apiService.markUserNotificationRead(notificationId);
                            }
                            await this.openAppointmentFromNotification(notification);
                        }
                    }

                    if (action === 'read') {
                        await this.apiService.markUserNotificationRead(notificationId);
                        showNotification('已标记为已读', 'success');
                    }

                    if (action === 'delete') {
                        await this.apiService.deleteUserNotification(notificationId);
                        showNotification('消息已删除', 'success');
                    }

                    window.dispatchEvent(new CustomEvent('userNotificationUpdated'));
                    await this.refreshNotifications();
                } catch (error) {
                    console.error('处理通知失败:', error);
                    showNotification('操作失败，请稍后重试', 'error');
                }
            });
        });
    },

    // 设置菜单项目点击事件
    setupMenuItemClick() {
        const menuItems = document.querySelectorAll('.menu-item');
        menuItems.forEach(item => {
            item.addEventListener('click', e => {
                const action = e.currentTarget.textContent.trim();
                this.handleMenuItemClick(action);
            });
        });
    },

    // 处理菜单项目点击
    handleMenuItemClick(action) {
        switch (action) {
            case '设置':
                // API调用：打开设置 - 后续添加
                window.location.href = 'settings.html';
                break;
            case '设备连接':
                // API调用：设备连接 - 后续添加
                window.location.href = 'device-connection.html';
                break;
            case '退出登录':
                if (confirm('确定要退出登录吗？')) {
                    if (window.AuthGuard && typeof window.AuthGuard.logout === 'function') {
                        window.AuthGuard.logout();
                    } else {
                        localStorage.removeItem('loginInfo');
                        sessionStorage.removeItem('loginInfo');
                        window.location.href = '/views/auth/login.html?logout=true';
                    }
                }
                break;
        }

        // 关闭菜单
        document.getElementById('avatar-menu').classList.remove('show');
    },

    // 设置页面内容
    setupPageContent() {
        // 为AI服务页面的按钮添加点击事件
        this.setupAIFeatureButtons();
    },

    // 设置AI功能按钮
    setupAIFeatureButtons() {
        const featureButtons = document.querySelectorAll('.feature-button');
        featureButtons.forEach(button => {
            button.addEventListener('click', e => {
                // 安全地查找span元素，处理可能的null情况
                const targetButton = e.currentTarget; // 使用currentTarget而不是target
                const parentElement = targetButton.parentElement;
                const spanElement = parentElement ? parentElement.querySelector('span') : null;
                if (spanElement) {
                    const feature = spanElement.textContent;
                    this.handleAIFeatureClick(feature);
                }
            });
        });
    },

    // 处理AI功能点击
    handleAIFeatureClick(feature) {
        console.log(`点击了${feature}功能`);

        if (feature === '健康咨询') {
            showHealthConsultationModal();
            return;
        }

        if (feature === '用药指导') {
            showMedicationGuidanceModal();
            return;
        }

        if (feature === '健康报告') {
            showReportFormatModal();
        }
    },
};

// 导入健康守护系统模块

function showHealthConsultationModal() {
    let modal = document.getElementById('health-consultation-modal');
    if (modal) {
        modal.style.display = 'flex';
        return;
    }

    modal = document.createElement('div');
    modal.id = 'health-consultation-modal';
    modal.className = 'modal show';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>健康咨询</h3>
                <button class="close-modal">&times;</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label for="health-consultation-input">请描述您的症状或健康问题</label>
                    <textarea id="health-consultation-input" placeholder="例如：这两天一直咳嗽、低烧、喉咙痛" rows="4"></textarea>
                </div>
                <div id="health-consultation-result" class="health-consultation-result" style="display:none;"></div>
            </div>
            <div class="modal-footer">
                <button id="cancel-health-consultation" class="feature-button">取消</button>
                <button id="submit-health-consultation" class="feature-button">开始分析</button>
            </div>
        </div>
    `;

    modal.style.display = 'flex';
    modal.style.opacity = '1';
    modal.style.visibility = 'visible';
    modal.style.padding = '24px';
    modal.style.overflowY = 'auto';
    document.body.appendChild(modal);

    const modalContent = modal.querySelector('.modal-content');
    const modalBody = modal.querySelector('.modal-body');
    const consultationInput = modal.querySelector('#health-consultation-input');

    if (modalContent) {
        modalContent.style.width = 'min(720px, calc(100vw - 32px))';
        modalContent.style.maxHeight = 'calc(100vh - 48px)';
        modalContent.style.display = 'flex';
        modalContent.style.flexDirection = 'column';
        modalContent.style.overflow = 'hidden';
        modalContent.style.transform = 'translateZ(0)';
        modalContent.style.backfaceVisibility = 'hidden';
    }

    if (modalBody) {
        modalBody.style.overflowY = 'auto';
        modalBody.style.overscrollBehavior = 'contain';
        modalBody.style.WebkitOverflowScrolling = 'touch';
    }

    if (consultationInput) {
        consultationInput.style.maxHeight = '180px';
        consultationInput.style.overflowY = 'auto';
        consultationInput.style.overscrollBehavior = 'contain';
    }

    const isolateWheelScroll = element => {
        if (!element) {
            return;
        }

        element.addEventListener('wheel', event => {
            event.stopPropagation();
        }, { passive: true });
    };

    isolateWheelScroll(modalContent);
    isolateWheelScroll(modalBody);
    isolateWheelScroll(consultationInput);

    const closeModal = () => modal.remove();
    modal.querySelector('.close-modal')?.addEventListener('click', closeModal);
    modal.querySelector('#cancel-health-consultation')?.addEventListener('click', closeModal);
    modal.addEventListener('click', e => {
        if (e.target === modal) {
            closeModal();
        }
    });

    modal.querySelector('#submit-health-consultation')?.addEventListener('click', async () => {
        const input = document.getElementById('health-consultation-input');
        const resultContainer = document.getElementById('health-consultation-result');
        const healthIssue = input ? input.value.trim() : '';

        if (!healthIssue) {
            showNotification('请先输入症状或健康问题', 'warning');
            return;
        }

        try {
            showNotification('正在分析，请稍候...', 'info');
            const { default: diseaseConsultation } = await import('./ai-services/disease-consultation.js');
            const result = await diseaseConsultation.analyzeSymptoms(healthIssue);

            if (resultContainer) {
                resultContainer.style.display = 'block';
                resultContainer.style.maxHeight = '45vh';
                resultContainer.style.overflowY = 'auto';
                resultContainer.style.overscrollBehavior = 'contain';
                resultContainer.style.WebkitOverflowScrolling = 'touch';
                isolateWheelScroll(resultContainer);
                const rawReplyHtml = result.rawReply
                    ? `<h5>AI原始回复</h5><div class="ai-raw-reply">${String(result.rawReply).replace(/\n/g, '<br>')}</div>`
                    : '';
                resultContainer.innerHTML = `
                    <div class="guidance-item">
                        <h4>分析结果</h4>
                        <p>${result.analysis || '暂无分析结果'}</p>
                        <h5>可能原因</h5>
                        <ul>${(result.possibleCauses || []).map(item => `<li>${item}</li>`).join('')}</ul>
                        <h5>建议</h5>
                        <ul>${(result.suggestions || []).map(item => `<li>${item}</li>`).join('')}</ul>
                        ${rawReplyHtml}
                    </div>
                `;
            }

            showNotification('健康咨询完成', 'success');
        } catch (error) {
            console.error('健康咨询失败:', error);
            showNotification(`健康咨询失败: ${error.message}`, 'error');
        }
    });
}

function showMedicationGuidanceModal() {
    let modal = document.getElementById('medication-guidance-modal');
    if (modal) {
        modal.style.display = 'flex';
        return;
    }

    modal = document.createElement('div');
    modal.id = 'medication-guidance-modal';
    modal.className = 'modal show';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>用药指导</h3>
                <button class="close-modal">&times;</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label for="medication-name">药物名称</label>
                    <input id="medication-name" type="text" placeholder="例如：布洛芬缓释胶囊" />
                </div>
                <div class="form-group">
                    <label for="medication-condition">病情描述</label>
                    <textarea id="medication-condition" placeholder="例如：发热 38.5°C，伴随头痛和肌肉酸痛" rows="4"></textarea>
                </div>
                <div id="medication-guidance-result" class="health-consultation-result" style="display:none;"></div>
            </div>
            <div class="modal-footer">
                <button id="cancel-medication-guidance" class="feature-button">取消</button>
                <button id="submit-medication-guidance" class="feature-button">获取指导</button>
            </div>
        </div>
    `;

    modal.style.display = 'flex';
    modal.style.opacity = '1';
    modal.style.visibility = 'visible';
    modal.style.padding = '24px';
    modal.style.overflowY = 'auto';
    document.body.appendChild(modal);

    const modalContent = modal.querySelector('.modal-content');
    const modalBody = modal.querySelector('.modal-body');
    const medicationNameInput = modal.querySelector('#medication-name');
    const medicationConditionInput = modal.querySelector('#medication-condition');

    if (modalContent) {
        modalContent.style.width = 'min(720px, calc(100vw - 32px))';
        modalContent.style.maxHeight = 'calc(100vh - 48px)';
        modalContent.style.display = 'flex';
        modalContent.style.flexDirection = 'column';
        modalContent.style.overflow = 'hidden';
        modalContent.style.transform = 'translateZ(0)';
        modalContent.style.backfaceVisibility = 'hidden';
    }

    if (modalBody) {
        modalBody.style.overflowY = 'auto';
        modalBody.style.overscrollBehavior = 'contain';
        modalBody.style.WebkitOverflowScrolling = 'touch';
    }

    if (medicationConditionInput) {
        medicationConditionInput.style.maxHeight = '180px';
        medicationConditionInput.style.overflowY = 'auto';
        medicationConditionInput.style.overscrollBehavior = 'contain';
    }

    const isolateWheelScroll = element => {
        if (!element) {
            return;
        }

        element.addEventListener('wheel', event => {
            event.stopPropagation();
        }, { passive: true });
    };

    isolateWheelScroll(modalContent);
    isolateWheelScroll(modalBody);
    isolateWheelScroll(medicationNameInput);
    isolateWheelScroll(medicationConditionInput);

    const closeModal = () => modal.remove();
    modal.querySelector('.close-modal')?.addEventListener('click', closeModal);
    modal.querySelector('#cancel-medication-guidance')?.addEventListener('click', closeModal);
    modal.addEventListener('click', e => {
        if (e.target === modal) {
            closeModal();
        }
    });

    modal.querySelector('#submit-medication-guidance')?.addEventListener('click', async () => {
        const medicationInput = document.getElementById('medication-name');
        const conditionInput = document.getElementById('medication-condition');
        const resultContainer = document.getElementById('medication-guidance-result');
        const medication = medicationInput ? medicationInput.value.trim() : '';
        const condition = conditionInput ? conditionInput.value.trim() : '';

        if (!medication || !condition) {
            showNotification('请填写药物名称和病情描述', 'warning');
            return;
        }

        try {
            showNotification('正在生成用药指导...', 'info');
            const { default: medicationGuidance } = await import('./ai-services/medication-guidance.js');
            const result = await medicationGuidance.getGuidance(medication, condition);

            if (resultContainer) {
                resultContainer.style.display = 'block';
                resultContainer.style.maxHeight = '45vh';
                resultContainer.style.overflowY = 'auto';
                resultContainer.style.overscrollBehavior = 'contain';
                resultContainer.style.WebkitOverflowScrolling = 'touch';
                isolateWheelScroll(resultContainer);
                const rawReplyHtml = result.rawReply
                    ? `<h5>AI原始回复</h5><div class="ai-raw-reply">${String(result.rawReply).replace(/\n/g, '<br>')}</div>`
                    : '';
                resultContainer.innerHTML = `
                    <div class="guidance-item">
                        <h4>${result.medication || medication}</h4>
                        <p><strong>建议剂量：</strong>${result.dosage || '请遵医嘱使用'}</p>
                        <h5>用药说明</h5>
                        <ul>${(result.instructions || []).map(item => `<li>${item}</li>`).join('')}</ul>
                        <h5>注意事项</h5>
                        <ul>${(result.precautions || []).map(item => `<li>${item}</li>`).join('')}</ul>
                        <p><strong>储存方式：</strong>${result.storage || '请查看说明书'}</p>
                        ${rawReplyHtml}
                    </div>
                `;
            }

            showNotification('用药指导已生成', 'success');
        } catch (error) {
            console.error('用药指导失败:', error);
            showNotification(`用药指导失败: ${error.message}`, 'error');
        }
    });
}

// 显示报告格式选择模态框
function showReportFormatModal() {
    // 检查是否已存在模态框
    let modal = document.getElementById('report-format-modal');
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('show');
        modal.style.opacity = '1';
        modal.style.visibility = 'visible';
        return;
    }

    // 创建模态框
    modal = document.createElement('div');
    modal.id = 'report-format-modal';
    modal.className = 'modal show';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>选择报告格式</h3>
                <button class="close-modal">&times;</button>
            </div>
            <div class="modal-body">
                <p>请选择您需要的健康报告格式：</p>
                <div class="format-options">
                    <label class="format-option">
                        <input type="radio" name="report-format" value="pdf" checked>
                        <span class="format-icon">📄</span>
                        <span class="format-name">PDF文档</span>
                        <span class="format-desc">适合打印和存档</span>
                    </label>
                    <label class="format-option">
                        <input type="radio" name="report-format" value="word">
                        <span class="format-icon">📝</span>
                        <span class="format-name">Word文档</span>
                        <span class="format-desc">可编辑格式</span>
                    </label>
                    <label class="format-option">
                        <input type="radio" name="report-format" value="excel">
                        <span class="format-icon">📊</span>
                        <span class="format-name">Excel表格</span>
                        <span class="format-desc">数据统计和分析</span>
                    </label>
                </div>
            </div>
            <div class="modal-footer">
                <button id="cancel-format" class="feature-button">取消</button>
                <button id="confirm-format" class="feature-button">确认生成</button>
            </div>
        </div>
    `;
    
    // 设置显示样式
    modal.style.display = 'flex';
    modal.style.opacity = '1';
    modal.style.visibility = 'visible';
    
    const modalContent = modal.querySelector('.modal-content');
    if (modalContent) {
        modalContent.style.transform = 'scale(1) translateY(0)';
        modalContent.style.opacity = '1';
    }

    // 添加到页面
    document.body.appendChild(modal);

    // 添加关闭按钮事件
    const closeModalBtn = modal.querySelector('.close-modal');
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            modal.remove();
        });
    }

    // 添加取消按钮事件
    const cancelBtn = modal.querySelector('#cancel-format');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            modal.remove();
        });
    }

    // 添加确认按钮事件
    const confirmBtn = modal.querySelector('#confirm-format');
    if (confirmBtn) {
        confirmBtn.addEventListener('click', () => {
            const selectedFormat = modal.querySelector('input[name="report-format"]:checked').value;
            generateAndDownloadReport(selectedFormat);
            modal.remove();
        });
    }

    // 点击模态框外部关闭
    modal.addEventListener('click', e => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// 生成并下载健康报告
async function generateAndDownloadReport(format) {
    try {
        // 显示加载状态
        showNotification('正在生成健康报告...', 'info');

        // 导入健康报告模块
        const { default: healthReport } = await import('../ai-services/health-report.js');

        // 生成健康报告
        const reportData = await healthReport.generateReport();

        // 直接下载，不再展示预览弹窗
        switch (format) {
            case 'pdf':
                downloadPDFReport(reportData);
                break;
            case 'word':
                downloadWordReport(reportData);
                break;
            case 'excel':
                downloadExcelReport(reportData);
                break;
            default:
                throw new Error('不支持的文件格式');
        }

        showNotification('健康报告生成成功，已开始下载', 'success');
    } catch (error) {
        console.error('生成健康报告失败:', error);
        showNotification(`生成健康报告失败: ${error.message}`, 'error');
    }
}

function buildHealthReportHtml(reportData, options = {}) {
    const title = options.title || '健康报告';
    const detailSections = Array.isArray(reportData.detailedSections) ? reportData.detailedSections : [];
    const riskFactors = Array.isArray(reportData.analysis?.riskFactors) ? reportData.analysis.riskFactors : [];
    const recommendations = Array.isArray(reportData.analysis?.recommendations) ? reportData.analysis.recommendations : [];
    const nextSteps = Array.isArray(reportData.nextSteps) ? reportData.nextSteps : [];

    const escape = value => String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    const formatMultiline = value => escape(value).replace(/\n/g, '<br>');

    return `
        <div style="font-family:'Microsoft YaHei','PingFang SC','Noto Sans SC',sans-serif;color:#1f2937;background:#ffffff;padding:32px;line-height:1.8;">
            <div style="border-bottom:3px solid #2563eb;padding-bottom:16px;margin-bottom:24px;">
                <h1 style="margin:0;font-size:30px;color:#111827;">${escape(title)}</h1>
                <p style="margin:8px 0 0;color:#6b7280;font-size:14px;">生成时间：${escape(new Date().toLocaleString('zh-CN'))}</p>
            </div>

            <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-bottom:24px;">
                <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:16px;">
                    <div style="font-size:12px;color:#6b7280;">姓名</div>
                    <div style="font-size:18px;font-weight:700;color:#1d4ed8;">${escape(reportData.personalInfo?.name || '用户')}</div>
                </div>
                <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px;">
                    <div style="font-size:12px;color:#6b7280;">年龄</div>
                    <div style="font-size:18px;font-weight:700;color:#15803d;">${escape(reportData.personalInfo?.age || '未知')}</div>
                </div>
                <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:16px;">
                    <div style="font-size:12px;color:#6b7280;">性别</div>
                    <div style="font-size:18px;font-weight:700;color:#c2410c;">${escape(reportData.personalInfo?.gender || '未知')}</div>
                </div>
            </div>

            <div style="margin-bottom:24px;">
                <h2 style="font-size:20px;margin:0 0 12px;color:#111827;">整体健康分析</h2>
                <div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:12px;padding:16px;">${formatMultiline(reportData.analysis?.overallHealth || '已生成健康分析')}</div>
            </div>

            <div style="margin-bottom:24px;">
                <h2 style="font-size:20px;margin:0 0 12px;color:#111827;">健康指标</h2>
                <table style="width:100%;border-collapse:collapse;font-size:14px;">
                    <tbody>
                        ${Object.entries(reportData.healthMetrics || {}).map(([key, value]) => `
                            <tr>
                                <td style="border:1px solid #dbeafe;background:#eff6ff;padding:10px 12px;font-weight:600;width:28%;">${escape(key)}</td>
                                <td style="border:1px solid #dbeafe;padding:10px 12px;">${escape(value)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>

            <div style="margin-bottom:24px;">
                <h2 style="font-size:20px;margin:0 0 12px;color:#111827;">风险因素</h2>
                <ul style="margin:0;padding-left:20px;">
                    ${(riskFactors.length ? riskFactors : ['暂无明显风险因素']).map(item => `<li>${escape(item)}</li>`).join('')}
                </ul>
            </div>

            <div style="margin-bottom:24px;">
                <h2 style="font-size:20px;margin:0 0 12px;color:#111827;">AI建议</h2>
                <ul style="margin:0;padding-left:20px;">
                    ${(recommendations.length ? recommendations : ['暂无建议']).map(item => `<li>${escape(item)}</li>`).join('')}
                </ul>
            </div>

            ${detailSections.map(section => `
                <div style="margin-bottom:24px;">
                    <h2 style="font-size:20px;margin:0 0 12px;color:#111827;">${escape(section.title)}</h2>
                    <div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:12px;padding:16px;">${formatMultiline(section.content || '暂无内容')}</div>
                </div>
            `).join('')}

            <div>
                <h2 style="font-size:20px;margin:0 0 12px;color:#111827;">后续步骤</h2>
                <ol style="margin:0;padding-left:20px;">
                    ${(nextSteps.length ? nextSteps : ['建议继续记录健康数据并定期复查']).map(item => `<li>${escape(item)}</li>`).join('')}
                </ol>
            </div>
        </div>
    `;
}

function downloadBlobFile(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// 下载PDF报告 - 生成正式PDF文件
async function downloadPDFReport(reportData) {
    try {
        await ensurePdfLibraries();
    } catch (error) {
        alert(`PDF导出功能加载失败：${error.message}`);
        return;
    }

    if (typeof html2canvas === 'undefined' || typeof window.jspdf === 'undefined' || !window.jspdf.jsPDF) {
        alert('PDF导出功能需要加载额外的库文件');
        return;
    }

    const wrapper = document.createElement('div');
    wrapper.style.position = 'fixed';
    wrapper.style.left = '-99999px';
    wrapper.style.top = '0';
    wrapper.style.width = '794px';
    wrapper.style.background = '#ffffff';
    wrapper.innerHTML = buildHealthReportHtml(reportData, { title: '健康报告（PDF）' });
    document.body.appendChild(wrapper);

    try {
        const canvas = await html2canvas(wrapper, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff',
        });

        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pageWidth = 210;
        const pageHeight = 297;
        const imgWidth = pageWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        const imgData = canvas.toDataURL('image/png');

        let heightLeft = imgHeight;
        let position = 0;
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft > 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
        }

        pdf.save(`健康报告_${new Date().toISOString().split('T')[0]}.pdf`);
    } finally {
        wrapper.remove();
    }
}

// 下载Word报告
function downloadWordReport(reportData) {
    const htmlContent = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body>${buildHealthReportHtml(reportData, { title: '健康报告（Word）' })}</body></html>`;
    const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword;charset=utf-8' });
    downloadBlobFile(blob, `健康报告_${new Date().toISOString().slice(0, 10)}.doc`);
}

// 下载Excel报告
function downloadExcelReport(reportData) {
    const rows = [
        ['类别', '项目', '值'],
        ['个人信息', '姓名', reportData.personalInfo?.name || '用户'],
        ['个人信息', '年龄', reportData.personalInfo?.age || '未知'],
        ['个人信息', '性别', reportData.personalInfo?.gender || '未知'],
        ...Object.entries(reportData.healthMetrics || {}).map(([key, value]) => ['健康指标', key, value]),
        ['健康分析', '整体健康', reportData.analysis?.overallHealth || '已生成健康分析'],
        ...((reportData.analysis?.riskFactors || []).length
            ? reportData.analysis.riskFactors.map(item => ['风险因素', '风险提示', item])
            : [['风险因素', '风险提示', '暂无明显风险因素']]),
        ...((reportData.analysis?.recommendations || []).length
            ? reportData.analysis.recommendations.map(item => ['AI建议', '建议摘要', item])
            : [['AI建议', '建议摘要', '暂无建议']]),
        ...((reportData.detailedSections || []).flatMap(section => [[section.title, '详细内容', section.content || '暂无内容']])),
        ...((reportData.nextSteps || []).length
            ? reportData.nextSteps.map((item, index) => ['后续步骤', `步骤${index + 1}`, item])
            : [['后续步骤', '步骤1', '建议继续记录健康数据并定期复查']]),
    ];

    const csvContent = rows.map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff', csvContent], { type: 'application/vnd.ms-excel;charset=utf-8' });
    downloadBlobFile(blob, `健康报告_${new Date().toISOString().slice(0, 10)}.xls`);
}

// 将 showPage 暴露到全局，供 state-persistor 调用
window.showPage = function(pageId, isRestore = false) {
    if (typeof UserRolePage !== 'undefined' && UserRolePage.showPage) {
        UserRolePage.showPage(pageId, isRestore);
    }
};

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    UserRolePage.init();
    // 初始化健康守护系统
    initHealthGuardian();
    // 初始化健康饮食功能
    initHealthyDiet();
    // 初始化AI服务功能
    initAIServices();
    // 设置聊天输入框自动调整高度
    setupChatInputListeners();
    // 设置头像同步监听
    setupAvatarSync();
    
    // 添加全局事件监听器来处理手动记录按钮点击
    document.addEventListener('click', (e) => {
        if (e.target.id === 'record-button' || e.target.closest('#record-button')) {
            showNotification('手动记录入口已迁移到首页健康守护模块，请在首页中使用。', 'info');
        }
    });
});

// 初始化健康饮食功能
function initHealthyDiet() {
    console.log('健康饮食功能模块已初始化');
    // 生成健康饮食页面内容
    generateDietPageContent();

    // 为健康饮食页面添加事件监听器
    setupDietPageEvents();
}

// 生成健康饮食页面内容
function parseBloodPressure(bloodPressure) {
    const match = String(bloodPressure || '').match(/(\d+)\s*\/\s*(\d+)/);
    if (!match) {
        return { systolic: null, diastolic: null };
    }

    return {
        systolic: Number(match[1]),
        diastolic: Number(match[2]),
    };
}

function buildHealthAlerts(profile = {}) {
    const alerts = [];
    const { systolic, diastolic } = parseBloodPressure(profile.bloodPressure);

    if (systolic >= 140 || diastolic >= 90) {
        alerts.push({
            key: 'bloodPressure',
            title: '血压偏高',
            advice: '控制钠盐、腌制食品和高油外卖摄入，优先选择低盐烹调。',
            avoid: ['腌制食品', '高盐汤底', '重口味外卖', '含钠零食'],
        });
    }

    if (safeNumber(profile.sleepHours) !== null && profile.sleepHours < 6) {
        alerts.push({
            key: 'sleep',
            title: '睡眠不足',
            advice: '晚餐尽量清淡，减少咖啡因和高糖夜宵，增加富含色氨酸与镁的食物。',
            avoid: ['浓茶咖啡', '高糖甜品', '油炸夜宵'],
        });
    }

    if (safeNumber(profile.bmi) !== null && profile.bmi >= 24) {
        alerts.push({
            key: 'weightHigh',
            title: '体重偏高',
            advice: '控制总热量与精制碳水，提升蛋白质和蔬菜占比。',
            avoid: ['含糖饮料', '奶茶', '油炸食品', '高糖糕点'],
        });
    } else if (safeNumber(profile.bmi) !== null && profile.bmi < 18.5) {
        alerts.push({
            key: 'weightLow',
            title: '体重偏低',
            advice: '适当提高优质蛋白、主食和健康脂肪摄入，避免长期吃得过少。',
            avoid: ['长期空腹', '只吃蔬果不吃主食', '高频跳餐'],
        });
    }

    return alerts;
}

function buildSpecialDietPlan(profile = {}, goal = 'maintain') {
    const alerts = buildHealthAlerts(profile);
    const recommendations = [];
    const avoidFoods = [];

    alerts.forEach(alert => {
        recommendations.push(`${alert.title}：${alert.advice}`);
        avoidFoods.push(...alert.avoid);
    });

    if (!recommendations.length) {
        recommendations.push('当前重点以均衡饮食为主，保持高蛋白、足量蔬菜与规律进餐。');
    }

    if (goal === 'lose') {
        recommendations.push('减脂阶段建议主食优先粗粮，晚餐控制油脂与精制碳水。');
    }
    if (goal === 'gain') {
        recommendations.push('增重阶段可增加加餐，优先牛奶、坚果、酸奶和全谷物。');
    }

    return {
        alerts,
        recommendations,
        avoidFoods: [...new Set(avoidFoods)],
    };
}

function buildMealPlanFromFallback(fallbackData) {
    const proteins = fallbackData.foodRecommendations.proteins;
    const carbs = fallbackData.foodRecommendations.carbs;
    const fats = fallbackData.foodRecommendations.fats;
    const vegetables = fallbackData.foodRecommendations.vegetables;

    return {
        breakfast: {
            name: '均衡早餐',
            items: [carbs[0], proteins[2], '低糖牛奶/无糖酸奶', '水果少量'].filter(Boolean),
        },
        lunch: {
            name: '高蛋白午餐',
            items: [carbs[1], proteins[0], vegetables[0], vegetables[1]].filter(Boolean),
        },
        dinner: {
            name: '清爽晚餐',
            items: [proteins[1], vegetables[2], vegetables[3], fats[0]].filter(Boolean),
        },
    };
}

function parseMealPlanSection(sectionText, fallbackMealPlan) {
    const parseMeal = (title, fallbackMeal, nextTitles = []) => {
        const block = extractAISection(sectionText, title, nextTitles);
        const name = block.split('\n')[0]?.replace(/^名称[：:]?\s*/, '').trim() || fallbackMeal.name;
        const itemsText = extractAISection(block, '食物', ['说明']);
        const items = parseAIList(itemsText);
        const description = extractAISection(block, '说明') || '';
        return {
            name,
            items: items.length ? items : fallbackMeal.items,
            description,
        };
    };

    return {
        breakfast: parseMeal('早餐', fallbackMealPlan.breakfast, ['午餐', '晚餐']),
        lunch: parseMeal('午餐', fallbackMealPlan.lunch, ['晚餐']),
        dinner: parseMeal('晚餐', fallbackMealPlan.dinner),
    };
}

function parseUserAge(user = {}) {
    if (safeNumber(user.age) !== null) {
        return Number(user.age);
    }
    if (!user.birthDate) {
        return null;
    }

    const birth = new Date(user.birthDate);
    if (Number.isNaN(birth.getTime())) {
        return null;
    }

    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const hasBirthdayPassed =
        today.getMonth() > birth.getMonth()
        || (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate());

    if (!hasBirthdayPassed) {
        age -= 1;
    }

    return age > 0 ? age : null;
}

function getCurrentUserProfile() {
    if (window.ProfileCompletion?.getProfileFromStorage) {
        return window.ProfileCompletion.getProfileFromStorage();
    }

    try {
        const sessionLoginInfo = JSON.parse(sessionStorage.getItem('loginInfo') || 'null');
        const localLoginInfo = JSON.parse(localStorage.getItem('loginInfo') || 'null');
        const loginInfo = sessionLoginInfo || localLoginInfo || {};
        const sessionUser = sessionLoginInfo?.user || {};
        const localUser = localLoginInfo?.user || {};
        let mergedUser = {
            ...localUser,
            ...sessionUser,
        };

        try {
            const users = JSON.parse(localStorage.getItem('users') || '[]');
            const accounts = JSON.parse(localStorage.getItem('accounts') || '{}');
            const accountUsers = Array.isArray(accounts?.user) ? accounts.user : [];
            const identity = mergedUser.id || mergedUser.userId || mergedUser.username || loginInfo.username;
            const storedUser = users.find(item => item.id === identity || item.username === identity)
                || accountUsers.find(item => item.id === identity || item.username === identity);

            if (storedUser) {
                mergedUser = {
                    ...storedUser,
                    ...mergedUser,
                };
            }
        } catch (storageError) {
            console.error('读取本地用户档案失败:', storageError);
        }

        return {
            age: parseUserAge(mergedUser),
            gender: mergedUser.gender || null,
            height: safeNumber(mergedUser.height),
            weight: safeNumber(mergedUser.weight),
            nickname: mergedUser.nickname || mergedUser.username || '',
            birthDate: mergedUser.birthDate || mergedUser.birth_date || null,
            email: mergedUser.email || '',
        };
    } catch (_error) {
        return {
            age: null,
            gender: null,
            height: null,
            weight: null,
            nickname: '',
            birthDate: null,
            email: '',
        };
    }
}

function hasCompletedBasicProfile(profile = getCurrentUserProfile()) {
    if (window.ProfileCompletion?.hasCompletedBasicProfile) {
        return window.ProfileCompletion.hasCompletedBasicProfile(profile);
    }

    return Boolean(
        profile.gender
        && Number.isFinite(profile.age)
        && Number.isFinite(profile.height)
        && Number.isFinite(profile.weight)
    );
}

function renderHomeProfileReminder() {
    const homePage = document.getElementById('home-page');
    if (!homePage) {
        return;
    }

    const existingReminder = document.getElementById('home-profile-reminder');
    if (existingReminder) {
        existingReminder.remove();
    }

    if (hasCompletedBasicProfile()) {
        return;
    }

    const reminderCard = document.createElement('section');
    reminderCard.id = 'home-profile-reminder';
    reminderCard.className = 'status-card profile-reminder-card';
    reminderCard.innerHTML = `
        <div class="profile-reminder-content">
            <div>
                <p class="profile-reminder-label">基础档案提醒</p>
                <h2>请先完善基础档案</h2>
                <p class="profile-reminder-text">为保证首页健康分析、饮食建议与服务推荐更准确，请先补充基础信息。</p>
            </div>
            <button type="button" class="feature-button profile-reminder-action">立即完善</button>
        </div>
    `;

    reminderCard.querySelector('.profile-reminder-action')?.addEventListener('click', () => {
        window.location.href = '/views/user/dashboard/settings.html';
    });

    homePage.insertBefore(reminderCard, homePage.firstChild);
}


function buildDietHealthSnapshot() {
    const todayRecords = healthDataManager.getData(undefined, { id: 'day', name: '今日', days: 1 });
    const latestData = todayRecords.length ? todayRecords[todayRecords.length - 1] : null;
    const indicators = latestData?.indicators || {};
    const currentUser = getCurrentUserProfile();

    const bloodPressure = indicators.bloodPressureSystolic && indicators.bloodPressureDiastolic
        ? `${indicators.bloodPressureSystolic}/${indicators.bloodPressureDiastolic}`
        : '--';

    const profile = healthyDiet.dietRecommendation.buildDietUserProfile({
        age: currentUser.age,
        gender: currentUser.gender,
        weight: indicators.weight ?? currentUser.weight,
        height: indicators.height ?? currentUser.height,
        activityLevel: 2,
        bmi: indicators.bmi,
        heartRate: indicators.heartRate,
        sleepHours: indicators.sleepHours,
        bloodPressure,
        steps: indicators.steps,
    });

    return {
        ...profile,
        userNickname: currentUser.nickname,
        timestamp: latestData?.timestamp || null,
        date: latestData?.date || '',
        time: latestData?.time || '',
    };
}

function renderDietRecommendationContent(recommendation) {
    const data = recommendation?.data;
        if (!data) {
        return `
            <div class="recommendation-empty">
                <p>当前还没有可用的饮食推荐数据。</p>
                <p class="recommendation-empty-tip">请先完善年龄、身高、体重等基础档案，或稍后点击“重新生成”。</p>
            </div>
        `;
    }

    const nutrientCards = [
        {
            icon: '🔥',
            label: '每日热量',
            value: `${data.recommendedCalories} kcal`,
        },
        {
            icon: '💪',
            label: '蛋白质',
            value: `${data.nutrientRatio.protein.grams}g (${data.nutrientRatio.protein.percentage}%)`,
        },
        {
            icon: '🍞',
            label: '碳水化合物',
            value: `${data.nutrientRatio.carbs.grams}g (${data.nutrientRatio.carbs.percentage}%)`,
        },
        {
            icon: '🥑',
            label: '脂肪',
            value: `${data.nutrientRatio.fat.grams}g (${data.nutrientRatio.fat.percentage}%)`,
        },
    ];

    const foodCategoryMap = [
        { icon: '🍗', title: '蛋白质', items: data.foodRecommendations.proteins || [] },
        { icon: '🌾', title: '碳水化合物', items: data.foodRecommendations.carbs || [] },
        { icon: '🥑', title: '脂肪', items: data.foodRecommendations.fats || [] },
        { icon: '🥬', title: '蔬菜', items: data.foodRecommendations.vegetables || [] },
    ];

    const goalLabelMap = {
        lose: '控能减脂',
        gain: '增肌增重',
        maintain: '均衡维持',
    };

    const specialPlan = data.specialPlan || {
        title: '专项饮食建议',
        recommendations: [],
        alerts: [],
        avoidFoods: [],
    };
    const mealPlan = data.mealPlan || {};

    return `
        <div class="recommendation-intro-row">
            <p class="recommendation-intro">已根据您最新的健康数据生成动态饮食建议，推荐会随健康记录更新。</p>
            <button id="refresh-diet-recommendation" class="feature-button">重新生成</button>
        </div>
        <div class="diet-ai-summary">
            <div class="diet-ai-badge">${data.source === 'ai' ? 'AI推荐' : '规则推荐'}</div>
            <div class="diet-ai-meta">${recommendation.snapshot?.userNickname ? `${recommendation.snapshot.userNickname} · ` : ''}目标：${goalLabelMap[data.goal] || '均衡饮食'}${recommendation.snapshot?.time ? ` · 数据时间：${recommendation.snapshot.date} ${recommendation.snapshot.time}` : ''}</div>
            <p class="diet-ai-description">${data.summary || '已结合当前健康数据生成饮食建议。'}</p>
        </div>
        <div class="nutrition-overview">
            ${nutrientCards.map(card => `
                <div class="nutrition-card">
                    <div class="nutrition-icon">${card.icon}</div>
                    <div class="nutrition-info">
                        <div class="nutrition-label">${card.label}</div>
                        <div class="nutrition-value">${card.value}</div>
                    </div>
                </div>
            `).join('')}
        </div>
        ${(specialPlan.recommendations.length || specialPlan.alerts.length || specialPlan.avoidFoods.length) ? `
            <div class="diet-special-section">
                <h3 class="section-title">${specialPlan.title}</h3>
                ${specialPlan.alerts.length ? `
                    <div class="diet-special-tags">
                        ${specialPlan.alerts.map(alert => `<span class="diet-special-tag">${alert.title || alert}</span>`).join('')}
                    </div>
                ` : ''}
                ${specialPlan.recommendations.length ? `
                    <div class="guidance-item">
                        <h4>重点建议</h4>
                        <ul>
                            ${specialPlan.recommendations.map(item => `<li>${item}</li>`).join('')}
                        </ul>
                        ${specialPlan.avoidFoods.length ? `
                            <h5>建议少吃</h5>
                            <div class="food-list">
                                ${specialPlan.avoidFoods.map(item => `<span class="food-item avoid-food-item">${item}</span>`).join('')}
                            </div>
                        ` : ''}
                    </div>
                ` : ''}
            </div>
        ` : ''}
        <div class="food-recommendations-section">
            <h3 class="section-title">推荐食物</h3>
            <div class="food-categories">
                ${foodCategoryMap.map(category => `
                    <div class="food-category">
                        <div class="category-header">
                            <div class="category-icon">${category.icon}</div>
                            <h4 class="category-title">${category.title}</h4>
                        </div>
                        <div class="food-list">
                            ${category.items.map(item => `<span class="food-item">${item}</span>`).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
        ${mealPlan.breakfast && mealPlan.lunch && mealPlan.dinner ? `
            <div class="diet-meal-plan-section">
                <h3 class="section-title">AI 一日三餐建议</h3>
                <div class="food-categories meal-plan-grid">
                    ${[
                        { key: 'breakfast', label: '早餐', icon: '🌅' },
                        { key: 'lunch', label: '午餐', icon: '☀️' },
                        { key: 'dinner', label: '晚餐', icon: '🌙' },
                    ].map(meal => `
                        <div class="food-category meal-plan-card">
                            <div class="category-header">
                                <div class="category-icon">${meal.icon}</div>
                                <h4 class="category-title">${meal.label} · ${mealPlan[meal.key].name || ''}</h4>
                            </div>
                            <div class="food-list">
                                ${mealPlan[meal.key].items.map(item => `<span class="food-item">${item}</span>`).join('')}
                            </div>
                            ${mealPlan[meal.key].description ? `<p class="meal-plan-description">${mealPlan[meal.key].description}</p>` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : ''}
        <div class="diet-tips-section">
            <h3 class="section-title">饮食建议</h3>
            <div class="tips-list">
                ${(data.foodRecommendations.additionalTips || []).map((tip, index) => `
                    <div class="tip-item">
                        <div class="tip-icon">${['💧', '🍽️', '🌈', '⏰'][index] || '✅'}</div>
                        <div class="tip-content">
                            <h4 class="tip-title">建议 ${index + 1}</h4>
                            <p class="tip-description">${tip}</p>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

async function loadPersonalizedDietRecommendation(forceRefresh = false) {
    const section = document.getElementById('diet-recommendation-content');
    if (!section) {
        return;
    }

    if (!forceRefresh && section.dataset.loaded === 'true') {
        return;
    }

    section.innerHTML = '<div class="loading">正在根据最新健康数据生成AI饮食推荐...</div>';

    const snapshot = buildDietHealthSnapshot();

    try {
        const recommendation = await healthyDiet.dietRecommendation.generatePersonalizedDietRecommendation(snapshot);
        let finalRecommendation = recommendation;

        if (!recommendation?.data) {
            const goal = healthyDiet.dietRecommendation.resolveDietGoal(snapshot);
            const fallbackResult = healthyDiet.dietRecommendation.generateDietRecommendation(snapshot, goal);

            if (fallbackResult?.data) {
                finalRecommendation = {
                    ...recommendation,
                    data: {
                        ...fallbackResult.data,
                        goal,
                        specialPlan: healthyDiet.dietRecommendation.buildSpecialDietPlan(snapshot, goal),
                        mealPlan: healthyDiet.dietRecommendation.buildMealPlanFromFallback(fallbackResult.data),
                        summary: recommendation?.error || 'AI结果暂不可用，已为您切换为基础饮食推荐。',
                        source: 'rule',
                    },
                };
            }
        }

        finalRecommendation.snapshot = snapshot;
        section.dataset.loaded = 'true';
        section.innerHTML = renderDietRecommendationContent(finalRecommendation);
    } catch (error) {
        console.error('生成个性化饮食推荐失败:', error);
        const goal = healthyDiet.dietRecommendation.resolveDietGoal(snapshot);
        const fallbackResult = healthyDiet.dietRecommendation.generateDietRecommendation(snapshot, goal);
        const emergencyRecommendation = fallbackResult?.data
            ? {
                success: true,
                data: {
                    ...fallbackResult.data,
                    goal,
                    specialPlan: healthyDiet.dietRecommendation.buildSpecialDietPlan(snapshot, goal),
                    mealPlan: healthyDiet.dietRecommendation.buildMealPlanFromFallback(fallbackResult.data),
                    summary: '生成AI推荐失败，已切换为基础饮食推荐。',
                    source: 'rule',
                },
                snapshot,
            }
            : null;

        section.dataset.loaded = 'true';
        section.innerHTML = renderDietRecommendationContent(emergencyRecommendation);
    }

    const refreshButton = document.getElementById('refresh-diet-recommendation');
    if (refreshButton) {
        refreshButton.addEventListener('click', () => {
            section.dataset.loaded = 'false';
            loadPersonalizedDietRecommendation(true);
        });
    }
}

function generateDietPageContent() {
    const dietPage = document.getElementById('diet-page');
    if (!dietPage) {
        return;
    }

    // 清空现有内容
    dietPage.innerHTML = '';

    // 创建健康饮食功能模块的容器
    const dietContainer = document.createElement('div');
    dietContainer.className = 'diet-container';

    // 添加饮食推荐部分
    const recommendationSection = document.createElement('div');
    recommendationSection.className = 'status-card diet-recommendation-card';
    recommendationSection.innerHTML = `
        <div class="card-header">
            <h2>个性化饮食推荐</h2>
        </div>
        <div id="diet-recommendation-content" class="recommendation-content">
            <div class="loading">正在根据最新健康数据准备饮食建议...</div>
        </div>
    `;

    // 添加健康饮食指导部分
    const guidanceSection = document.createElement('div');
    guidanceSection.className = 'status-card';
    guidanceSection.innerHTML = `
        <h2>健康饮食指导</h2>
        <div class="guidance-tabs">
            <button class="guidance-tab active" data-tab="principles">饮食原则</button>
            <button class="guidance-tab" data-tab="patterns">饮食模式</button>
            <button class="guidance-tab" data-tab="timing">饮食时间</button>
            <button class="guidance-tab" data-tab="combinations">食物搭配</button>
        </div>
        <div id="guidance-content" class="guidance-content"></div>
    `;

    // 添加AI食谱推荐部分
    const recipeSection = document.createElement('div');
    recipeSection.className = 'status-card';
    recipeSection.innerHTML = `
        <h2>AI食谱推荐</h2>
        <div class="ingredient-input">
            <h3>输入现有食材</h3>
            <div class="ingredient-controls">
                <input type="text" id="ingredient-input" placeholder="用逗号、空格或顿号分隔，例如：西红柿,鸡蛋 黄瓜、豆腐">
                <button id="add-ingredient" class="feature-button">添加</button>
            </div>
            <div id="ingredient-list" class="ingredient-list">
                <div class="ingredient-hint" style="
                    text-align: center;
                    padding: 20px;
                    color: #999999;
                    font-size: 14px;
                    background-color: #f5f7fa;
                    border-radius: 6px;
                ">
                    暂无食材，请在上方输入框中添加食材
                </div>
            </div>
            <button id="generate-recipes" class="feature-button">生成食谱</button>
        </div>
        <div id="recipe-result" class="recipe-result"></div>
    `;

    // 将所有部分添加到容器中
    dietContainer.appendChild(recommendationSection);
    dietContainer.appendChild(guidanceSection);
    dietContainer.appendChild(recipeSection);

    // 将容器添加到页面中
    dietPage.appendChild(dietContainer);

    // 初始化健康饮食指导内容
    loadDietaryGuidance('principles');
    loadPersonalizedDietRecommendation();
    
    // 初始化食材列表提示
    updateIngredientList();
}

// 为健康饮食页面添加事件监听器
function setupDietPageEvents() {
    // 健康饮食指导标签点击事件
    const guidanceTabs = document.querySelectorAll('.guidance-tab');
    guidanceTabs.forEach(tab => {
        tab.addEventListener('click', e => {
            // 移除所有标签的active类
            guidanceTabs.forEach(t => t.classList.remove('active'));
            // 添加当前标签的active类
            e.target.classList.add('active');
            // 加载对应内容
            loadDietaryGuidance(e.target.dataset.tab);
        });
    });

    // 添加食材按钮点击事件
    const addIngredientBtn = document.getElementById('add-ingredient');
    if (addIngredientBtn) {
        addIngredientBtn.addEventListener('click', addIngredient);
    }

    // 生成食谱按钮点击事件
    const generateRecipesBtn = document.getElementById('generate-recipes');
    if (generateRecipesBtn) {
        generateRecipesBtn.addEventListener('click', generateRecipes);
    }
}

// 加载健康饮食指导内容
function loadDietaryGuidance(tab) {
    const contentContainer = document.getElementById('guidance-content');
    if (!contentContainer) {
        return;
    }

    let content = '';

    switch (tab) {
        case 'principles': {
            const principles = healthyDiet.dietGuidance.getDietaryPrinciples();
            if (principles && principles.principles) {
                content = principles.principles
                    .map(
                        principle => `
                    <div class="guidance-item">
                        <h4>${principle.title}</h4>
                        <p>${principle.description}</p>
                        <ul>
                            ${principle.tips.map(tip => `<li>${tip}</li>`).join('')}
                        </ul>
                    </div>
                `
                    )
                    .join('');
            }
            break;
        }
        case 'patterns': {
            const patterns = healthyDiet.dietGuidance.getDietaryPatterns();
            if (patterns && patterns.patterns) {
                content = patterns.patterns
                    .map(
                        pattern => `
                    <div class="guidance-item">
                        <h4>${pattern.name}</h4>
                        <p>${pattern.description}</p>
                        <h5>好处：</h5>
                        <ul>
                            ${pattern.benefits.map(benefit => `<li>${benefit}</li>`).join('')}
                        </ul>
                        <h5>核心成分：</h5>
                        <ul>
                            ${pattern.keyComponents.map(component => `<li>${component}</li>`).join('')}
                        </ul>
                    </div>
                `
                    )
                    .join('');
            }
            break;
        }
        case 'timing': {
            const timing = healthyDiet.dietGuidance.getMealTimingAdvice();
            if (timing && timing.timing) {
                content = timing.timing
                    .map(
                        meal => `
                    <div class="guidance-item">
                        <h4>${meal.meal} (${meal.time})</h4>
                        <p>${meal.importance}</p>
                        <h5>推荐：</h5>
                        <ul>
                            ${meal.recommendations.map(recommendation => `<li>${recommendation}</li>`).join('')}
                        </ul>
                    </div>
                `
                    )
                    .join('');
            }
            break;
        }
        case 'combinations': {
            const combinations = healthyDiet.dietGuidance.getFoodCombinationAdvice();
            if (combinations && combinations.combinations) {
                content = combinations.combinations
                    .map(
                        combination => `
                    <div class="guidance-item">
                        <h4>${combination.type}</h4>
                        <p>${combination.description}</p>
                        <h5>示例：</h5>
                        <ul>
                            ${combination.examples.map(example => `<li>${example}</li>`).join('')}
                        </ul>
                    </div>
                `
                    )
                    .join('');

                content += `
                    <div class="guidance-item">
                        <h4>避免的搭配</h4>
                        <ul>
                            ${combinations.avoidCombinations.map(item => `<li>${item}</li>`).join('')}
                        </ul>
                    </div>
                `;
            }
            break;
        }
    }

    contentContainer.innerHTML = content;
}

// 食材管理
const ingredientManager = new healthyDiet.IngredientManager();

// 智能分割和处理食材输入
function processIngredientInput(inputString) {
    if (!inputString || !inputString.trim()) {
        return [];
    }

    // 使用多种分隔符分割：逗号(，)、空格( )、顿号(、)
    // 使用正则表达式匹配所有分隔符
    const separatorsRegex = /[,，、\s]+/;
    let ingredients = inputString.split(separatorsRegex);

    // 处理每个食材项：去除首尾空格、过滤空项
    ingredients = ingredients.map(ing => ing.trim()).filter(ing => ing.length > 0);

    // 去重处理
    const uniqueIngredients = [];
    const seenIngredients = new Set();

    for (const ing of ingredients) {
        const normalizedIng = ing;
        if (!seenIngredients.has(normalizedIng)) {
            seenIngredients.add(normalizedIng);
            uniqueIngredients.push(normalizedIng);
        }
    }

    return uniqueIngredients;
}

// 添加食材
function addIngredient() {
    const input = document.getElementById('ingredient-input');
    const inputValue = input.value;

    if (!inputValue || !inputValue.trim()) {
        alert('请输入食材名称');
        return;
    }

    const processedIngredients = processIngredientInput(inputValue);

    if (processedIngredients.length === 0) {
        alert('未能识别有效的食材，请重新输入');
        return;
    }

    let addedCount = 0;
    let duplicateCount = 0;
    const errors = [];

    for (const ing of processedIngredients) {
        const result = ingredientManager.addIngredient(ing);
        if (result.success) {
            addedCount++;
        } else if (result.error && result.error.includes('已经在列表中')) {
            duplicateCount++;
        } else {
            errors.push(result.error);
        }
    }

    // 显示操作结果
    let message = '';
    if (addedCount > 0) {
        message += `成功添加 ${addedCount} 种食材`;
    }
    if (duplicateCount > 0) {
        message += `${message ? '；' : ''}${duplicateCount} 种食材已存在，已跳过`;
    }
    if (errors.length > 0) {
        message += `${message ? '；' : ''}部分食材添加失败：${errors.join(', ')}`;
    }

    if (addedCount > 0) {
        updateIngredientList();
        input.value = '';
    }

    if (message) {
        showNotification(message, addedCount > 0 ? 'success' : 'warning');
    }
}

// 更新食材列表
function updateIngredientList() {
    const listContainer = document.getElementById('ingredient-list');
    if (!listContainer) {
        return;
    }

    const ingredients = ingredientManager.getIngredients();
    if (ingredients.length === 0) {
        listContainer.innerHTML = `
            <div class="ingredient-hint" style="
                text-align: center;
                padding: 20px;
                color: #999999;
                font-size: 14px;
                background-color: #f5f7fa;
                border-radius: 6px;
            ">
                暂无食材，请在上方输入框中添加食材
            </div>
        `;
        return;
    }

    listContainer.innerHTML = ingredients
        .map(
            ingredient => `
        <div class="ingredient-item">
            <span>${ingredient}</span>
            <button class="remove-ingredient" data-ingredient="${ingredient}">移除</button>
        </div>
    `
        )
        .join('');

    // 添加移除食材按钮的点击事件
    const removeButtons = document.querySelectorAll('.remove-ingredient');
    removeButtons.forEach(button => {
        button.addEventListener('click', e => {
            const ingredient = e.target.dataset.ingredient;
            ingredientManager.removeIngredient(ingredient);
            updateIngredientList();
        });
    });
}

// 生成食谱推荐
async function generateRecipes() {
    const ingredients = ingredientManager.getIngredients();
    if (ingredients.length === 0) {
        alert('请至少添加一种食材');
        return;
    }

    const resultContainer = document.getElementById('recipe-result');
    if (resultContainer) {
        resultContainer.innerHTML = '<div class="loading">正在生成AI食谱，请稍候...</div>';
    }

    const result = await healthyDiet.generateRecipeRecommendations(ingredients);

    if (result.success) {
        const recipes = result.data;
        resultContainer.innerHTML = recipes
            .map(recipe => {
                const nutritionAnalysis = healthyDiet.analyzeRecipeNutrition(recipe);
                let nutritionContent = '';
                if (nutritionAnalysis.success) {
                    const nutrition = nutritionAnalysis.data;
                    nutritionContent = `
                    <div class="nutrition-info">
                        <h5>营养成分</h5>
                        <div class="nutrition-item">
                            <span>卡路里:</span>
                            <span>${nutrition.calories} kcal</span>
                        </div>
                        <div class="nutrition-item">
                            <span>蛋白质:</span>
                            <span>${nutrition.protein}g (${nutrition.percentages.protein}%)</span>
                        </div>
                        <div class="nutrition-item">
                            <span>碳水化合物:</span>
                            <span>${nutrition.carbs}g (${nutrition.percentages.carbs}%)</span>
                        </div>
                        <div class="nutrition-item">
                            <span>脂肪:</span>
                            <span>${nutrition.fat}g (${nutrition.percentages.fat}%)</span>
                        </div>
                        <div class="nutrition-item">
                            <span>营养评级:</span>
                            <span>${nutrition.rating}</span>
                        </div>
                    </div>
                `;
                }

                return `
                <div class="recipe-item">
                    <h4>${recipe.name}</h4>
                    <div class="recipe-meta">
                        <span>烹饪时间: ${recipe.cookingTime}分钟</span>
                        <span>难度: ${recipe.difficulty}</span>
                        <span>匹配度: ${Math.round(recipe.matchScore * 100)}%</span>
                    </div>
                    <div class="recipe-ingredients">
                        <h5>所需食材</h5>
                        <ul>
                            ${recipe.ingredients
                                .map(ingredient => {
                                    const isAvailable = ingredients.includes(ingredient);
                                    return `<li class="${isAvailable ? 'available' : 'missing'}">${ingredient} ${!isAvailable ? '(缺少)' : ''}</li>`;
                                })
                                .join('')}
                        </ul>
                    </div>
                    <div class="recipe-instructions">
                        <h5>制作步骤</h5>
                        <ol>
                            ${recipe.instructions.map((instruction, _index) => `<li>${instruction}</li>`).join('')}
                        </ol>
                    </div>
                    ${nutritionContent}
                </div>
            `;
            })
            .join('');
    } else {
        resultContainer.innerHTML = `<p class="error">${result.error}</p>`;
    }
}

// 定期同步医院注册状态（确保数据实时性）
let hospitalSyncInterval = null;

function refreshHospitalRegistrationStatus() {
    if (!currentHospitals || currentHospitals.length === 0) {
        console.log('当前没有医院数据，跳过注册状态同步');
        return;
    }

    syncRegisteredHospitalAccounts(true).catch(error => {
        console.warn('刷新已注册医院账户列表失败:', error);
    });

    currentHospitals = currentHospitals.map((hospital, index) => normalizeHospitalData(hospital, index));

    if (currentUserPosition) {
        saveHospitalListCache(currentUserPosition, currentHospitals);
    }

    const hospitalList = document.getElementById('hospital-list');
    if (hospitalList && hospitalList.style.display !== 'none') {
        renderHospitalList(hospitalList, currentHospitals);
        updateConsultationAvailabilitySummary();
    }
}

function startHospitalStatusSync() {
    // 每5分钟同步一次医院状态数据
    const SYNC_INTERVAL = 5 * 60 * 1000;
    
    if (hospitalSyncInterval) {
        clearInterval(hospitalSyncInterval);
    }
    
    hospitalSyncInterval = setInterval(() => {
        console.log('同步医院注册状态数据...');
        try {
            // 仅刷新注册状态，不重新获取位置和附近医院
            refreshHospitalRegistrationStatus();
            console.log('医院注册状态数据同步完成');
        } catch (error) {
            console.error('同步医院状态失败:', error);
        }
    }, SYNC_INTERVAL);
    
    console.log('医院状态同步服务已启动，每5分钟同步一次');
}

// 停止医院状态同步
function stopHospitalStatusSync() {
    if (hospitalSyncInterval) {
        clearInterval(hospitalSyncInterval);
        hospitalSyncInterval = null;
        console.log('医院状态同步服务已停止');
    }
}

function ensureOnlineHospitalInitialized() {
    if (onlineHospitalInitialized) {
        return;
    }
    onlineHospitalInitialized = true;
    initOnlineHospital();
}

// 初始化在线医院功能
function initOnlineHospital() {
    console.log('在线医院功能模块已初始化');
    
    // 设置刷新按钮事件（强制刷新模式）
    const refreshBtn = document.getElementById('refresh-hospitals-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            console.log('用户点击刷新位置按钮');
            loadHospitalList(true);
        });
    }
    
    // 设置错误重试按钮事件（强制刷新模式）
    const errorRetryBtn = document.querySelector('#hospital-error .refresh-btn');
    if (errorRetryBtn) {
        errorRetryBtn.addEventListener('click', () => {
            console.log('用户点击错误重试按钮');
            loadHospitalList(true);
        });
    }

    // 为在线医院页面添加事件监听器
    setupHospitalPageEvents();

    // 仅在首次登录加载页面时获取一次医院列表和预约记录
    loadHospitalList(false);
    loadAppointmentRecords();
    
    // 启动医院状态同步服务
    startHospitalStatusSync();
}

// 为在线医院页面添加事件监听器
function setupHospitalPageEvents() {
    // 注意：刷新按钮已经在 initOnlineHospital 中绑定到 refresh-hospitals-btn 了
    // 这里不再重复绑定
    
    // 筛选医院按钮点击事件（如果页面中有这个按钮的话）
    const filterHospitalsBtn = document.getElementById('filter-hospitals');
    if (filterHospitalsBtn) {
        filterHospitalsBtn.addEventListener('click', showFilterModal);
    }

    // 开始咨询按钮点击事件
    const startConsultationBtn = document.getElementById('start-consultation');
    if (startConsultationBtn) {
        startConsultationBtn.addEventListener('click', startConsultation);
    }

    // 查看历史按钮点击事件
    const viewHistoryBtn = document.getElementById('view-history');
    if (viewHistoryBtn) {
        viewHistoryBtn.addEventListener('click', viewConsultationHistory);
    }
}

// 显示筛选模态框
function showFilterModal() {
    // 检查是否已存在模态框
    let modal = document.getElementById('filter-modal');
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('show');
        modal.style.opacity = '1';
        modal.style.visibility = 'visible';
        return;
    }

    // 创建模态框
    modal = document.createElement('div');
    modal.id = 'filter-modal';
    modal.className = 'modal show';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>筛选条件</h3>
                <button class="close-modal">&times;</button>
            </div>
            <div class="modal-body">
                <div class="filter-section">
                    <h4>距离范围</h4>
                    <div class="filter-options">
                        <label>
                            <input type="radio" name="distance" value="2" checked>
                            2公里内
                        </label>
                        <label>
                            <input type="radio" name="distance" value="5">
                            5公里内
                        </label>
                        <label>
                            <input type="radio" name="distance" value="10">
                            10公里内
                        </label>
                        <label>
                            <input type="radio" name="distance" value="20">
                            20公里内
                        </label>
                    </div>
                </div>
                <div class="filter-section">
                    <h4>医院等级</h4>
                    <div class="filter-options">
                        <label>
                            <input type="checkbox" name="level" value="三级甲等">
                            三级甲等
                        </label>
                        <label>
                            <input type="checkbox" name="level" value="三级乙等">
                            三级乙等
                        </label>
                        <label>
                            <input type="checkbox" name="level" value="二级甲等">
                            二级甲等
                        </label>
                        <label>
                            <input type="checkbox" name="level" value="二级乙等">
                            二级乙等
                        </label>
                    </div>
                </div>
                <div class="filter-section">
                    <h4>科室</h4>
                    <div class="filter-options">
                        <label>
                            <input type="checkbox" name="department" value="内科">
                            内科
                        </label>
                        <label>
                            <input type="checkbox" name="department" value="外科">
                            外科
                        </label>
                        <label>
                            <input type="checkbox" name="department" value="儿科">
                            儿科
                        </label>
                        <label>
                            <input type="checkbox" name="department" value="妇产科">
                            妇产科
                        </label>
                        <label>
                            <input type="checkbox" name="department" value="骨科">
                            骨科
                        </label>
                        <label>
                            <input type="checkbox" name="department" value="眼科">
                            眼科
                        </label>
                        <label>
                            <input type="checkbox" name="department" value="呼吸科">
                            呼吸科
                        </label>
                        <label>
                            <input type="checkbox" name="department" value="心血管科">
                            心血管科
                        </label>
                    </div>
                </div>
                <div class="filter-section">
                    <h4>排序方式</h4>
                    <div class="filter-options">
                        <label>
                            <input type="radio" name="sort" value="distance" checked>
                            距离优先
                        </label>
                        <label>
                            <input type="radio" name="sort" value="rating">
                            评分优先
                        </label>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button id="reset-filter" class="feature-button">重置</button>
                <button id="apply-filter" class="feature-button">应用</button>
            </div>
        </div>
    `;
    
    // 设置显示样式
    modal.style.display = 'flex';
    modal.style.opacity = '1';
    modal.style.visibility = 'visible';
    
    const modalContent = modal.querySelector('.modal-content');
    if (modalContent) {
        modalContent.style.transform = 'scale(1) translateY(0)';
        modalContent.style.opacity = '1';
    }

    // 添加到页面
    document.body.appendChild(modal);

    // 添加关闭按钮事件
    const closeModalBtn = modal.querySelector('.close-modal');
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            modal.remove();
        });
    }

    // 添加重置按钮事件
    const resetFilterBtn = modal.querySelector('#reset-filter');
    if (resetFilterBtn) {
        resetFilterBtn.addEventListener('click', () => {
            // 重置所有筛选条件
            modal.querySelectorAll('input[type="radio"]').forEach(radio => {
                if (radio.checked) {
                    radio.checked = false;
                }
                if (radio.name === 'distance' && radio.value === '2') {
                    radio.checked = true;
                }
                if (radio.name === 'sort' && radio.value === 'distance') {
                    radio.checked = true;
                }
            });
            modal.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
                checkbox.checked = false;
            });
        });
    }

    // 添加应用按钮事件
    const applyFilterBtn = modal.querySelector('#apply-filter');
    if (applyFilterBtn) {
        applyFilterBtn.addEventListener('click', () => {
            // 获取筛选条件
            const distanceInput = modal.querySelector('input[name="distance"]:checked');
            const sortInput = modal.querySelector('input[name="sort"]:checked');
            const filters = {
                distance: distanceInput ? distanceInput.value : '10',
                levels: Array.from(modal.querySelectorAll('input[name="level"]:checked')).map(
                    cb => cb.value
                ),
                departments: Array.from(
                    modal.querySelectorAll('input[name="department"]:checked')
                ).map(cb => cb.value),
                sort: sortInput ? sortInput.value : 'distance',
            };

            // 应用筛选
            applyHospitalFilters(filters);
            modal.remove();
        });
    }

    // 点击模态框外部关闭
    modal.addEventListener('click', e => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// 应用医院筛选
async function applyHospitalFilters(filters) {
    const hospitalList = document.getElementById('hospital-list');
    if (!hospitalList) {
        return;
    }

    hospitalList.innerHTML = '<div class="loading">筛选中...</div>';

    try {
        // 获取医院数据（包含距离计算）
        console.log('应用筛选条件:', filters);
        let hospitals = await updateHospitalDistances();
        console.log('筛选前的医院列表:', hospitals.map(h => ({ name: h.name, distance: h.distance })));
        
        // 应用筛选
        let filteredHospitals = [...hospitals]; // 创建副本，避免修改原始数据

        // 距离筛选
        const maxDistance = parseFloat(filters.distance);
        if (!isNaN(maxDistance)) {
            filteredHospitals = filteredHospitals.filter(hospital => {
                return hospital.distance <= maxDistance;
            });
            console.log('距离筛选后（', maxDistance, 'km）:', filteredHospitals.length, '家');
        }

        // 等级筛选
        if (filters.levels && filters.levels.length > 0) {
            filteredHospitals = filteredHospitals.filter(hospital => {
                return filters.levels.includes(hospital.level);
            });
            console.log('等级筛选后:', filteredHospitals.length, '家');
        }

        // 科室筛选
        if (filters.departments && filters.departments.length > 0) {
            filteredHospitals = filteredHospitals.filter(hospital => {
                return filters.departments.some(dept => hospital.departments.includes(dept));
            });
            console.log('科室筛选后:', filteredHospitals.length, '家');
        }

        // 排序
        if (filters.sort === 'distance') {
            filteredHospitals.sort((a, b) => a.distance - b.distance);
            console.log('按距离排序完成');
        } else if (filters.sort === 'rating') {
            filteredHospitals.sort((a, b) => b.rating - a.rating);
            console.log('按评分排序完成');
        }

        // 更新全局医院数据
        currentHospitals = filteredHospitals;
        console.log('筛选后的医院列表:', filteredHospitals.map((h, i) => `${i + 1}. ${h.name} - ${h.distance}km`));

        // 渲染筛选后的医院列表
        renderHospitalList(hospitalList, filteredHospitals);
        updateConsultationAvailabilitySummary();
    } catch (error) {
        console.error('筛选医院失败:', error);
        hospitalList.innerHTML = '<div class="error">筛选失败，请重试</div>';
    }
}





// 显示导航选择模态框
function showNavigationModal(hospital) {
    let modal = document.getElementById('navigation-modal');
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('show');
        modal.style.opacity = '1';
        modal.style.visibility = 'visible';
        return;
    }

    modal = document.createElement('div');
    modal.id = 'navigation-modal';
    modal.className = 'modal show';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>选择导航方式</h3>
                <button class="close-modal">&times;</button>
            </div>
            <div class="modal-body">
                <p style="margin-bottom: 20px;">
                    <strong>目的地：</strong>${hospital.name}<br>
                    <strong>地址：</strong>${hospital.address}
                </p>
                <div class="navigation-options">
                    <button class="feature-button nav-option" data-type="amap" style="width: 100%; margin: 10px 0;">
                        🗺️ 高德地图导航
                    </button>
                    <button class="feature-button nav-option" data-type="baidu" style="width: 100%; margin: 10px 0;">
                        🗺️ 百度地图导航
                    </button>
                    <button class="feature-button nav-option" data-type="web" style="width: 100%; margin: 10px 0;">
                        🌐 网页地图查看
                    </button>
                </div>
            </div>
            <div class="modal-footer">
                <button class="feature-button" id="cancel-nav">取消</button>
            </div>
        </div>
    `;
    
    // 设置显示样式
    modal.style.display = 'flex';
    modal.style.opacity = '1';
    modal.style.visibility = 'visible';
    
    const modalContent = modal.querySelector('.modal-content');
    if (modalContent) {
        modalContent.style.transform = 'scale(1) translateY(0)';
        modalContent.style.opacity = '1';
    }

    document.body.appendChild(modal);

    const closeModalBtn = modal.querySelector('.close-modal');
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            modal.remove();
        });
    }

    const cancelBtn = document.getElementById('cancel-nav');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            modal.remove();
        });
    }

    const navOptions = modal.querySelectorAll('.nav-option');
    navOptions.forEach(btn => {
        btn.addEventListener('click', e => {
            const type = e.target.dataset.type;
            openNavigation(type, hospital);
            modal.remove();
        });
    });

    modal.addEventListener('click', e => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// 打开导航
function openNavigation(type, hospital) {
    const address = encodeURIComponent(hospital.address);
    const name = encodeURIComponent(hospital.name);

    let navUrl = '';

    switch (type) {
        case 'amap':
            // 高德地图导航
            navUrl = `https://uri.amap.com/navigation?to=,,${name},${address}&mode=car&coordinate=gaode&callnative=1`;
            showNotification('正在打开高德地图...', 'info');
            break;
        case 'baidu':
            // 百度地图导航
            navUrl = `https://map.baidu.com/search/${encodeURIComponent(`${hospital.name} ${hospital.address}`)}`;
            showNotification('正在打开百度地图...', 'info');
            break;
        case 'web':
            // 网页版地图（使用高德地图搜索）
            navUrl = `https://www.amap.com/search?query=${name} ${address}`;
            showNotification('正在打开网页地图...', 'info');
            break;
    }

    if (navUrl) {
        window.open(navUrl, '_blank');
    }
}

// 显示预约模态框
function showAppointmentModal(hospital) {
    const resolvedHospital = hydrateHospitalRegistrationData(hospital);
    const hospitalDepartments = getHospitalDepartments(resolvedHospital).filter(Boolean);
    let modal = document.getElementById('appointment-modal');
    if (modal) {
        modal.remove();
    }

    modal = document.createElement('div');
    modal.id = 'appointment-modal';
    modal.className = 'modal show';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>预约就诊</h3>
                <button class="close-modal">&times;</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label>医院名称</label>
                    <input type="text" id="appointment-hospital" value="${resolvedHospital.name}" disabled>
                </div>
                <div class="form-group">
                    <label for="appointment-department">科室 *</label>
                    <select id="appointment-department" required ${hospitalDepartments.length === 0 ? 'disabled' : ''}>
                        <option value="">${hospitalDepartments.length === 0 ? '暂无可预约科室' : '请选择科室'}</option>
                        ${hospitalDepartments.map(dept => `<option value="${dept}">${dept}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label for="appointment-doctor">医生 *</label>
                    <select id="appointment-doctor" required>
                        <option value="">请选择医生</option>
                        <option value="张医生">张医生</option>
                        <option value="李医生">李医生</option>
                        <option value="王医生">王医生</option>
                        <option value="刘医生">刘医生</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="appointment-date">日期 *</label>
                    <input type="date" id="appointment-date" min="${new Date().toISOString().split('T')[0]}" required>
                </div>
                <div class="form-group">
                    <label for="appointment-time">时间段 *</label>
                    <select id="appointment-time" required>
                        <option value="">请选择时间段</option>
                        <option value="08:00">08:00</option>
                        <option value="08:30">08:30</option>
                        <option value="09:00">09:00</option>
                        <option value="09:30">09:30</option>
                        <option value="10:00">10:00</option>
                        <option value="10:30">10:30</option>
                        <option value="11:00">11:00</option>
                        <option value="11:30">11:30</option>
                        <option value="14:00">14:00</option>
                        <option value="14:30">14:30</option>
                        <option value="15:00">15:00</option>
                        <option value="15:30">15:30</option>
                        <option value="16:00">16:00</option>
                        <option value="16:30">16:30</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="appointment-patient-name">就诊人姓名 *</label>
                    <input type="text" id="appointment-patient-name" placeholder="请输入就诊人姓名" required>
                </div>
                <div class="form-group">
                    <label for="appointment-patient-phone">手机号 *</label>
                    <input type="tel" id="appointment-patient-phone" placeholder="请输入手机号" required>
                </div>
                <div class="form-group">
                    <label for="appointment-symptoms">症状描述</label>
                    <textarea id="appointment-symptoms" rows="3" placeholder="请描述您的症状"></textarea>
                </div>
            </div>
            <div class="modal-footer">
                <button class="feature-button" id="cancel-appointment">取消</button>
                <button class="feature-button" id="confirm-appointment">确认预约</button>
            </div>
        </div>
    `;
    
    // 设置显示样式
    modal.style.display = 'flex';
    modal.style.opacity = '1';
    modal.style.visibility = 'visible';
    
    const modalContent = modal.querySelector('.modal-content');
    if (modalContent) {
        modalContent.style.transform = 'scale(1) translateY(0)';
        modalContent.style.opacity = '1';
    }

    document.body.appendChild(modal);

    const closeModalBtn = modal.querySelector('.close-modal');
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            modal.remove();
        });
    }

    const cancelBtn = document.getElementById('cancel-appointment');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            modal.remove();
        });
    }

    const confirmBtn = document.getElementById('confirm-appointment');
    if (confirmBtn) {
        confirmBtn.addEventListener('click', async () => {
            const department = document.getElementById('appointment-department').value;
            const doctor = document.getElementById('appointment-doctor').value;
            const date = document.getElementById('appointment-date').value;
            const time = document.getElementById('appointment-time').value;
            const patientName = document.getElementById('appointment-patient-name').value;
            const patientPhone = document.getElementById('appointment-patient-phone').value;
            const symptoms = document.getElementById('appointment-symptoms').value;

            if (hospitalDepartments.length === 0) {
                showNotification('该医院暂未配置可预约科室，请稍后再试', 'warning');
                return;
            }

            if (!department || !doctor || !date || !time || !patientName || !patientPhone) {
                showNotification('请填写所有必填字段', 'warning');
                return;
            }

            try {
                let appointmentResult = null;
                if (window.apiService) {
                    appointmentResult = await window.apiService.createAppointment({
                        hospitalId: resolvedHospital.id,
                        hospitalName: resolvedHospital.name,
                        department,
                        doctor,
                        appointmentTime: `${date} ${time}`,
                        patientName,
                        patientPhone,
                        symptoms,
                        reminderMinutes: 30,
                    });

                    await createAppointmentMessageCenterNotification({
                        title: '预约提醒已创建',
                        content: `您已成功预约 ${resolvedHospital.name}${department ? ` · ${department}` : ''}${doctor ? ` · ${doctor}` : ''}，就诊时间为 ${date} ${time}。系统将按预约提醒设置推送消息。`,
                        type: 'appointment-reminder',
                        appointmentId: appointmentResult?.id || appointmentResult?.data?.id || null,
                        appointmentNumber: appointmentResult?.appointmentNumber || appointmentResult?.data?.appointmentNumber || null,
                    });
                }

                showNotification('预约成功！', 'success');
                modal.remove();
                loadAppointmentRecords();
            } catch (error) {
                console.error('预约失败:', error);
                showNotification('预约失败，请重试', 'error');
            }
        });
    }

    modal.addEventListener('click', e => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// 加载医院列表
// 更新位置信息显示
function updatePositionInfoDisplay() {
    const positionInfo = document.getElementById('position-info');
    const positionStatus = document.getElementById('position-status');
    const positionCoords = document.getElementById('position-coords');
    const positionTime = document.getElementById('position-time');
    
    if (!positionInfo || !currentUserPosition) {
        return;
    }
    
    positionInfo.style.display = 'block';

    const locationLabel = currentUserPosition.isDefault
        ? '当前展示位置'
        : '当前位置';
    const locationName = currentUserPosition.addressName || '位置名称获取中';
    
    // 显示位置名称
    positionStatus.textContent = locationLabel;
    positionStatus.style.color = currentUserPosition.isDefault ? '#ff7d00' : '#1d2129';
    
    // 显示位置描述和精度信息
    positionCoords.textContent = locationName;
    
    if (currentUserPosition.accuracy) {
        positionCoords.textContent += ` (精度: ±${Math.round(currentUserPosition.accuracy)}米)`;
    }
    
    if (currentUserPosition.timestamp) {
        positionTime.textContent = `更新时间: ${currentUserPosition.timestamp}`;
    }
}

// 加载医院列表
async function loadHospitalList(forceRefresh = false) {
    console.log('🔄 加载医院列表，强制刷新:', forceRefresh);
    
    const hospitalList = document.getElementById('hospital-list');
    const hospitalLoading = document.getElementById('hospital-loading');
    const hospitalError = document.getElementById('hospital-error');
    const hospitalErrorMessage = document.getElementById('hospital-error-message');
    
    console.log('DOM元素检查:', {
        hospitalList: !!hospitalList,
        hospitalLoading: !!hospitalLoading,
        hospitalError: !!hospitalError
    });
    
    if (!hospitalList) {
        console.error('❌ 找不到 hospital-list 元素');
        return;
    }

    // 显示loading，隐藏列表和错误
    hospitalListExpanded = false;
    if (hospitalLoading) {
        hospitalLoading.style.display = 'block';
        console.log('显示loading状态');
    }
    if (hospitalError) hospitalError.style.display = 'none';
    hospitalList.innerHTML = '';
    hospitalList.style.display = 'block';

    try {
        await syncRegisteredHospitalAccounts(forceRefresh);

        // 如果是强制刷新，清除运行时缓存
        if (forceRefresh) {
            console.log('强制刷新：清除运行时缓存');
            currentUserPosition = null;
            currentHospitals = [];
        }
        
        // 获取用户位置，优先使用浏览器缓存的位置结果
        console.log('正在确认用户当前位置...');
        const latestPosition = await getCurrentUserPositionEnhanced(forceRefresh, false);

        const cachedHospitalData = !forceRefresh ? getHospitalListCache() : null;
        if (cachedHospitalData && isSameHospitalLocation(latestPosition, cachedHospitalData.position)) {
            console.log('✅ 用户位置未变化，直接复用上次医院列表缓存');
            currentUserPosition = latestPosition;
            currentHospitals = cachedHospitalData.hospitals;

            if (hospitalLoading) {
                hospitalLoading.style.display = 'none';
                console.log('隐藏loading状态');
            }

            updatePositionInfoDisplay();
            console.log('开始渲染缓存医院列表...');
            renderHospitalList(hospitalList, currentHospitals);
            updateConsultationAvailabilitySummary();
            console.log('✅ 缓存医院列表渲染完成');
            return;
        }

        currentUserPosition = latestPosition;
        
        // 获取用户位置并计算医院距离
        console.log('开始获取医院数据...');
        const hospitals = await updateHospitalDistances(false);
        currentHospitals = hospitals;
        saveHospitalListCache(currentUserPosition, hospitals);
        
        console.log('✅ 医院数据获取成功，共', hospitals.length, '家医院');
        console.log('即将渲染的医院列表:', hospitals.map((h, i) => `${i + 1}. ${h.name} - ${formatHospitalDistance(h.distance)}km`));

        // 隐藏loading，显示列表
        if (hospitalLoading) {
            hospitalLoading.style.display = 'none';
            console.log('隐藏loading状态');
        }
        
        // 更新位置信息显示
        updatePositionInfoDisplay();
        
        // 渲染医院列表 - 确保使用最新获取的数据
        console.log('开始渲染医院列表...');
        renderHospitalList(hospitalList, hospitals);
        updateConsultationAvailabilitySummary();
        console.log('✅ 医院列表渲染完成');
        
    } catch (error) {
        console.error('❌ 加载医院列表失败:', error);
        console.error(error.stack);
        // 隐藏loading，隐藏医院列表，显示错误
        if (hospitalLoading) hospitalLoading.style.display = 'none';
        hospitalList.innerHTML = ''; // 清空医院列表
        hospitalList.style.display = 'none'; // 隐藏医院列表区域
        if (hospitalError && hospitalErrorMessage) {
            hospitalErrorMessage.textContent = '获取不到当前位置附近医院信息';
            hospitalError.style.display = 'block';
            // 确保错误提示有明显的样式
            hospitalError.style.padding = '30px';
            hospitalError.style.textAlign = 'center';
            hospitalError.style.color = '#e74c3c';
            hospitalError.style.fontSize = '16px';
            hospitalError.style.fontWeight = '500';
            hospitalError.style.backgroundColor = '#fdf2f2';
            hospitalError.style.borderRadius = '12px';
            hospitalError.style.border = '1px solid #fecaca';
        }
    }
}

// 渲染医院列表
function renderHospitalList(container, hospitals) {
    console.log('🎨 renderHospitalList 被调用');
    console.log('容器:', container);
    console.log('医院数据数量:', hospitals ? hospitals.length : 0);
    if (hospitals && hospitals.length > 0) {
        console.log('医院列表详情:');
        hospitals.forEach((h, i) => {
            console.log(`  ${i + 1}. ${h.name} - 距离: ${formatHospitalDistance(h.distance)}km, 等级: ${h.level}`);
        });
    }
    
    if (!container) {
        console.error('❌ renderHospitalList: 容器不存在');
        return;
    }
    
    if (!hospitals || hospitals.length === 0) {
        console.log('⚠️ 没有医院数据，显示空状态');
        container.innerHTML = '<div class="no-results" style="text-align: center; padding: 40px; color: #86909c;">附近暂无医院</div>';
        return;
    }

    console.log('开始渲染', hospitals.length, '家医院');

    const registeredHospitals = hospitals.filter(
        hospital => hospital.isRegistered && Number.isFinite(hospital.distance)
    );
    const unregisteredHospitals = hospitals.filter(hospital => !hospital.isRegistered);
    const previewHospitals = hospitalListExpanded
        ? unregisteredHospitals
        : unregisteredHospitals.slice(0, NEARBY_HOSPITAL_PREVIEW_COUNT);
    const hiddenHospitalCount = Math.max(unregisteredHospitals.length - NEARBY_HOSPITAL_PREVIEW_COUNT, 0);

    const renderHospitalCards = hospitalItems => hospitalItems
        .map(
            (hospital, index) => `
        <div class="hospital-item ${hospital.isRegistered ? 'hospital-registered' : 'hospital-unregistered'}" data-hospital-index="${index}">
            <div class="hospital-info">
                <div class="hospital-header">
                    <h4>${hospital.name}</h4>
                    <span class="hospital-status-badge ${hospital.isRegistered ? 'status-registered' : 'status-unregistered'}">
                        ${hospital.isRegistered ? '✓ 可预约 / 可咨询' : '仅可查看详情 / 导航'}
                    </span>
                </div>
                <p class="hospital-address">📍 ${hospital.address}</p>
                <p class="hospital-phone">📞 ${hospital.phone || '暂无'}</p>
                <p class="hospital-hours">🕐 ${hospital.businessHours || '暂无公开营业时间'}</p>
                <p class="hospital-online-consultation-tip" style="margin: 10px 0 0; font-size: 13px; color: ${hospital.isRegistered ? '#0f7b45' : '#86909c'};">
                    ${hospital.isRegistered ? '在线咨询：已完成医院端注册，可在咨询入口中选择该医院发起在线咨询。' : '在线咨询：未匹配到已注册医院，当前不支持在线咨询。'}
                </p>
                <div class="hospital-meta">
                    <span class="distance">${formatHospitalDistance(hospital.distance)}公里</span>
                    <span class="rating">⭐ ${hospital.rating != null ? hospital.rating : '暂无公开评分'}</span>
                    <span class="level">${hospital.level}</span>
                </div>
                <div class="hospital-departments">
                    ${hospital.departments && hospital.departments.length > 0
                        ? hospital.departments.map(dept => `<span class="department-tag">${dept}</span>`).join('')
                        : '<span class="department-tag">暂无公开科室信息</span>'}
                </div>
            </div>
            <div class="hospital-actions">
                ${hospital.isRegistered ? `
                    <button class="feature-button hospital-detail-btn" data-hospital-id="${hospital.id}">详情</button>
                    <button class="feature-button hospital-appointment-btn" data-hospital-id="${hospital.id}">预约</button>
                ` : `
                    <button class="feature-button hospital-detail-btn" data-hospital-id="${hospital.id}">详情</button>
                    <button class="feature-button hospital-appointment-btn disabled" data-hospital-id="${hospital.id}" disabled>不可预约</button>
                `}
                <button class="feature-button hospital-nav-btn" data-hospital-id="${hospital.id}">导航</button>
            </div>
        </div>
    `
        )
        .join('');

    const registeredSectionHtml = registeredHospitals.length > 0
        ? `
        <section class="hospital-priority-section" style="margin-bottom: 18px; padding: 16px; background: linear-gradient(135deg, rgba(15,123,69,0.08), rgba(38,208,124,0.12)); border: 1px solid rgba(15,123,69,0.16); border-radius: 16px; box-shadow: 0 10px 30px rgba(15,123,69,0.08);">
            <div class="hospital-priority-section__header" style="display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; flex-wrap: wrap;">
                <div>
                    <div style="font-size: 12px; letter-spacing: 0.08em; color: #0f7b45; font-weight: 700; text-transform: uppercase;">优先推荐</div>
                    <h3 style="margin: 4px 0 0; font-size: 18px; color: #0f172a;">已注册医院</h3>
                </div>
                <span style="display: inline-flex; align-items: center; padding: 6px 10px; border-radius: 999px; background: rgba(15,123,69,0.12); color: #0f7b45; font-size: 12px; font-weight: 700;">${registeredHospitals.length} 家可预约 / 可咨询</span>
            </div>
            <p style="margin: 0 0 14px; font-size: 13px; line-height: 1.7; color: #3f6600;">这些医院已完成医院端注册，您可以直接从这里发起预约或在线咨询。</p>
            <div class="hospital-priority-section__list">${renderHospitalCards(registeredHospitals)}</div>
        </section>
    `
        : '';

    const previewHintHtml = hiddenHospitalCount > 0
        ? `
        <div class="hospital-preview-hint">
            已为您展示最近的 ${NEARBY_HOSPITAL_PREVIEW_COUNT} 家未注册医院，注册医院已置顶显示
        </div>
    `
        : '';

    const toggleHtml = hiddenHospitalCount > 0
        ? `
        <button
            type="button"
            class="hospital-toggle-btn"
            id="hospital-toggle-btn"
            aria-expanded="${hospitalListExpanded ? 'true' : 'false'}"
        >
            <span class="hospital-toggle-btn__text">
                ${hospitalListExpanded
                    ? `收起更多医院（${hiddenHospitalCount} 家）`
                    : `查看更多医院（还有 ${hiddenHospitalCount} 家）`}
            </span>
            <span class="hospital-toggle-btn__icon" aria-hidden="true">${hospitalListExpanded ? '↑' : '↓'}</span>
        </button>
    `
        : '';

    const otherHospitalsSectionHtml = unregisteredHospitals.length > 0
        ? `
        <section class="hospital-secondary-section">
            <div class="hospital-secondary-section__header" style="display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: 4px 0 12px; flex-wrap: wrap;">
                <div>
                    <div style="font-size: 12px; letter-spacing: 0.08em; color: #86909c; font-weight: 700; text-transform: uppercase;">附近更多</div>
                    <h3 style="margin: 4px 0 0; font-size: 17px; color: #1d2129;">其他附近医院</h3>
                </div>
                <span style="font-size: 12px; color: #86909c;">可查看详情与导航</span>
            </div>
            ${previewHintHtml}
            ${renderHospitalCards(previewHospitals)}
            ${toggleHtml}
        </section>
    `
        : '';
    
    const html = `${registeredSectionHtml}${otherHospitalsSectionHtml}`;
    
    console.log('生成的HTML长度:', html.length);
    container.innerHTML = html;
    console.log('✅ HTML已插入到容器中');
    console.log('容器当前内容长度:', container.innerHTML.length);

    // 添加动态生成按钮的事件监听器
    console.log('设置医院列表按钮事件...');
    setupHospitalItemButtons();
    setupHospitalToggleButton(container, hospitals);
    console.log('✅ 按钮事件设置完成');
}

function setupHospitalToggleButton(container, hospitals) {
    const toggleButton = container.querySelector('#hospital-toggle-btn');
    if (!toggleButton) {
        return;
    }

    toggleButton.addEventListener('click', () => {
        hospitalListExpanded = !hospitalListExpanded;
        renderHospitalList(container, hospitals);
    });
}

// 处理医院预约
async function handleHospitalAppointment(hospitalId) {
    const hospital = currentHospitals.find(h => String(h.id) === String(hospitalId));
    if (!hospital) {
        showNotification('医院信息未找到', 'error');
        return;
    }

    try {
        await syncRegisteredHospitalAccounts(true);
    } catch (error) {
        console.warn('刷新医院预约信息失败，继续使用当前缓存:', error);
    }

    const resolvedHospital = hydrateHospitalRegistrationData(hospital);
    
    if (!resolvedHospital.isRegistered) {
        showNotification('该医院暂未开通预约服务，请选择其他医院', 'warning');
        return;
    }
    
    showAppointmentModal(resolvedHospital);
}

// 处理医院导航
function handleHospitalNavigation(hospitalId) {
    const hospital = currentHospitals.find(h => String(h.id) === String(hospitalId));
    if (!hospital) {
        showNotification('医院信息未找到', 'error');
        return;
    }

    // 显示导航确认模态框
    showNavigationConfirmationModal(hospital);
}

// 直接打开导航到医院
function openNavigationToHospital(hospital, startLocation = null, manualInput = null) {
    const address = encodeURIComponent(hospital.address);
    const name = encodeURIComponent(hospital.name);
    
    // 尝试使用多种地图服务
    let navUrl = '';
    
    // 构建起点参数
    let fromParam = '';
    if (startLocation && startLocation.latitude && startLocation.longitude) {
        fromParam = `&from=${startLocation.longitude},${startLocation.latitude},我的位置`;
    } else if (manualInput) {
        const encodedManualInput = encodeURIComponent(manualInput);
        // 对于手动输入，使用地址方式
        fromParam = `&from=${encodedManualInput}`;
    }
    
    // 优先使用经纬度（如果有）
    if (hospital.latitude && hospital.longitude) {
        // 高德地图
        navUrl = `https://uri.amap.com/navigation?to=${hospital.longitude},${hospital.latitude},${name}${fromParam}&mode=car&coordinate=gaode&callnative=1`;
    } else {
        // 百度地图（使用地址）
        if (manualInput) {
            const encodedManualInput = encodeURIComponent(manualInput);
            navUrl = `https://map.baidu.com/direction?origin=${encodedManualInput}&destination=${name} ${address}&mode=driving`;
        } else {
            navUrl = `https://map.baidu.com/search/${encodeURIComponent(`${hospital.name} ${hospital.address}`)}`;
        }
    }
    
    // 打开地图
    if (navUrl) {
        console.log('打开导航URL:', navUrl);
        window.open(navUrl, '_blank');
    } else {
        showNotification('无法生成导航链接', 'error');
    }
}

// 显示医院详情
function showHospitalDetail(hospitalId) {
    const hospital = currentHospitals.find(h => String(h.id) === String(hospitalId));
    if (!hospital) {
        showNotification('医院信息未找到', 'error');
        return;
    }

    const hospitalDepartments = getHospitalDepartments(hospital);
    const hospitalDepartmentDetails = getHospitalDepartmentDetails(hospital);

    let modal = document.getElementById('hospital-detail-modal');
    if (modal) {
        modal.remove();
    }

    modal = document.createElement('div');
    modal.id = 'hospital-detail-modal';
    modal.className = 'modal show';
    modal.style.cssText = 'display: flex; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 10000; justify-content: center; align-items: center; padding: 20px;';

    const canOnlineService = Boolean(hospital.isRegistered);

    modal.innerHTML = `
        <div class="modal-content" style="max-width: 760px; width: 100%; max-height: 90vh; overflow-y: auto; background: white; border-radius: 20px; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
            <div class="modal-header" style="background: linear-gradient(135deg, #165dff 0%, #36cfc9 100%); color: white; padding: 25px 30px; border-radius: 20px 20px 0 0; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <h3 style="margin: 0; font-size: 24px;">${hospital.name}</h3>
                    <p style="margin: 8px 0 0 0; opacity: 0.92; font-size: 14px;">${hospital.level || '医院信息'}</p>
                </div>
                <button class="close-modal" style="background: rgba(255,255,255,0.2); border: none; color: white; width: 40px; height: 40px; border-radius: 50%; font-size: 24px; cursor: pointer; transition: all 0.3s;">&times;</button>
            </div>
            <div class="modal-body" style="padding: 30px; background: #f7f9fc;">
                <div style="background: white; border-radius: 16px; padding: 22px; box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06); margin-bottom: 18px;">
                    <h4 style="margin: 0 0 18px 0; color: #1d2129; font-size: 18px;">基础公开信息</h4>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px;">
                        <div style="background: #f0f5ff; padding: 15px; border-radius: 12px;">
                            <div style="color: #667eea; font-size: 13px; margin-bottom: 6px;">医院地址</div>
                            <div style="color: #1d2129; font-weight: 500; line-height: 1.7;">${hospital.address || '暂无公开地址信息'}</div>
                        </div>
                        <div style="background: #f0f5ff; padding: 15px; border-radius: 12px;">
                            <div style="color: #667eea; font-size: 13px; margin-bottom: 6px;">联系电话</div>
                            <div style="color: #1d2129; font-weight: 500; line-height: 1.7;">${hospital.phone || '暂无公开电话信息'}</div>
                        </div>
                        <div style="background: #f0f5ff; padding: 15px; border-radius: 12px;">
                            <div style="color: #667eea; font-size: 13px; margin-bottom: 6px;">营业时间</div>
                            <div style="color: #1d2129; font-weight: 500; line-height: 1.7;">${hospital.businessHours || '暂无公开营业时间'}</div>
                        </div>
                        <div style="background: #f0f5ff; padding: 15px; border-radius: 12px;">
                            <div style="color: #667eea; font-size: 13px; margin-bottom: 6px;">距离</div>
                            <div style="color: #1d2129; font-weight: 500; line-height: 1.7;">${formatHospitalDistance(hospital.distance)} 公里</div>
                        </div>
                        <div style="background: #f0f5ff; padding: 15px; border-radius: 12px;">
                            <div style="color: #667eea; font-size: 13px; margin-bottom: 6px;">评分</div>
                            <div style="color: #1d2129; font-weight: 500; line-height: 1.7;">${hospital.rating != null ? hospital.rating : '暂无公开评分'}</div>
                        </div>
                        <div style="background: #f0f5ff; padding: 15px; border-radius: 12px;">
                            <div style="color: #667eea; font-size: 13px; margin-bottom: 6px;">线上服务</div>
                            <div style="color: #1d2129; font-weight: 500; line-height: 1.7;">${canOnlineService ? '支持预约 / 咨询' : '仅支持查看详情 / 导航'}</div>
                        </div>
                    </div>
                </div>

                ${hospitalDepartments.length > 0 ? `
                <div style="background: white; border-radius: 16px; padding: 22px; box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06); margin-bottom: 18px;">
                    <h4 style="margin: 0 0 14px 0; color: #1d2129; font-size: 18px;">公开科室信息</h4>
                    <div style="display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 18px;">
                        ${hospitalDepartments.map(dept => `<span class="department-tag">${dept}</span>`).join('')}
                    </div>
                    <div style="display: grid; gap: 12px;">
                        ${hospitalDepartmentDetails.map(detail => `
                            <div style="padding: 14px 16px; border-radius: 14px; background: #f8fafc; border: 1px solid rgba(148, 163, 184, 0.18);">
                                <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 8px;">
                                    <strong style="color: #0f172a; font-size: 15px;">${detail.name || '未命名科室'}</strong>
                                    <span style="font-size: 12px; color: #475569; background: #e2e8f0; padding: 4px 10px; border-radius: 999px;">${detail.doctors?.length ? `${detail.doctors.length} 位医生` : '暂无医生公开信息'}</span>
                                </div>
                                <p style="margin: 0; color: #475569; font-size: 13px; line-height: 1.7;">${detail.description || '暂无公开科室简介'}</p>
                            </div>
                        `).join('')}
                    </div>
                </div>
                ` : ''}

                <div style="background: #fff7e8; border: 1px solid #ffd591; border-radius: 16px; padding: 16px 18px; color: #ad6800; line-height: 1.7; font-size: 14px;">
                    当前仅展示公开可获取的附近医院基础信息，已移除未核验的医生、床位、停车、挂号指南等扩展详情。
                </div>
            </div>
            <div class="modal-footer" style="padding: 20px 30px; background: #f8f9fa; border-radius: 0 0 20px 20px; display: flex; gap: 12px; justify-content: flex-end;">
                <button class="feature-button" id="close-detail" style="padding: 12px 30px; border-radius: 10px; background: #6c757d; color: white; border: none; cursor: pointer; font-size: 16px; font-weight: 500; transition: all 0.3s;">
                    <i class="fas fa-times" style="margin-right: 8px;"></i>关闭
                </button>
                ${canOnlineService ? `
                <button class="feature-button" id="detail-appointment" style="padding: 12px 30px; border-radius: 10px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; cursor: pointer; font-size: 16px; font-weight: 500; transition: all 0.3s;">
                    <i class="fas fa-calendar-plus" style="margin-right: 8px;"></i>预约就诊
                </button>
                ` : ''}
                <button class="feature-button" id="detail-nav" style="padding: 12px 30px; border-radius: 10px; background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); color: white; border: none; cursor: pointer; font-size: 16px; font-weight: 500; transition: all 0.3s;">
                    <i class="fas fa-map-marked-alt" style="margin-right: 8px;"></i>导航前往
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const closeModalBtn = modal.querySelector('.close-modal');
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            modal.remove();
        });
    }

    const closeBtn = document.getElementById('close-detail');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.remove();
        });
    }

    const detailAppointmentBtn = document.getElementById('detail-appointment');
    if (detailAppointmentBtn) {
        detailAppointmentBtn.addEventListener('click', () => {
            modal.remove();
            showAppointmentModal(hospital);
        });
    }

    const detailNavBtn = document.getElementById('detail-nav');
    if (detailNavBtn) {
        detailNavBtn.addEventListener('click', () => {
            modal.remove();
            showNotification('正在打开导航...', 'info');
            openNavigationToHospital(hospital);
        });
    }

    modal.addEventListener('click', e => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

function setupHospitalItemButtons() {
    updateConsultationAvailabilitySummary();

    const detailBtns = document.querySelectorAll('.hospital-detail-btn');
    detailBtns.forEach(btn => {
        btn.addEventListener('click', e => {
            const hospitalId = e.currentTarget.dataset.hospitalId;
            showHospitalDetail(hospitalId);
        });
    });

    const appointmentBtns = document.querySelectorAll('.hospital-appointment-btn:not(.disabled)');
    appointmentBtns.forEach(btn => {
        btn.addEventListener('click', e => {
            const hospitalId = e.currentTarget.dataset.hospitalId;
            handleHospitalAppointment(hospitalId);
        });
    });

    const navBtns = document.querySelectorAll('.hospital-nav-btn');
    navBtns.forEach(btn => {
        btn.addEventListener('click', e => {
            const hospitalId = e.currentTarget.dataset.hospitalId;
            handleHospitalNavigation(hospitalId);
        });
    });
}

function updateConsultationAvailabilitySummary() {
    const summary = document.getElementById('consultation-availability-summary');
    const startConsultationBtn = document.getElementById('start-consultation');
    if (!summary || !startConsultationBtn) {
        return;
    }

    const registeredHospitals = currentHospitals.filter(hospital => hospital.isRegistered);
    const registeredCount = registeredHospitals.length;

    if (registeredCount > 0) {
        const regionNames = Array.from(
            new Set(
                registeredHospitals
                    .map(hospital => [hospital.province, hospital.city].filter(Boolean).join(''))
                    .filter(Boolean)
            )
        );
        const regionText = regionNames.length > 0
            ? `当前可从 ${regionNames.slice(0, 3).join('、')}${regionNames.length > 3 ? ' 等地区' : ''} 的已注册医院中发起咨询。`
            : '当前可从附近已注册医院中发起咨询。';

        summary.style.background = '#e8ffea';
        summary.style.color = '#0f5132';
        summary.innerHTML = `用户可手动选择地区，并从该地区已注册的医院中发起咨询。未主动选择医院前，“在线医院”页面中的“在线咨询”会根据附近医院里哪些医院已完成医院端注册来展示；只有匹配成功的医院才支持在线咨询。<br>${regionText}`;
        startConsultationBtn.disabled = false;
        startConsultationBtn.style.opacity = '1';
        startConsultationBtn.style.cursor = 'pointer';
        return;
    }

    summary.style.background = '#fff7e8';
    summary.style.color = '#ad6800';
    summary.textContent = '当前附近医院中暂无已完成医院端注册的机构，因此暂不展示可发起的在线咨询医院。待附近医院注册完成后，您可按地区手动选择医院发起咨询。';
    startConsultationBtn.disabled = true;
    startConsultationBtn.style.opacity = '0.6';
    startConsultationBtn.style.cursor = 'not-allowed';
}

// 咨询会话管理
// 变量声明统一放在后面的在线咨询模块中，避免重复声明

// 预约数据管理辅助函数
// 医院数据存储
const NEARBY_HOSPITAL_PREVIEW_COUNT = 3;
let currentHospitals = [];
let currentUserPosition = null;
let hospitalListExpanded = false;



// 逆地理编码：将经纬度转换为地址名称
async function reverseGeocode(latitude, longitude) {
    // 对于北京天安门默认位置，直接返回，避免不必要的API调用
    if (latitude === 39.9042 && longitude === 116.4074) {
        return '北京天安门';
    }

    try {
        console.log('开始逆地理编码:', latitude, longitude);

        const providers = ['amap', 'tencent', 'baidu', 'tianditu'];
        const requestUrls = ['/api/reverse-geocoding', '/reverse-geocoding'];
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            requestUrls.push(`http://${window.location.hostname}:${window.location.port || '8899'}/reverse-geocoding`);
        }

        let lastError = null;

        for (const requestUrl of requestUrls) {
            for (const provider of providers) {
                const requestBody = JSON.stringify({
                    lat: latitude,
                    lng: longitude,
                    provider,
                });

                try {
                    const response = await fetch(requestUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: requestBody,
                    });

                    if (!response.ok) {
                        throw new Error(`逆地理编码请求失败: ${response.status}`);
                    }

                    const result = await response.json();
                    console.log('逆地理编码结果:', { requestUrl, provider, result });

                    if (result.success && result.data) {
                        const formattedAddress = result.data.formattedAddress || result.data.address || result.data.name;
                        return formattedAddress || `位置 (${latitude.toFixed(2)}, ${longitude.toFixed(2)})`;
                    }

                    throw new Error(result.error?.message || '逆地理编码失败');
                } catch (error) {
                    lastError = error;
                    console.warn(`逆地理编码请求失败，尝试下一个地址/提供商: ${requestUrl} [${provider}]`, error.message || error);
                }
            }
        }

        throw lastError || new Error('逆地理编码失败');
    } catch (error) {
        console.log('逆地理编码不可用（这是正常的，不影响医院列表显示）:', error.message || error);
        // 如果API调用失败，返回一个简单的位置描述
        return `位置 (${latitude.toFixed(2)}, ${longitude.toFixed(2)})`;
    }
}

// 改进的地理位置获取函数
function getCurrentUserPositionEnhanced(forceRefresh = false, showLoading = true) {
    return new Promise((resolve, reject) => {
        console.log('开始获取用户位置...');
        
        if (!navigator.geolocation) {
            const error = new Error('浏览器不支持地理位置功能');
            console.error(error.message);
            reject(error);
            return;
        }
        
        // 如果强制刷新，清除缓存的位置
        if (forceRefresh) {
            currentUserPosition = null;
            console.log('强制刷新模式：清除缓存位置');
        }
        
        const options = {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: forceRefresh ? 0 : 300000
        };
        
        console.log('位置获取参数:', options);
        
        const success = async (position) => {
            currentUserPosition = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
                timestamp: new Date(position.timestamp).toLocaleString('zh-CN')
            };
            
            // 获取位置名称
            try {
                currentUserPosition.addressName = await reverseGeocode(
                    currentUserPosition.latitude,
                    currentUserPosition.longitude
                );
            } catch (error) {
                console.error('获取位置名称失败:', error);
                currentUserPosition.addressName = '位置获取中...';
            }
            
            console.log('✅ 成功获取用户位置:', currentUserPosition);
            showNotification(`位置获取成功\n${currentUserPosition.addressName || `纬度: ${currentUserPosition.latitude.toFixed(2)}\n经度: ${currentUserPosition.longitude.toFixed(2)}`}`, 'success');
            resolve(currentUserPosition);
        };
        
        const error = async (err) => {
            let errorMessage = '';
            
            switch (err.code) {
                case err.PERMISSION_DENIED:
                    errorMessage = '用户拒绝了位置访问权限，请在浏览器设置中允许位置访问';
                    break;
                case err.POSITION_UNAVAILABLE:
                    errorMessage = '无法获取位置信息';
                    break;
                case err.TIMEOUT:
                    errorMessage = '获取位置超时，请检查网络连接或GPS信号';
                    break;
                default:
                    errorMessage = '获取位置时发生未知错误: ' + err.message;
            }
            
            console.error('❌ 获取位置失败:', errorMessage);

            // 权限被拒绝时保留报错，其它可恢复错误自动降级到默认位置
            if (err.code === err.PERMISSION_DENIED) {
                const error = new Error(errorMessage);
                error.code = err.code;
                reject(error);
                return;
            }

            try {
                const fallbackPosition = await getIPLocationFallback();
                currentUserPosition = {
                    ...fallbackPosition,
                    timestamp: new Date().toLocaleString('zh-CN'),
                    isDefault: true,
                };

                console.warn('⚠️ 使用降级位置继续加载医院列表:', currentUserPosition);
                showNotification('定位失败，已为您切换到默认位置附近的医院', 'warning');
                resolve(currentUserPosition);
            } catch (fallbackError) {
                console.error('❌ 降级位置获取失败:', fallbackError);
                const error = new Error(errorMessage);
                error.code = err.code;
                reject(error);
            }
        };
        
        navigator.geolocation.getCurrentPosition(success, error, options);
    });
}

// IP定位降级方案（模拟实现）
function getIPLocationFallback() {
    return new Promise((resolve) => {
        // 这里模拟一个IP定位服务，实际项目中可以接入真实的IP定位API
        setTimeout(() => {
            // 模拟返回一个基于IP的位置
            resolve({
                latitude: 39.9087,
                longitude: 116.3912,
                addressName: '北京市中心（默认位置）',
                accuracy: 5000
            });
        }, 1000);
    });
}

// 获取用户当前地理位置（保持向后兼容）
function getCurrentUserPosition(forceRefresh = false) {
    return getCurrentUserPositionEnhanced(forceRefresh, true);
}

// 显示导航确认模态框
function showNavigationConfirmationModal(hospital) {
    // 检查是否已存在模态框
    let modal = document.getElementById('navigation-confirmation-modal');
    if (modal) {
        modal.remove();
    }

    modal = document.createElement('div');
    modal.id = 'navigation-confirmation-modal';
    modal.className = 'modal show';
    modal.style.cssText = 'display: flex; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 10000; justify-content: center; align-items: center; padding: 20px;';
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px; width: 100%; background: white; border-radius: 20px; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
            <div class="modal-header" style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); color: white; padding: 25px 30px; border-radius: 20px 20px 0 0; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <h3 style="margin: 0; font-size: 22px;"><i class="fas fa-map-marked-alt" style="margin-right: 10px;"></i>导航到 ${hospital.name}</h3>
                    <p style="margin: 8px 0 0 0; opacity: 0.9; font-size: 14px;">${hospital.address}</p>
                </div>
                <button class="close-modal" style="background: rgba(255,255,255,0.2); border: none; color: white; width: 40px; height: 40px; border-radius: 50%; font-size: 24px; cursor: pointer; transition: all 0.3s;">&times;</button>
            </div>
            <div class="modal-body" style="padding: 30px;">
                <!-- 位置权限说明 -->
                <div id="location-permission-notice" style="background: #e3f2fd; padding: 15px; border-radius: 12px; border-left: 4px solid #2196f3; margin-bottom: 20px;">
                    <div style="font-weight: 600; color: #1565c0; margin-bottom: 8px;">
                        <i class="fas fa-info-circle" style="margin-right: 8px;"></i>位置权限说明
                    </div>
                    <p style="margin: 0; color: #555; font-size: 14px; line-height: 1.6;">
                        为了提供更准确的导航服务，我们需要获取您的当前位置。<br>
                        位置信息仅用于本次导航，不会被存储或分享给第三方。
                    </p>
                </div>
                
                <!-- 加载状态 -->
                <div id="navigation-loading" style="text-align: center; padding: 30px;">
                    <div style="font-size: 48px; margin-bottom: 15px;">📍</div>
                    <p style="margin: 0; color: #333; font-size: 16px; font-weight: 500;">正在获取您的位置...</p>
                </div>
                
                <!-- 位置输入表单 -->
                <div id="location-form" style="display: none;">
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 8px; color: #333; font-weight: 500;">
                            <i class="fas fa-map-marker-alt" style="margin-right: 8px; color: #667eea;"></i>起点位置
                        </label>
                        <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                            <input type="text" id="start-location-input" 
                                   placeholder="输入起点位置（如：我的位置、北京市朝阳区...）"
                                   style="flex: 1; padding: 12px 15px; border: 2px solid #e0e0e0; border-radius: 10px; font-size: 15px; transition: all 0.3s;">
                            <button id="use-current-location-btn" class="feature-button" style="padding: 12px 20px; border-radius: 10px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; cursor: pointer; white-space: nowrap;">
                                <i class="fas fa-location-dot" style="margin-right: 5px;"></i>使用当前位置
                            </button>
                        </div>
                    </div>
                    
                    <div id="current-location-display" style="background: #f0f4ff; padding: 15px; border-radius: 12px; margin-bottom: 20px; display: none;">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                            <div>
                                <div style="color: #667eea; font-size: 14px; font-weight: 500; margin-bottom: 5px;">
                                    <i class="fas fa-check-circle" style="margin-right: 5px;"></i>已获取当前位置
                                </div>
                                <div id="current-location-address" style="color: #333; font-size: 15px;"></div>
                                <div id="current-location-coords" style="color: #888; font-size: 12px; margin-top: 3px;"></div>
                            </div>
                            <button id="clear-location-btn" style="background: none; border: none; color: #888; cursor: pointer; font-size: 20px;">×</button>
                        </div>
                    </div>
                </div>
            </div>
            <div class="modal-footer" style="padding: 20px 30px; background: #f8f9fa; border-radius: 0 0 20px 20px; display: flex; gap: 12px; justify-content: flex-end;">
                <button id="cancel-navigation" class="feature-button" style="padding: 12px 30px; border-radius: 10px; background: #6c757d; color: white; border: none; cursor: pointer; font-size: 16px; font-weight: 500;">
                    取消
                </button>
                <button id="start-navigation" class="feature-button" style="padding: 12px 30px; border-radius: 10px; background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); color: white; border: none; cursor: pointer; font-size: 16px; font-weight: 500; display: none;">
                    <i class="fas fa-route" style="margin-right: 8px;"></i>开始导航
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    
    // 当前选择的起点位置
    let selectedStartLocation = null;
    
    // 关闭按钮事件
    const closeModalBtn = modal.querySelector('.close-modal');
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            modal.remove();
        });
    }
    
    // 取消按钮事件
    const cancelBtn = document.getElementById('cancel-navigation');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            modal.remove();
        });
    }
    
    // 点击模态框外部关闭
    modal.addEventListener('click', e => {
        if (e.target === modal) {
            modal.remove();
        }
    });
    
    // 开始导航按钮事件
    const startNavBtn = document.getElementById('start-navigation');
    if (startNavBtn) {
        startNavBtn.addEventListener('click', () => {
            const manualInput = document.getElementById('start-location-input').value.trim();
            openNavigationToHospital(hospital, selectedStartLocation, manualInput);
            modal.remove();
        });
    }
    
    // 使用当前位置按钮事件
    const useCurrentLocBtn = document.getElementById('use-current-location-btn');
    if (useCurrentLocBtn) {
        useCurrentLocBtn.addEventListener('click', async () => {
            await fetchAndDisplayCurrentLocation();
        });
    }
    
    // 清除位置按钮事件
    const clearLocBtn = document.getElementById('clear-location-btn');
    if (clearLocBtn) {
        clearLocBtn.addEventListener('click', () => {
            selectedStartLocation = null;
            document.getElementById('current-location-display').style.display = 'none';
            document.getElementById('start-location-input').value = '';
            document.getElementById('start-location-input').disabled = false;
            document.getElementById('use-current-location-btn').disabled = false;
            updateStartNavigationButton();
        });
    }
    
    // 监听起点输入框变化
    const startLocInput = document.getElementById('start-location-input');
    if (startLocInput) {
        startLocInput.addEventListener('input', updateStartNavigationButton);
    }
    
    // 更新开始导航按钮状态
    function updateStartNavigationButton() {
        const hasLocation = selectedStartLocation || startLocInput.value.trim();
        startNavBtn.style.display = hasLocation ? 'inline-block' : 'none';
    }
    
    // 获取并显示当前位置
    async function fetchAndDisplayCurrentLocation() {
        try {
            // 隐藏权限说明，显示加载状态
            document.getElementById('location-permission-notice').style.display = 'none';
            document.getElementById('navigation-loading').style.display = 'block';
            document.getElementById('location-form').style.display = 'none';
            
            useCurrentLocBtn.disabled = true;
            useCurrentLocBtn.innerHTML = '<i class="fas fa-spinner fa-spin" style="margin-right: 5px;"></i>获取中...';
            
            const position = await getCurrentUserPositionEnhanced(true, false);
            selectedStartLocation = position;
            
            // 显示位置信息
            document.getElementById('navigation-loading').style.display = 'none';
            document.getElementById('location-form').style.display = 'block';
            
            const locDisplay = document.getElementById('current-location-display');
            locDisplay.style.display = 'block';
            document.getElementById('current-location-address').textContent = position.addressName || '未知位置';
            document.getElementById('current-location-coords').textContent = 
                `纬度: ${position.latitude.toFixed(2)}, 经度: ${position.longitude.toFixed(2)}`;
            
            // 禁用手动输入框
            startLocInput.value = position.addressName || '当前位置';
            startLocInput.disabled = true;
            
            updateStartNavigationButton();
            
        } catch (error) {
            console.error('获取位置失败:', error);
            showNotification('获取位置失败，请手动输入起点', 'warning');
            
            // 显示表单让用户手动输入
            document.getElementById('location-permission-notice').style.display = 'none';
            document.getElementById('navigation-loading').style.display = 'none';
            document.getElementById('location-form').style.display = 'block';
        } finally {
            useCurrentLocBtn.disabled = false;
            useCurrentLocBtn.innerHTML = '<i class="fas fa-location-dot" style="margin-right: 5px;"></i>使用当前位置';
        }
    }
    
    // 自动尝试获取位置
    setTimeout(() => {
        fetchAndDisplayCurrentLocation();
    }, 500);
}

// 计算两点之间的距离（Haversine公式）
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// 角度转弧度
function toRad(degrees) {
    return degrees * (Math.PI / 180);
}

// 计算并更新医院距离
async function updateHospitalDistances(forceRefresh = false) {
    console.log('开始计算医院距离，强制刷新:', forceRefresh);
    
    // 如果强制刷新或者没有位置，获取新位置
    if (forceRefresh || !currentUserPosition) {
        console.log('正在获取用户位置...');
        try {
            await getCurrentUserPositionEnhanced(forceRefresh);
        } catch (error) {
            console.error('获取用户位置失败:', error);
            throw new Error('无法获取用户位置');
        }
    }
    
    console.log('当前用户位置:', currentUserPosition);
    
    if (!currentUserPosition) {
        console.error('无法获取用户位置');
        throw new Error('无法获取用户位置');
    }
    
    const startTime = Date.now();
    
    // ================================================
    // 关键点：使用高德地图PlaceSearch搜索附近医院
    // 而不是调用后端API
    // ================================================
    console.log('🔄 切换到高德地图搜索...');
    const hospitals = await searchNearbyHospitalsWithAMap(
        currentUserPosition.latitude,
        currentUserPosition.longitude,
        50000
    );
    
    const endTime = Date.now();
    console.log(`医院数据获取和距离计算耗时: ${endTime - startTime}ms`);
    console.log('排序后的医院列表（按距离）:');
    hospitals.forEach((h, index) => {
        console.log(`  ${index + 1}. ${h.name} - ${h.distance}km`);
    });
    
    return hospitals;
}



// 加载预约记录
function highlightAppointmentRecord(appointmentId) {
    const appointmentCard = document.querySelector(`.appointment-item[data-appointment-id="${appointmentId}"]`);
    if (!appointmentCard) {
        return false;
    }

    document.querySelectorAll('.appointment-item.is-highlighted').forEach(item => {
        item.classList.remove('is-highlighted');
    });

    appointmentCard.classList.add('is-highlighted');
    appointmentCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
    window.setTimeout(() => {
        appointmentCard.classList.remove('is-highlighted');
    }, 3200);
    return true;
}

function loadAppointmentRecords() {
    const appointmentRecords = document.getElementById('appointment-records');
    if (!appointmentRecords) {
        return;
    }

    const normalizeAppointmentStatus = status => {
        const statusMap = {
            pending: 'pending',
            confirmed: 'confirmed',
            completed: 'completed',
            cancelled: 'cancelled',
            待确认: 'pending',
            已确认: 'confirmed',
            已完成: 'completed',
            已取消: 'cancelled',
        };

        return statusMap[status] || 'pending';
    };

    const getAppointmentStatusText = status => {
        const statusTextMap = {
            pending: '待确认',
            confirmed: '已确认',
            completed: '已完成',
            cancelled: '已取消',
        };

        return statusTextMap[normalizeAppointmentStatus(status)] || '待确认';
    };

    appointmentRecords.innerHTML = '<div class="loading">加载中...</div>';

    const renderAppointments = appointments => {
        const activeAppointments = appointments.filter(
            app => normalizeAppointmentStatus(app.status) !== 'cancelled'
        );

        if (activeAppointments.length === 0) {
            appointmentRecords.innerHTML = '<div class="empty-state">暂无预约记录</div>';
            return;
        }

        appointmentRecords.innerHTML = activeAppointments
            .map(
                appointment => {
                    const hospitalName = appointment.hospital || appointment.hospitalName || '';
                    const appointmentDate = appointment.date || appointment.appointmentTime?.split(' ')[0] || '';
                    const appointmentTime = appointment.time || appointment.appointmentTime?.split(' ')[1] || '';
                    const appointmentStatus = normalizeAppointmentStatus(appointment.status);
                    const appointmentStatusText = getAppointmentStatusText(appointment.status);
                    const reminderValue = appointment.reminder ?? appointment.reminderMinutes ?? 30;

                    return `
            <article class="appointment-item" data-appointment-id="${appointment.id}" data-appointment-number="${appointment.appointmentNumber || ''}" role="listitem" aria-labelledby="appointment-title-${appointment.id}">
                <div class="appointment-info">
                    <h4 id="appointment-title-${appointment.id}">${hospitalName} - ${appointment.department}</h4>
                    <p class="appointment-doctor">
                        <span class="label">医生:</span>
                        <span class="value">${appointment.doctor || ''}</span>
                    </p>
                    <p class="appointment-time">
                        <span class="label">时间:</span>
                        <time datetime="${appointmentDate}T${appointmentTime}" class="value">${appointmentDate} ${appointmentTime}</time>
                    </p>
                </div>
                <div class="appointment-status" data-status="${appointmentStatus}" role="status" aria-label="预约状态: ${appointmentStatusText}">
                    ${appointmentStatusText}
                </div>
                <div class="appointment-actions">
                    ${
                        appointmentStatus === 'confirmed' || appointmentStatus === 'pending'
                            ? `
                        <button class="appointment-btn appointment-btn--modify" data-appointment-id="${appointment.id}" aria-label="修改预约: ${hospitalName}">修改预约</button>
                        <button class="appointment-btn appointment-btn--cancel" data-appointment-id="${appointment.id}" aria-label="取消预约: ${hospitalName}">取消预约</button>
                    `
                            : ''
                    }
                </div>
                <div class="appointment-reminder" aria-labelledby="reminder-header-${appointment.id}">
                    <div class="reminder-header">
                        <span id="reminder-header-${appointment.id}">预约提醒</span>
                        <span class="reminder-status" role="status">已设置</span>
                    </div>
                    <div class="reminder-setting">
                        <label for="reminder-time-${appointment.id}" class="sr-only">提醒时间</label>
                        <select id="reminder-time-${appointment.id}" class="reminder-time" data-appointment-id="${appointment.id}" aria-label="选择提醒时间">
                            <option value="15" ${reminderValue === 15 ? 'selected' : ''}>提前15分钟</option>
                            <option value="30" ${reminderValue === 30 ? 'selected' : ''}>提前30分钟</option>
                            <option value="60" ${reminderValue === 60 ? 'selected' : ''}>提前1小时</option>
                            <option value="120" ${reminderValue === 120 ? 'selected' : ''}>提前2小时</option>
                            <option value="1440" ${reminderValue === 1440 ? 'selected' : ''}>提前1天</option>
                        </select>
                        <button class="reminder-save feature-button" data-appointment-id="${appointment.id}" aria-label="保存提醒设置">保存</button>
                    </div>
                </div>
            </article>
        `;
                }
            )
            .join('');

        setupAppointmentEvents();

        const pendingHighlightId = window.pendingAppointmentHighlightId;
        if (pendingHighlightId) {
            const highlighted = highlightAppointmentRecord(String(pendingHighlightId));
            if (highlighted) {
                window.pendingAppointmentHighlightId = null;
            }
        }
    };

    setTimeout(async () => {
        try {
            if (!window.apiService) {
                throw new Error('预约服务未初始化');
            }

            const response = await window.apiService.getMyAppointments();
            const appointments = Array.isArray(response?.list)
                ? response.list
                : Array.isArray(response?.appointments)
                  ? response.appointments
                  : [];

            await syncUpcomingAppointmentReminders(appointments);
            renderAppointments(appointments);
        } catch (error) {
            console.error('加载预约记录失败:', error);
            appointmentRecords.innerHTML = '<div class="empty-state">预约记录加载失败，请稍后重试</div>';
        }
    }, 300);
}

// 设置预约相关事件
function setupAppointmentEvents() {
    // 取消预约按钮点击事件
    const cancelButtons = document.querySelectorAll('.appointment-btn--cancel');
    cancelButtons.forEach(button => {
        button.addEventListener('click', e => {
            const appointmentId = e.target.dataset.appointmentId;
            if (confirm('确定要取消这个预约吗？')) {
                cancelAppointment(appointmentId);
            }
        });
    });

    // 修改预约按钮点击事件
    const modifyButtons = document.querySelectorAll('.appointment-btn--modify');
    modifyButtons.forEach(button => {
        button.addEventListener('click', e => {
            const appointmentId = e.target.dataset.appointmentId;
            showModifyAppointmentModal(appointmentId);
        });
    });

    // 保存提醒设置按钮点击事件
    const saveReminderButtons = document.querySelectorAll('.reminder-save');
    saveReminderButtons.forEach(button => {
        button.addEventListener('click', e => {
            const appointmentId = e.target.dataset.appointmentId;
            const selectElement = document.querySelector(
                `.reminder-time[data-appointment-id="${appointmentId}"]`
            );
            const reminderTime = selectElement.value;
            saveReminderSetting(appointmentId, reminderTime);
        });
    });
}

// 取消预约
function cancelAppointment(appointmentId) {
    setTimeout(async () => {
        try {
            if (!window.apiService) {
                throw new Error('预约服务未初始化');
            }

            const response = await window.apiService.getMyAppointments();
            const appointments = Array.isArray(response?.list)
                ? response.list
                : Array.isArray(response?.appointments)
                  ? response.appointments
                  : [];
            const currentAppointment = appointments.find(item => String(item.id) === String(appointmentId));

            await window.apiService.updateAppointmentStatus(appointmentId, 'cancelled');
            await createAppointmentMessageCenterNotification({
                title: '预约已取消',
                content: currentAppointment
                    ? `您在 ${currentAppointment.hospitalName} ${currentAppointment.department}${currentAppointment.doctor ? ` · ${currentAppointment.doctor}` : ''} 的预约已取消。`
                    : '您的一条预约记录已取消。',
                type: 'appointment-cancelled',
                appointmentId,
                appointmentNumber: currentAppointment?.appointmentNumber || null,
            });
            showNotification('预约已成功取消', 'success');
            loadAppointmentRecords();
        } catch (error) {
            console.error('取消预约失败:', error);
            showNotification(error.message || '取消预约失败，请重试', 'error');
        }
    }, 300);
}

// 显示修改预约模态框
function showModifyAppointmentModal(appointmentId) {
    const appointmentRecords = document.getElementById('appointment-records');
    const appointmentCard = appointmentRecords?.querySelector(
        `[data-appointment-id="${appointmentId}"]`
    )?.closest('.appointment-item');
    const appointmentTimeElement = appointmentCard?.querySelector('.appointment-time time');
    const appointmentDateTime = appointmentTimeElement?.textContent?.trim() || '';
    const [defaultDate = '', defaultTime = ''] = appointmentDateTime.split(' ');

    // 检查是否已存在模态框
    let modal = document.getElementById('modify-appointment-modal');
    if (modal) {
        modal.remove();
    }

    // 创建模态框
    modal = document.createElement('div');
    modal.id = 'modify-appointment-modal';
    modal.className = 'modal show';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>修改预约</h3>
                <button class="close-modal">&times;</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label for="modify-date">日期</label>
                    <input type="date" id="modify-date" value="${defaultDate}" min="${new Date().toISOString().split('T')[0]}">
                </div>
                <div class="form-group">
                    <label for="modify-time">时间</label>
                    <input type="time" id="modify-time" value="${defaultTime}">
                </div>
            </div>
            <div class="modal-footer">
                <button class="feature-button">取消</button>
                <button id="save-modification" class="feature-button" data-appointment-id="${appointmentId}">保存修改</button>
            </div>
        </div>
    `;
    
    // 设置显示样式
    modal.style.display = 'flex';
    modal.style.opacity = '1';
    modal.style.visibility = 'visible';
    
    const modalContent = modal.querySelector('.modal-content');
    if (modalContent) {
        modalContent.style.transform = 'scale(1) translateY(0)';
        modalContent.style.opacity = '1';
    }

    // 添加到页面
    document.body.appendChild(modal);

    // 添加关闭按钮事件
    const closeModalBtn = modal.querySelector('.close-modal');
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            modal.remove();
        });
    }

    // 添加取消按钮事件
    const cancelBtn = modal.querySelector('.feature-button:first-child');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            modal.remove();
        });
    }

    // 添加保存修改按钮事件
    const saveBtn = modal.querySelector('#save-modification');
    if (saveBtn) {
        saveBtn.addEventListener('click', async e => {
            const currentAppointmentId = e.target.dataset.appointmentId;
            const date = document.getElementById('modify-date').value;
            const time = document.getElementById('modify-time').value;

            if (!date || !time) {
                alert('请填写完整的预约信息');
                return;
            }

            try {
                await saveAppointmentModification(currentAppointmentId, date, time);
                modal.remove();
            } catch (error) {
                console.error('修改预约失败:', error);
                showNotification(error.message || '修改预约失败，请重试', 'error');
            }
        });
    }

    // 点击模态框外部关闭
    modal.addEventListener('click', e => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// 保存预约修改
function saveAppointmentModification(appointmentId, date, time) {
    return new Promise((resolve, reject) => {
        setTimeout(async () => {
            const appointmentTime = `${date} ${time}`;

            try {
                if (!window.apiService) {
                    throw new Error('预约服务未初始化');
                }

                const response = await window.apiService.getMyAppointments();
                const appointments = Array.isArray(response?.list)
                    ? response.list
                    : Array.isArray(response?.appointments)
                      ? response.appointments
                      : [];
                const currentAppointment = appointments.find(item => String(item.id) === String(appointmentId));

                const updatedResponse = await window.apiService.rescheduleAppointment(appointmentId, appointmentTime);
                const updatedAppointment = updatedResponse?.appointment || updatedResponse?.data?.appointment || null;
                await createAppointmentMessageCenterNotification({
                    title: '预约已改签',
                    content: `您在 ${currentAppointment?.hospitalName || '目标医院'} ${currentAppointment?.department || ''}${currentAppointment?.doctor ? ` · ${currentAppointment.doctor}` : ''} 的预约已改签到 ${updatedAppointment?.appointmentTime || appointmentTime}。`,
                    type: 'appointment-rescheduled',
                    appointmentId,
                    appointmentNumber: currentAppointment?.appointmentNumber || updatedAppointment?.appointmentNumber || null,
                });
                showNotification('预约已成功修改', 'success');
                loadAppointmentRecords();
                resolve();
            } catch (error) {
                reject(error);
            }
        }, 300);
    });
}

// 保存提醒设置
function saveReminderSetting(appointmentId, reminderTime) {
    setTimeout(async () => {
        const reminderMinutes = Number(reminderTime);

        try {
            if (!window.apiService) {
                throw new Error('预约服务未初始化');
            }

            const response = await window.apiService.getMyAppointments();
            const appointments = Array.isArray(response?.list)
                ? response.list
                : Array.isArray(response?.appointments)
                  ? response.appointments
                  : [];
            const currentAppointment = appointments.find(item => String(item.id) === String(appointmentId));

            await window.apiService.updateAppointmentReminder(appointmentId, reminderMinutes);
            await createAppointmentMessageCenterNotification({
                title: '预约提醒已更新',
                content: currentAppointment
                    ? `您在 ${currentAppointment.hospitalName} ${currentAppointment.department}${currentAppointment.doctor ? ` · ${currentAppointment.doctor}` : ''} 的提醒时间已更新为提前 ${reminderMinutes >= 1440 ? '1天' : reminderMinutes >= 60 ? `${reminderMinutes / 60}小时` : `${reminderMinutes}分钟`}。`
                    : '您的预约提醒时间已更新。',
                type: 'appointment-reminder-updated',
                appointmentId,
                appointmentNumber: currentAppointment?.appointmentNumber || null,
            });
            showNotification('提醒设置已保存', 'success');
            loadAppointmentRecords();
        } catch (error) {
            console.error('保存提醒设置失败:', error);
            showNotification(error.message || '提醒设置保存失败，请重试', 'error');
        }
    }, 300);
}

// 显示通知
function showNotification(message, type = 'info') {
    // 创建通知元素
    const notification = document.createElement('div');
    notification.className = `notification notification--${type}`;
    notification.textContent = message;

    // 添加到页面
    document.body.appendChild(notification);

    // 显示通知
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);

    // 3秒后隐藏通知
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

let currentConsultationId = null;
let currentConsultationHospital = null;
let messagePollingInterval = null;
let isPolling = false;
let lastConsultationMessageAt = null;
const PAGE_SIZE = 10;
let currentPage = 1;
let totalRecords = 0;

function getAuthHeaders() {
    let loginInfo = null;
    try {
        loginInfo = JSON.parse(sessionStorage.getItem('loginInfo') || localStorage.getItem('loginInfo') || '{}');
    } catch (_error) {
        loginInfo = {};
    }

    const token = loginInfo?.token
        || sessionStorage.getItem('authToken')
        || localStorage.getItem('authToken');

    return token
        ? {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        }
        : {
            'Content-Type': 'application/json',
        };
}

function normalizeConsultationApiResponse(data) {
    if (!data || typeof data !== 'object') {
        return data;
    }

    const payload = data.data && typeof data.data === 'object' ? data.data : null;
    if (!payload) {
        return data;
    }

    const normalized = {
        ...data,
        ...payload,
    };

    if (!normalized.consultation && payload.consultation) {
        normalized.consultation = payload.consultation;
    }

    if (!normalized.message && payload.message) {
        normalized.message = payload.message;
    }

    if (!normalized.message && normalized.consultation?.messages?.length) {
        normalized.message = normalized.consultation.messages[normalized.consultation.messages.length - 1];
    }

    if (!normalized.consultations && Array.isArray(payload.list)) {
        normalized.consultations = payload.list;
    }

    if (!normalized.messages && Array.isArray(payload.messages)) {
        normalized.messages = payload.messages;
    }

    return normalized;
}

async function requestConsultationApi(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: {
            ...getAuthHeaders(),
            ...(options.headers || {}),
        },
    });

    let data = null;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
        data = await response.json();
    } else {
        const text = await response.text();
        throw new Error(text || `HTTP ${response.status}`);
    }

    if (!response.ok || data?.success === false) {
        const errorMessage = data?.error?.message || data?.message || `HTTP ${response.status}`;
        const error = new Error(errorMessage);
        error.status = response.status;
        error.code = data?.error?.code || data?.code || `HTTP_${response.status}`;

        if (
            response.status === 401
            && window.AuthGuard
            && typeof window.AuthGuard.handleSessionExpired === 'function'
        ) {
            window.AuthGuard.handleSessionExpired(errorMessage || '登录状态已失效，请重新登录');
        }

        throw error;
    }

    return normalizeConsultationApiResponse(data);
}

function getAppointmentReminderTrackerKey() {
    const currentUserId = getCurrentUserId() || 'anonymous';
    return `appointmentReminderTracker_${currentUserId}`;
}

function getAppointmentReminderTracker() {
    try {
        return JSON.parse(localStorage.getItem(getAppointmentReminderTrackerKey()) || '{}');
    } catch (_error) {
        return {};
    }
}

function saveAppointmentReminderTracker(tracker) {
    localStorage.setItem(getAppointmentReminderTrackerKey(), JSON.stringify(tracker));
}

async function createAppointmentMessageCenterNotification({
    title,
    content,
    type,
    appointmentId = null,
    appointmentNumber = null,
}) {
    if (!window.apiService) {
        return;
    }

    await window.apiService.createUserNotification({
        title,
        content,
        level: 'info',
        type,
        appointmentId,
        appointmentNumber,
    });
    window.dispatchEvent(new CustomEvent('userNotificationUpdated'));
}

async function syncUpcomingAppointmentReminders(appointments = []) {
    if (!Array.isArray(appointments) || appointments.length === 0 || !window.apiService) {
        return;
    }

    const tracker = getAppointmentReminderTracker();
    const now = Date.now();

    for (const appointment of appointments) {
        if (!appointment || !['pending', 'confirmed'].includes(appointment.status)) {
            continue;
        }

        const appointmentTime = new Date(String(appointment.appointmentTime).replace(' ', 'T')).getTime();
        if (!Number.isFinite(appointmentTime) || appointmentTime <= now) {
            continue;
        }

        const minutesUntilAppointment = Math.floor((appointmentTime - now) / 60000);
        const reminderPlans = [
            {
                key: 'before24h',
                thresholdMinutes: 24 * 60,
                title: '预约前一天提醒',
                buildContent: item => `您预约的 ${item.hospitalName} ${item.department}${item.doctor ? ` · ${item.doctor}` : ''} 将于明天开始就诊，请提前安排出行与到院时间。`,
            },
            {
                key: 'before2h',
                thresholdMinutes: 2 * 60,
                title: '预约即将开始',
                buildContent: item => `您预约的 ${item.hospitalName} ${item.department}${item.doctor ? ` · ${item.doctor}` : ''} 将在 2 小时内开始，就诊时间：${item.appointmentTime}。`,
            },
        ];

        for (const reminderPlan of reminderPlans) {
            const trackerKey = `${appointment.id}_${reminderPlan.key}`;
            if (tracker[trackerKey]) {
                continue;
            }

            if (minutesUntilAppointment <= reminderPlan.thresholdMinutes) {
                await createAppointmentMessageCenterNotification({
                    title: reminderPlan.title,
                    content: reminderPlan.buildContent(appointment),
                    type: 'appointment-upcoming',
                    appointmentId: appointment.id,
                    appointmentNumber: appointment.appointmentNumber || null,
                });
                tracker[trackerKey] = Date.now();
            }
        }
    }

    saveAppointmentReminderTracker(tracker);
}

function getCurrentUserId() {
    const loginInfo = JSON.parse(sessionStorage.getItem('loginInfo') || localStorage.getItem('loginInfo') || '{}');
    return loginInfo?.user?.id || loginInfo?.username || null;
}

function getHospitalNameById(hospitalId) {
    return currentHospitals.find(h => String(h.id) === String(hospitalId))?.name || '医院';
}

function renderConsultationChat({ hospitalName, level, messages = [] }) {
    const consultationChat = document.getElementById('consultation-chat');
    if (!consultationChat) {
        return;
    }

    consultationChat.style.display = 'block';
    consultationChat.innerHTML = `
        <div class="chat-header">
            <div class="chat-header-info">
                <h3>在线咨询</h3>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <p class="chat-hospital-name">${escapeHtml(hospitalName)}${level ? ` - ${escapeHtml(level)}` : ''}</p>
                    <span class="hospital-status-badge status-registered" style="padding: 3px 8px; font-size: 11px;">✓ 已注册</span>
                </div>
            </div>
            <button id="close-consultation" class="feature-button">关闭</button>
        </div>
        <div class="ai-chat-container">
            <div class="chat-messages">${messages.map(renderConsultationMessageBubble).join('')}</div>
            <div class="chat-input">
                <textarea id="chat-input" placeholder="请输入您的问题..." rows="1" style="resize: none; overflow: hidden;"></textarea>
                <button id="send-message" class="feature-button">发送</button>
            </div>
        </div>
    `;

    const sendMessageBtn = document.getElementById('send-message');
    if (sendMessageBtn) {
        sendMessageBtn.addEventListener('click', sendMessage);
    }

    const closeConsultationBtn = document.getElementById('close-consultation');
    if (closeConsultationBtn) {
        closeConsultationBtn.addEventListener('click', () => {
            stopMessagePolling();
            consultationChat.style.display = 'none';
            currentConsultationId = null;
            currentConsultationHospital = null;
            lastConsultationMessageAt = null;
        });
    }

    const chatInput = document.getElementById('chat-input');
    if (chatInput) {
        chatInput.addEventListener('input', () => {
            autoResizeInput(chatInput);
        });
        chatInput.addEventListener('keydown', e => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }

    updateAllChatAvatars();
    const chatMessages = consultationChat.querySelector('.chat-messages');
    if (chatMessages) {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}

function renderConsultationMessageBubble(message) {
    const isUser = message.senderRole === 'user' || message.senderType === 'user' || message.type === 'user';
    const className = isUser ? 'user-message' : 'bot-message';
    return `
        <div class="message ${className}" data-message-id="${escapeHtml(message.id || '')}">
            <div class="message-avatar"></div>
            <div class="message-content">
                <p>${escapeHtml(message.content)}</p>
            </div>
        </div>
    `;
}

function appendConsultationMessages(messages, { notify = false } = {}) {
    const chatMessages = document.querySelector('.chat-messages');
    if (!chatMessages || !Array.isArray(messages) || messages.length === 0) {
        return;
    }

    messages.forEach(message => {
        if (message.id && chatMessages.querySelector(`[data-message-id="${message.id}"]`)) {
            return;
        }
        chatMessages.insertAdjacentHTML('beforeend', renderConsultationMessageBubble(message));
        if (notify && message.senderRole === 'hospital') {
            showNotification('收到新的医院回复消息！', 'info');
        }
        if (message.createdAt) {
            lastConsultationMessageAt = message.createdAt;
        }
    });

    updateAllChatAvatars();
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// 开始在线咨询
function startConsultation() {
    const registeredHospitals = currentHospitals.filter(hospital => hospital.isRegistered);
    if (registeredHospitals.length === 0) {
        showNotification('当前附近医院中暂无已注册医院，暂不支持发起在线咨询', 'warning');
        updateConsultationAvailabilitySummary();
        return;
    }

    const consultationChat = document.getElementById('consultation-chat');
    if (!consultationChat) {
        return;
    }

    // 显示医院选择界面
    consultationChat.style.display = 'block';
    consultationChat.innerHTML = `
        <div class="chat-header">
            <h3>选择医院</h3>
            <button id="close-consultation" class="feature-button">关闭</button>
        </div>
        <div class="hospital-selection">
            <div class="selection-header">
                <h4>按地区选择医院</h4>
                <p>用户可手动选择地区，并从该地区已注册的医院中发起咨询</p>
            </div>
            <div class="consultation-region-filters" style="display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 16px;">
                <select id="consultation-province-select" style="min-width: 180px; padding: 10px 12px; border: 1px solid #d9d9d9; border-radius: 10px;">
                    <option value="">全部省份</option>
                </select>
                <select id="consultation-city-select" style="min-width: 180px; padding: 10px 12px; border: 1px solid #d9d9d9; border-radius: 10px;">
                    <option value="">全部城市</option>
                </select>
            </div>
            <div id="hospital-selection-list" class="hospital-selection-list">
                <div class="loading">加载中...</div>
            </div>
        </div>
    `;

    // 加载医院列表
    loadHospitalSelectionList();

    // 添加关闭咨询按钮的点击事件
    const closeConsultationBtn = document.getElementById('close-consultation');
    if (closeConsultationBtn) {
        closeConsultationBtn.addEventListener('click', () => {
            consultationChat.style.display = 'none';
        });
    }
}

// 加载医院选择列表
function loadHospitalSelectionList() {
    const hospitalSelectionList = document.getElementById('hospital-selection-list');
    const provinceSelect = document.getElementById('consultation-province-select');
    const citySelect = document.getElementById('consultation-city-select');
    if (!hospitalSelectionList) {
        return;
    }

    const registeredHospitals = currentHospitals.filter(hospital => hospital.isRegistered);
    const normalizeRegionValue = value => String(value || '').trim();
    const buildRegionText = hospital => {
        const province = normalizeRegionValue(hospital.province);
        const city = normalizeRegionValue(hospital.city);
        return [province, city].filter(Boolean).join(' / ') || '地区信息待完善';
    };

    const provinceOptions = Array.from(
        new Set(
            registeredHospitals
                .map(hospital => normalizeRegionValue(hospital.province))
                .filter(Boolean)
        )
    );

    const renderCityOptions = selectedProvince => {
        if (!citySelect) {
            return;
        }

        const cityOptions = Array.from(
            new Set(
                registeredHospitals
                    .filter(hospital => !selectedProvince || normalizeRegionValue(hospital.province) === selectedProvince)
                    .map(hospital => normalizeRegionValue(hospital.city))
                    .filter(Boolean)
            )
        );

        citySelect.innerHTML = `<option value="">全部城市</option>${cityOptions
            .map(city => `<option value="${city}">${city}</option>`)
            .join('')}`;
    };

    const renderSelectionList = () => {
        const selectedProvince = normalizeRegionValue(provinceSelect?.value);
        const selectedCity = normalizeRegionValue(citySelect?.value);
        const matchedHospitals = registeredHospitals.filter(hospital => {
            const provinceMatched = !selectedProvince || normalizeRegionValue(hospital.province) === selectedProvince;
            const cityMatched = !selectedCity || normalizeRegionValue(hospital.city) === selectedCity;
            return provinceMatched && cityMatched;
        });

        if (matchedHospitals.length === 0) {
            hospitalSelectionList.innerHTML = `
                <div class="no-registered-hospitals">
                    <div style="text-align: center; padding: 40px 20px;">
                        <p style="font-size: 16px; color: #86909c; margin-bottom: 8px;">所选地区暂无已注册医院</p>
                        <p style="font-size: 14px; color: #86909c;">请切换地区，或返回附近已注册医院后再试</p>
                    </div>
                </div>
            `;
            return;
        }

        hospitalSelectionList.innerHTML = matchedHospitals
            .map(
                hospital => `
            <div class="hospital-selection-item" data-hospital-id="${hospital.id}">
                <div class="hospital-selection-info">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; gap: 12px;">
                        <div>
                            <h5>${hospital.name}</h5>
                            <p style="margin: 6px 0 0; font-size: 13px; color: #4e5969;">地区：${buildRegionText(hospital)}</p>
                        </div>
                        <span class="hospital-status-badge status-registered" style="padding: 4px 10px; font-size: 12px;">✓ 已注册</span>
                    </div>
                    <p class="hospital-selection-address">${hospital.address}</p>
                    <div class="hospital-selection-meta">
                        <span class="distance">${formatHospitalDistance(hospital.distance)}公里</span>
                        <span class="rating">⭐ ${hospital.rating}</span>
                        <span class="level">${hospital.level}</span>
                    </div>
                    <div class="hospital-selection-departments">
                        ${getHospitalDepartments(hospital).map(dept => `<span class="department-tag">${dept}</span>`).join('')}
                    </div>
                </div>
                <div class="hospital-selection-action">
                    <button class="feature-button select-hospital" data-hospital-id="${hospital.id}">选择</button>
                </div>
            </div>
        `
            )
            .join('');

        const selectHospitalBtns = document.querySelectorAll('.select-hospital');
        selectHospitalBtns.forEach(btn => {
            btn.addEventListener('click', e => {
                const hospitalId = e.target.dataset.hospitalId;
                const hospital = matchedHospitals.find(h => String(h.id) === String(hospitalId));
                if (hospital) {
                    startConsultationWithHospital(hospital);
                }
            });
        });

        const hospitalItems = document.querySelectorAll('.hospital-selection-item');
        hospitalItems.forEach(item => {
            item.addEventListener('click', e => {
                if (!e.target.closest('.select-hospital')) {
                    const hospitalId = item.dataset.hospitalId;
                    const hospital = matchedHospitals.find(h => String(h.id) === String(hospitalId));
                    if (hospital) {
                        startConsultationWithHospital(hospital);
                    }
                }
            });
        });
    };

    setTimeout(() => {
        if (registeredHospitals.length === 0) {
            hospitalSelectionList.innerHTML = `
                <div class="no-registered-hospitals">
                    <div style="text-align: center; padding: 40px 20px;">
                        <p style="font-size: 16px; color: #86909c; margin-bottom: 8px;">暂无已注册的医院</p>
                        <p style="font-size: 14px; color: #86909c;">请稍后再试或选择其他服务</p>
                    </div>
                </div>
            `;
            return;
        }

        if (provinceSelect) {
            provinceSelect.innerHTML = `<option value="">全部省份</option>${provinceOptions
                .map(province => `<option value="${province}">${province}</option>`)
                .join('')}`;
            provinceSelect.addEventListener('change', () => {
                renderCityOptions(normalizeRegionValue(provinceSelect.value));
                if (citySelect) {
                    citySelect.value = '';
                }
                renderSelectionList();
            });
        }

        if (citySelect) {
            citySelect.addEventListener('change', renderSelectionList);
        }

        renderCityOptions('');
        renderSelectionList();
    }, 500);
}

// 验证医院注册状态
function validateHospitalRegistration(hospitalId) {
    // 从最新的医院数据中查找，确保数据实时性
    const hospital = currentHospitals.find(h => String(h.id) === String(hospitalId));
    
    if (!hospital) {
        return {
            isValid: false,
            message: '医院信息不存在'
        };
    }
    
    if (!hospital.isRegistered) {
        return {
            isValid: false,
            message: '该医院暂未开通在线咨询服务，请选择其他已注册医院'
        };
    }
    
    return {
        isValid: true,
        hospital: hospital
    };
}

// 选择医院后开始咨询
async function startConsultationWithHospital(hospital) {
    const validation = validateHospitalRegistration(hospital.id);

    if (!validation.isValid) {
        showNotification(validation.message, 'warning');
        return;
    }

    const validHospital = validation.hospital;
    const consultationChat = document.getElementById('consultation-chat');
    if (!consultationChat) {
        return;
    }

    const availableDepartments = getHospitalDepartments(validHospital);
    const defaultDepartment = availableDepartments[0] || '在线咨询';
    const consultationDraftKey = `consultation_draft_${validHospital.id}`;
    const getDefaultSubject = () => `${defaultDepartment}问诊`;
    const readConsultationDraft = () => {
        try {
            const rawDraft = localStorage.getItem(consultationDraftKey);
            if (!rawDraft) {
                return null;
            }
            const parsedDraft = JSON.parse(rawDraft);
            if (!parsedDraft || typeof parsedDraft !== 'object') {
                return null;
            }
            return {
                subject: String(parsedDraft.subject || '').trim(),
                message: String(parsedDraft.message || ''),
            };
        } catch (error) {
            console.error('读取咨询草稿失败:', error);
            return null;
        }
    };
    const saveConsultationDraft = (subject, message) => {
        try {
            localStorage.setItem(consultationDraftKey, JSON.stringify({
                subject: String(subject || ''),
                message: String(message || ''),
                updatedAt: Date.now(),
            }));
        } catch (error) {
            console.error('保存咨询草稿失败:', error);
        }
    };
    const clearConsultationDraft = () => {
        try {
            localStorage.removeItem(consultationDraftKey);
        } catch (error) {
            console.error('清理咨询草稿失败:', error);
        }
    };

    const renderComposer = () => {
        const quickSubjects = [
            `${defaultDepartment}问诊`,
            '复诊咨询',
            '检查结果解读',
            '用药咨询',
            '就诊建议',
        ];
        const draft = readConsultationDraft();
        const subjectValue = draft?.subject || getDefaultSubject();
        const messageValue = draft?.message || '我想咨询一下当前的症状与就诊建议。';

        consultationChat.style.display = 'block';
        consultationChat.innerHTML = `
            <div class="chat-header">
                <div class="chat-header-info">
                    <h3>填写咨询内容</h3>
                    <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                        <p class="chat-hospital-name">${escapeHtml(validHospital.name)} - ${escapeHtml(validHospital.level)}</p>
                        <span class="hospital-status-badge status-registered" style="padding: 3px 8px; font-size: 11px;">✓ 已注册</span>
                    </div>
                </div>
                <div class="consultation-entry-actions">
                    <button id="back-to-hospital-selection" class="feature-button">返回选择</button>
                    <button id="close-consultation" class="feature-button">关闭</button>
                </div>
            </div>
            <div class="consultation-entry-card">
                <div class="consultation-entry-card__header">
                    <div>
                        <h4>向医院发起首次咨询</h4>
                        <p>先填写咨询主题和问题描述，提交后将直接进入聊天窗口。</p>
                    </div>
                    <div class="consultation-entry-card__badge">${escapeHtml(defaultDepartment)}</div>
                </div>
                <div class="consultation-entry-form">
                    <label class="consultation-entry-field">
                        <span>咨询主题</span>
                        <input id="consultation-subject-input" type="text" maxlength="60" value="${escapeHtml(subjectValue)}" placeholder="例如：呼吸科问诊" />
                    </label>
                    <div class="consultation-entry-quick-subjects">
                        <span class="consultation-entry-quick-subjects__label">快捷主题</span>
                        <div class="consultation-entry-quick-subjects__list">
                            ${quickSubjects.map(subject => `<button type="button" class="consultation-subject-chip" data-subject="${escapeHtml(subject)}">${escapeHtml(subject)}</button>`).join('')}
                        </div>
                    </div>
                    <label class="consultation-entry-field">
                        <span>问题描述</span>
                        <textarea id="consultation-initial-message-input" rows="5" maxlength="500" placeholder="请简要描述症状、持续时间、是否已检查或用药等信息">${escapeHtml(messageValue)}</textarea>
                    </label>
                    <div class="consultation-entry-meta">
                        <div class="consultation-entry-tips">
                            <span>建议说明症状表现、持续时间、是否已用药。</span>
                            <span>最多 500 字。</span>
                        </div>
                        <div id="consultation-message-counter" class="consultation-message-counter">0 / 500</div>
                    </div>
                    <div class="consultation-entry-submit">
                        <span id="consultation-draft-status" class="consultation-draft-status">已自动保存草稿</span>
                        <button id="submit-consultation-entry" class="feature-button">进入聊天</button>
                    </div>
                </div>
            </div>
        `;

        const closeConsultationBtn = document.getElementById('close-consultation');
        if (closeConsultationBtn) {
            closeConsultationBtn.addEventListener('click', () => {
                consultationChat.style.display = 'none';
            });
        }

        const backButton = document.getElementById('back-to-hospital-selection');
        if (backButton) {
            backButton.addEventListener('click', startConsultation);
        }

        const submitButton = document.getElementById('submit-consultation-entry');
        const subjectInput = document.getElementById('consultation-subject-input');
        const initialMessageInput = document.getElementById('consultation-initial-message-input');
        const messageCounter = document.getElementById('consultation-message-counter');
        const draftStatus = document.getElementById('consultation-draft-status');
        const subjectChips = Array.from(document.querySelectorAll('.consultation-subject-chip'));
        let isSubmitting = false;
        let draftStatusTimer = null;

        const setDraftStatus = (text, type = '') => {
            if (!draftStatus) {
                return;
            }
            draftStatus.textContent = text;
            draftStatus.classList.toggle('is-active', type === 'active');
            draftStatus.classList.toggle('is-submitting', type === 'submitting');
        };

        const persistDraft = () => {
            saveConsultationDraft(subjectInput?.value, initialMessageInput?.value);
            setDraftStatus('已自动保存草稿', 'active');
            if (draftStatusTimer) {
                clearTimeout(draftStatusTimer);
            }
            draftStatusTimer = setTimeout(() => {
                setDraftStatus('草稿将保留在当前医院', '');
            }, 1800);
        };

        const updateSubmitState = () => {
            const messageLength = initialMessageInput?.value?.trim().length || 0;
            if (messageCounter) {
                messageCounter.textContent = `${messageLength} / 500`;
                messageCounter.classList.toggle('is-warning', messageLength >= 450);
            }
            if (submitButton) {
                submitButton.disabled = messageLength === 0 || isSubmitting;
                submitButton.textContent = isSubmitting ? '正在进入聊天...' : '进入聊天';
            }
        };

        subjectChips.forEach(chip => {
            chip.addEventListener('click', () => {
                const nextSubject = chip.dataset.subject || '';
                if (subjectInput) {
                    subjectInput.value = nextSubject;
                    subjectInput.focus();
                    subjectInput.setSelectionRange(subjectInput.value.length, subjectInput.value.length);
                }
                subjectChips.forEach(item => item.classList.toggle('is-active', item === chip));
                persistDraft();
            });
        });

        initialMessageInput?.addEventListener('input', () => {
            updateSubmitState();
            persistDraft();
        });
        subjectInput?.addEventListener('input', () => {
            const normalizedSubject = subjectInput.value.trim();
            subjectChips.forEach(chip => {
                chip.classList.toggle('is-active', (chip.dataset.subject || '') === normalizedSubject);
            });
            persistDraft();
        });

        updateSubmitState();
        setDraftStatus(draft ? '已恢复上次草稿' : '草稿将保留在当前医院', draft ? 'active' : '');
        subjectChips.forEach(chip => {
            chip.classList.toggle('is-active', (chip.dataset.subject || '') === (subjectInput?.value?.trim() || ''));
        });

        initialMessageInput?.focus();
        initialMessageInput?.setSelectionRange(initialMessageInput.value.length, initialMessageInput.value.length);

        submitButton?.addEventListener('click', async () => {
            const subject = subjectInput?.value?.trim() || `${defaultDepartment}问诊`;
            const initialMessage = initialMessageInput?.value?.trim();

            if (!initialMessage || isSubmitting) {
                if (!initialMessage) {
                    showNotification('请先填写问题描述', 'warning');
                    initialMessageInput?.focus();
                    updateSubmitState();
                }
                return;
            }

            isSubmitting = true;
            setDraftStatus('正在创建咨询会话...', 'submitting');
            updateSubmitState();

            consultationChat.innerHTML = `
                <div class="chat-header">
                    <div class="chat-header-info">
                        <h3>在线咨询</h3>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <p class="chat-hospital-name">${escapeHtml(validHospital.name)} - ${escapeHtml(validHospital.level)}</p>
                            <span class="hospital-status-badge status-registered" style="padding: 3px 8px; font-size: 11px;">✓ 已注册</span>
                        </div>
                    </div>
                    <button id="close-consultation" class="feature-button">关闭</button>
                </div>
                <div class="ai-chat-container">
                    <div class="chat-messages">
                        <div class="loading" style="text-align: center; padding: 40px;">正在连接咨询服务...</div>
                    </div>
                </div>
            `;

            try {
                const response = await requestConsultationApi('/api/consultations', {
                    method: 'POST',
                    body: JSON.stringify({
                        hospitalId: validHospital.id,
                        department: defaultDepartment,
                        subject,
                        content: initialMessage,
                        type: 'text',
                    }),
                });

                currentConsultationId = response.consultation.id;
                currentConsultationHospital = validHospital;
                lastConsultationMessageAt = response.message?.createdAt || response.timestamp || null;
                clearConsultationDraft();

                renderConsultationChat({
                    hospitalName: validHospital.name,
                    level: validHospital.level,
                    messages: response.message ? [response.message] : [],
                });
                startMessagePolling();
                showNotification('咨询已创建，您可以继续发送消息', 'success');
            } catch (error) {
                console.error('创建咨询会话失败:', error);
                isSubmitting = false;
                showNotification(error.message || '创建咨询会话失败，请稍后重试', 'error');
                renderComposer();
            }
        });
    };

    renderComposer();
}

async function sendMessage() {
    const chatInput = document.getElementById('chat-input');
    const message = chatInput?.value?.trim();

    if (!chatInput || !message || !currentConsultationId) {
        return;
    }

    try {
        const response = await requestConsultationApi(`/api/consultations/${currentConsultationId}/messages`, {
            method: 'POST',
            body: JSON.stringify({
                content: message,
                type: 'text',
            }),
        });

        appendConsultationMessages([response.message]);
        chatInput.value = '';
        autoResizeInput(chatInput);
    } catch (error) {
        console.error('发送消息失败:', error);
        showNotification(error.message || '发送消息失败，请重试', 'error');
    }
}

function startMessagePolling() {
    if (isPolling || !currentConsultationId) {
        return;
    }

    isPolling = true;
    pollMessages();
}

function stopMessagePolling() {
    isPolling = false;
    if (messagePollingInterval) {
        clearTimeout(messagePollingInterval);
        messagePollingInterval = null;
    }
}

async function pollMessages() {
    if (!isPolling || !currentConsultationId) {
        return;
    }

    try {
        const query = new URLSearchParams({ consultationId: currentConsultationId });
        if (lastConsultationMessageAt) {
            query.set('since', lastConsultationMessageAt);
        }
        const response = await requestConsultationApi(`/api/messages/poll?${query.toString()}`);
        const newMessages = (response.messages || []).filter(message => message.senderRole === 'hospital');
        appendConsultationMessages(newMessages, { notify: newMessages.length > 0 });
        if (isPolling) {
            messagePollingInterval = setTimeout(pollMessages, 2000);
        }
    } catch (error) {
        console.error('消息轮询错误:', error);
        if (isPolling) {
            messagePollingInterval = setTimeout(pollMessages, 3000);
        }
    }
}

function handleNewMessages(messages) {
    appendConsultationMessages(messages, { notify: true });
}

function getConsultationOwnerIdentifiers(record = {}) {
    return [
        record.userId,
        record.user_id,
        record.createdBy,
        record.created_by,
        record.patientId,
        record.patient_id,
        record.username,
        record.userName,
    ]
        .map(value => String(value || '').trim())
        .filter(Boolean);
}

function getLoginUserIdentifiers() {
    try {
        const loginInfo = JSON.parse(sessionStorage.getItem('loginInfo') || localStorage.getItem('loginInfo') || '{}');
        return [
            loginInfo?.user?.id,
            loginInfo?.user?.userId,
            loginInfo?.user?.username,
            loginInfo?.user?.account,
            loginInfo?.userId,
            loginInfo?.username,
            loginInfo?.account,
        ]
            .map(value => String(value || '').trim())
            .filter(Boolean);
    } catch (_error) {
        return [];
    }
}

function isCurrentUserConsultation(record = {}, currentUserIdentifiers = []) {
    const recordOwnerIdentifiers = getConsultationOwnerIdentifiers(record);
    if (recordOwnerIdentifiers.length === 0 || currentUserIdentifiers.length === 0) {
        return true;
    }

    return recordOwnerIdentifiers.some(identifier => currentUserIdentifiers.includes(identifier));
}

function getConsultationSortTimestamp(record = {}) {
    return (
        record.lastMessageAt
        || record.updatedAt
        || record.createdAt
        || record.startTime
        || record.timestamp
        || 0
    );
}

function getConsultationStatusLabel(status) {
    const normalizedStatus = String(status || '').trim().toLowerCase();

    switch (normalizedStatus) {
        case 'completed':
        case 'done':
        case 'finished':
        case '已完成':
            return '已完成';
        case 'closed':
        case 'cancelled':
        case 'canceled':
        case 'terminated':
        case '已关闭':
        case '已取消':
            return '已关闭';
        case 'connecting':
        case 'consulting':
        case 'active':
        case 'ongoing':
        case 'pending':
        case 'in_progress':
        case '进行中':
            return '进行中';
        default:
            return '进行中';
    }
}

async function getUserConsultationHistory(page = 1, pageSize = PAGE_SIZE) {
    const response = await requestConsultationApi('/api/consultations');
    const currentUserIdentifiers = getLoginUserIdentifiers();
    const consultationList = Array.isArray(response.consultations)
        ? response.consultations
        : [];
    const history = consultationList
        .filter(record => isCurrentUserConsultation(record, currentUserIdentifiers))
        .sort((a, b) => new Date(getConsultationSortTimestamp(b)) - new Date(getConsultationSortTimestamp(a)));

    totalRecords = history.length;
    const startIndex = (page - 1) * pageSize;
    const records = history.slice(startIndex, startIndex + pageSize);

    return {
        records,
        total: totalRecords,
        currentPage: page,
        totalPages: Math.ceil(totalRecords / pageSize),
        pageSize,
    };
}

function initConsultationHistory() {
    if (!Number.isFinite(currentPage) || currentPage < 1) {
        currentPage = 1;
    }

    if (!Number.isFinite(totalRecords) || totalRecords < 0) {
        totalRecords = 0;
    }
}

// 显示咨询历史模态框
function viewConsultationHistory() {
    // 初始化数据（如果需要）
    initConsultationHistory();
    
    // 重置当前页
    currentPage = 1;
    
    // 检查是否已存在模态框
    let modal = document.getElementById('consultation-history-modal');
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('show');
        modal.style.opacity = '1';
        modal.style.visibility = 'visible';
        loadConsultationHistoryPage(1);
        return;
    }
    
    // 创建模态框
    modal = document.createElement('div');
    modal.id = 'consultation-history-modal';
    modal.className = 'modal show';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 900px; max-height: 80vh;">
            <div class="modal-header">
                <h3>咨询历史</h3>
                <button class="close-modal">&times;</button>
            </div>
            <div class="modal-body" style="padding: 0; overflow: hidden;">
                <div id="consultation-history-list" class="consultation-history-list" style="max-height: 60vh; overflow-y: auto; padding: 20px;"></div>
                <div id="consultation-history-pagination" class="consultation-history-pagination" style="padding: 16px 20px; border-top: 1px solid #f2f3f5; display: flex; justify-content: center; align-items: center; gap: 12px;"></div>
            </div>
        </div>
    `;
    
    // 设置显示样式
    modal.style.display = 'flex';
    modal.style.opacity = '1';
    modal.style.visibility = 'visible';
    
    const modalContent = modal.querySelector('.modal-content');
    if (modalContent) {
        modalContent.style.transform = 'scale(1) translateY(0)';
        modalContent.style.opacity = '1';
    }
    
    document.body.appendChild(modal);
    
    // 添加关闭按钮事件
    const closeModalBtn = modal.querySelector('.close-modal');
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            modal.remove();
        });
    }
    
    // 点击模态框外部关闭
    modal.addEventListener('click', e => {
        if (e.target === modal) {
            modal.remove();
        }
    });
    
    // 加载第一页数据
    loadConsultationHistoryPage(1);
}

// 加载指定页的咨询历史
async function loadConsultationHistoryPage(page) {
    currentPage = page;

    const historyList = document.getElementById('consultation-history-list');
    const pagination = document.getElementById('consultation-history-pagination');

    if (!historyList || !pagination) return;

    historyList.innerHTML = '<div class="loading" style="text-align: center; padding: 40px;">加载中...</div>';

    try {
        const result = await getUserConsultationHistory(page, PAGE_SIZE);

        if (result.total === 0) {
            historyList.innerHTML = `
                <div class="consultation-history-empty" style="text-align: center; padding: 60px 20px;">
                    <div style="font-size: 48px; margin-bottom: 16px;">📋</div>
                    <h4 style="margin: 0 0 8px 0; font-size: 18px; color: #1d2129;">暂无咨询历史</h4>
                    <p style="margin: 0; font-size: 14px; color: #86909c;">您还没有进行过在线咨询，快去试试吧！</p>
                </div>
            `;
            pagination.innerHTML = '';
            return;
        }

        historyList.innerHTML = result.records.map(record => {
            const displayTime = formatConsultationTime(getConsultationSortTimestamp(record));
            const statusLabel = getConsultationStatusLabel(record.status);

            return `
            <div class="consultation-history-item" style="background: #f7f8fa; border-radius: 12px; padding: 20px; margin-bottom: 16px;">
                <div class="consultation-history-header" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                    <div>
                        <h4 style="margin: 0 0 4px 0; font-size: 16px; font-weight: 600; color: #1d2129;">${escapeHtml(getHospitalNameById(record.hospitalId))}</h4>
                        <p style="margin: 0; font-size: 13px; color: #86909c;">${escapeHtml(record.department || '在线咨询')} · ${displayTime}</p>
                    </div>
                    <span class="consultation-status-badge" style="padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 500; ${getStatusBadgeStyle(statusLabel)}">
                        ${statusLabel}
                    </span>
                </div>
                <div class="consultation-history-content" style="background: white; border-radius: 8px; padding: 16px;">
                    <div class="consultation-question" style="margin-bottom: 12px;">
                        <p style="margin: 0 0 4px 0; font-size: 13px; font-weight: 600; color: #4e5969;">咨询主题：</p>
                        <p style="margin: 0; font-size: 14px; color: #1d2129;">${escapeHtml(record.subject || '未填写主题')}</p>
                    </div>
                </div>
                <div class="consultation-history-actions" style="margin-top: 12px; display: flex; gap: 8px;">
                    <button class="feature-button view-detail-btn" data-record-id="${record.id}" style="padding: 6px 16px; font-size: 13px;">查看详情</button>
                    <button class="feature-button consult-again-btn" data-hospital-id="${record.hospitalId}" style="padding: 6px 16px; font-size: 13px; background: var(--btn-primary);">再次咨询</button>
                </div>
            </div>
        `;
        }).join('');

        renderPagination(result);
        setupHistoryItemEvents();
    } catch (error) {
        console.error('加载咨询历史失败:', error);
        historyList.innerHTML = '<div style="text-align:center;padding:40px;color:#f53f3f;">加载咨询历史失败</div>';
        pagination.innerHTML = '';
    }
}

// 获取状态标签样式
function getStatusBadgeStyle(status) {
    switch (status) {
        case '已完成':
            return 'background: var(--btn-success-light); color: #1d7d4c;';
        case '进行中':
            return 'background: var(--btn-primary-light); color: var(--btn-primary);';
        case '已关闭':
            return 'background: #f5f7fa; color: #86909c;';
        default:
            return 'background: #f5f7fa; color: #86909c;';
    }
}

// 格式化咨询时间
function formatConsultationTime(isoString) {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
        return `今天 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    } else if (diffDays === 1) {
        return `昨天 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    } else if (diffDays < 7) {
        return `${diffDays}天前 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    } else {
        return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    }
}

// 渲染分页
function renderPagination(result) {
    const pagination = document.getElementById('consultation-history-pagination');
    if (!pagination) return;
    
    if (result.totalPages <= 1) {
        pagination.innerHTML = `<span style="font-size: 14px; color: #86909c;">共 ${result.total} 条记录</span>`;
        return;
    }
    
    let paginationHTML = `
        <span style="font-size: 14px; color: #86909c;">共 ${result.total} 条记录</span>
        <button class="feature-button pagination-btn" data-page="prev" ${result.currentPage === 1 ? 'disabled' : ''} style="padding: 6px 12px; font-size: 13px;">上一页</button>
    `;
    
    // 生成页码按钮
    const maxVisiblePages = 5;
    let startPage = Math.max(1, result.currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(result.totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    if (startPage > 1) {
        paginationHTML += `<button class="feature-button pagination-btn" data-page="1" style="padding: 6px 12px; font-size: 13px;">1</button>`;
        if (startPage > 2) {
            paginationHTML += `<span style="padding: 0 4px;">...</span>`;
        }
    }
    
    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `<button class="feature-button pagination-btn ${i === result.currentPage ? 'active' : ''}" data-page="${i}" style="padding: 6px 12px; font-size: 13px; ${i === result.currentPage ? 'background: var(--btn-primary); color: white;' : ''}">${i}</button>`;
    }
    
    if (endPage < result.totalPages) {
        if (endPage < result.totalPages - 1) {
            paginationHTML += `<span style="padding: 0 4px;">...</span>`;
        }
        paginationHTML += `<button class="feature-button pagination-btn" data-page="${result.totalPages}" style="padding: 6px 12px; font-size: 13px;">${result.totalPages}</button>`;
    }
    
    paginationHTML += `
        <button class="feature-button pagination-btn" data-page="next" ${result.currentPage === result.totalPages ? 'disabled' : ''} style="padding: 6px 12px; font-size: 13px;">下一页</button>
    `;
    
    pagination.innerHTML = paginationHTML;
    
    // 添加分页按钮事件
    const paginationBtns = pagination.querySelectorAll('.pagination-btn');
    paginationBtns.forEach(btn => {
        btn.addEventListener('click', e => {
            const page = e.target.dataset.page;
            if (page === 'prev') {
                loadConsultationHistoryPage(result.currentPage - 1);
            } else if (page === 'next') {
                loadConsultationHistoryPage(result.currentPage + 1);
            } else {
                loadConsultationHistoryPage(parseInt(page));
            }
        });
    });
}

// 设置历史记录项事件
function setupHistoryItemEvents() {
    const viewDetailBtns = document.querySelectorAll('.view-detail-btn');
    viewDetailBtns.forEach(btn => {
        btn.addEventListener('click', e => {
            const recordId = e.target.dataset.recordId;
            showConsultationDetail(recordId);
        });
    });

    const consultAgainBtns = document.querySelectorAll('.consult-again-btn');
    consultAgainBtns.forEach(btn => {
        btn.addEventListener('click', e => {
            const hospitalId = e.target.dataset.hospitalId;
            const hospital = currentHospitals.find(h => String(h.id) === String(hospitalId));
            if (hospital) {
                const modal = document.getElementById('consultation-history-modal');
                if (modal) modal.style.display = 'none';
                startConsultationWithHospital(hospital);
            }
        });
    });
}

async function showConsultationDetail(recordId) {
    try {
        const response = await requestConsultationApi(`/api/consultations/${recordId}`);
        const record = response.consultation;
        const messages = response.messages || [];

        let modal = document.getElementById('consultation-detail-modal');
        if (modal) {
            modal.remove();
        }

        modal = document.createElement('div');
        modal.id = 'consultation-detail-modal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 700px; max-height: 80vh;">
                <div class="modal-header">
                    <h3>咨询详情</h3>
                    <button class="close-modal">&times;</button>
                </div>
                <div class="modal-body" style="overflow-y: auto; max-height: 60vh;">
                    <div style="background: #f7f8fa; border-radius: 12px; padding: 20px; margin-bottom: 16px;">
                        <h4 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #1d2129;">${escapeHtml(getHospitalNameById(record.hospitalId))}</h4>
                        <p style="margin: 0 0 4px 0; font-size: 14px; color: #4e5969;">科室：${escapeHtml(record.department || '在线咨询')}</p>
                        <p style="margin: 0 0 4px 0; font-size: 14px; color: #4e5969;">主题：${escapeHtml(record.subject || '未填写主题')}</p>
                        <p style="margin: 0; font-size: 14px; color: #4e5969;">最后更新时间：${new Date(record.lastMessageAt).toLocaleString('zh-CN')}</p>
                    </div>

                    <div style="background: white; border-radius: 12px; padding: 20px;">
                        <h4 style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #1d2129;">对话记录</h4>
                        <div style="display: flex; flex-direction: column; gap: 16px;">
                            ${messages.map(msg => `
                                <div style="display: flex; gap: 12px; justify-content: ${msg.senderRole === 'user' ? 'flex-end' : 'flex-start'}; align-items: flex-start;">
                                    <div style="width: 40px; height: 40px; border-radius: 12px; background: ${msg.senderRole === 'user' ? '#d8d8d8' : '#ffffff'}; border: ${msg.senderRole === 'user' ? '1px solid rgba(255,255,255,0.9)' : '1px solid #e6e6e6'}; display: flex; align-items: center; justify-content: center; color: #1f2937; font-size: 16px; flex-shrink: 0; box-shadow: 0 6px 18px rgba(15, 23, 42, 0.08); order: ${msg.senderRole === 'user' ? '2' : '1'};">
                                        ${msg.senderRole === 'user' ? '👤' : '🏥'}
                                    </div>
                                    <div style="max-width: 70%; display: flex; flex-direction: column; align-items: ${msg.senderRole === 'user' ? 'flex-end' : 'flex-start'}; order: ${msg.senderRole === 'user' ? '1' : '2'};">
                                        <div style="background: ${msg.senderRole === 'user' ? '#95ec69' : '#ffffff'}; padding: 12px 14px; border-radius: 16px; border-top-${msg.senderRole === 'user' ? 'right' : 'left'}-radius: 6px; border: ${msg.senderRole === 'user' ? 'none' : '1px solid #e6e6e6'}; box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08); position: relative;">
                                            <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #1d2129;">${escapeHtml(msg.content)}</p>
                                        </div>
                                        <p style="margin: 8px 2px 0 2px; font-size: 11px; font-weight: 500; color: rgba(0, 0, 0, 0.45); text-align: ${msg.senderRole === 'user' ? 'right' : 'left'};">
                                            ${new Date(msg.createdAt).toLocaleTimeString('zh-CN')}
                                        </p>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="feature-button" id="close-detail-modal">关闭</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const closeModalBtn = modal.querySelector('.close-modal');
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', () => {
                modal.remove();
            });
        }

        const closeDetailBtn = document.getElementById('close-detail-modal');
        if (closeDetailBtn) {
            closeDetailBtn.addEventListener('click', () => {
                modal.remove();
            });
        }

        modal.addEventListener('click', e => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    } catch (error) {
        console.error('读取咨询详情失败:', error);
        showNotification(error.message || '读取咨询详情失败', 'error');
    }
}

// 初始化AI服务功能
function initAIServices() {
    console.log('AI服务功能模块已初始化');
    // 生成AI服务页面内容
    generateAIPageContent();

    // 为AI服务页面添加事件监听器
    setupAIPageEvents();

    // 恢复静愈馆聊天界面与历史
    restoreMentalHealthChatOnPageLoad();

    // 检查功能访问状态并更新UI
    updateAIFeatureAccess();
}

// 生成AI服务页面内容
function generateAIPageContent() {
    const aiPage = document.getElementById('ai-page');
    if (!aiPage) {
        return;
    }

    // 清空现有内容
    aiPage.innerHTML = '';

    // 创建AI服务功能模块的容器
    const aiContainer = document.createElement('div');
    aiContainer.className = 'ai-container';

    // 添加AI健康助手部分
    const aiHealthAssistantSection = document.createElement('div');
    aiHealthAssistantSection.className = 'status-card';
    aiHealthAssistantSection.innerHTML = `
        <h2>AI健康助手</h2>
        <div class="ai-assistant-container">
            <!-- 健康咨询区域 -->
            <div class="health-consultation-section">
                <div class="section-header">
                    <div class="section-icon">💬</div>
                    <h3>健康咨询</h3>
                </div>
                <div class="consultation-input-area">
                    <textarea id="health-consultation-input" placeholder="请描述您的健康问题或症状..." rows="3"></textarea>
                    <div id="health-consultation-hint" class="consultation-hint" style="display: none;">
                        <span class="hint-icon">⚠️</span>
                        <span class="hint-text"></span>
                    </div>
                    <div class="input-guidance" style="margin-top: 8px; padding: 10px; background-color: #f0f9ff; border-radius: 8px; border-left: 4px solid #3b82f6;">
                        <p style="margin: 0; font-size: 13px; color: #1e40af; font-weight: 500;">💡 输入提示：</p>
                        <ul style="margin: 6px 0 0 0; padding-left: 20px; font-size: 12px; color: #374151;">
                            <li>症状描述（如：头痛、咳嗽、发烧等）</li>
                            <li>疾病咨询（如：高血压、糖尿病、感冒等）</li>
                            <li>用药指导（如：药物用法、剂量、副作用等）</li>
                            <li>健康建议（如：饮食、运动、养生等）</li>
                        </ul>
                    </div>
                    <div class="consultation-actions">
                        <button id="start-health-consultation" class="feature-button">开始咨询</button>
                        <button id="get-medication-guide" class="feature-button" style="display: none;">获取用药指导</button>
                        <button id="view-consultation-history" class="feature-button">咨询历史</button>
                    </div>
                </div>
                <!-- 健康咨询结果区域 -->
                <div id="health-consultation-result" class="health-consultation-result" style="display: none;">
                    <div class="result-header">
                        <div class="result-icon">📋</div>
                        <h4>咨询结果</h4>
                        <button id="clear-consultation-result" class="feature-button">清空</button>
                    </div>
                    <div class="result-content"></div>
                </div>
            </div>
            
            <!-- 分隔线 -->
            <div class="section-divider"></div>
            
            <!-- 健康报告区域 -->
            <div class="health-report-section">
                <div class="section-header">
                    <div class="section-icon">📊</div>
                    <h3>健康报告</h3>
                </div>
                <p>分析健康数据，生成详细报告</p>
                <button id="generate-health-report" class="feature-button">生成报告</button>
                <!-- 健康报告显示区域 -->
                <div id="health-report-result" class="health-report-result" style="display: none;">
                    <div class="report-header">
                        <h4>健康数据报告</h4>
                        <button id="clear-health-report" class="feature-button">清空</button>
                    </div>
                    <div class="report-content"></div>
                </div>
            </div>
        </div>
    `;

    // 添加静愈馆AI聊天界面
    const aiChatSection = document.createElement('div');
    aiChatSection.className = 'status-card';
    aiChatSection.innerHTML = `
        <div class="card-header">
            <h2>静愈馆</h2>
        </div>
        <div class="mental-health-toolbar">
            <div class="mental-health-toolbar__hint">点击建议问题可快速开始，也可直接输入感受</div>
            <button id="ai-chat-clear-history" class="feature-button" type="button">清空展示</button>
        </div>
        <div id="ai-chat-container" class="ai-chat-container">
            <div class="chat-messages" id="ai-chat-messages">
                <div class="message bot-message message--welcome">
                    <div class="message-avatar"></div>
                    <div class="message-content">
                        <p>您好！我是您的静愈馆AI助手，专注于心理健康和情绪疏导。无论您是面临压力、焦虑还是情绪困扰，我都在这里倾听和支持您。</p>
                        <div class="mental-health-quick-actions">
                            <button type="button" class="mental-health-quick-action" data-chat-prompt="我最近压力很大，总是放松不下来">压力很大</button>
                            <button type="button" class="mental-health-quick-action" data-chat-prompt="我最近总是焦虑，晚上也睡不好">最近焦虑</button>
                            <button type="button" class="mental-health-quick-action" data-chat-prompt="我情绪有点低落，提不起精神">情绪低落</button>
                            <button type="button" class="mental-health-quick-action" data-chat-prompt="我想聊聊最近的人际关系困扰">人际困扰</button>
                        </div>
                    </div>
                </div>
            </div>
            <div class="chat-input">
                <textarea id="ai-chat-input" placeholder="请分享您的感受或问题，Enter 发送，Shift+Enter 换行..." rows="1" style="resize: none; overflow: hidden;"></textarea>
                <button id="ai-send-message" class="feature-button">发送</button>
            </div>
        </div>
        <div id="ai-chat-placeholder" class="ai-chat-placeholder" style="display: none;">
            <p>在这里与静愈馆AI助手交流，获得心理支持和情绪疏导</p>
            <p>请直接输入您的问题或感受，AI将根据您的输入提供相关回应</p>
        </div>
    `;

    // 将所有部分添加到容器中
    aiContainer.appendChild(aiHealthAssistantSection);
    aiContainer.appendChild(aiChatSection);

    // 将容器添加到页面中
    aiPage.appendChild(aiContainer);
}

// 为AI服务页面添加事件监听器
function setupAIPageEvents() {
    // 健康咨询输入框
    const healthConsultationInput = document.getElementById('health-consultation-input');
    const healthConsultationHint = document.getElementById('health-consultation-hint');
    const hintText = healthConsultationHint ? healthConsultationHint.querySelector('.hint-text') : null;
    
    // 存储上一个有效的输入值
    let lastValidValue = '';
    
    // 更新提示信息显示
    function updateValidationHint(inputValue, showImmediately = false) {
        if (!healthConsultationHint || !hintText) return;
        
        const validationResult = HealthContentValidator.validateContent(inputValue);
        
        if (validationResult.isValid) {
            healthConsultationHint.style.display = 'none';
            if (healthConsultationInput) {
                healthConsultationInput.classList.remove('invalid-input');
                healthConsultationInput.classList.add('valid-input');
            }
            // 保存有效的输入值
            lastValidValue = inputValue;
        } else {
            healthConsultationHint.style.display = 'flex';
            hintText.textContent = HealthContentValidator.getValidationMessage(validationResult);
            if (healthConsultationInput) {
                healthConsultationInput.classList.remove('valid-input');
                healthConsultationInput.classList.add('invalid-input');
            }
        }
    }
    
    // 实时输入检测 - 阻止无效输入
    if (healthConsultationInput) {
        // 监听输入事件，实时验证
        healthConsultationInput.addEventListener('input', (e) => {
            const currentValue = e.target.value;
            const validationResult = HealthContentValidator.validateContent(currentValue);
            
            // 如果输入无效且不是空输入，尝试恢复到上一个有效输入
            if (!validationResult.isValid && currentValue.trim() !== '') {
                // 检查是否是刚刚开始输入无效内容
                if (currentValue.length > lastValidValue.length + 2) {
                    // 如果是粘贴或快速输入，进行更严格的验证
                    updateValidationHint(currentValue, true);
                } else {
                    // 对于逐字输入，给予实时反馈但不立即阻止
                    updateValidationHint(currentValue);
                }
            } else {
                updateValidationHint(currentValue);
            }
        });
        
        // 监听 keydown 事件，在输入前进行预验证
        healthConsultationInput.addEventListener('keydown', (e) => {
            // 允许的控制键
            const allowedKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'Tab', 'Enter'];
            if (allowedKeys.includes(e.key) || e.ctrlKey || e.metaKey) {
                return;
            }
        });
        
        // 监听 paste 事件，验证粘贴内容
        healthConsultationInput.addEventListener('paste', (e) => {
            const pastedText = (e.clipboardData || window.clipboardData).getData('text');
            const currentValue = healthConsultationInput.value;
            const selectionStart = healthConsultationInput.selectionStart;
            const selectionEnd = healthConsultationInput.selectionEnd;
            const newValue = currentValue.substring(0, selectionStart) + pastedText + currentValue.substring(selectionEnd);
            
            const validationResult = HealthContentValidator.validateContent(newValue);
            if (!validationResult.isValid && newValue.trim() !== '') {
                e.preventDefault();
                showNotification('粘贴的内容包含非健康相关信息，请只粘贴健康问题或症状描述。', 'warning');
            }
        });
    }
    
    // 创建咨询结果悬浮框
    function createHealthConsultationModal(healthIssue, response, consultationResult = null) {
        // 检查是否已存在悬浮框
        let modal = document.querySelector('.health-consultation-modal-overlay');
        if (modal) {
            modal.remove();
        }
        
        // 确保模态框居中的函数
        function ensureModalCentered() {
            const modalOverlay = document.querySelector('.health-consultation-modal-overlay');
            if (modalOverlay) {
                // 触发重排，确保flex布局重新计算
                modalOverlay.style.display = 'none';
                modalOverlay.offsetHeight; // 强制重排
                modalOverlay.style.display = 'flex';
            }
        }
        
        // 创建悬浮框覆盖层
        modal = document.createElement('div');
        modal.className = 'health-consultation-modal-overlay';
        
        // 创建悬浮框内容
        modal.innerHTML = `
            <div class="health-consultation-modal">
                <div class="health-consultation-modal-header">
                    <h3><span>📋</span> 咨询结果</h3>
                    <button class="health-consultation-modal-close">&times;</button>
                </div>
                <div class="health-consultation-modal-body">
                    <div class="health-consultation-result">
                        <div class="result-content">
                            ${renderHealthConsultationResultContent(healthIssue, response, consultationResult)}
                        </div>
                    </div>
                    <div style="margin-top: 20px; text-align: center;">
                        <button id="modal-get-medication-guide" class="feature-button" style="background: linear-gradient(135deg, #165dff 0%, #00c6fb 100%); color: #ffffff; padding: 12px 24px; border-radius: 10px; font-weight: 600; border: none; cursor: pointer; transition: all 0.2s ease; box-shadow: 0 2px 8px rgba(22, 93, 255, 0.2);">
                            获取用药指导
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // 添加到页面
        document.body.appendChild(modal);
        
        // 添加窗口大小变化和滚动事件监听器
        window.addEventListener('resize', ensureModalCentered);
        window.addEventListener('scroll', ensureModalCentered);
        
        // 保存移除事件监听器的函数，以便在模态框关闭时调用
        const removeEventListeners = () => {
            window.removeEventListener('resize', ensureModalCentered);
            window.removeEventListener('scroll', ensureModalCentered);
        };
        
        // 添加关闭按钮事件
        const closeBtn = modal.querySelector('.health-consultation-modal-close');
        closeBtn.addEventListener('click', () => {
            removeEventListeners();
            modal.style.animation = 'fadeInOverlay 0.2s ease-out reverse';
            modal.querySelector('.health-consultation-modal').style.animation = 'slideUp 0.3s ease-out reverse';
            setTimeout(() => modal.remove(), 200);
        });
        
        // 点击覆盖层关闭
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                removeEventListeners();
                modal.style.animation = 'fadeInOverlay 0.2s ease-out reverse';
                modal.querySelector('.health-consultation-modal').style.animation = 'slideUp 0.3s ease-out reverse';
                setTimeout(() => modal.remove(), 200);
            }
        });
        
        // 添加获取用药指导按钮事件
        const getMedicationGuideBtn = modal.querySelector('#modal-get-medication-guide');
        getMedicationGuideBtn.addEventListener('click', async () => {
            // 记录开始时间
            const startTime = performance.now();
            
            // 检查是否已经添加了用药指导内容
            let medicationSection = modal.querySelector('.medication-guidance-section');
            if (medicationSection) {
                console.log('用药指导内容已存在');
                return;
            }
            
            // 获取结果内容容器
            const resultContent = modal.querySelector('.result-content');
            if (!resultContent) {
                return;
            }

            try {
                const { default: medicationGuidance } = await import('/views/user/ai-services/medication-guidance.js');
                const guidanceResult = await medicationGuidance.getGuidance('', healthIssue);
                const instructionItems = (guidanceResult.instructions || []).map(item => `<li>${item}</li>`).join('');
                const precautionItems = (guidanceResult.precautions || []).map(item => `<li>${item}</li>`).join('');
                const medicationCardsHtml = (guidanceResult.medications || []).map(item => `
                    <div class="medication-info-card" style="margin-top: 18px;">
                        <div class="medication-info-header">
                            <div class="medication-icon">💊</div>
                            <div class="medication-name">
                                <h4>${item.name}</h4>
                                <p>${item.description}</p>
                            </div>
                        </div>
                        <div class="medication-details-grid">
                            <div class="medication-detail-card">
                                <div class="medication-detail-header">
                                    <div class="medication-detail-icon">📏</div>
                                    <p class="medication-detail-title">建议剂量</p>
                                </div>
                                <div class="medication-detail-content">
                                    <p>${guidanceResult.dosage || '请遵医嘱使用'}</p>
                                </div>
                            </div>
                            <div class="medication-detail-card">
                                <div class="medication-detail-header">
                                    <div class="medication-detail-icon">📋</div>
                                    <p class="medication-detail-title">用药说明</p>
                                </div>
                                <div class="medication-detail-content">
                                    <ul>${instructionItems}</ul>
                                </div>
                            </div>
                            <div class="medication-detail-card">
                                <div class="medication-detail-header">
                                    <div class="medication-detail-icon">⚠️</div>
                                    <p class="medication-detail-title">注意事项</p>
                                </div>
                                <div class="medication-detail-content">
                                    <ul>${precautionItems}</ul>
                                </div>
                            </div>
                            <div class="medication-detail-card">
                                <div class="medication-detail-header">
                                    <div class="medication-detail-icon">📦</div>
                                    <p class="medication-detail-title">储存方式</p>
                                </div>
                                <div class="medication-detail-content">
                                    <p>${guidanceResult.storage || '请查看说明书'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                `).join('');
                const rawReplyHtml = guidanceResult.rawReply
                    ? `
                        <div class="ai-response" style="margin-top: 18px;">
                            <div class="message-icon">🤖</div>
                            <div class="message-content">
                                <p style="white-space: pre-line;">${guidanceResult.rawReply}</p>
                            </div>
                        </div>
                    `
                    : '';

                medicationSection = document.createElement('div');
                medicationSection.className = 'medication-guidance-section';
                medicationSection.innerHTML = `
                    <div class="medication-guidance-warning">
                        <div class="warning-icon">⚠️</div>
                        <p class="warning-text">用药指导仅供参考</p>
                    </div>
                    ${rawReplyHtml}
                    ${medicationCardsHtml || `
                    <div class="medication-info-card" style="margin-top: 18px;">
                        <div class="medication-info-header">
                            <div class="medication-icon">💊</div>
                            <div class="medication-name">
                                <h4>${guidanceResult.medication || 'AI推荐非处方药'}</h4>
                                <p>AI 提取的结构化要点</p>
                            </div>
                        </div>
                        <div class="medication-details-grid">
                            <div class="medication-detail-card">
                                <div class="medication-detail-header">
                                    <div class="medication-detail-icon">📏</div>
                                    <p class="medication-detail-title">建议剂量</p>
                                </div>
                                <div class="medication-detail-content">
                                    <p>${guidanceResult.dosage || '请遵医嘱使用'}</p>
                                </div>
                            </div>
                            <div class="medication-detail-card">
                                <div class="medication-detail-header">
                                    <div class="medication-detail-icon">📋</div>
                                    <p class="medication-detail-title">用药说明</p>
                                </div>
                                <div class="medication-detail-content">
                                    <ul>${instructionItems}</ul>
                                </div>
                            </div>
                            <div class="medication-detail-card">
                                <div class="medication-detail-header">
                                    <div class="medication-detail-icon">⚠️</div>
                                    <p class="medication-detail-title">注意事项</p>
                                </div>
                                <div class="medication-detail-content">
                                    <ul>${precautionItems}</ul>
                                </div>
                            </div>
                            <div class="medication-detail-card">
                                <div class="medication-detail-header">
                                    <div class="medication-detail-icon">📦</div>
                                    <p class="medication-detail-title">储存方式</p>
                                </div>
                                <div class="medication-detail-content">
                                    <p>${guidanceResult.storage || '请查看说明书'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    `}
                `;
            } catch (error) {
                console.error('获取用药指导失败:', error);
                medicationSection = document.createElement('div');
                medicationSection.className = 'medication-guidance-section';
                medicationSection.innerHTML = `
                    <div class="medication-guidance-warning">
                        <div class="warning-icon">⚠️</div>
                        <p class="warning-text">用药指导获取失败</p>
                    </div>
                    <div class="medication-info-card">
                        <div class="medication-detail-content">
                            <p>${error.message}</p>
                        </div>
                    </div>
                `;
            }
            
            // 将用药指导添加到结果内容中
            resultContent.appendChild(medicationSection);
            
            // 隐藏"获取用药指导"按钮
            getMedicationGuideBtn.style.display = 'none';
            
            // 确保模态框在添加内容后仍然居中
            ensureModalCentered();
            
            // 验证响应时间
            const endTime = performance.now();
            console.log(`用药指导响应时间: ${(endTime - startTime).toFixed(2)}ms`);
        });
        
        // 添加按钮悬停效果
        getMedicationGuideBtn.addEventListener('mouseenter', () => {
            getMedicationGuideBtn.style.transform = 'translateY(-2px)';
            getMedicationGuideBtn.style.boxShadow = '0 4px 16px rgba(22, 93, 255, 0.3)';
            getMedicationGuideBtn.style.background = 'linear-gradient(135deg, #0e47d9 0%, #00a8e0 100%)';
        });
        
        getMedicationGuideBtn.addEventListener('mouseleave', () => {
            getMedicationGuideBtn.style.transform = 'translateY(0)';
            getMedicationGuideBtn.style.boxShadow = '0 2px 8px rgba(22, 93, 255, 0.2)';
            getMedicationGuideBtn.style.background = 'linear-gradient(135deg, #165dff 0%, #00c6fb 100%)';
        });
        
        getMedicationGuideBtn.addEventListener('mousedown', () => {
            getMedicationGuideBtn.style.transform = 'translateY(0)';
            getMedicationGuideBtn.style.boxShadow = '0 2px 8px rgba(22, 93, 255, 0.2)';
        });
        
        getMedicationGuideBtn.addEventListener('mouseup', () => {
            getMedicationGuideBtn.style.transform = 'translateY(-2px)';
            getMedicationGuideBtn.style.boxShadow = '0 4px 16px rgba(22, 93, 255, 0.3)';
        });
    }
    
    // 健康咨询按钮点击事件
    const startHealthConsultationBtn = document.getElementById('start-health-consultation');
    if (startHealthConsultationBtn) {
        startHealthConsultationBtn.addEventListener('click', async () => {
            // 记录开始时间
            const startTime = performance.now();
            
            // 获取用户输入的健康问题描述
            const healthIssue = healthConsultationInput ? healthConsultationInput.value.trim() : '';

            if (!healthIssue) {
                alert('请输入您的健康问题或症状');
                return;
            }
            
            // 提交前验证
            const validationResult = HealthContentValidator.validateContent(healthIssue);
            if (!validationResult.isValid) {
                updateValidationHint(healthIssue);
                // 滚动到提示区域
                healthConsultationHint?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                return;
            }

            try {
                const { default: diseaseConsultation } = await import('/views/user/ai-services/disease-consultation.js');
                const result = await diseaseConsultation.analyzeSymptoms(healthIssue);
                const fallbackReply = [
                    result.analysis,
                    result.possibleCauses?.length ? `可能原因：${result.possibleCauses.join('；')}` : '',
                    result.suggestions?.length ? `建议处理：${result.suggestions.join('；')}` : '',
                ].filter(Boolean).join('\n\n');
                const aiReply = result.rawReply || fallbackReply || '暂无AI回复';

                // 创建并显示悬浮框
                createHealthConsultationModal(healthIssue, aiReply, result);
            } catch (error) {
                console.error('健康咨询失败:', error);
                showNotification(`健康咨询失败: ${error.message}`, 'error');
            }
            
            // 验证响应时间
            const endTime = performance.now();
            console.log(`健康咨询响应时间: ${(endTime - startTime).toFixed(2)}ms`);
        });
    }

    // 清空咨询结果按钮点击事件
    const clearConsultationResultBtn = document.getElementById('clear-consultation-result');
    if (clearConsultationResultBtn) {
        clearConsultationResultBtn.addEventListener('click', () => {
            const resultContainer = document.getElementById('health-consultation-result');
            const resultContent = resultContainer.querySelector('.result-content');
            const healthConsultationInput = document.getElementById('health-consultation-input');
            const healthConsultationHint = document.getElementById('health-consultation-hint');

            resultContainer.style.display = 'none';
            resultContent.innerHTML = '';
            healthConsultationInput.value = '';
            
            // 清除提示信息和输入框状态
            if (healthConsultationHint) {
                healthConsultationHint.style.display = 'none';
            }
            if (healthConsultationInput) {
                healthConsultationInput.classList.remove('valid-input', 'invalid-input');
            }

            // 隐藏获取用药指导按钮
            const getMedicationGuideBtn = document.getElementById('get-medication-guide');
            if (getMedicationGuideBtn) {
                getMedicationGuideBtn.style.display = 'none';
            }
        });
    }

    // 用药指导按钮点击事件
    const getMedicationGuideBtn = document.getElementById('get-medication-guide');
    if (getMedicationGuideBtn) {
        getMedicationGuideBtn.addEventListener('click', () => {
            // 记录开始时间
            const startTime = performance.now();
            
            // 检查是否已经添加了用药指导内容
            let medicationSection = document.querySelector('.medication-guidance-section');
            if (medicationSection) {
                // 如果已经存在，则不重复添加
                console.log('用药指导内容已存在');
                return;
            }
            
            // 获取结果内容容器
            const resultContent = document.querySelector('#health-consultation-result .result-content');
            if (!resultContent) {
                return;
            }
            
            // 创建用药指导内容
            medicationSection = document.createElement('div');
            medicationSection.className = 'medication-guidance-section';
            medicationSection.innerHTML = `
                <div class="medication-guidance-warning">
                    <div class="warning-icon">⚠️</div>
                    <p class="warning-text">用药指导仅供参考</p>
                </div>
                <div class="medication-guidance-content">
                    <h5>用药建议</h5>
                    <ul>
                        <li>请在医生或药师指导下使用药物</li>
                        <li>仔细阅读药品说明书，了解用法用量</li>
                        <li>注意药物的禁忌症和不良反应</li>
                        <li>如出现不适，请立即停药并就医</li>
                        <li>儿童、孕妇、哺乳期妇女等特殊人群需特别注意</li>
                    </ul>
                </div>
            `;
            
            // 将用药指导添加到结果内容中
            resultContent.appendChild(medicationSection);
            
            // 隐藏"获取用药指导"按钮
            getMedicationGuideBtn.style.display = 'none';
            
            // 确保模态框在添加内容后仍然居中
            ensureModalCentered();
            
            // 验证响应时间
            const endTime = performance.now();
            console.log(`用药指导响应时间: ${(endTime - startTime).toFixed(2)}ms`);
        });
    }

    // 使用事件委托处理按钮点击，确保动态渲染的按钮也能工作
    const aiPage = document.getElementById('ai-page');
    if (aiPage) {
        aiPage.addEventListener('click', (e) => {
            // 生成健康报告按钮
            if (e.target.matches('#generate-health-report')) {
                showReportFormatModal();
            }
            
            // 清空健康报告按钮
            if (e.target.matches('#clear-health-report')) {
                const resultContainer = document.getElementById('health-report-result');
                const reportContent = resultContainer.querySelector('.report-content');

                resultContainer.style.display = 'none';
                reportContent.innerHTML = '';
            }
            
            // 发送AI消息按钮
            if (e.target.matches('#ai-send-message')) {
                sendAIMessage();
            }
            
            // 咨询历史按钮
            if (e.target.matches('#view-consultation-history')) {
                viewConsultationHistory();
            }
        });
    }

    // 同时保持原来的绑定方式，作为备用方案
    const generateHealthReportBtn = document.getElementById('generate-health-report');
    if (generateHealthReportBtn) {
        generateHealthReportBtn.addEventListener('click', () => {
            showReportFormatModal();
        });
    }

    const clearHealthReportBtn = document.getElementById('clear-health-report');
    if (clearHealthReportBtn) {
        clearHealthReportBtn.addEventListener('click', () => {
            const resultContainer = document.getElementById('health-report-result');
            const reportContent = resultContainer.querySelector('.report-content');

            resultContainer.style.display = 'none';
            reportContent.innerHTML = '';
        });
    }

    const aiSendMessageBtn = document.getElementById('ai-send-message');
    if (aiSendMessageBtn) {
        aiSendMessageBtn.addEventListener('click', sendAIMessage);
    }

    bindMentalHealthQuickActions();

    const viewConsultationHistoryBtn = document.getElementById('view-consultation-history');
    if (viewConsultationHistoryBtn) {
        viewConsultationHistoryBtn.addEventListener('click', viewConsultationHistory);
    }
}

// 为聊天输入框添加自动调整高度和回车键发送的事件监听器
function setupChatInputListeners() {
    // 为AI聊天输入框添加事件监听器
    const aiChatInput = document.getElementById('ai-chat-input');
    if (aiChatInput) {
        aiChatInput.addEventListener('input', () => {
            autoResizeInput(aiChatInput);
        });

        // 添加回车键发送功能
        aiChatInput.addEventListener('keydown', e => {
            if (e.nativeEvent?.isComposing || e.isComposing) {
                return;
            }

            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendAIMessage();
            }
        });
    }

    // 为在线咨询输入框添加事件监听器
    const chatInput = document.getElementById('chat-input');
    if (chatInput) {
        chatInput.addEventListener('input', () => {
            autoResizeInput(chatInput);
        });

        // 添加回车键发送功能
        chatInput.addEventListener('keydown', e => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }
}

// 打开AI聊天界面
function openAIChat(type, healthIssue = '') {
    const aiChatContainer = document.getElementById('ai-chat-container');
    const aiChatPlaceholder = document.getElementById('ai-chat-placeholder');
    const aiChatMessages = document.getElementById('ai-chat-messages');

    if (aiChatContainer && aiChatPlaceholder && aiChatMessages) {
        // 如果是健康报告，先显示健康数据录入界面
        if (type === '健康报告') {
            showHealthDataForm();
            return;
        }

        // 显示聊天界面，隐藏占位符
        aiChatContainer.style.display = 'block';
        aiChatPlaceholder.style.display = 'none';

        // 清空聊天消息
        let welcomeMessage = '';
        if (type === '静愈馆') {
            welcomeMessage = createMentalHealthWelcomeMessage();
        } else {
            welcomeMessage = `
                <div class="message bot-message">
                    <div class="message-avatar"></div>
                    <div class="message-content">
                        <p>您好！我是您的${type}助手，有什么可以帮助您的吗？</p>
                    </div>
                </div>
            `;
        }
        aiChatMessages.innerHTML = welcomeMessage;

        if (type === '静愈馆') {
            bindMentalHealthQuickActions();
            void renderMentalHealthChatHistory();
        }

        const streamEnabled = type === '静愈馆' || type === '健康咨询';
        sessionStorage.setItem('currentChatStreamEnabled', streamEnabled ? 'true' : 'false');

        // 如果有健康问题描述，自动发送给AI
        if (healthIssue) {
            appendAIChatMessage('user', healthIssue);

            const loadingMessage = createTypingIndicator('正在思考中...');
            (async () => {
                try {
                    const result = await aiServices.mentalHealthChat.sendMessage(healthIssue, {
                        stream: streamEnabled,
                        onChunk: (_, fullText) => {
                            updateAIChatMessage(loadingMessage, fullText || '正在思考中...');
                        },
                    });
                    updateAIChatMessage(loadingMessage, result.reply);
                } catch (error) {
                    console.error('健康咨询失败:', error);
                    updateAIChatMessage(loadingMessage, '抱歉，健康咨询服务暂时不可用，请稍后再试。');
                }
            })();
        }

        // 为AI聊天输入框添加自动调整高度和回车键发送的事件监听器
        const aiChatInput = document.getElementById('ai-chat-input');
        if (aiChatInput) {
            aiChatInput.addEventListener('input', () => {
                autoResizeInput(aiChatInput);
            });

            // 添加回车键发送功能
            aiChatInput.addEventListener('keydown', e => {
                if (e.nativeEvent?.isComposing || e.isComposing) {
                    return;
                }

                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendAIMessage();
                }
            });
        }

        // 存储当前聊天类型
        sessionStorage.setItem('currentChatType', type);
    }
}

// 显示健康数据录入表单
function showHealthDataForm() {
    const aiChatContainer = document.getElementById('ai-chat-container');
    const aiChatPlaceholder = document.getElementById('ai-chat-placeholder');

    if (aiChatContainer && aiChatPlaceholder) {
        // 显示聊天容器，隐藏占位符
        aiChatContainer.style.display = 'block';
        aiChatPlaceholder.style.display = 'none';

        // 获取健康数据模板
        const healthDataTemplate = aiServices.healthReport.getHealthDataTemplate();

        // 生成健康数据录入表单
        aiChatContainer.innerHTML = `
            <div class="chat-header">
                <h3>健康数据录入</h3>
            </div>
            <div class="health-data-form">
                <p>请填写以下健康数据，以便生成个性化健康报告：</p>
                <form id="health-data-form">
                    ${Object.entries(healthDataTemplate)
                        .map(
                            ([key, label]) => `
                        <div class="form-group">
                            <label for="${key}">${label}</label>
                            <input type="text" id="${key}" name="${key}" placeholder="请输入${label}">
                        </div>
                    `
                        )
                        .join('')}
                    <div class="form-actions">
                        <button type="button" id="cancel-health-data" class="feature-button">取消</button>
                        <button type="submit" class="feature-button">提交数据</button>
                    </div>
                </form>
            </div>
        `;

        // 添加取消按钮事件监听器
        const cancelBtn = document.getElementById('cancel-health-data');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', closeAIChat);
        }

        // 添加表单提交事件监听器
        const form = document.getElementById('health-data-form');
        if (form) {
            form.addEventListener('submit', async e => {
                e.preventDefault();

                // 收集表单数据
                const formData = new FormData(form);
                const healthData = {};
                for (const [key, value] of formData.entries()) {
                    healthData[key] = value;
                }

                // 生成健康报告
                try {
                    const report = await aiServices.healthReport.generateReport(healthData);

                    // 显示健康报告结果
                    showHealthReport(report);
                } catch (error) {
                    console.error('生成健康报告失败:', error);
                    alert(`生成健康报告失败: ${error.message}`);
                }
            });
        }
    }
}

// 显示健康报告
function showHealthReport(report) {
    const aiChatContainer = document.getElementById('ai-chat-container');

    if (aiChatContainer) {
        // 生成健康报告HTML
        aiChatContainer.innerHTML = `
            <div class="chat-header">
                <h3>健康报告</h3>
            </div>
            <div class="health-report">
                <div class="report-section">
                    <h4>个人信息</h4>
                    <p><strong>姓名:</strong> ${report.personalInfo.name}</p>
                    <p><strong>年龄:</strong> ${report.personalInfo.age}</p>
                    <p><strong>性别:</strong> ${report.personalInfo.gender}</p>
                </div>
                <div class="report-section">
                    <h4>健康指标</h4>
                    <p><strong>血压:</strong> ${report.healthMetrics.bloodPressure}</p>
                    <p><strong>心率:</strong> ${report.healthMetrics.heartRate}</p>
                    <p><strong>血糖:</strong> ${report.healthMetrics.bloodSugar}</p>
                    <p><strong>体重:</strong> ${report.healthMetrics.weight}</p>
                    <p><strong>身高:</strong> ${report.healthMetrics.height}</p>
                </div>
                <div class="report-section">
                    <h4>健康分析</h4>
                    <p><strong>总体健康状况:</strong> ${report.analysis.overallHealth}</p>
                    <p><strong>风险因素:</strong> ${report.analysis.riskFactors.join(', ')}</p>
                    <p><strong>建议:</strong></p>
                    <ul>
                        ${report.analysis.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                    </ul>
                </div>
                <div class="report-section">
                    <h4>详细分析</h4>
                    ${report.detailedSections
                        .map(
                            section => `
                        <div class="report-subsection">
                            <h5>${section.title}</h5>
                            <p>${section.content}</p>
                        </div>
                    `
                        )
                        .join('')}
                </div>
                <div class="report-section">
                    <h4>下一步建议</h4>
                    <ul>
                        ${report.nextSteps.map(step => `<li>${step}</li>`).join('')}
                    </ul>
                </div>
            </div>
        `;
    }
}

// 关闭AI聊天界面
function closeAIChat() {
    const aiChatContainer = document.getElementById('ai-chat-container');
    const aiChatPlaceholder = document.getElementById('ai-chat-placeholder');

    if (aiChatContainer && aiChatPlaceholder) {
        // 隐藏聊天界面，显示占位符
        aiChatContainer.style.display = 'none';
        aiChatPlaceholder.style.display = 'block';
    }
}

// 更新AI功能访问状态
function updateAIFeatureAccess() {
    // 启用所有功能按钮，确保用户可以直接使用
    const medicationGuideBtn = document.getElementById('get-medication-guide');
    const healthReportBtn = document.getElementById('generate-health-report');

    // 启用用药指导按钮
    if (medicationGuideBtn) {
        medicationGuideBtn.disabled = false;
        medicationGuideBtn.title = '获取用药指导';
    }

    // 启用健康报告按钮
    if (healthReportBtn) {
        healthReportBtn.disabled = false;
        healthReportBtn.title = '生成健康报告';
    }
}

// 自动调整输入框高度
function autoResizeInput(input) {
    // 重置高度，以便正确计算滚动高度
    input.style.height = 'auto';
    // 设置高度为滚动高度
    input.style.height = `${Math.min(input.scrollHeight, 120)}px`; // 限制最大高度为120px
}

function escapeHTML(value = '') {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function createMentalHealthWelcomeMessage() {
    return `
        <div class="message bot-message message--welcome">
            <div class="message-avatar"></div>
            <div class="message-content">
                <p>你好，我在这里陪你聊聊。你可以直接告诉我现在的感受，也可以点下面的话题开始。</p>
                <div class="mental-health-quick-actions">
                    <button type="button" class="mental-health-quick-action" data-chat-prompt="我最近压力很大，总是放松不下来">最近压力很大</button>
                    <button type="button" class="mental-health-quick-action" data-chat-prompt="我最近总是焦虑，晚上也睡不好">最近有点焦虑</button>
                    <button type="button" class="mental-health-quick-action" data-chat-prompt="我情绪有点低落，提不起精神">情绪有点低落</button>
                    <button type="button" class="mental-health-quick-action" data-chat-prompt="我想聊聊最近的人际关系困扰">聊聊人际关系</button>
                </div>
            </div>
        </div>
    `;
}

function appendAIChatMessage(role, content = '', metaText = '') {
    const aiChatMessages = document.getElementById('ai-chat-messages');
    if (!aiChatMessages) {
        return null;
    }

    const wrapper = document.createElement('div');
    wrapper.className = `message ${role === 'user' ? 'user-message' : 'bot-message'}`;

    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';

    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    if (role === 'bot' && /正在思考|正在生成/.test(content)) {
        messageContent.classList.add('is-thinking');
    }

    const paragraph = document.createElement('p');
    paragraph.innerHTML = escapeHTML(content).replace(/\n/g, '<br>');
    messageContent.appendChild(paragraph);

    let metaElement = null;
    if (metaText) {
        metaElement = document.createElement('div');
        metaElement.className = 'message-meta';
        metaElement.textContent = metaText;
        messageContent.appendChild(metaElement);
    }

    wrapper.appendChild(avatar);
    wrapper.appendChild(messageContent);
    aiChatMessages.appendChild(wrapper);

    if (role === 'user') {
        setUserAvatarToElement(avatar);
    }

    aiChatMessages.scrollTop = aiChatMessages.scrollHeight;
    return { wrapper, paragraph, avatar, metaElement };
}

function updateAIChatMessage(messageNode, content = '') {
    if (!messageNode?.paragraph) {
        return;
    }
    messageNode.paragraph.innerHTML = escapeHTML(content).replace(/\n/g, '<br>');
    messageNode.paragraph.parentElement?.classList.remove('is-thinking');
    const aiChatMessages = document.getElementById('ai-chat-messages');
    if (aiChatMessages) {
        aiChatMessages.scrollTop = aiChatMessages.scrollHeight;
    }
}

function createTypingIndicator(text = '正在思考中...') {
    return appendAIChatMessage('bot', text);
}

function formatChatHistoryTime(timestamp) {
    if (!timestamp) {
        return '';
    }

    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) {
        return '';
    }

    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${month}-${day} ${hours}:${minutes}`;
}

function formatChatHistoryDateLabel(timestamp) {
    if (!timestamp) {
        return '';
    }

    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) {
        return '';
    }

    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const isSameDate = (left, right) => left.getFullYear() === right.getFullYear()
        && left.getMonth() === right.getMonth()
        && left.getDate() === right.getDate();

    if (isSameDate(date, today)) {
        return '今天';
    }

    if (isSameDate(date, yesterday)) {
        return '昨天';
    }

    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
}

function appendChatDateDivider(label) {
    if (!label) {
        return;
    }

    const aiChatMessages = document.getElementById('ai-chat-messages');
    if (!aiChatMessages) {
        return;
    }

    const divider = document.createElement('div');
    divider.className = 'chat-date-divider';
    divider.innerHTML = `<span>${escapeHTML(label)}</span>`;
    aiChatMessages.appendChild(divider);
}

async function renderMentalHealthChatHistory(options = {}) {
    const aiChatMessages = document.getElementById('ai-chat-messages');
    if (!aiChatMessages) {
        return;
    }

    const { preserveWelcomeMessage = true } = options;
    if (!preserveWelcomeMessage) {
        aiChatMessages.innerHTML = '';
    }

    try {
        const history = await aiServices.mentalHealthChat.getHistory();
        if (!Array.isArray(history) || history.length === 0) {
            return;
        }

        const orderedHistory = [...history].reverse();
        let lastDateLabel = '';
        orderedHistory.forEach(record => {
            const userMessage = String(record?.userMessage || '').trim();
            const aiReply = String(record?.aiReply || '').trim();
            const timeLabel = formatChatHistoryTime(record?.timestamp);
            const dateLabel = formatChatHistoryDateLabel(record?.timestamp);

            if (dateLabel && dateLabel !== lastDateLabel) {
                appendChatDateDivider(dateLabel);
                lastDateLabel = dateLabel;
            }

            if (userMessage) {
                const userNode = appendAIChatMessage('user', userMessage, timeLabel);
                if (timeLabel && userNode?.wrapper) {
                    userNode.wrapper.dataset.timestamp = timeLabel;
                    userNode.wrapper.title = timeLabel;
                }
            }

            if (aiReply) {
                const botNode = appendAIChatMessage('bot', aiReply, timeLabel);
                if (timeLabel && botNode?.wrapper) {
                    botNode.wrapper.dataset.timestamp = timeLabel;
                    botNode.wrapper.title = timeLabel;
                }
            }
        });
    } catch (error) {
        console.error('渲染静愈馆聊天历史失败:', error);
    }
}

function ensureMentalHealthChatVisible() {
    const aiChatContainer = document.getElementById('ai-chat-container');
    const aiChatPlaceholder = document.getElementById('ai-chat-placeholder');
    const aiChatMessages = document.getElementById('ai-chat-messages');

    if (!aiChatContainer || !aiChatPlaceholder || !aiChatMessages) {
        return;
    }

    sessionStorage.setItem('currentChatType', '静愈馆');
    sessionStorage.setItem('currentChatStreamEnabled', 'true');
    aiChatContainer.style.display = 'block';
    aiChatPlaceholder.style.display = 'none';
    aiChatMessages.innerHTML = createMentalHealthWelcomeMessage();
    bindMentalHealthQuickActions();
    void renderMentalHealthChatHistory();
}

function restoreMentalHealthChatOnPageLoad() {
    const aiPage = document.getElementById('ai-page');

    if (!aiPage || !aiPage.classList.contains('active')) {
        return;
    }

    ensureMentalHealthChatVisible();
}

function bindMentalHealthQuickActions() {
    document.querySelectorAll('.mental-health-quick-action').forEach(button => {
        button.addEventListener('click', () => {
            const prompt = button.dataset.chatPrompt || '';
            const input = document.getElementById('ai-chat-input');
            if (!input || !prompt) {
                return;
            }

            input.value = prompt;
            autoResizeInput(input);
            input.focus();
        });
    });

    document.getElementById('ai-chat-clear-history')?.addEventListener('click', () => {
        const aiChatMessages = document.getElementById('ai-chat-messages');
        if (!aiChatMessages) {
            return;
        }

        aiChatMessages.innerHTML = createMentalHealthWelcomeMessage();
        bindMentalHealthQuickActions();
    });
}

// 发送AI消息
function sendAIMessage() {
    const aiChatInput = document.getElementById('ai-chat-input');
    const aiChatMessages = document.getElementById('ai-chat-messages');
    const message = aiChatInput.value.trim();

    if (!message) {
        return;
    }

    const sendButton = document.getElementById('ai-send-message');
    if (sendButton) {
        sendButton.disabled = true;
        sendButton.textContent = '发送中...';
    }

    // 获取当前聊天类型
    const currentChatType = sessionStorage.getItem('currentChatType') || '健康咨询';
    const streamEnabled = sessionStorage.getItem('currentChatStreamEnabled') === 'true';

    appendAIChatMessage('user', message);

    // 清空输入框并重置高度
    aiChatInput.value = '';
    autoResizeInput(aiChatInput);

    const loadingMessage = createTypingIndicator(streamEnabled ? '正在思考中...' : '正在生成回复...');

    (async () => {
        let response = '';

        // 根据聊天类型调用不同的API
        if (currentChatType === '静愈馆') {
            try {
                const result = await aiServices.mentalHealthChat.sendMessage(message, {
                    stream: streamEnabled,
                    onChunk: (_, fullText) => {
                        updateAIChatMessage(loadingMessage, fullText || '正在思考中...');
                    },
                });
                response = typeof result === 'string' ? result : result?.reply || '';
                updateAIFeatureAccess();
            } catch (error) {
                console.error('静愈馆服务失败:', error);
                response = error?.message
                    ? `抱歉，静愈馆 AI 服务暂时不可用：${error.message}`
                    : '抱歉，静愈馆 AI 服务暂时不可用，请稍后再试或联系管理员检查 AI 配置。';
            }
        } else if (currentChatType === '健康咨询') {
            try {
                const result = await aiServices.mentalHealthChat.sendMessage(message, {
                    stream: streamEnabled,
                    onChunk: (_, fullText) => {
                        updateAIChatMessage(loadingMessage, fullText || '正在思考中...');
                    },
                });
                response = typeof result === 'string' ? result : result?.reply || '';
                updateAIFeatureAccess();
            } catch (error) {
                console.error('健康咨询失败:', error);
                response = '抱歉，健康咨询服务暂时不可用，请稍后再试。';
            }
        } else if (currentChatType === '用药指导') {
            try {
                const canAccess = aiServices.medicationGuidance.canAccess();
                if (!canAccess) {
                    response = '请先完成健康咨询，然后再获取用药指导。';
                } else {
                    const result = await aiServices.medicationGuidance.getGuidance(
                        '药物名称',
                        message
                    );
                    response = `用药指导：${result.dosage}\n\n注意事项：${result.precautions.join('\n')}`;
                }
            } catch (error) {
                console.error('用药指导失败:', error);
                response = error.message || '抱歉，用药指导服务暂时不可用，请稍后再试。';
            }
        } else if (currentChatType === '健康报告') {
            try {
                const canAccess = aiServices.healthReport.canAccess();
                if (!canAccess) {
                    response = '请先完成健康咨询，然后再生成健康报告。';
                } else {
                    const result = await aiServices.healthReport.generateReport();
                    response = `健康报告：\n\n总体健康状况：${result.analysis.overallHealth}\n\n建议：${result.analysis.recommendations.join('\n')}`;
                }
            } catch (error) {
                console.error('健康报告生成失败:', error);
                response = error.message || '抱歉，健康报告服务暂时不可用，请稍后再试。';
            }
        } else {
            response = '感谢您的咨询。我是您的AI健康助手，可以回答关于健康、用药和健康报告的问题。';
        }

        updateAIChatMessage(loadingMessage, response);
        if (sendButton) {
            sendButton.disabled = false;
            sendButton.textContent = '发送';
        }
    })();

    // 滚动到底部
    aiChatMessages.scrollTop = aiChatMessages.scrollHeight;
}

// 获取当前用户头像
function getUserAvatar() {
    try {
        const loginInfo = JSON.parse(sessionStorage.getItem('loginInfo'));
        if (loginInfo && loginInfo.user && loginInfo.user.avatar) {
            return loginInfo.user.avatar;
        }
    } catch (error) {
        console.error('获取用户头像失败:', error);
    }
    return null;
}

// 为用户消息设置头像
function setUserAvatarToElement(avatarElement) {
    const userAvatar = getUserAvatar();
    if (userAvatar && avatarElement) {
        avatarElement.style.backgroundImage = `url(${userAvatar})`;
    }
}

// 更新所有聊天消息中的用户头像
function updateAllChatAvatars() {
    const userAvatars = document.querySelectorAll('.ai-chat-container .user-message .message-avatar');
    userAvatars.forEach(avatarElement => {
        setUserAvatarToElement(avatarElement);
    });
}

// 设置头像同步监听
function setupAvatarSync() {
    // 使用 BroadcastChannel 监听头像更新
    if (typeof BroadcastChannel !== 'undefined') {
        const channel = new BroadcastChannel('avatar_sync');
        channel.onmessage = event => {
            if (event.data && event.data.type === 'AVATAR_UPDATED') {
                handleAvatarUpdate(event.data.avatar);
            }
        };
    }

    // 兼容性备份：监听 localStorage 变化
    window.addEventListener('storage', e => {
        if (e.key === 'avatarUpdate' && e.newValue) {
            try {
                const data = JSON.parse(e.newValue);
                if (data && data.avatar) {
                    handleAvatarUpdate(data.avatar);
                }
            } catch (error) {
                console.error('解析头像更新数据失败:', error);
            }
        }
    });
}

// 处理头像更新
function handleAvatarUpdate(avatarData) {
    // 更新 sessionStorage 中的用户头像
    try {
        const loginInfo = JSON.parse(sessionStorage.getItem('loginInfo'));
        if (loginInfo && loginInfo.user) {
            loginInfo.user.avatar = avatarData;
            sessionStorage.setItem('loginInfo', JSON.stringify(loginInfo));
        }
    } catch (error) {
        console.error('更新 sessionStorage 头像失败:', error);
    }

    // 更新所有聊天消息中的用户头像
    updateAllChatAvatars();
}

window.addEventListener('storage', event => {
    if (event.key === 'profileCompletionUpdatedAt') {
        renderHomeProfileReminder();
    }
});

window.addEventListener('profileCompletionUpdated', () => {
    renderHomeProfileReminder();
});


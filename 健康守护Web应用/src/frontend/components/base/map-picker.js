// 通用地图选择组件 - 完全采用高德地图JavaScript API原生功能
// 支持搜索地址、点击地图选择位置、自动填入地址和经纬度

class MapPicker {
    constructor(options = {}) {
        this.addressInputId = options.addressInputId || 'address';
        this.latInputId = options.latInputId || 'lat';
        this.lngInputId = options.lngInputId || 'lng';
        this.mapContainerId = 'map-picker-container';
        this.mapId = 'map-picker-map';
        this.onConfirm = options.onConfirm || null;
        this.mapInstance = null;
        this.marker = null;
        this.currentLocation = null;
        this.geocoder = null;
        this.placeSearch = null;
        this.autoComplete = null;
        this.geolocation = null;
        this.autoLocateOnOpen = options.autoLocateOnOpen !== false;
        this.onLocateError = options.onLocateError || null;
    }

    isValidCoordinate(lat, lng) {
        return Number.isFinite(lat) && Number.isFinite(lng);
    }

    open(initialLat = null, initialLng = null, initialAddress = '') {
        this.createModal();

        const addressInput = document.getElementById(this.addressInputId);
        const latInput = document.getElementById(this.latInputId);
        const lngInput = document.getElementById(this.lngInputId);

        if (addressInput && addressInput.value) {
            initialAddress = addressInput.value;
        }
        if (latInput && latInput.value) {
            initialLat = parseFloat(latInput.value);
        }
        if (lngInput && lngInput.value) {
            initialLng = parseFloat(lngInput.value);
        }

        const hasInitialCoordinate = this.isValidCoordinate(Number(initialLat), Number(initialLng));

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                this.initMap(
                    hasInitialCoordinate ? Number(initialLat) : null,
                    hasInitialCoordinate ? Number(initialLng) : null,
                    initialAddress,
                );
            });
        });
    }

    createModal() {
        const existing = document.getElementById(this.mapContainerId);
        if (existing) {
            existing.remove();
        }

        const modal = document.createElement('div');
        modal.id = this.mapContainerId;
        modal.innerHTML = `
            <div class="map-picker-overlay">
                <div class="map-picker-modal">
                    <div class="map-picker-header">
                        <h3><i class="fas fa-map-marked-alt"></i> 选择位置</h3>
                        <button class="map-picker-close" type="button">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="map-picker-search-container">
                        <div class="map-picker-search-box">
                            <input type="text" id="amap-search-input" class="map-picker-search-input" placeholder="搜索地点...">
                            <button class="map-picker-search-btn" type="button" id="amap-search-btn">
                                <i class="fas fa-search"></i>
                            </button>
                        </div>
                    </div>
                    <div id="${this.mapId}" class="map-picker-map"></div>
                    <div class="map-picker-actions">
                        <button class="map-picker-btn map-picker-btn-primary" type="button" id="map-picker-confirm-btn">
                            <i class="fas fa-check"></i> 确定
                        </button>
                    </div>
                </div>
            </div>
        `;

        if (!document.getElementById('map-picker-styles')) {
            const style = document.createElement('style');
            style.id = 'map-picker-styles';
            style.textContent = `
                .map-picker-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.6);
                    z-index: 10000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    animation: fadeIn 0.3s;
                }
                
                .map-picker-modal {
                    background: white;
                    border-radius: 12px;
                    width: 90%;
                    max-width: 800px;
                    max-height: 90vh;
                    display: flex;
                    flex-direction: column;
                    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
                    animation: slideUp 0.3s;
                }
                
                .map-picker-header {
                    padding: 20px;
                    border-bottom: 1px solid #e0e0e0;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                
                .map-picker-search-container {
                    padding: 15px 20px;
                    border-bottom: 1px solid #e0e0e0;
                }
                
                .map-picker-search-box {
                    display: flex;
                    gap: 10px;
                }
                
                .map-picker-search-input {
                    flex: 1;
                    padding: 10px 15px;
                    border: 1px solid #ddd;
                    border-radius: 6px;
                    font-size: 14px;
                    outline: none;
                    transition: border-color 0.3s;
                }
                
                .map-picker-search-input:focus {
                    border-color: #667eea;
                }
                
                .map-picker-search-btn {
                    padding: 10px 20px;
                    background: #667eea;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 14px;
                    transition: background 0.3s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .map-picker-search-btn:hover {
                    background: #5568d3;
                }
                
                .map-picker-header h3 {
                    margin: 0;
                    color: #333;
                    font-size: 1.2rem;
                }
                
                .map-picker-close {
                    background: none;
                    border: none;
                    font-size: 1.5rem;
                    color: #999;
                    cursor: pointer;
                    padding: 5px;
                    transition: color 0.3s;
                }
                
                .map-picker-close:hover {
                    color: #333;
                }
                
                .map-picker-map {
                    height: 500px;
                    width: 100%;
                    background: #f5f5f5;
                    position: relative;
                }
                
                .map-picker-actions {
                    padding: 15px 20px;
                    display: flex;
                    gap: 10px;
                    justify-content: flex-end;
                }
                
                .map-picker-btn {
                    padding: 10px 20px;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 0.95rem;
                    transition: all 0.3s;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                
                .map-picker-btn-primary {
                    background: #667eea;
                    color: white;
                }
                
                .map-picker-btn-primary:hover {
                    background: #5568d3;
                }
                
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                
                @keyframes slideUp {
                    from {
                        transform: translateY(30px);
                        opacity: 0;
                    }
                    to {
                        transform: translateY(0);
                        opacity: 1;
                    }
                }
                
                @media (max-width: 768px) {
                    .map-picker-modal {
                        width: 95%;
                        max-height: 95vh;
                    }
                    
                    .map-picker-map {
                        height: 400px;
                    }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(modal);
        window.currentMapPickerInstance = this;

        const closeBtn = modal.querySelector('.map-picker-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', e => {
                e.preventDefault();
                e.stopPropagation();
                this.close();
            });
        }

        const confirmBtn = document.getElementById('map-picker-confirm-btn');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', e => {
                e.preventDefault();
                e.stopPropagation();
                this.confirm();
            });
        }

        const overlay = modal.querySelector('.map-picker-overlay');
        if (overlay) {
            overlay.addEventListener('click', e => {
                if (e.target === overlay || e.target.classList.contains('map-picker-overlay')) {
                    this.close();
                }
            });
        }

        const modalContent = modal.querySelector('.map-picker-modal');
        if (modalContent) {
            modalContent.addEventListener('click', e => {
                e.stopPropagation();
            });
        }

        const searchBtn = document.getElementById('amap-search-btn');
        if (searchBtn) {
            searchBtn.addEventListener('click', e => {
                e.preventDefault();
                e.stopPropagation();
                this.handleSearch();
            });
        }

        const searchInput = document.getElementById('amap-search-input');
        if (searchInput) {
            searchInput.addEventListener('keypress', e => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    e.stopPropagation();
                    this.handleSearch();
                }
            });
        }
    }

    handleSearch() {
        const searchInput = document.getElementById('amap-search-input');
        if (!searchInput || !searchInput.value.trim()) {
            return;
        }

        const keyword = searchInput.value.trim();

        if (this.autoComplete) {
            this.autoComplete.search(keyword, (status, result) => {
                if (status !== 'complete' || !result?.tips?.length) {
                    if (this.placeSearch) {
                        this.placeSearch.search(keyword);
                    }
                    return;
                }

                const matchedTip = result.tips.find(tip => tip.location) || result.tips[0];
                if (!matchedTip) {
                    return;
                }

                if (matchedTip.location) {
                    const lng = Number(matchedTip.location.lng);
                    const lat = Number(matchedTip.location.lat);
                    if (!this.isValidCoordinate(lat, lng)) {
                        return;
                    }
                    this.safeSetMarkerPosition(this.marker, lng, lat);
                    this.mapInstance?.setZoomAndCenter(15, [lng, lat]);
                    this.reverseGeocode(lat, lng);
                    return;
                }

                if (this.placeSearch) {
                    this.placeSearch.search(matchedTip.name || keyword);
                }
            });
            return;
        }

        if (!this.placeSearch) {
            return;
        }

        this.placeSearch.search(keyword);
    }

    initMap(lat, lng, address) {
        const mapEl = document.getElementById(this.mapId);
        if (!mapEl) {
            return;
        }

        const locationConfig = this.getLocationAPIConfig();
        const hasInitialCoordinate = this.isValidCoordinate(Number(lat), Number(lng));
        const initialLat = hasInitialCoordinate ? Number(lat) : 39.9042;
        const initialLng = hasInitialCoordinate ? Number(lng) : 116.4074;
        const initialAddress = address;

        this.createAmapMap(initialLat, initialLng, initialAddress, locationConfig, {
            shouldAutoLocate: this.autoLocateOnOpen,
        });
    }

    getLocationAPIConfig() {
        try {
            const loginInfo = JSON.parse(sessionStorage.getItem('loginInfo') || '{}');
            if (loginInfo.user?.settings) {
                try {
                    const settings
                        = typeof loginInfo.user.settings === 'string'
                            ? JSON.parse(loginInfo.user.settings)
                            : loginInfo.user.settings;
                    if (settings && settings.location && settings.location.providers) {
                        return settings.location;
                    }
                } catch (e) {
                    console.warn('解析登录信息中的settings失败:', e);
                }
            }

            const settings = localStorage.getItem('admin_settings');
            if (settings) {
                const parsed = JSON.parse(settings);
                if (parsed.location && parsed.location.providers) {
                    return parsed.location;
                }
                if (
                    parsed.apiSettings
                    && parsed.apiSettings.location
                    && parsed.apiSettings.location.providers
                ) {
                    return parsed.apiSettings.location;
                }
            }
        } catch (error) {
            console.error('获取地理位置API配置失败:', error);
        }
        return null;
    }

    createAmapMap(lat, lng, address, locationConfig, options = {}) {
        const mapEl = document.getElementById(this.mapId);
        let apiKey = '';
        let securityKey = '';

        if (
            locationConfig
            && locationConfig.providers
            && locationConfig.providers.amap
            && locationConfig.providers.amap.apiKey
        ) {
            apiKey = locationConfig.providers.amap.apiKey;
        }

        if (
            locationConfig
            && locationConfig.providers
            && locationConfig.providers.amap
            && locationConfig.providers.amap.securityKey
        ) {
            securityKey = locationConfig.providers.amap.securityKey;
        }

        if (!window.AMap) {
            // 设置安全密钥
            window._AMapSecurityConfig = {
                securityJsCode: securityKey
            };
            
            const script = document.createElement('script');
            const pluginList = [
                'AMap.Geocoder',
                'AMap.PlaceSearch',
                'AMap.Geolocation',
                'AMap.ToolBar',
                'AMap.Scale',
                'AMap.ControlBar',
                'AMap.AutoComplete',
            ];
            script.src = `https://webapi.amap.com/maps?v=2.0&key=${apiKey}&plugin=${pluginList.join(',')}`;

            let fallbackTriggered = false;
            const fallbackTimer = setTimeout(() => {
                if (fallbackTriggered) {
                    return;
                }
                fallbackTriggered = true;
                console.error('高德地图JS API加载超时');
            }, 3000);

            script.onload = () => {
                if (fallbackTriggered) {
                    return;
                }
                clearTimeout(fallbackTimer);
                this.initAmapMap(lat, lng, address, options);
            };
            script.onerror = () => {
                if (fallbackTriggered) {
                    return;
                }
                fallbackTriggered = true;
                clearTimeout(fallbackTimer);
                console.error('高德地图JS API加载失败');
            };
            document.head.appendChild(script);
        } else {
            this.initAmapMap(lat, lng, address, options);
        }
    }

    initAmapMap(lat, lng, address, options = {}) {
        const mapEl = document.getElementById(this.mapId);
        if (!mapEl || !window.AMap) {
            return;
        }

        if (this.mapInstance) {
            this.mapInstance.destroy();
        }

        const numLng = Number(lng);
        const numLat = Number(lat);
        if (!this.isValidCoordinate(numLat, numLng)) {
            console.warn('地图初始化坐标无效，使用默认坐标', { lat, lng });
            return this.initAmapMap(39.9042, 116.4074, address);
        }

        try {
            this.mapInstance = new AMap.Map(this.mapId, {
                zoom: 13,
                center: [numLng, numLat],
                resizeEnable: true,
            });

            this.mapInstance.addControl(new AMap.ToolBar());
            this.mapInstance.addControl(new AMap.Scale());
            this.mapInstance.addControl(new AMap.ControlBar());

            this.geocoder = new AMap.Geocoder({
                city: '全国',
                radius: 1000,
            });

            this.placeSearch = new AMap.PlaceSearch({
                city: '全国',
                pageSize: 10,
                pageIndex: 1,
                map: this.mapInstance,
                panel: false,
                autoFitView: true,
            });

            const searchInput = document.getElementById('amap-search-input');
            if (searchInput) {
                this.autoComplete = new AMap.AutoComplete({
                    city: '全国',
                    input: searchInput,
                });

                this.autoComplete.on('select', e => {
                    if (e.poi && e.poi.location) {
                        const lng = Number(e.poi.location.lng);
                        const lat = Number(e.poi.location.lat);
                        if (!this.isValidCoordinate(lat, lng)) {
                            return;
                        }
                        this.safeSetMarkerPosition(this.marker, lng, lat);
                        this.mapInstance.setZoomAndCenter(15, [lng, lat]);
                        this.reverseGeocode(lat, lng);
                    }
                });
            } else {
                this.autoComplete = null;
            }

            this.geolocation = new AMap.Geolocation({
                enableHighAccuracy: true,
                timeout: 10000,
                buttonOffset: new AMap.Pixel(10, 20),
                zoomToAccuracy: true,
                buttonPosition: 'RB',
            });
            this.mapInstance.addControl(this.geolocation);

            this.marker = new AMap.Marker({
                position: [numLng, numLat],
                draggable: true,
            });
            this.mapInstance.add(this.marker);
        } catch (error) {
            console.error('初始化高德地图失败:', error);
            return;
        }

        if (address) {
            this.updateAddressDisplay(address, lat, lng);
        } else {
            this.reverseGeocode(lat, lng);
        }

        this.mapInstance.on('click', e => {
            const lng = Number(e.lnglat.lng);
            const lat = Number(e.lnglat.lat);
            if (!this.isValidCoordinate(lat, lng)) {
                return;
            }
            this.safeSetMarkerPosition(this.marker, lng, lat);
            this.reverseGeocode(lat, lng);
        });

        this.marker.on('dragend', e => {
            const lng = Number(e.lnglat.lng);
            const lat = Number(e.lnglat.lat);
            if (!this.isValidCoordinate(lat, lng)) {
                return;
            }
            this.reverseGeocode(lat, lng);
        });

        if (options.shouldAutoLocate) {
            this.getCurrentLocation();
        }
    }

    safeSetMarkerPosition(marker, lng, lat) {
        const numLng = Number(lng);
        const numLat = Number(lat);
        if (marker && marker.setPosition && this.isValidCoordinate(numLat, numLng)) {
            marker.setPosition([numLng, numLat]);
        }
    }

    reverseGeocode(lat, lng) {
        const numLat = Number(lat);
        const numLng = Number(lng);
        if (!this.geocoder || !this.isValidCoordinate(numLat, numLng)) {
            return;
        }

        this.geocoder.getAddress([numLng, numLat], (status, result) => {
            if (status === 'complete' && result.regeocode) {
                const address = result.regeocode.formattedAddress;
                this.currentLocation = { lat: numLat, lng: numLng, address };
                this.updateAddressDisplay(address, numLat, numLng);
            }
        });
    }

    updateAddressDisplay(address, lat, lng) {
        const numLat = Number(lat);
        const numLng = Number(lng);
        if (!this.isValidCoordinate(numLat, numLng)) {
            return;
        }
        this.currentLocation = { lat: numLat, lng: numLng, address };
    }

    getCurrentLocation() {
        if (this.geolocation) {
            this.geolocation.getCurrentPosition((status, result) => {
                if (status === 'complete') {
                    const lng = Number(result.position.lng);
                    const lat = Number(result.position.lat);
                    if (this.isValidCoordinate(lat, lng)) {
                        this.setLocation(lat, lng);
                    }
                    return;
                }

                const geolocationErrorMessage = result?.message || result?.info || '';
                const shouldFallbackToBrowserGeolocation =
                    typeof navigator !== 'undefined'
                    && navigator.geolocation
                    && /permission|denied|timeout|browser|sdk|https|secure|position|fail/i.test(
                        geolocationErrorMessage,
                    );

                if (shouldFallbackToBrowserGeolocation) {
                    navigator.geolocation.getCurrentPosition(
                        position => {
                            const lat = Number(position.coords.latitude);
                            const lng = Number(position.coords.longitude);
                            if (this.isValidCoordinate(lat, lng)) {
                                this.setLocation(lat, lng);
                                return;
                            }

                            const fallbackErrorMessage = '浏览器定位返回的坐标无效，请手动选择位置';
                            if (typeof this.onLocateError === 'function') {
                                this.onLocateError(fallbackErrorMessage, result);
                            }
                        },
                        browserError => {
                            const errorMessage =
                                geolocationErrorMessage
                                || browserError?.message
                                || '定位失败，请手动选择位置';
                            if (typeof this.onLocateError === 'function') {
                                this.onLocateError(errorMessage, browserError);
                            }
                        },
                        {
                            enableHighAccuracy: true,
                            timeout: 10000,
                            maximumAge: 0,
                        },
                    );
                    return;
                }

                const errorMessage = geolocationErrorMessage || '定位失败，请手动选择位置';
                if (typeof this.onLocateError === 'function') {
                    this.onLocateError(errorMessage, result);
                }
            });
        }
    }

    setLocation(lat, lng, address = null) {
        const numLat = Number(lat);
        const numLng = Number(lng);
        if (!this.isValidCoordinate(numLat, numLng)) {
            return;
        }

        if (this.marker) {
            this.safeSetMarkerPosition(this.marker, numLng, numLat);
        }
        if (this.mapInstance) {
            this.mapInstance.setZoomAndCenter(15, [numLng, numLat]);
        }
        if (address) {
            this.updateAddressDisplay(address, numLat, numLng);
        } else {
            this.reverseGeocode(numLat, numLng);
        }
    }

    confirm() {
        if (!this.currentLocation) {
            alert('请先选择一个位置');
            return;
        }

        const { lat, lng, address } = this.currentLocation;

        const addressInput = document.getElementById(this.addressInputId);
        const latInput = document.getElementById(this.latInputId);
        const lngInput = document.getElementById(this.lngInputId);

        if (addressInput) {
            addressInput.value = address || '';
        }
        if (latInput) {
            latInput.value = lat.toFixed(2);
        }
        if (lngInput) {
            lngInput.value = lng.toFixed(2);
        }

        if (this.onConfirm) {
            this.onConfirm({ lat, lng, address });
        }

        this.close();
    }

    close() {
        if (this.autoComplete?.off) {
            this.autoComplete.off('select');
        }
        if (this.mapInstance?.destroy) {
            this.mapInstance.destroy();
        }

        const modal = document.getElementById(this.mapContainerId);
        if (modal) {
            modal.remove();
        }
        this.mapInstance = null;
        this.marker = null;
        this.currentLocation = null;
        this.geocoder = null;
        this.placeSearch = null;
        this.autoComplete = null;
        this.geolocation = null;
    }
}

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

    try {
        if (!document || !document.documentElement) {
            return;
        }
    } catch (e) {
        return;
    }

    const patchNode = node => {
        try {
            if (!node || node.nodeType !== Node.ELEMENT_NODE) {
                return;
            }

            if (node.tagName === 'STYLE' && node.textContent?.includes(AMAP_HTTP_ASSET_PREFIX)) {
                node.textContent = rewriteAmapAssetUrl(node.textContent);
            }

            if (node.hasAttribute('style')) {
                const nextStyle = rewriteAmapAssetUrl(node.getAttribute('style'));
                if (nextStyle !== node.getAttribute('style')) {
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
        } catch (e) {
            console.warn('patchNode error:', e);
        }
    };

    try {
        document.querySelectorAll('style, [style], img[src], link[href]').forEach(node => {
            patchNode(node);
        });

        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                try {
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
                } catch (e) {
                    console.warn('MutationObserver error:', e);
                }
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
    } catch (e) {
        console.warn('forceAmapHttpsAssets error:', e);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', forceAmapHttpsAssets);
} else {
    forceAmapHttpsAssets();
}

window.MapPicker = MapPicker;


/**
 * 地理位置工具类
 * 用于获取用户当前地理位置坐标
 */

let cachedPosition = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存

/**
 * 获取用户当前地理位置（带缓存和重试机制）
 * @param {boolean} forceRefresh 是否强制刷新位置
 * @param {number} retryCount 重试次数
 * @returns {Promise<{latitude: number, longitude: number}>} 位置坐标
 */
export const getCurrentPosition = (forceRefresh = false, retryCount = 3) => {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('浏览器不支持地理位置功能'));
            return;
        }

        if (!forceRefresh && cachedPosition && Date.now() - cacheTimestamp < CACHE_DURATION) {
            resolve(cachedPosition);
            return;
        }

        const tryGetPosition = (attempt = 0) => {
            navigator.geolocation.getCurrentPosition(
                position => {
                    cachedPosition = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                    };
                    cacheTimestamp = Date.now();
                    resolve(cachedPosition);
                },
                error => {
                    if (attempt < retryCount) {
                        setTimeout(() => tryGetPosition(attempt + 1), 1000);
                    } else {
                        if (cachedPosition) {
                            resolve(cachedPosition);
                        } else {
                            reject(new Error(`获取位置失败: ${error.message}`));
                        }
                    }
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: CACHE_DURATION,
                },
            );
        };

        tryGetPosition();
    });
};

/**
 * 计算两点之间的距离（使用Haversine公式）
 * @param {number} lat1 第一个点的纬度
 * @param {number} lon1 第一个点的经度
 * @param {number} lat2 第二个点的纬度
 * @param {number} lon2 第二个点的经度
 * @returns {number} 距离（公里）
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a
        = Math.sin(dLat / 2) * Math.sin(dLat / 2)
        + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return distance;
};

/**
 * 估算到达时间
 * @param {number} distance 距离（公里）
 * @param {string} transportType 交通方式
 * @returns {number} 预计时间（分钟）
 */
export const estimateArrivalTime = (distance, transportType = 'driving') => {
    const speeds = {
        walking: 5,
        cycling: 15,
        driving: 30,
        public_transport: 25,
    };
    const speed = speeds[transportType] || speeds.driving;
    const timeInHours = distance / speed;
    return Math.ceil(timeInHours * 60);
};

/**
 * 将角度转换为弧度
 * @param {number} degrees 角度
 * @returns {number} 弧度
 */
const toRad = degrees => {
    return degrees * (Math.PI / 180);
};

/**
 * 地理位置钩子
 */

/**
 * 获取用户地理位置
 * @returns {Promise<Object>} 包含经纬度的对象
 */
export function useGeolocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('浏览器不支持地理位置服务'));
            return;
        }

        navigator.geolocation.getCurrentPosition(
            position => {
                resolve({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                });
            },
            error => {
                reject(error);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 300000,
            },
        );
    });
}

/**
 * 监听地理位置变化
 * @param {Function} callback - 位置变化时的回调函数
 * @returns {Function} 取消监听的函数
 */
export function watchPosition(callback) {
    if (!navigator.geolocation) {
        console.error('浏览器不支持地理位置服务');
        return () => {};
    }

    const watchId = navigator.geolocation.watchPosition(
        position => {
            callback({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
            });
        },
        error => {
            console.error('获取地理位置失败:', error);
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000,
        },
    );

    return () => {
        navigator.geolocation.clearWatch(watchId);
    };
}

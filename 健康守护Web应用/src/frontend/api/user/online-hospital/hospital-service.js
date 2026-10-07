/**
 * 医院服务层
 * 处理医院相关的API调用
 */

import { unwrapListResponseData } from './service-helpers.js';
import { calculateDistance, estimateArrivalTime } from '../../../utils/user/online-hospital/geolocation.js';
import { get } from '../../../utils/user/online-hospital/request.js';

/**
 * 获取附近医院列表
 * @param {number} latitude 纬度
 * @param {number} longitude 经度
 * @param {number} radius 搜索半径（公里）
 * @param {string} transportType 交通方式
 * @returns {Promise<Array>} 医院列表
 */
export const getNearbyHospitals = async (
    latitude,
    longitude,
    radius = 50,
    transportType = 'driving',
) => {
    try {
        const response = await get('/hospitals', {
            lat: latitude,
            lng: longitude,
            radius,
            sortBy: 'distance',
            pageSize: 50,
        });

        const hospitalList = unwrapListResponseData(response, '获取医院数据失败', ['list', 'hospitals']);

        const hospitals = hospitalList.map(hospital => {
            const distance = hospital.lat && hospital.lng
                ? calculateDistance(latitude, longitude, hospital.lat, hospital.lng)
                : null;
            const estimatedTime = distance ? estimateArrivalTime(distance, transportType) : null;
            const departments = Array.isArray(hospital.departments) && hospital.departments.length > 0
                ? hospital.departments
                : hospital.features || [];

            return {
                id: hospital.id,
                name: hospital.name,
                avatar: hospital.avatar || '',
                province: hospital.province || '',
                city: hospital.city || '',
                address: `${hospital.province || ''}${hospital.city || ''}${hospital.address || ''}`,
                latitude: hospital.lat,
                longitude: hospital.lng,
                rating: hospital.rating,
                level: hospital.level === '三甲' ? '三级甲等' : hospital.level,
                departments,
                features: hospital.features || departments,
                phone: hospital.phone,
                businessHours: hospital.businessHours,
                distance: distance !== null ? Math.round(distance * 10) / 10 : null,
                estimatedTime: estimatedTime || hospital.estimatedTime,
                emergency: hospital.emergency,
                isRegistered: true,
            };
        });

        hospitals.sort((a, b) => {
            if (a.distance === null) return 1;
            if (b.distance === null) return -1;
            return a.distance - b.distance;
        });

        return hospitals;
    } catch (error) {
        console.error('获取附近医院失败:', error);
        throw error;
    }
};

export const searchHospitals = async keyword => {
    try {
        const response = await get('/hospitals', {
            keyword,
            pageSize: 50,
        });

        const hospitalList = unwrapListResponseData(response, '搜索医院失败', ['list', 'hospitals']);

        return hospitalList.map(hospital => {
            const departments = Array.isArray(hospital.departments) && hospital.departments.length > 0
                ? hospital.departments
                : hospital.features || [];

            return {
                id: hospital.id,
                name: hospital.name,
                avatar: hospital.avatar || '',
                province: hospital.province || '',
                city: hospital.city || '',
                address: `${hospital.province || ''}${hospital.city || ''}${hospital.address || ''}`,
                latitude: hospital.lat,
                longitude: hospital.lng,
                rating: hospital.rating,
                level: hospital.level === '三甲' ? '三级甲等' : hospital.level,
                departments,
                features: hospital.features || departments,
                phone: hospital.phone,
                businessHours: hospital.businessHours,
                distance: null,
                estimatedTime: null,
                emergency: hospital.emergency,
                isRegistered: true,
            };
        });
    } catch (error) {
        console.error('搜索医院失败:', error);
        throw error;
    }
};

export const filterHospitals = (hospitals, filters) => {
    return hospitals.filter(hospital => {
        if (filters.level && hospital.level !== filters.level) {
            return false;
        }

        const departments = Array.isArray(hospital.departments) && hospital.departments.length > 0
            ? hospital.departments
            : hospital.features || [];

        if (filters.department && !departments.includes(filters.department)) {
            return false;
        }
        return true;
    });
};

export const sortHospitals = (hospitals, sortBy = 'distance', order = 'asc') => {
    return [...hospitals].sort((a, b) => {
        let compareValue = 0;

        if (sortBy === 'distance') {
            compareValue = a.distance - b.distance;
        } else if (sortBy === 'rating') {
            compareValue = b.rating - a.rating;
        }

        return order === 'asc' ? compareValue : -compareValue;
    });
};

export const getHospitalDetail = async hospitalId => {
    try {
        const response = await get('/hospitals', {
            pageSize: 100,
        }, true);

        const hospitalList = unwrapListResponseData(response, '获取医院数据失败', ['list', 'hospitals']);
        const hospital = hospitalList.find(h => h.id === hospitalId);

        if (!hospital) {
            throw new Error('医院不存在');
        }

        return {
            id: hospital.id,
            name: hospital.name,
            avatar: hospital.avatar || '',
            province: hospital.province || '',
            city: hospital.city || '',
            address: `${hospital.province || ''}${hospital.city || ''}${hospital.address || ''}`,
            latitude: hospital.lat,
            longitude: hospital.lng,
            rating: hospital.rating,
            level: hospital.level === '三甲' ? '三级甲等' : hospital.level,
            departments: Array.isArray(hospital.departments) && hospital.departments.length > 0
                ? hospital.departments
                : hospital.features || [],
            features: hospital.features || hospital.departments || [],
            phone: hospital.phone,
            businessHours: hospital.businessHours,
            emergency: hospital.emergency,
            isRegistered: true,
        };
    } catch (error) {
        console.error('获取医院详情失败:', error);
        throw error;
    }
};

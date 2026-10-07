/**
 * 医院列表组件
 * 展示附近医院信息，支持排序、搜索和筛选功能
 */

import { useState, useEffect, useRef } from 'react';
import { EmptyState, ErrorState } from './feedback-state.js';
import { formatTravelDuration } from '../../../utils/user/online-hospital/date-utils.js';
import { getCurrentPosition } from '../../../utils/user/online-hospital/geolocation.js';
import { watchPosition } from '../../hooks/online-hospital/useGeolocation.js';
import {
    getNearbyHospitals,
    searchHospitals,
    filterHospitals,
    sortHospitals,
} from '../../../api/user/online-hospital/hospital-service.js';

const getHospitalCardMeta = hospital => [hospital?.level, hospital?.emergency ? '急诊' : '门诊'].filter(Boolean);

const getHospitalDepartments = hospital => {
    if (Array.isArray(hospital?.departments) && hospital.departments.length > 0) {
        return hospital.departments;
    }

    if (Array.isArray(hospital?.features) && hospital.features.length > 0) {
        return hospital.features;
    }

    return [];
};

const HospitalList = ({ onHospitalSelect, onAppointmentClick }) => {
    const [hospitals, setHospitals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchKeyword, setSearchKeyword] = useState('');
    const [filters, setFilters] = useState({
        level: '',
        department: '',
    });
    const [sortConfig, setSortConfig] = useState({
        sortBy: 'distance',
        order: 'asc',
    });
    const [transportType, setTransportType] = useState('driving');
    const [currentPosition, setCurrentPosition] = useState(null);
    const [lastPosition, setLastPosition] = useState(null);
    const watcherRef = useRef(null);
    const positionChangeThreshold = 0.1; // 位置变化阈值（公里），超过此值才更新医院列表

    const fetchNearbyHospitals = async (latitude, longitude) => {
        try {
            setLoading(true);
            setError(null);

            const nearbyHospitals = await getNearbyHospitals(
                latitude,
                longitude,
                50,
                transportType
            );

            setHospitals(nearbyHospitals);
        } catch (err) {
            setError(err.message);
            setHospitals([]);
        } finally {
            setLoading(false);
        }
    };

    // 检查位置是否发生显著变化
    const hasSignificantPositionChange = (pos1, pos2) => {
        if (!pos1 || !pos2) return true;

        const R = 6371; // 地球半径（公里）
        const dLat = (pos2.latitude - pos1.latitude) * Math.PI / 180;
        const dLon = (pos2.longitude - pos1.longitude) * Math.PI / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2)
            + Math.cos(pos1.latitude * Math.PI / 180) * Math.cos(pos2.latitude * Math.PI / 180)
            * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;

        return distance > positionChangeThreshold;
    };

    // 处理位置更新
    const handlePositionUpdate = (position) => {
        setCurrentPosition(position);

        // 只有当位置发生显著变化时才更新医院列表
        if (hasSignificantPositionChange(lastPosition, position)) {
            setLastPosition(position);
            fetchNearbyHospitals(position.latitude, position.longitude);
        }
    };

    useEffect(() => {
        // 初始化：获取当前位置
        const initPosition = async () => {
            try {
                const position = await getCurrentPosition(false);
                setCurrentPosition(position);
                setLastPosition(position);
                fetchNearbyHospitals(position.latitude, position.longitude);
            } catch (err) {
                console.error('获取初始位置失败:', err);
                setError('无法获取您的位置，请允许位置访问权限');
                setLoading(false);
            }
        };

        initPosition();

        // 设置位置监听
        watcherRef.current = watchPosition(handlePositionUpdate);

        // 组件卸载时清除监听
        return () => {
            if (watcherRef.current) {
                watcherRef.current();
            }
        };
    }, []);

    useEffect(() => {
        if (currentPosition) {
            fetchNearbyHospitals(currentPosition.latitude, currentPosition.longitude);
        }
    }, [transportType]);

    const handleRefresh = async () => {
        try {
            const position = await getCurrentPosition(true);
            setCurrentPosition(position);
            setLastPosition(position);
            fetchNearbyHospitals(position.latitude, position.longitude);
        } catch (err) {
            console.error('刷新位置失败:', err);
            if (currentPosition) {
                fetchNearbyHospitals(currentPosition.latitude, currentPosition.longitude);
            }
        }
    };

    const handleSearch = async () => {
        if (!searchKeyword.trim()) {
            if (currentPosition) {
                fetchNearbyHospitals(currentPosition.latitude, currentPosition.longitude);
            }
            return;
        }

        try {
            setLoading(true);
            const searchResults = await searchHospitals(searchKeyword);
            setHospitals(searchResults);
        } catch (err) {
            setError('搜索失败，请重试');
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({
            ...prev,
            [key]: value,
        }));
    };

    const handleSortChange = sortBy => {
        setSortConfig(prev => ({
            sortBy,
            order: prev.sortBy === sortBy && prev.order === 'asc' ? 'desc' : 'asc',
        }));
    };

    const filteredAndSortedHospitals = sortHospitals(
        filterHospitals(hospitals, filters),
        sortConfig.sortBy,
        sortConfig.order,
    );
    const departmentOptions = Array.from(new Set(
        hospitals.flatMap(hospital => getHospitalDepartments(hospital))
            .map(department => String(department || '').trim())
            .filter(Boolean)
    )).sort((left, right) => left.localeCompare(right, 'zh-CN'));

    if (loading) {
        return (
            <div className="hospital-list">
                <div className="hospital-list__loading">
                    <div className="loading-spinner"></div>
                    <p>正在获取位置信息和附近医院...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="hospital-list">
            {error && (
                <ErrorState
                    className="hospital-list__error"
                    text={error}
                    actionText="刷新位置"
                    onAction={handleRefresh}
                />
            )}

            <div className="hospital-list__controls">
                <div className="hospital-list__search">
                    <input
                        type="text"
                        placeholder="搜索医院、科室..."
                        value={searchKeyword}
                        onChange={e => setSearchKeyword(e.target.value)}
                        onKeyPress={e => e.key === 'Enter' && handleSearch()}
                    />
                    <button onClick={handleSearch}>搜索</button>
                </div>

                <div className="hospital-list__transport">
                    <select value={transportType} onChange={e => setTransportType(e.target.value)}>
                        <option value="driving">驾车</option>
                        <option value="public_transport">公共交通</option>
                        <option value="cycling">骑行</option>
                        <option value="walking">步行</option>
                    </select>
                    <button onClick={handleRefresh} className="refresh-btn-small">
                        🔄 刷新位置
                    </button>
                </div>

                <div className="hospital-list__filters">
                    <select
                        value={filters.level}
                        onChange={e => handleFilterChange('level', e.target.value)}
                    >
                        <option value="">医院等级</option>
                        <option value="三级甲等">三级甲等</option>
                        <option value="三级乙等">三级乙等</option>
                        <option value="二级甲等">二级甲等</option>
                    </select>

                    <select
                        value={filters.department}
                        onChange={e => handleFilterChange('department', e.target.value)}
                    >
                        <option value="">科室</option>
                        {departmentOptions.map(department => (
                            <option key={department} value={department}>
                                {department}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="hospital-list__sort">
                    <button
                        className={sortConfig.sortBy === 'distance' ? 'active' : ''}
                        onClick={() => handleSortChange('distance')}
                    >
                        距离{' '}
                        {sortConfig.sortBy === 'distance' &&
                            (sortConfig.order === 'asc' ? '↑' : '↓')}
                    </button>
                    <button
                        className={sortConfig.sortBy === 'rating' ? 'active' : ''}
                        onClick={() => handleSortChange('rating')}
                    >
                        评分{' '}
                        {sortConfig.sortBy === 'rating' && (sortConfig.order === 'asc' ? '↑' : '↓')}
                    </button>
                </div>
            </div>

            <div className="hospital-list__content">
                {filteredAndSortedHospitals.length === 0 ? (
                    <EmptyState className="hospital-list__empty" text="暂无医院数据" />
                ) : (
                    filteredAndSortedHospitals.map(hospital => {
                        const metaItems = getHospitalCardMeta(hospital);

                        return (
                            <div key={hospital.id} className="hospital-card">
                                <div className="hospital-card__identity">
                                    <div className="hospital-card__avatar" aria-hidden="true">
                                        {hospital.avatar ? (
                                            <img src={hospital.avatar} alt="" />
                                        ) : (
                                            <span className="hospital-card__avatar-name">
                                                {String(hospital.name || '医院')}
                                            </span>
                                        )}
                                    </div>

                                    <div className="hospital-card__identity-main">
                                        <div className="hospital-card__header">
                                            <div>
                                                <h3 className="hospital-card__name">{hospital.name}</h3>
                                                <div className="hospital-card__badges">
                                                    {metaItems.map(item => (
                                                        <span key={item} className="hospital-card__badge">{item}</span>
                                                    ))}
                                                </div>
                                            </div>
                                            <span className="hospital-card__level">{hospital.level}</span>
                                        </div>

                                        <div className="hospital-card__info">
                                            <p className="hospital-card__address">📍 {hospital.address}</p>
                                            <p className="hospital-card__phone">📞 {hospital.phone}</p>
                                            <p className="hospital-card__hours">🕐 {hospital.businessHours}</p>
                                            <div className="hospital-card__meta">
                                                <span className="hospital-card__distance">
                                                    距离: {hospital.distance ?? '--'}km
                                                </span>
                                                <span className="hospital-card__time">
                                                    预计: {hospital.estimatedTime ? formatTravelDuration(hospital.estimatedTime) : '--'}
                                                </span>
                                                <span className="hospital-card__rating">
                                                    评分: {hospital.rating ?? '--'}
                                                </span>
                                            </div>
                                            <div className="hospital-card__features">
                                                {getHospitalDepartments(hospital).map((department, index) => (
                                                    <span key={index} className="hospital-card__feature">
                                                        {department}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="hospital-card__actions">
                                    <button
                                        className="hospital-card__btn hospital-card__btn--detail"
                                        onClick={() => onHospitalSelect(hospital)}
                                    >
                                        详情
                                    </button>
                                    <button
                                        className="hospital-card__btn hospital-card__btn--appointment"
                                        onClick={() => onAppointmentClick(hospital)}
                                    >
                                        预约
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default HospitalList;

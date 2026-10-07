/**
 * 咨询历史记录组件
 * 按时间倒序展示所有咨询记录，支持搜索和筛选功能
 */

import { useState, useEffect } from 'react';
import { EmptyState, ErrorState, LoadingState } from './feedback-state.js';
import { formatMinutes } from '../utils/date-utils.js';
import { getConsultationHistory, getConsultationDetail } from '../services/consultation-service.js';

const matchesConsultationKeyword = (consultation, keyword) => {
    const normalizedKeyword = keyword.trim();
    if (!normalizedKeyword) {
        return true;
    }

    return [
        consultation.hospitalName,
        consultation.doctor,
        consultation.department,
        consultation.summary,
    ].some(value => String(value || '').includes(normalizedKeyword));
};

const getHistoryMessageAvatar = (message, consultation) => {
    if (message?.sender === 'hospital') {
        return consultation?.hospitalAvatar || '';
    }

    return consultation?.userAvatar || '';
};

const getHistoryMessageLabel = message => (message?.sender === 'hospital' ? '医院' : '我');

const getConsultationCardAvatar = consultation => consultation?.hospitalAvatar || '';

const getConsultationCardMeta = consultation => [consultation?.department, consultation?.doctor].filter(Boolean).join(' · ');

const ConsultationHistory = ({ onViewDetail }) => {
    const [consultations, setConsultations] = useState([]);
    const [filteredConsultations, setFilteredConsultations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchKeyword, setSearchKeyword] = useState('');
    const [filterDepartment, setFilterDepartment] = useState('');
    const [selectedConsultation, setSelectedConsultation] = useState(null);
    const [showDetail, setShowDetail] = useState(false);

    // 获取咨询历史
    useEffect(() => {
        const fetchConsultationHistory = async () => {
            try {
                setLoading(true);
                const history = await getConsultationHistory();
                setConsultations(history);
                setFilteredConsultations(history);
            } catch (err) {
                setError('获取咨询历史失败');
            } finally {
                setLoading(false);
            }
        };

        fetchConsultationHistory();
    }, []);

    // 搜索和筛选
    useEffect(() => {
        let result = [...consultations];

        // 搜索
        if (searchKeyword) {
            result = result.filter(consultation => matchesConsultationKeyword(consultation, searchKeyword));
        }

        // 筛选科室
        if (filterDepartment) {
            result = result.filter(consultation => consultation.department === filterDepartment);
        }

        setFilteredConsultations(result);
    }, [consultations, searchKeyword, filterDepartment]);

    // 查看详情
    const handleViewDetail = async consultationId => {
        try {
            setLoading(true);
            const detail = await getConsultationDetail(consultationId);
            setSelectedConsultation(detail);
            setShowDetail(true);
            onViewDetail?.(detail);
        } catch (err) {
            setError('获取咨询详情失败');
        } finally {
            setLoading(false);
        }
    };

    // 获取所有科室
    const departments = [...new Set(consultations.map(c => c.department))];

    if (loading && !selectedConsultation) {
        return <LoadingState className="consultation-history__loading" />;
    }

    if (error) {
        return <ErrorState className="consultation-history__error" text={error} />;
    }

    return (
        <div className="consultation-history">
            {/* 搜索和筛选 */}
            <div className="consultation-history__controls">
                <div className="consultation-history__search">
                    <input
                        type="text"
                        placeholder="搜索医院、医生、科室..."
                        value={searchKeyword}
                        onChange={e => setSearchKeyword(e.target.value)}
                    />
                </div>

                <div className="consultation-history__filter">
                    <select
                        value={filterDepartment}
                        onChange={e => setFilterDepartment(e.target.value)}
                    >
                        <option value="">所有科室</option>
                        {departments.map((department, index) => (
                            <option key={index} value={department}>
                                {department}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* 咨询记录列表 */}
            <div className="consultation-history__list">
                {filteredConsultations.length === 0 ? (
                    <EmptyState className="consultation-history__empty" text="暂无咨询记录" />
                ) : (
                    filteredConsultations.map(consultation => {
                        const meta = getConsultationCardMeta(consultation);
                        const avatar = getConsultationCardAvatar(consultation);

                        return (
                            <div key={consultation.id} className="consultation-history__item">
                                <div className="consultation-history__item-avatar" aria-hidden="true">
                                    {avatar ? (
                                        <img src={avatar} alt="" />
                                    ) : (
                                        <span>{String(consultation.hospitalName || '医').slice(0, 1)}</span>
                                    )}
                                </div>

                                <div className="consultation-history__item-main">
                                    <div className="consultation-history__item-header">
                                        <div>
                                            <h3>{consultation.hospitalName}</h3>
                                            {meta && (
                                                <p className="consultation-history__item-meta">{meta}</p>
                                            )}
                                        </div>
                                        <span className="consultation-history__item-time">
                                            {consultation.startTime}
                                        </span>
                                    </div>

                                    <div className="consultation-history__item-info">
                                        <p>
                                            <strong>时长:</strong> {formatMinutes(consultation.duration)}
                                        </p>
                                        {consultation.rating && (
                                            <p>
                                                <strong>评分:</strong> {'★'.repeat(consultation.rating)}
                                            </p>
                                        )}
                                    </div>

                                    <div className="consultation-history__item-summary">
                                        <p>{consultation.summary}</p>
                                    </div>

                                    <div className="consultation-history__item-actions">
                                        <button onClick={() => handleViewDetail(consultation.id)}>
                                            查看详情
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* 详情模态框 */}
            {showDetail && selectedConsultation && (
                <div className="consultation-history__detail-modal">
                    <div className="consultation-history__detail-content">
                        <div className="consultation-history__detail-header">
                            <h3>咨询详情</h3>
                            <button onClick={() => setShowDetail(false)}>关闭</button>
                        </div>

                        <div className="consultation-history__detail-info">
                            <p>
                                <strong>医院:</strong> {selectedConsultation.hospitalName}
                            </p>
                            <p>
                                <strong>科室:</strong> {selectedConsultation.department}
                            </p>
                            <p>
                                <strong>医生:</strong> {selectedConsultation.doctor}
                            </p>
                            <p>
                                <strong>开始时间:</strong> {selectedConsultation.startTime}
                            </p>
                            <p>
                                <strong>结束时间:</strong> {selectedConsultation.endTime}
                            </p>
                            <p>
                                <strong>时长:</strong> {formatMinutes(selectedConsultation.duration)}
                            </p>
                            {selectedConsultation.rating && (
                                <p>
                                    <strong>评分:</strong> {'★'.repeat(selectedConsultation.rating)}
                                </p>
                            )}
                            {selectedConsultation.feedback && (
                                <p>
                                    <strong>反馈:</strong> {selectedConsultation.feedback}
                                </p>
                            )}
                        </div>

                        <div className="consultation-history__detail-messages">
                            <h4>对话记录</h4>
                            {selectedConsultation.messages.map(message => {
                                const avatar = getHistoryMessageAvatar(message, selectedConsultation);

                                return (
                                    <div
                                        key={message.id}
                                        className={`consultation-history__detail-message consultation-history__detail-message--${message.sender}`}
                                    >
                                        <div className="consultation-history__detail-message-avatar" aria-hidden="true">
                                            {avatar ? (
                                                <img src={avatar} alt="" />
                                            ) : (
                                                <span>{getHistoryMessageLabel(message).slice(0, 1)}</span>
                                            )}
                                        </div>
                                        <div className="consultation-history__detail-message-body">
                                            <div className="consultation-history__detail-message-sender">
                                                {getHistoryMessageLabel(message)}
                                            </div>
                                            <div className="consultation-history__detail-message-content">
                                                {message.type === 'text' && <p>{message.content}</p>}
                                                {message.type === 'image' && (
                                                    <img
                                                        src={message.content}
                                                        alt="咨询图片"
                                                        className="consultation-history__detail-message-image"
                                                    />
                                                )}
                                                {message.type === 'file' && (
                                                    <a
                                                        href={message.content}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="consultation-history__detail-message-file"
                                                    >
                                                        查看文件
                                                    </a>
                                                )}
                                                <span className="consultation-history__detail-message-time">
                                                    {message.timestamp}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ConsultationHistory;

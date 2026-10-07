/**
 * 咨询聊天组件
 * 实现在线医院咨询功能，支持文字消息、图片发送和文件上传
 */

import { useEffect, useRef, useState } from 'react';
import {
    startConsultation,
    sendMessage,
    endConsultation,
    rateConsultation,
    uploadFile,
    getConsultationDetail,
    pollConsultationMessages,
} from '../services/consultation-service';

const POLL_MS = 4000;
const MAX_UPLOAD_SIZE = 10 * 1024 * 1024;

const canSendText = value => value.trim().length > 0;

const formatTime = value => {
    const date = new Date(value || '');
    if (Number.isNaN(date.getTime())) {
        return '';
    }

    return date.toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
    });
};

const normalizeMessage = message => ({
    ...message,
    id: message?.id || `${message?.sender || 'user'}_${message?.createdAt || message?.timestamp || Date.now()}`,
    sender: message?.sender === 'hospital' ? 'hospital' : 'user',
    type: message?.type || 'text',
    content: String(message?.content || ''),
    createdAt: message?.createdAt || message?.timestamp || null,
    timestamp: formatTime(message?.createdAt || message?.timestamp),
});

const mergeMessages = messages => {
    const result = [];

    (Array.isArray(messages) ? messages : []).map(normalizeMessage).forEach(message => {
        const duplicated = result.some(item => item.id === message.id || (
            item.sender === message.sender
            && item.type === message.type
            && item.content === message.content
            && item.createdAt === message.createdAt
        ));

        if (!duplicated && message.content) {
            result.push(message);
        }
    });

    return result.sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
};

const getLatestMessageId = messages => messages[messages.length - 1]?.id || '';
const isNearBottom = element => !element || element.scrollHeight - element.scrollTop - element.clientHeight < 80;

const getSenderAvatar = (message, consultation, hospital) => {
    if (message?.sender === 'hospital') {
        return consultation?.hospitalAvatar || hospital?.avatar || '';
    }

    return consultation?.userAvatar || '';
};

const getSenderLabel = message => (message?.sender === 'hospital' ? '医院' : '我');

const validateFile = (file, type) => {
    if (!file) {
        return '未选择文件';
    }

    if (file.size > MAX_UPLOAD_SIZE) {
        return '文件大小不能超过 10MB';
    }

    if (type === 'image' && !String(file.type || '').startsWith('image/')) {
        return '请选择图片文件';
    }

    return '';
};

const ConsultationChat = ({ hospital, doctor, department, onClose, onEnd }) => {
    const [consultation, setConsultation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [sending, setSending] = useState(false);
    const [showRating, setShowRating] = useState(false);
    const [rating, setRating] = useState(5);
    const [feedback, setFeedback] = useState('');
    const [uploading, setUploading] = useState(false);
    const [hasUnreadNewMessages, setHasUnreadNewMessages] = useState(false);
    const messagesEndRef = useRef(null);
    const messagesRef = useRef(null);
    const pollingTimerRef = useRef(null);
    const lastMessageIdRef = useRef('');
    const autoScrollRef = useRef(true);

    const applyDetail = detail => {
        const nextMessages = mergeMessages(detail?.messages || []);
        lastMessageIdRef.current = getLatestMessageId(nextMessages);
        setConsultation(detail || null);
        setMessages(nextMessages);
        return detail;
    };

    const syncConsultationDetail = async consultationId => {
        if (!consultationId) {
            return null;
        }

        const detail = await getConsultationDetail(consultationId);
        return applyDetail(detail);
    };

    const appendOutgoingMessage = message => {
        const normalized = normalizeMessage(message);
        autoScrollRef.current = true;
        setHasUnreadNewMessages(false);
        lastMessageIdRef.current = normalized.id || lastMessageIdRef.current;
        setMessages(prev => mergeMessages([...prev, normalized]));
        setConsultation(prev => (prev ? {
            ...prev,
            status: prev.status === 'connecting' ? 'consulting' : prev.status,
            lastMessageAt: normalized.createdAt || prev.lastMessageAt,
        } : prev));
    };

    const handleMessagesScroll = () => {
        autoScrollRef.current = isNearBottom(messagesRef.current);
        if (autoScrollRef.current) {
            setHasUnreadNewMessages(false);
        }
    };

    const handleMessageKeyDown = event => {
        if (event.nativeEvent?.isComposing) {
            return;
        }

        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            handleSendMessage();
        }
    };

    // 初始化咨询会话
    useEffect(() => {
        let isActive = true;

        const initConsultation = async () => {
            try {
                setLoading(true);
                const consultationData = {
                    hospitalId: hospital.id,
                    hospitalName: hospital.name,
                    doctor,
                    department,
                };
                const newConsultation = await startConsultation(consultationData);
                if (!isActive) {
                    return;
                }

                const initialMessages = mergeMessages(newConsultation.messages);
                lastMessageIdRef.current = getLatestMessageId(initialMessages);
                setConsultation(newConsultation);
                setMessages(initialMessages);
            } catch (err) {
                if (isActive) {
                    setError('开始咨询失败，请重试');
                }
            } finally {
                if (isActive) {
                    setLoading(false);
                }
            }
        };

        initConsultation();

        return () => {
            isActive = false;
            if (pollingTimerRef.current) {
                clearInterval(pollingTimerRef.current);
                pollingTimerRef.current = null;
            }
        };
    }, [hospital, doctor, department]);

    useEffect(() => {
        if (!consultation?.id || consultation.status === 'completed') {
            if (pollingTimerRef.current) {
                clearInterval(pollingTimerRef.current);
                pollingTimerRef.current = null;
            }
            return undefined;
        }

        let polling = false;
        const pollLatestMessages = async () => {
            if (polling) {
                return;
            }
            polling = true;

            try {
                const pollResult = await pollConsultationMessages(consultation.id);
                if (!pollResult?.hasNewMessages) {
                    return;
                }

                const detail = await getConsultationDetail(consultation.id);
                const nextMessages = mergeMessages(detail?.messages || []);
                const nextLastMessageId = getLatestMessageId(nextMessages);
                if (nextLastMessageId && nextLastMessageId !== lastMessageIdRef.current) {
                    lastMessageIdRef.current = nextLastMessageId;
                    if (!autoScrollRef.current) {
                        setHasUnreadNewMessages(true);
                    }
                    setMessages(nextMessages);
                }
                setConsultation(detail);
                if (detail.status === 'completed') {
                    setShowRating(true);
                }
            } catch (err) {
                console.error('同步咨询消息失败:', err);
            } finally {
                polling = false;
            }
        };

        pollingTimerRef.current = setInterval(pollLatestMessages, POLL_MS);

        return () => {
            if (pollingTimerRef.current) {
                clearInterval(pollingTimerRef.current);
                pollingTimerRef.current = null;
            }
        };
    }, [consultation?.id, consultation?.status]);

    // 自动滚动到最新消息
    useEffect(() => {
        if (autoScrollRef.current) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    // 发送消息
    const handleSendMessage = async () => {
        if (!canSendText(inputText) || !consultation) return;

        try {
            setSending(true);
            setError(null);
            const message = await sendMessage(consultation.id, inputText.trim());
            appendOutgoingMessage(message);
            setInputText('');
        } catch (err) {
            setError('发送消息失败，请重试');
        } finally {
            setSending(false);
        }
    };

    // 处理文件上传
    const handleFileUpload = async e => {
        const file = e.target.files[0];
        if (!file || !consultation) return;

        const validationError = validateFile(file, 'file');
        if (validationError) {
            setError(validationError);
            e.target.value = '';
            return;
        }

        try {
            setUploading(true);
            setError(null);
            const result = await uploadFile(consultation.id, file);

            const fileMessage = await sendMessage(consultation.id, result.url, 'file');
            appendOutgoingMessage(fileMessage);
        } catch (err) {
            setError('上传文件失败，请重试');
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    // 处理图片上传
    const handleImageUpload = async e => {
        const file = e.target.files[0];
        if (!file || !consultation) return;

        const validationError = validateFile(file, 'image');
        if (validationError) {
            setError(validationError);
            e.target.value = '';
            return;
        }

        try {
            setUploading(true);
            setError(null);
            const result = await uploadFile(consultation.id, file);

            const imageMessage = await sendMessage(consultation.id, result.url, 'image');
            appendOutgoingMessage(imageMessage);
        } catch (err) {
            setError('上传图片失败，请重试');
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    // 结束咨询
    const handleEndConsultation = async () => {
        if (!consultation) return;

        try {
            setLoading(true);
            setError(null);
            const updatedConsultation = await endConsultation(consultation.id);
            setConsultation(prev => prev ? {
                ...prev,
                ...updatedConsultation,
            } : updatedConsultation);
            if (pollingTimerRef.current) {
                clearInterval(pollingTimerRef.current);
                pollingTimerRef.current = null;
            }
            setShowRating(true);
        } catch (err) {
            setError('结束咨询失败，请重试');
        } finally {
            setLoading(false);
        }
    };

    // 提交评价
    const handleSubmitRating = async () => {
        if (!consultation) return;

        try {
            setLoading(true);
            setError(null);
            await rateConsultation(consultation.id, rating, feedback);
            setShowRating(false);
            onEnd({
                ...consultation,
                rating,
                feedback,
            });
        } catch (err) {
            setError('提交评价失败，请重试');
        } finally {
            setLoading(false);
        }
    };

    if (loading && !consultation) {
        return <div className="consultation-chat__loading">连接中...</div>;
    }

    if (error && !consultation) {
        return <div className="consultation-chat__error">{error}</div>;
    }

    const scrollToLatestMessages = () => {
        autoScrollRef.current = true;
        setHasUnreadNewMessages(false);
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <div className="consultation-chat">
            {/* 聊天头部 */}
            <div className="consultation-chat__header">
                <div className="consultation-chat__info-wrap">
                    <div className="consultation-chat__hospital-avatar">
                        {hospital?.avatar ? (
                            <img src={hospital.avatar} alt={`${hospital.name}头像`} />
                        ) : (
                            <span>{hospital?.name?.slice(0, 1) || '医'}</span>
                        )}
                    </div>
                    <div className="consultation-chat__info">
                        <h3>{hospital.name}</h3>
                        <p>
                            {department} - {doctor}
                        </p>
                        <div
                            className={`consultation-chat__status consultation-chat__status--${consultation?.status}`}
                        >
                            {consultation?.status === 'connecting' && '连接中'}
                            {consultation?.status === 'consulting' && '咨询中'}
                            {consultation?.status === 'completed' && '已结束'}
                        </div>
                    </div>
                </div>
                {consultation?.status === 'consulting' && (
                    <button className="consultation-chat__end-btn" onClick={handleEndConsultation}>
                        结束咨询
                    </button>
                )}
            </div>

            {error && <div className="consultation-chat__error">{error}</div>}

            {/* 聊天内容 */}
            <div
                ref={messagesRef}
                className="consultation-chat__messages"
                onScroll={handleMessagesScroll}
            >
                {hasUnreadNewMessages && (
                    <button
                        type="button"
                        className="consultation-chat__new-message-tip"
                        onClick={scrollToLatestMessages}
                    >
                        有新消息，点击查看
                    </button>
                )}
                {messages.length === 0 ? (
                    <div className="consultation-chat__empty">开始咨询吧</div>
                ) : (
                    messages.map(message => {
                        const avatar = getSenderAvatar(message, consultation, hospital);

                        return (
                            <div
                                key={message.id}
                                className={`consultation-chat__message consultation-chat__message--${message.sender}`}
                            >
                                <div className="consultation-chat__message-avatar" aria-hidden="true">
                                    {avatar ? (
                                        <img src={avatar} alt="" />
                                    ) : (
                                        <span>{getSenderLabel(message).slice(0, 1)}</span>
                                    )}
                                </div>
                                <div className="consultation-chat__message-body">
                                    <div className="consultation-chat__message-sender">
                                        {getSenderLabel(message)}
                                    </div>
                                    <div className="consultation-chat__message-content">
                                        {message.type === 'text' && <p>{message.content}</p>}
                                        {message.type === 'image' && (
                                            <img
                                                src={message.content}
                                                alt="咨询图片"
                                                className="consultation-chat__message-image"
                                            />
                                        )}
                                        {message.type === 'file' && (
                                            <a
                                                href={message.content}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="consultation-chat__message-file"
                                            >
                                                查看文件
                                            </a>
                                        )}
                                        <span className="consultation-chat__message-time">
                                            {message.timestamp}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* 聊天输入 */}
            {consultation?.status === 'consulting' && (
                <div className="consultation-chat__input">
                    <div className="consultation-chat__input-actions">
                        <label className="consultation-chat__input-btn consultation-chat__input-btn--image">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleImageUpload}
                                disabled={uploading}
                            />
                            📷
                        </label>
                        <label className="consultation-chat__input-btn consultation-chat__input-btn--file">
                            <input
                                type="file"
                                accept=".pdf,.doc,.docx,.jpg,.png"
                                onChange={handleFileUpload}
                                disabled={uploading}
                            />
                            📎
                        </label>
                    </div>
                    <input
                        type="text"
                        placeholder={uploading ? '正在上传，请稍候...' : '输入消息，按 Enter 发送'}
                        value={inputText}
                        onChange={e => setInputText(e.target.value)}
                        onKeyDown={handleMessageKeyDown}
                        disabled={sending || uploading}
                        maxLength={1000}
                    />
                    <button onClick={handleSendMessage} disabled={sending || uploading || !canSendText(inputText)}>
                        {sending ? '发送中...' : '发送'}
                    </button>
                </div>
            )}

            {/* 评价表单 */}
            {showRating && (
                <div className="consultation-chat__rating">
                    <h3>评价本次咨询</h3>
                    <div className="consultation-chat__rating-stars">
                        {[1, 2, 3, 4, 5].map(star => (
                            <button
                                key={star}
                                className={`consultation-chat__rating-star ${star <= rating ? 'active' : ''}`}
                                onClick={() => setRating(star)}
                            >
                                ★
                            </button>
                        ))}
                    </div>
                    <textarea
                        placeholder="请输入您的反馈..."
                        value={feedback}
                        onChange={e => setFeedback(e.target.value)}
                        rows={3}
                        maxLength={300}
                    />
                    <div className="consultation-chat__rating-actions">
                        <button onClick={() => setShowRating(false)}>取消</button>
                        <button onClick={handleSubmitRating} disabled={loading}>
                            {loading ? '提交中...' : '提交评价'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ConsultationChat;

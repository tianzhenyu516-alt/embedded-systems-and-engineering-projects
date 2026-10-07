/**
 * 在线医院模块通用反馈态组件
 */

export const LoadingState = ({ className, text = '加载中...' }) => {
    return <div className={className}>{text}</div>;
};

export const ErrorState = ({ className, text, actionText = '', onAction = null }) => {
    return (
        <div className={className}>
            <p>{text}</p>
            {actionText && typeof onAction === 'function' && (
                <button onClick={onAction}>{actionText}</button>
            )}
        </div>
    );
};

export const EmptyState = ({ className, text }) => {
    return <div className={className}>{text}</div>;
};

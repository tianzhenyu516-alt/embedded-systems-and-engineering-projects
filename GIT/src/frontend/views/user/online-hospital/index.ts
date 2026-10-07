// 在线医院模块入口文件

// 导出组件
export { default as HospitalList } from '../../../components/business/online-hospital/hospital-list.js';
export { default as ConsultationChat } from '../../../components/business/online-hospital/consultation-chat.js';
export { default as AppointmentForm } from '../../../components/business/online-hospital/appointment-form.js';
export { default as ConsultationHistory } from '../../../components/business/online-hospital/consultation-history.js';
export { default as AppointmentRecords } from '../../../components/business/online-hospital/appointment-records.js';
export { default as NotificationCenter } from '../../../components/business/online-hospital/notification-center.js';

// 导出服务
export * from '../../../api/user/online-hospital/hospital-service.js';
export * from '../../../api/user/online-hospital/consultation-service.js';
export * from '../../../api/user/online-hospital/appointment-service.js';
export * from '../../../api/user/online-hospital/service-helpers.js';

// 导出工具
export * from '../../../utils/user/online-hospital/geolocation.js';
export * from '../../../utils/user/online-hospital/date-utils.js';
export * from '../../../utils/user/online-hospital/request.js';

// 导出钩子
export * from '../../../components/hooks/online-hospital/useNotification.js';
export * from '../../../components/hooks/online-hospital/useGeolocation.js';

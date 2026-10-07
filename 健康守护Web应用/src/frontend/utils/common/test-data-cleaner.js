/**
 * 测试数据清理工具
 * 用于清理开发测试过程中产生的测试数据
 */

class TestDataCleaner {
    constructor() {
        this._log('info', '测试数据清理工具已初始化');
    }

    /**
     * 统一的日志记录方法
     * @private
     * @param {string} level - 日志级别
     * @param {...any} args - 日志参数
     */
    _log(level, ...args) {
        if (window.logger) {
            window.logger[level](...args);
        } else {
            const consoleMethod = level === 'debug' ? 'log' : level;
            console[consoleMethod](...args);
        }
    }

    /**
     * 删除所有测试医院
     * @param {Object} options - 选项
     * @param {boolean} options.confirm - 是否需要确认（默认true）
     * @param {Array<string>} options.testKeywords - 测试关键词列表（用于识别测试数据）
     * @returns {Promise<Object>} 删除结果
     */
    async deleteTestHospitals(options = {}) {
        const {
            confirm: needConfirm = true,
            testKeywords = ['test', '测试', 'demo', '示例', 'temp', '临时'],
        } = options;

        try {
            // 获取所有医院
            const hospitals = JSON.parse(localStorage.getItem('hospitals') || '[]');

            if (hospitals.length === 0) {
                this._log('info', '没有找到医院数据');
                return { success: true, deleted: 0, message: '没有医院数据' };
            }

            // 识别测试医院
            const testHospitals = hospitals.filter(hospital => {
                const name = (hospital.name || '').toLowerCase();
                const username = (hospital.username || '').toLowerCase();

                return testKeywords.some(
                    keyword =>
                        name.includes(keyword.toLowerCase())
                        || username.includes(keyword.toLowerCase()),
                );
            });

            if (testHospitals.length === 0) {
                this._log('info', '没有找到测试医院');
                return { success: true, deleted: 0, message: '没有找到测试医院' };
            }

            // 显示将要删除的医院信息
            const hospitalNames = testHospitals.map(h => h.name || h.username).join(', ');
            this._log('info', `找到 ${testHospitals.length} 个测试医院:`, hospitalNames);

            // 如果需要确认
            if (needConfirm && typeof window !== 'undefined') {
                const confirmed = window.confirm(
                    `确定要删除 ${testHospitals.length} 个测试医院吗？\n\n`
                        + `医院列表：${hospitalNames}\n\n`
                        + '此操作不可恢复！',
                );

                if (!confirmed) {
                    this._log('info', '用户取消了删除操作');
                    return { success: false, deleted: 0, message: '用户取消了操作' };
                }
            }

            // 删除测试医院
            const testHospitalIds = testHospitals.map(h => h.id);
            const remainingHospitals = hospitals.filter(h => !testHospitalIds.includes(h.id));

            localStorage.setItem('hospitals', JSON.stringify(remainingHospitals));

            this._log('info', `成功删除 ${testHospitals.length} 个测试医院`);

            return {
                success: true,
                deleted: testHospitals.length,
                remaining: remainingHospitals.length,
                deletedHospitals: testHospitals.map(h => ({
                    id: h.id,
                    name: h.name || h.username,
                    username: h.username,
                })),
            };
        } catch (error) {
            this._log('error', '删除测试医院失败:', error);
            throw error;
        }
    }

    /**
     * 删除所有医院（谨慎使用）
     * @param {boolean} needConfirm - 是否需要确认
     * @returns {Promise<Object>} 删除结果
     */
    async deleteAllHospitals(needConfirm = true) {
        try {
            const hospitals = JSON.parse(localStorage.getItem('hospitals') || '[]');

            if (hospitals.length === 0) {
                return { success: true, deleted: 0, message: '没有医院数据' };
            }

            if (needConfirm && typeof window !== 'undefined') {
                const confirmed = window.confirm(
                    `警告：确定要删除所有 ${hospitals.length} 个医院吗？\n\n` + '此操作不可恢复！',
                );

                if (!confirmed) {
                    return { success: false, deleted: 0, message: '用户取消了操作' };
                }
            }

            const deletedCount = hospitals.length;
            localStorage.setItem('hospitals', JSON.stringify([]));

            this._log('warn', `已删除所有 ${deletedCount} 个医院`);

            return {
                success: true,
                deleted: deletedCount,
                remaining: 0,
            };
        } catch (error) {
            this._log('error', '删除所有医院失败:', error);
            throw error;
        }
    }

    /**
     * 根据ID删除指定医院
     * @param {string} hospitalId - 医院ID或用户名
     * @returns {Promise<Object>} 删除结果
     */
    async deleteHospitalById(hospitalId) {
        if (!hospitalId) {
            throw new Error('医院ID不能为空');
        }

        try {
            if (window.apiService && typeof window.apiService.deleteAdminHospital === 'function') {
                await window.apiService.deleteAdminHospital(hospitalId);
                this._log('info', `成功删除医院: ${hospitalId}`);
                return { success: true, deleted: hospitalId };
            } else {
                // 直接操作 localStorage
                const hospitals = JSON.parse(localStorage.getItem('hospitals') || '[]');
                const filtered = hospitals.filter(
                    h => h.id !== hospitalId && h.username !== hospitalId,
                );

                if (filtered.length === hospitals.length) {
                    return { success: false, message: '未找到指定的医院' };
                }

                localStorage.setItem('hospitals', JSON.stringify(filtered));
                this._log('info', `成功删除医院: ${hospitalId}`);
                return { success: true, deleted: hospitalId };
            }
        } catch (error) {
            this._log('error', '删除医院失败:', error);
            throw error;
        }
    }

    /**
     * 获取所有医院信息（用于预览）
     * @returns {Array} 医院列表
     */
    getAllHospitals() {
        try {
            return JSON.parse(localStorage.getItem('hospitals') || '[]');
        } catch (error) {
            this._log('error', '获取医院列表失败:', error);
            return [];
        }
    }

    /**
     * 统计医院数据
     * @returns {Object} 统计信息
     */
    getHospitalStats() {
        try {
            const hospitals = JSON.parse(localStorage.getItem('hospitals') || '[]');

            const testKeywords = ['test', '测试', 'demo', '示例', 'temp', '临时'];
            const testHospitals = hospitals.filter(hospital => {
                const name = (hospital.name || '').toLowerCase();
                const username = (hospital.username || '').toLowerCase();
                return testKeywords.some(
                    keyword =>
                        name.includes(keyword.toLowerCase())
                        || username.includes(keyword.toLowerCase()),
                );
            });

            return {
                total: hospitals.length,
                test: testHospitals.length,
                normal: hospitals.length - testHospitals.length,
                hospitals: hospitals.map(h => ({
                    id: h.id,
                    name: h.name || h.username,
                    username: h.username,
                    isTest: testHospitals.some(th => th.id === h.id),
                })),
            };
        } catch (error) {
            this._log('error', '获取医院统计失败:', error);
            return { total: 0, test: 0, normal: 0, hospitals: [] };
        }
    }
}

// 创建全局实例
if (typeof window !== 'undefined') {
    window.testDataCleaner = new TestDataCleaner();
}

// 导出类（用于模块环境）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TestDataCleaner;
}

// 用户界面功能脚本 - 增强版
// 包含所有用户界面按钮的功能实现
// 版本: 7.0

console.log('===== 用户界面脚本开始加载 =====');

// 全局函数暴露到window对象，确保onclick事件可以访问
window.showProfileTab = showProfileTab;
window.switchExercisePlan = switchExercisePlan;
window.generateAIVisit = generateAIVisit;
window.getFoodRecommendation = getFoodRecommendation;
window.showAddCustomPlanModal = showAddCustomPlanModal;
window.clearChatHistory = clearChatHistory;
window.sendMessage = sendMessage;
window.startMeditation = startMeditation;
window.showSleepTips = showSleepTips;
window.showSocialTips = showSocialTips;
window.showLearningTips = showLearningTips;
window.getStressAdvice = getStressAdvice;
window.showAIConsultationHistory = showAIConsultationHistory;
window.analyzeSymptomsWithAI = analyzeSymptomsWithAI;
window.loadConsultationHistory = loadConsultationHistory;
window.callEmergency = callEmergency;
window.findHospital = findHospital;
window.startOnlineConsultation = startOnlineConsultation;
window.editHealthProfile = editHealthProfile;
window.cancelEditHealthProfile = cancelEditHealthProfile;
window.saveHealthProfile = saveHealthProfile;
window.loadUserAppointments = loadUserAppointments;
window.filterUserAppointments = filterUserAppointments;
window.handleAvatarUpload = handleAvatarUpload;
window.changePassword = changePassword;
window.triggerSync = triggerSync;
window.deactivateUserAccount = deactivateUserAccount;
window.resetAccountForm = resetAccountForm;
window.saveAccountInfo = saveAccountInfo;
window.exportData = exportData;
window.closeManualDataEntry = closeManualDataEntry;
window.saveManualData = saveManualData;
window.escapeHtml = escapeHtml;

// 运动计划标签页切换函数
function switchExercisePlan(planType) {
    console.log('switchExercisePlan被调用，参数:', planType);
    const startTime = performance.now();

    try {
        // 移除所有标签页按钮的active状态
        const buttons = document.querySelectorAll('.plan-tabs .tab-btn');
        console.log('找到运动计划标签页按钮数量:', buttons.length);
        buttons.forEach(btn => {
            btn.classList.remove('active');
        });

        // 隐藏所有计划内容
        const dailyPlan = document.getElementById('daily-plan');
        const weeklyPlan = document.getElementById('weekly-plan');
        const customPlan = document.getElementById('custom-plan');

        if (dailyPlan) {
            dailyPlan.classList.remove('active');
        }
        if (weeklyPlan) {
            weeklyPlan.classList.remove('active');
        }
        if (customPlan) {
            customPlan.classList.remove('active');
        }

        // 设置当前按钮为active状态
        const activeButton = document.querySelector(`.plan-tabs .tab-btn[data-plan="${planType}"]`);
        if (activeButton) {
            activeButton.classList.add('active');
        }

        // 显示对应的计划内容
        let targetPlan;
        switch (planType) {
            case 'daily':
                targetPlan = dailyPlan;
                break;
            case 'weekly':
                targetPlan = weeklyPlan;
                break;
            case 'custom':
                targetPlan = customPlan;
                break;
            default:
                targetPlan = dailyPlan;
        }

        if (targetPlan) {
            targetPlan.classList.add('active');
        }

        const endTime = performance.now();
        const responseTime = endTime - startTime;
        console.log(`运动计划切换完成，响应时间: ${responseTime.toFixed(2)}ms`);

        if (responseTime > 300) {
            console.warn('警告：响应时间超过300ms！');
        }
    } catch (error) {
        console.error('切换运动计划时出错:', error);
        alert(`切换运动计划时出现错误，请刷新页面重试。错误: ${error.message}`);
    }
}

// Profile标签页切换函数
function showProfileTab(tabId) {
    console.log('showProfileTab被调用，参数:', tabId);
    try {
        // 隐藏所有标签页内容
        const tabs = document.querySelectorAll('.profile-tab-content');
        console.log('找到标签页数量:', tabs.length);
        tabs.forEach(tab => {
            tab.style.display = 'none';
            tab.classList.remove('active');
        });

        // 移除所有按钮的active状态
        const buttons = document.querySelectorAll('.profile-tab-btn');
        console.log('找到标签页按钮数量:', buttons.length);
        buttons.forEach(btn => {
            btn.classList.remove('active');
        });

        // 显示选中的标签页
        const targetTab = document.getElementById(`profile-${tabId}`);
        console.log('目标标签页元素:', targetTab);
        if (targetTab) {
            targetTab.style.display = 'block';
            targetTab.classList.add('active');
        } else {
            console.error('未找到目标标签页:', `profile-${tabId}`);
        }

        // 设置选中按钮的active状态
        const activeButton = document.querySelector(`.profile-tab-btn[data-tab="${tabId}"]`);
        console.log('目标按钮元素:', activeButton);
        if (activeButton) {
            activeButton.classList.add('active');
        }

        // 保存当前标签页状态
        sessionStorage.setItem('currentProfileTab', tabId);

        console.log('切换到标签页成功:', tabId);
    } catch (error) {
        console.error('切换标签页时出错:', error);
        alert(`切换页面时出现错误，请刷新页面重试。错误: ${error.message}`);
    }
}

// 生成AI健康建议
function generateAIVisit() {
    console.log('generateAIVisit被调用');
    try {
        const adviceElement = document.getElementById('ai-advice-text');
        if (adviceElement) {
            adviceElement.innerHTML
                = '<i class="fas fa-spinner fa-spin"></i> 正在生成个性化建议...';
        }

        // 模拟AI生成延迟
        setTimeout(() => {
            const advices = [
                '根据您的健康数据，建议您保持当前的锻炼习惯，并注意增加水分摄入。',
                '您的睡眠质量很好！建议继续保持规律的作息时间。',
                '今日运动量达标！建议明天可以尝试一些轻度拉伸运动。',
                '您的血压和心率都在正常范围内，继续保持健康的生活方式！',
            ];
            const randomAdvice = advices[Math.floor(Math.random() * advices.length)];
            if (adviceElement) {
                adviceElement.textContent = randomAdvice;
            }
            console.log('AI建议生成完成');
        }, 1000);
    } catch (error) {
        console.error('生成AI建议时出错:', error);
        alert('生成建议时出现错误，请重试。');
    }
}

// 获取食物推荐
function getFoodRecommendation() {
    console.log('getFoodRecommendation被调用');
    try {
        const ingredients = document.getElementById('ingredients-input');
        const recommendBtn = document.getElementById('recommend-btn');

        if (ingredients && !ingredients.value.trim()) {
            alert('请输入您现有的食材！');
            return;
        }

        if (recommendBtn) {
            recommendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 正在分析食材...';
            recommendBtn.disabled = true;
        }

        // 模拟AI推荐延迟
        setTimeout(() => {
            alert('AI已根据您的食材生成了推荐菜品！\n\n（这是演示功能，实际推荐需要后端支持）');
            if (recommendBtn) {
                recommendBtn.innerHTML
                    = '<i class="fas fa-magic"></i> 输入您的食材，获取AI智能推荐';
                recommendBtn.disabled = false;
            }
            console.log('食物推荐完成');
        }, 1500);
    } catch (error) {
        console.error('获取食物推荐时出错:', error);
        alert('获取推荐时出现错误，请重试。');
    }
}

// 显示添加自定义计划模态框
function showAddCustomPlanModal() {
    console.log('showAddCustomPlanModal被调用');
    alert('添加自定义运动计划功能\n\n（这是演示功能）');
}

// 清空聊天历史
function clearChatHistory() {
    console.log('clearChatHistory被调用');
    if (confirm('确定要清空聊天记录吗？')) {
        const chatMessages = document.getElementById('chat-messages');
        if (chatMessages) {
            chatMessages.innerHTML = `
                <div class="message ai-message">
                    <div class="message-avatar">
                        <i class="fas fa-robot"></i>
                    </div>
                    <div class="message-content">
                        <p>我是心屿。这里没有评判，只有理解的空间。你可以分享任何感受——沉重的、混乱的，或是难以名状的。今天，是什么让你来到了这里？</p>
                    </div>
                </div>
            `;
        }
        console.log('聊天历史已清空');
    }
}

// 发送聊天消息
function sendMessage() {
    console.log('sendMessage被调用');
    try {
        const input = document.getElementById('chat-input');
        const chatMessages = document.getElementById('chat-messages');

        if (!input || !chatMessages || !input.value.trim()) {
            console.log('输入为空或元素未找到');
            return;
        }

        // 添加用户消息
        const userMessage = document.createElement('div');
        userMessage.className = 'message user-message';
        userMessage.innerHTML = `
            <div class="message-avatar">
                <i class="fas fa-user"></i>
            </div>
            <div class="message-content">
                <p>${escapeHtml(input.value)}</p>
            </div>
        `;
        chatMessages.appendChild(userMessage);

        const userText = input.value;
        input.value = '';

        // 滚动到底部
        chatMessages.scrollTop = chatMessages.scrollHeight;

        // 模拟AI回复
        setTimeout(() => {
            const aiReply = document.createElement('div');
            aiReply.className = 'message ai-message';
            aiReply.innerHTML = `
                <div class="message-avatar">
                    <i class="fas fa-robot"></i>
                </div>
                <div class="message-content">
                    <p>感谢您的分享。我能理解您的感受。让我们一起慢慢探索这些情绪吧。</p>
                </div>
            `;
            chatMessages.appendChild(aiReply);
            chatMessages.scrollTop = chatMessages.scrollHeight;
            console.log('消息发送完成');
        }, 1000);
    } catch (error) {
        console.error('发送消息时出错:', error);
    }
}

// 开始冥想
function startMeditation() {
    console.log('startMeditation被调用');
    const button = document.getElementById('meditation-button');
    const status = document.getElementById('meditation-status');
    const statusText = document.getElementById('meditation-status-text');

    if (button && status) {
        button.style.display = 'none';
        status.style.display = 'block';

        let seconds = 900; // 15分钟
        const timer = setInterval(() => {
            const minutes = Math.floor(seconds / 60);
            const secs = seconds % 60;
            if (statusText) {
                statusText.textContent = `冥想中... ${minutes}:${secs.toString().padStart(2, '0')}`;
            }
            seconds--;

            if (seconds < 0) {
                clearInterval(timer);
                if (statusText) {
                    statusText.textContent = '冥想完成！';
                }
                if (button) {
                    button.textContent = '再次冥想';
                    button.style.display = 'inline-block';
                }
                console.log('冥想完成');
            }
        }, 1000);
    }
}

// 显示睡眠建议
function showSleepTips() {
    console.log('showSleepTips被调用');
    alert(
        '睡眠优化建议：\n\n1. 保持规律的睡眠时间\n2. 睡前1小时避免使用电子设备\n3. 保持卧室黑暗和凉爽\n4. 避免睡前摄入咖啡因',
    );
}

// 显示社交建议
function showSocialTips() {
    console.log('showSocialTips被调用');
    alert(
        '社交连接建议：\n\n1. 每周至少与朋友或家人联系一次\n2. 参加兴趣小组活动\n3. 分享您的感受和经历\n4. 倾听他人的故事',
    );
}

// 显示学习建议
function showLearningTips() {
    console.log('showLearningTips被调用');
    alert(
        '学习成长建议：\n\n1. 设定小目标，逐步实现\n2. 每天学习30分钟\n3. 尝试新的爱好\n4. 记录您的进步',
    );
}

// 获取压力管理建议
function getStressAdvice() {
    console.log('getStressAdvice被调用');
    const btn = document.getElementById('get-stress-advice-btn');
    const content = document.getElementById('stress-advice-content');
    const text = document.getElementById('stress-advice-text');

    if (btn && content && text) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 正在分析...';

        setTimeout(() => {
            text.innerHTML
                = '根据您的健康数据，建议您：<br><br>'
                + '1. 每天进行10-15分钟的深呼吸练习<br>'
                + '2. 尝试渐进式肌肉放松法<br>'
                + '3. 保证充足的睡眠时间<br>'
                + '4. 与亲友分享您的感受';
            content.style.display = 'block';
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-robot"></i> 获取AI压力管理建议';
            console.log('压力建议获取完成');
        }, 1500);
    }
}

// 显示AI咨询历史
function showAIConsultationHistory() {
    console.log('showAIConsultationHistory被调用');
    alert('AI咨询历史\n\n（这是演示功能）');
}

// AI分析症状
function analyzeSymptomsWithAI() {
    console.log('analyzeSymptomsWithAI被调用');
    const mainSymptom = document.getElementById('main-symptom');
    const result = document.getElementById('ai-symptom-analysis-result');
    const content = document.getElementById('ai-analysis-content');

    if (!mainSymptom || !mainSymptom.value) {
        alert('请选择主要症状！');
        return;
    }

    if (result && content) {
        result.style.display = 'block';
        content.innerHTML = `
            <h4 style="color: #333; margin-bottom: 10px;"><i class="fas fa-check-circle" style="color: #4CAF50;"></i> 分析完成</h4>
            <p style="color: #666; line-height: 1.8;">
                根据您描述的症状，可能是普通感冒或轻度不适。<br><br>
                <strong>建议：</strong><br>
                - 多休息，保持充足睡眠<br>
                - 多喝水<br>
                - 如症状加重或持续，请及时就医
            </p>
        `;
        console.log('症状分析完成');
    }
}

// 加载咨询历史
function loadConsultationHistory() {
    console.log('loadConsultationHistory被调用');
    alert('加载咨询历史\n\n（这是演示功能）');
}

// 拨打急救电话
function callEmergency() {
    console.log('callEmergency被调用');
    alert('急救电话功能\n\n（在实际环境中，这将拨打120）');
}

// 查找医院
function findHospital() {
    console.log('findHospital被调用');
    alert('查找附近医院\n\n（这是演示功能，将使用地图API查找医院）');
}

// 开始在线咨询
function startOnlineConsultation() {
    console.log('startOnlineConsultation被调用');
    alert('开始在线咨询\n\n（这是演示功能）');
}

// 编辑健康档案
function editHealthProfile() {
    console.log('editHealthProfile被调用');
    const display = document.getElementById('health-profile-display');
    const edit = document.getElementById('health-profile-edit');

    if (display && edit) {
        display.style.display = 'none';
        edit.style.display = 'block';
        console.log('进入编辑模式');
    }
}

// 取消编辑健康档案
function cancelEditHealthProfile() {
    console.log('cancelEditHealthProfile被调用');
    const display = document.getElementById('health-profile-display');
    const edit = document.getElementById('health-profile-edit');

    if (display && edit) {
        edit.style.display = 'none';
        display.style.display = 'block';
        console.log('取消编辑');
    }
}

// 保存健康档案
function saveHealthProfile() {
    console.log('saveHealthProfile被调用');
    alert('保存健康档案\n\n（这是演示功能，数据将保存到后端）');

    const display = document.getElementById('health-profile-display');
    const edit = document.getElementById('health-profile-edit');

    if (display && edit) {
        edit.style.display = 'none';
        display.style.display = 'block';
        console.log('健康档案保存完成');
    }
}

// 加载用户预约
function loadUserAppointments() {
    console.log('loadUserAppointments被调用');
    const list = document.getElementById('user-appointments-list');
    if (list) {
        list.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #999;">
                <i class="fas fa-calendar-check" style="font-size: 48px; margin-bottom: 15px; color: #667eea;"></i>
                <p>暂无预约记录</p>
            </div>
        `;
        console.log('预约加载完成');
    }
}

// 筛选用户预约
function filterUserAppointments() {
    console.log('filterUserAppointments被调用');
    loadUserAppointments();
}

// 处理头像上传
function handleAvatarUpload(event) {
    console.log('handleAvatarUpload被调用');
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const avatar = document.getElementById('account-avatar');
            if (avatar) {
                avatar.src = e.target.result;
            }
            console.log('头像上传完成');
        };
        reader.readAsDataURL(file);
    }
}

// 修改密码
function changePassword() {
    console.log('changePassword被调用');
    alert('修改密码\n\n（这是演示功能）');
}

// 触发同步
function triggerSync() {
    console.log('triggerSync被调用');
    const btn = document.getElementById('sync-now-btn');
    const icon = document.getElementById('sync-icon');
    const text = document.getElementById('sync-text');
    const status = document.getElementById('sync-status');
    const statusText = document.getElementById('sync-status-text');

    if (btn && icon && text) {
        btn.disabled = true;
        icon.classList.add('fa-spin');
        text.textContent = '同步中...';

        if (status && statusText) {
            status.style.display = 'block';
            statusText.textContent = '正在同步数据...';
        }

        setTimeout(() => {
            btn.disabled = false;
            icon.classList.remove('fa-spin');
            text.textContent = '立即同步';

            if (status && statusText) {
                statusText.textContent = '同步完成！';
            }

            const syncInfo = document.getElementById('sync-info');
            const syncSuccessText = document.getElementById('sync-success-text');
            if (syncInfo && syncSuccessText) {
                syncInfo.style.display = 'block';
                syncSuccessText.textContent = '所有数据已同步成功！';
            }
            console.log('数据同步完成');
        }, 2000);
    }
}

// 注销用户账户
function deactivateUserAccount() {
    console.log('deactivateUserAccount被调用');
    if (confirm('警告：此操作不可恢复！\n\n确定要注销账号吗？')) {
        alert('账号注销功能\n\n（这是演示功能）');
    }
}

// 重置账户表单
function resetAccountForm() {
    console.log('resetAccountForm被调用');
    if (confirm('确定要重置表单吗？所有未保存的修改将丢失。')) {
        alert('表单已重置');
    }
}

// 保存账户信息
function saveAccountInfo() {
    console.log('saveAccountInfo被调用');
    alert('保存账户信息\n\n（这是演示功能，数据将保存到后端）');
}

// 导出数据
function exportData() {
    console.log('exportData被调用');
    alert('导出数据\n\n（这是演示功能）');
}

// 关闭手动数据录入
function closeManualDataEntry() {
    console.log('closeManualDataEntry被调用');
    const modal = document.getElementById('manualDataModal');
    if (modal) {
        modal.style.display = 'none';
        console.log('手动数据录入模态框已关闭');
    }
}

// 保存手动数据
function saveManualData(event) {
    console.log('saveManualData被调用');
    event.preventDefault();
    alert('保存手动录入数据\n\n（这是演示功能）');
    closeManualDataEntry();
}

// 工具函数：HTML转义
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 页面加载完成后的初始化
document.addEventListener('DOMContentLoaded', () => {
    console.log('===== DOM加载完成，初始化用户界面 =====');

    // 初始化模态框关闭按钮
    const modal = document.getElementById('modal');
    const closeBtn = modal ? modal.querySelector('.close') : null;
    if (closeBtn) {
        closeBtn.onclick = function () {
            modal.style.display = 'none';
        };
    }

    // 点击模态框外部关闭
    window.onclick = function (event) {
        const manualModal = document.getElementById('manualDataModal');
        if (event.target === manualModal) {
            closeManualDataEntry();
        }
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    };

    // 添加按钮点击监听器 - 增强版
    const allButtons = document.querySelectorAll('button, [onclick]');
    console.log('找到可交互元素数量:', allButtons.length);

    // 为所有按钮添加调试日志
    allButtons.forEach((element, index) => {
        const originalOnclick = element.getAttribute('onclick');
        if (originalOnclick) {
            console.log(`元素 ${index + 1}:`, element.tagName, originalOnclick);
        }
    });

    console.log('===== 用户界面初始化完成 =====');
});

console.log('===== 用户界面脚本加载完成 =====');

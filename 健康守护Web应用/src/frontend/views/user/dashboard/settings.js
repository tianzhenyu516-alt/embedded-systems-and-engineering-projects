/* global APIService */
/* eslint-disable no-unused-vars */

const SETTINGS_STORAGE_PREFIX = 'userSettings';

class SettingsPage {
    constructor() {
        this.apiService = new APIService();
        this.currentUser = null;
        this.cropImageData = null;
        this.cropState = {
            imageData: '',
            sourceType: 'image/png',
            sourceImage: null,
            fileName: '',
            scale: 1,
            minScale: 1,
            maxScale: 4,
            offsetX: 0,
            offsetY: 0,
            isDragging: false,
            dragStartX: 0,
            dragStartY: 0,
            lastPointerId: null,
            pinchDistance: 0,
            pinchStartScale: 1,
        };
        this.init();
    }

    async init() {
        await this.loadUserInfo();
        this.initAvatarEditor();
        this.setupEventListeners();
        await this.loadSettings();
        this.updateNotificationPermissionStatus();
        this.updateLocationPermissionStatus();
        this.initSettingsSync();
    }

    /**
     * 初始化设置同步功能
     */
    initSettingsSync() {
        if (window.settingsSyncManager) {
            window.settingsSyncManager.addSyncListener((event, data) => {
                this.handleSyncEvent(event, data);
            });

            // 初始拉取设置
            window.settingsSyncManager.pullSettings().catch(err => {
                console.error('初始设置拉取失败:', err);
            });
        }
    }

    /**
     * 处理同步事件
     */
    handleSyncEvent(event, data) {
        switch (event) {
            case 'status_changed':
                this.updateSyncStatusUI(data);
                break;
            case 'settings_updated':
                this.loadSettings();
                break;
            case 'conflict_detected':
                this.showConflictResolutionDialog(data);
                break;
            case 'conflict_resolved':
                this.loadSettings();
                break;
        }
    }

    /**
     * 更新同步状态 UI
     */
    updateSyncStatusUI(statusData) {
        const statusElement = document.getElementById('sync-status');
        const statusTextElement = document.getElementById('sync-status-text');
        const lastSyncElement = document.getElementById('last-sync-time');

        if (!statusElement || !statusTextElement) return;

        statusElement.className = 'sync-status sync-status-' + statusData.status;
        
        const statusTexts = {
            idle: '等待同步',
            syncing: '正在同步...',
            success: '同步成功',
            error: '同步失败'
        };
        statusTextElement.textContent = statusTexts[statusData.status] || statusData.message;

        if (lastSyncElement && window.settingsSyncManager) {
            const syncStatus = window.settingsSyncManager.getSyncStatus();
            if (syncStatus.lastSync) {
                const date = new Date(syncStatus.lastSync);
                lastSyncElement.textContent = '上次同步: ' + date.toLocaleString('zh-CN');
            }
        }
    }

    /**
     * 显示冲突解决对话框
     */
    showConflictResolutionDialog(data) {
    }

    /**
     * 手动触发同步
     */
    async triggerManualSync() {
        if (!window.settingsSyncManager) {
            return;
        }

        const result = await window.settingsSyncManager.triggerManualSync();
        if (result.success) {
        } else {
        }
    }

    async loadUserInfo() {
        try {
            const loginInfo = JSON.parse(sessionStorage.getItem('loginInfo'));
            if (loginInfo && loginInfo.user) {
                this.currentUser = loginInfo.user;
                this.currentUserId = String(loginInfo.user.id || loginInfo.user.userId || loginInfo.user.username || loginInfo.username || '');

                try {
                    const response = await this.apiService.getCurrentUserProfile();
                    const latestUser = response?.data || response;
                    if (latestUser) {
                        this.currentUser = {
                            ...this.currentUser,
                            ...latestUser,
                        };

                        const nextLoginInfo = {
                            ...loginInfo,
                            username: this.currentUser.username || loginInfo.username,
                            user: {
                                ...loginInfo.user,
                                ...this.currentUser,
                            },
                        };

                        sessionStorage.setItem('loginInfo', JSON.stringify(nextLoginInfo));
                        localStorage.setItem('loginInfo', JSON.stringify(nextLoginInfo));
                    }
                } catch (error) {
                    console.error('获取最新用户资料失败，继续使用本地缓存:', error);
                }
                
                // 尝试从 localStorage 中获取最新的用户信息（包含头像）
                try {
                    const users = JSON.parse(localStorage.getItem('users') || '[]');
                    const accounts = JSON.parse(localStorage.getItem('accounts') || '{}');
                    const accountsUsers = accounts.user || [];
                    
                    // 在所有数据源中查找用户
                    let foundUser = users.find(u => u.id === this.currentUser.id || u.username === this.currentUser.username);
                    if (!foundUser) {
                        foundUser = accountsUsers.find(u => u.id === this.currentUser.id || u.username === this.currentUser.username);
                    }
                    
                    // 如果找到了用户且有头像，更新 currentUser
                    if (foundUser && foundUser.avatar) {
                        this.currentUser.avatar = foundUser.avatar;
                    }
                } catch (error) {
                    console.error('从 localStorage 获取用户头像失败:', error);
                }
                
                this.populateUserInfo();
            }
        } catch (error) {
            console.error('加载用户信息失败:', error);
        }
    }

    initAvatarEditor() {
        if (!window.AvatarEditor) {
            return;
        }

        const currentAvatar = this.currentUser?.avatar || document.getElementById('current-avatar')?.src || '';
        this.avatarEditor = window.AvatarEditor.create({
            title: '头像设置',
            currentAvatar,
            helperText: '支持 JPG、PNG、WEBP，裁剪结果会压缩到 640×640 以内',
            onSave: async avatarData => {
                this.showAvatarLoading(true);
                try {
                    const loginInfo = JSON.parse(sessionStorage.getItem('loginInfo') || 'null');
                    if (!loginInfo || !loginInfo.user) {
                        throw new Error('登录状态已失效，请重新登录');
                    }

                    await this.apiService.updateUserAvatar(loginInfo.user.id, avatarData);
                    loginInfo.user.avatar = avatarData;
                    sessionStorage.setItem('loginInfo', JSON.stringify(loginInfo));
                    this.currentUser = {
                        ...this.currentUser,
                        avatar: avatarData,
                    };

                    const avatarImg = document.getElementById('current-avatar');
                    if (avatarImg) {
                        avatarImg.src = avatarData;
                    }

                    const headerAvatar = document.querySelector('.avatar');
                    if (headerAvatar) {
                        headerAvatar.style.backgroundImage = `url(${avatarData})`;
                    }

                    this.updateAvatarStatus(avatarData);
                    this.broadcastAvatarUpdate(avatarData);
                } finally {
                    this.showAvatarLoading(false);
                }
            },
            onError: error => {
            },
        });
    }

    populateUserInfo() {
        const usernameInput = document.getElementById('username');
        const emailInput = document.getElementById('email');
        const genderSelect = document.getElementById('gender');
        const ageInput = document.getElementById('age');
        const heightInput = document.getElementById('height');
        const weightInput = document.getElementById('weight');
        const avatarImg = document.getElementById('current-avatar');

        if (usernameInput) {
            usernameInput.value = this.currentUser.nickname || this.currentUser.username || '';
        }
        if (emailInput && this.currentUser.email) {
            emailInput.value = this.currentUser.email;
        }
        if (genderSelect) {
            genderSelect.value = this.currentUser.gender || '保密';
        }
        if (ageInput && this.currentUser.age !== undefined && this.currentUser.age !== null) {
            ageInput.value = this.currentUser.age;
        }
        if (heightInput && this.currentUser.height !== undefined && this.currentUser.height !== null) {
            heightInput.value = this.currentUser.height;
        }
        if (weightInput && this.currentUser.weight !== undefined && this.currentUser.weight !== null) {
            weightInput.value = this.currentUser.weight;
        }
        if (avatarImg && this.currentUser.avatar) {
            avatarImg.src = this.currentUser.avatar;
        } else if (avatarImg) {
            avatarImg.removeAttribute('src');
            avatarImg.alt = `${this.currentUser.nickname || this.currentUser.username || '用户'}头像`;
        }
        this.updateAvatarStatus(this.currentUser.avatar);
        this.updateBasicProfileStatus();
        // 更新顶部导航栏头像
        const headerAvatar = document.querySelector('.avatar');
        if (headerAvatar && this.currentUser.avatar) {
            headerAvatar.style.backgroundImage = `url(${this.currentUser.avatar})`;
        }
    }

    updateBasicProfileStatus() {
        const statusElement = document.getElementById('basic-profile-status');
        if (!statusElement) {
            return;
        }

        const profile = {
            gender: this.currentUser?.gender || null,
            age: window.ProfileCompletion?.parseUserAge
                ? window.ProfileCompletion.parseUserAge(this.currentUser || {})
                : Number.isFinite(Number(this.currentUser?.age)) ? Number(this.currentUser.age) : null,
            height: window.ProfileCompletion?.safeNumber
                ? window.ProfileCompletion.safeNumber(this.currentUser?.height)
                : Number.isFinite(Number(this.currentUser?.height)) ? Number(this.currentUser.height) : null,
            weight: window.ProfileCompletion?.safeNumber
                ? window.ProfileCompletion.safeNumber(this.currentUser?.weight)
                : Number.isFinite(Number(this.currentUser?.weight)) ? Number(this.currentUser.weight) : null,
        };

        const hasCompletedProfile = window.ProfileCompletion?.hasCompletedBasicProfile
            ? window.ProfileCompletion.hasCompletedBasicProfile(profile)
            : Boolean(profile.gender && Number.isFinite(profile.age) && Number.isFinite(profile.height) && Number.isFinite(profile.weight));

        if (hasCompletedProfile) {
            statusElement.textContent = '基础档案已完善，首页将不再显示补充提醒。';
            statusElement.style.color = '#00b42a';
            return;
        }

        const missingFields = window.ProfileCompletion?.getMissingBasicProfileFields
            ? window.ProfileCompletion.getMissingBasicProfileFields(profile)
            : ['性别', '年龄', '身高', '体重'].filter((field, index) => {
                const checks = [profile.gender, profile.age, profile.height, profile.weight];
                return !checks[index] && !Number.isFinite(checks[index]);
            });

        statusElement.textContent = `基础档案还差：${missingFields.join('、')}。完善后首页提醒会自动消失。`;
        statusElement.style.color = '#ff7d00';
    }



    getCurrentUserSettingsKey() {
        return this.currentUserId ? `${SETTINGS_STORAGE_PREFIX}_${this.currentUserId}` : SETTINGS_STORAGE_PREFIX;
    }

    saveScopedSettings(storageKey, settings) {
        localStorage.setItem(this.getCurrentUserSettingsKey(), JSON.stringify({
            ...(this.getAllScopedSettings() || {}),
            [storageKey]: settings,
        }));
    }

    getAllScopedSettings() {
        try {
            const savedSettings = localStorage.getItem(this.getCurrentUserSettingsKey());
            return savedSettings ? JSON.parse(savedSettings) : {};
        } catch (error) {
            console.error('读取用户设置失败:', error);
            return {};
        }
    }

    setupEventListeners() {
        const avatarInput = document.getElementById('avatar-input');
        if (avatarInput) {
            avatarInput.addEventListener('change', e => this.handleAvatarSelect(e));
        }

        const openAvatarEditor = event => {
            event?.preventDefault?.();
            event?.stopPropagation?.();
            if (this.avatarEditor) {
                this.avatarEditor.open(this.currentUser?.avatar || document.getElementById('current-avatar')?.src || '');
            } else if (avatarInput) {
                avatarInput.click();
            }
        };

        const avatarOverlay = document.querySelector('.avatar-overlay');
        if (avatarOverlay) {
            avatarOverlay.addEventListener('click', openAvatarEditor);
        }

        const avatarPreviewWrapper = document.querySelector('.avatar-preview-wrapper');
        if (avatarPreviewWrapper) {
            avatarPreviewWrapper.addEventListener('click', openAvatarEditor);
        }

        const avatarButton = document.getElementById('avatar-button');
        const avatarMenu = document.getElementById('avatar-menu');
        if (avatarButton && avatarMenu) {
            avatarButton.addEventListener('click', e => {
                e.stopPropagation();
                avatarMenu.classList.toggle('show');
            });

            document.addEventListener('click', () => {
                avatarMenu.classList.remove('show');
            });

            avatarMenu.addEventListener('click', e => {
                e.stopPropagation();
            });
        }

        const cropZoom = document.getElementById('crop-zoom');
        if (cropZoom) {
            cropZoom.addEventListener('input', e => this.handleZoomChange(e));
        }

        this.setupCropInteractions();

        const notificationCheckboxes = document.querySelectorAll(
            '.settings-section:nth-of-type(4) .switch input',
        );
        notificationCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.saveNotificationSettings();
            });
        });

        const privacyCheckboxes = document.querySelectorAll(
            '.settings-section:nth-of-type(5) .switch input',
        );
        privacyCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.savePrivacySettings();
            });
        });

        const deactivateUserAccountButton = document.getElementById('deactivate-user-account');
        if (deactivateUserAccountButton) {
            deactivateUserAccountButton.addEventListener('click', () => {
                this.deactivateUserAccount();
            });
        }

        const requestNotificationPermissionButton = document.getElementById('request-notification-permission');
        if (requestNotificationPermissionButton) {
            requestNotificationPermissionButton.addEventListener('click', () => {
                this.requestNotificationPermission();
            });
        }

        const requestLocationPermissionButton = document.getElementById('request-location-permission');
        if (requestLocationPermissionButton) {
            requestLocationPermissionButton.addEventListener('click', () => {
                this.requestLocationPermission();
            });
        }

        const viewPrivacyPolicyButton = document.getElementById('view-privacy-policy');
        if (viewPrivacyPolicyButton) {
            viewPrivacyPolicyButton.addEventListener('click', () => {
                this.showPrivacyPolicySummary();
            });
        }

        const privacyPolicyModal = document.getElementById('privacy-policy-modal');
        const closePrivacyPolicyModalButton = document.getElementById('close-privacy-policy-modal');
        const confirmPrivacyPolicyModalButton = document.getElementById('confirm-privacy-policy-modal');
        [closePrivacyPolicyModalButton, confirmPrivacyPolicyModalButton].forEach(button => {
            button?.addEventListener('click', () => {
                this.hidePrivacyPolicyModal();
            });
        });
        privacyPolicyModal?.addEventListener('click', event => {
            if (event.target === privacyPolicyModal) {
                this.hidePrivacyPolicyModal();
            }
        });
    }

    handleAvatarSelect(event) {
        if (this.avatarEditor) {
            this.avatarEditor.open(this.currentUser?.avatar || document.getElementById('current-avatar')?.src || '');
            if (event?.target) {
                event.target.value = '';
            }
            return;
        }

        const file = event.target.files[0];
        if (!file) {
            return;
        }

        const maxFileSize = 5 * 1024 * 1024;
        if (file.size > maxFileSize) {
            event.target.value = '';
            return;
        }

        if (!file.type.startsWith('image/')) {
            event.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = e => {
            this.cropImageData = e.target.result;
            this.openCropModal(e.target.result, file.type || 'image/png', file.name || '');
        };
        reader.readAsDataURL(file);
    }

    openCropModal(imageData, fileType = 'image/png', fileName = '') {
        const modal = document.getElementById('crop-modal');
        const cropImage = document.getElementById('crop-image');
        const zoomSlider = document.getElementById('crop-zoom');

        if (!modal || !cropImage || !zoomSlider) {
            return;
        }

        const sourceImage = new Image();
        sourceImage.onload = () => {
            const minScale = this.calculateMinScale(sourceImage);
            this.cropState = {
                ...this.cropState,
                imageData,
                sourceType: fileType,
                sourceImage,
                fileName,
                scale: minScale,
                minScale,
                maxScale: Math.max(minScale + 2.5, minScale * 3),
                offsetX: 0,
                offsetY: 0,
                isDragging: false,
                dragStartX: 0,
                dragStartY: 0,
                lastPointerId: null,
                pinchDistance: 0,
                pinchStartScale: minScale,
            };

            zoomSlider.min = String(minScale);
            zoomSlider.max = String(this.cropState.maxScale);
            zoomSlider.step = '0.01';
            zoomSlider.value = String(minScale);

            cropImage.src = imageData;
            modal.style.display = 'flex';
            this.renderCropImage();
            this.updateCropPreview();
        };
        sourceImage.src = imageData;
    }

    closeCropModal() {
        const modal = document.getElementById('crop-modal');
        if (modal) {
            modal.style.display = 'none';
        }

        this.cropState = {
            ...this.cropState,
            imageData: '',
            sourceImage: null,
            fileName: '',
            offsetX: 0,
            offsetY: 0,
            isDragging: false,
            dragStartX: 0,
            dragStartY: 0,
            lastPointerId: null,
            pinchDistance: 0,
            pinchStartScale: this.cropState.minScale,
        };

        const avatarInput = document.getElementById('avatar-input');
        if (avatarInput) {
            avatarInput.value = '';
        }
    }

    calculateMinScale(image) {
        const cropSize = 280;
        return Math.max(cropSize / image.naturalWidth, cropSize / image.naturalHeight, 0.4);
    }

    handleZoomChange(event) {
        const nextScale = parseFloat(event.target.value);
        this.updateScale(nextScale);
    }

    updateScale(nextScale) {
        if (!Number.isFinite(nextScale)) {
            return;
        }

        const boundedScale = Math.min(
            this.cropState.maxScale,
            Math.max(this.cropState.minScale, nextScale),
        );

        this.cropState.scale = boundedScale;
        this.syncZoomSlider();
        this.clampCropOffsets();
        this.renderCropImage();
        this.updateCropPreview();
    }

    syncZoomSlider() {
        const zoomSlider = document.getElementById('crop-zoom');
        if (zoomSlider) {
            zoomSlider.value = String(this.cropState.scale);
        }
    }

    setupCropInteractions() {
        const cropArea = document.querySelector('.crop-area');
        if (!cropArea) {
            return;
        }

        cropArea.addEventListener('wheel', event => this.handleCropWheel(event), { passive: false });
        cropArea.addEventListener('pointerdown', event => this.startCropDrag(event));
        cropArea.addEventListener('pointermove', event => this.onCropDrag(event));
        cropArea.addEventListener('pointerup', event => this.endCropDrag(event));
        cropArea.addEventListener('pointerleave', event => this.endCropDrag(event));
        cropArea.addEventListener('pointercancel', event => this.endCropDrag(event));
        cropArea.addEventListener('touchstart', event => this.startPinchZoom(event), { passive: false });
        cropArea.addEventListener('touchmove', event => this.handlePinchZoom(event), { passive: false });
        cropArea.addEventListener('touchend', () => this.resetPinchZoom());
        cropArea.addEventListener('touchcancel', () => this.resetPinchZoom());
    }

    handleCropWheel(event) {
        if (!this.cropState.sourceImage) {
            return;
        }

        event.preventDefault();
        const zoomStep = event.deltaY < 0 ? 0.08 : -0.08;
        this.updateScale(this.cropState.scale + zoomStep);
    }

    startCropDrag(event) {
        if (!this.cropState.sourceImage) {
            return;
        }

        const cropArea = document.querySelector('.crop-area');
        if (!cropArea) {
            return;
        }

        this.cropState.isDragging = true;
        this.cropState.lastPointerId = event.pointerId;
        this.cropState.dragStartX = event.clientX - this.cropState.offsetX;
        this.cropState.dragStartY = event.clientY - this.cropState.offsetY;
        cropArea.classList.add('is-dragging');

        if (cropArea.setPointerCapture) {
            cropArea.setPointerCapture(event.pointerId);
        }
    }

    startPinchZoom(event) {
        if (event.touches.length < 2) {
            return;
        }

        event.preventDefault();
        this.cropState.isDragging = false;
        this.cropState.pinchDistance = this.getTouchDistance(event.touches[0], event.touches[1]);
        this.cropState.pinchStartScale = this.cropState.scale;

        const cropArea = document.querySelector('.crop-area');
        if (cropArea) {
            cropArea.classList.remove('is-dragging');
        }
    }

    onCropDrag(event) {
        if (!this.cropState.isDragging || event.pointerId !== this.cropState.lastPointerId) {
            return;
        }

        this.cropState.offsetX = event.clientX - this.cropState.dragStartX;
        this.cropState.offsetY = event.clientY - this.cropState.dragStartY;
        this.clampCropOffsets();
        this.renderCropImage();
        this.updateCropPreview();
    }

    handlePinchZoom(event) {
        if (event.touches.length < 2) {
            return;
        }

        event.preventDefault();
        const distance = this.getTouchDistance(event.touches[0], event.touches[1]);
        if (!this.cropState.pinchDistance || !distance) {
            this.cropState.pinchDistance = distance;
            this.cropState.pinchStartScale = this.cropState.scale;
            return;
        }

        const nextScale = this.cropState.pinchStartScale * (distance / this.cropState.pinchDistance);
        this.updateScale(nextScale);
    }

    getTouchDistance(firstTouch, secondTouch) {
        return Math.hypot(
            secondTouch.clientX - firstTouch.clientX,
            secondTouch.clientY - firstTouch.clientY,
        );
    }

    resetPinchZoom() {
        this.cropState.pinchDistance = 0;
        this.cropState.pinchStartScale = this.cropState.scale;
    }

    endCropDrag(event) {
        if (event && event.pointerType === 'touch') {
            this.resetPinchZoom();
        }

        if (!this.cropState.isDragging) {
            return;
        }

        if (event && this.cropState.lastPointerId !== null && event.pointerId !== this.cropState.lastPointerId) {
            return;
        }

        const cropArea = document.querySelector('.crop-area');
        if (cropArea) {
            cropArea.classList.remove('is-dragging');
            if (event && cropArea.releasePointerCapture) {
                try {
                    cropArea.releasePointerCapture(event.pointerId);
                } catch (_error) {
                    // ignore release failures
                }
            }
        }

        this.cropState.isDragging = false;
        this.cropState.lastPointerId = null;
    }

    clampCropOffsets() {
        const image = this.cropState.sourceImage;
        if (!image) {
            return;
        }

        const cropSize = 280;
        const scaledWidth = image.naturalWidth * this.cropState.scale;
        const scaledHeight = image.naturalHeight * this.cropState.scale;
        const maxOffsetX = Math.max(0, (scaledWidth - cropSize) / 2);
        const maxOffsetY = Math.max(0, (scaledHeight - cropSize) / 2);

        this.cropState.offsetX = Math.min(maxOffsetX, Math.max(-maxOffsetX, this.cropState.offsetX));
        this.cropState.offsetY = Math.min(maxOffsetY, Math.max(-maxOffsetY, this.cropState.offsetY));
    }

    renderCropImage() {
        const cropImage = document.getElementById('crop-image');
        if (!cropImage || !this.cropState.sourceImage) {
            return;
        }

        cropImage.style.width = `${this.cropState.sourceImage.naturalWidth}px`;
        cropImage.style.height = `${this.cropState.sourceImage.naturalHeight}px`;
        cropImage.style.transform = `translate(calc(-50% + ${this.cropState.offsetX}px), calc(-50% + ${this.cropState.offsetY}px)) scale(${this.cropState.scale})`;
    }

    updateCropPreview() {
        const cropPreview = document.getElementById('crop-preview');
        const image = this.cropState.sourceImage;

        if (!cropPreview || !image) {
            return;
        }

        const ctx = cropPreview.getContext('2d');
        const previewSize = 220;
        const cropSize = 280;
        cropPreview.width = previewSize;
        cropPreview.height = previewSize;

        ctx.clearRect(0, 0, previewSize, previewSize);
        ctx.save();
        ctx.beginPath();
        ctx.arc(previewSize / 2, previewSize / 2, previewSize / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();

        const scaleRatio = previewSize / cropSize;
        const drawWidth = image.naturalWidth * this.cropState.scale * scaleRatio;
        const drawHeight = image.naturalHeight * this.cropState.scale * scaleRatio;
        const drawX = previewSize / 2 - drawWidth / 2 + this.cropState.offsetX * scaleRatio;
        const drawY = previewSize / 2 - drawHeight / 2 + this.cropState.offsetY * scaleRatio;

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
        ctx.restore();
    }

    updateAvatarStatus(avatarData) {
        const statusElement = document.getElementById('avatar-sync-status');
        if (!statusElement) {
            return;
        }

        if (avatarData) {
            const updatedAt = new Date().toLocaleString('zh-CN', {
                hour12: false,
            });
            statusElement.textContent = `头像已就绪，最近同步时间：${updatedAt}`;
            statusElement.classList.add('is-ready');
        } else {
            statusElement.textContent = '当前头像将同步展示到用户端各页面';
            statusElement.classList.remove('is-ready');
        }
    }

    async applyCrop() {
        const image = this.cropState.sourceImage;
        if (!image) {
            return;
        }

        const canvas = document.createElement('canvas');
        const outputSize = 512;
        const cropSize = 280;
        canvas.width = outputSize;
        canvas.height = outputSize;

        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        ctx.save();
        ctx.beginPath();
        ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();

        const exportRatio = outputSize / cropSize;
        const drawWidth = image.naturalWidth * this.cropState.scale * exportRatio;
        const drawHeight = image.naturalHeight * this.cropState.scale * exportRatio;
        const drawX = outputSize / 2 - drawWidth / 2 + this.cropState.offsetX * exportRatio;
        const drawY = outputSize / 2 - drawHeight / 2 + this.cropState.offsetY * exportRatio;

        ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
        ctx.restore();

        const avatarData = canvas.toDataURL('image/png');

        this.showAvatarLoading(true);

        try {
            const loginInfo = JSON.parse(sessionStorage.getItem('loginInfo'));
            if (loginInfo && loginInfo.user) {
                await this.apiService.updateUserAvatar(loginInfo.user.id, avatarData);

                loginInfo.user.avatar = avatarData;
                sessionStorage.setItem('loginInfo', JSON.stringify(loginInfo));
                this.currentUser = {
                    ...this.currentUser,
                    avatar: avatarData,
                };

                const avatarImg = document.getElementById('current-avatar');
                if (avatarImg) {
                    avatarImg.src = avatarData;
                }

                const headerAvatar = document.querySelector('.avatar');
                if (headerAvatar) {
                    headerAvatar.style.backgroundImage = `url(${avatarData})`;
                }

                this.updateAvatarStatus(avatarData);
                this.broadcastAvatarUpdate(avatarData);
            }
        } catch (error) {
        } finally {
            this.showAvatarLoading(false);
            this.closeCropModal();
        }
    }

    showAvatarLoading(show) {
        const loading = document.getElementById('avatar-loading');
        if (loading) {
            loading.style.display = show ? 'flex' : 'none';
        }
    }

    showError(message) {
        if (typeof showErrorToast === 'function') {
            showErrorToast(message);
            return;
        }
        window.alert(message);
    }

    showSuccess(message) {
        if (typeof showSuccessToast === 'function') {
            showSuccessToast(message);
            return;
        }
        window.alert(message);
    }

    /**
     * 广播头像更新事件
     * 使用 BroadcastChannel 实现同源页面间的实时通信
     * @param {string} avatarData - 头像的 Base64 数据
     */
    broadcastAvatarUpdate(avatarData) {
        if (window.AvatarEditor) {
            window.AvatarEditor.broadcast({
                avatar: avatarData,
                scope: 'user',
                userId: this.currentUserId || String(this.currentUser?.id || ''),
                username: this.currentUser?.username || '',
            });
            return;
        }

        try {
            // 使用 BroadcastChannel 通知其他页面
            if (typeof BroadcastChannel !== 'undefined') {
                const channel = new BroadcastChannel('avatar_sync');
                channel.postMessage({
                    type: 'AVATAR_UPDATED',
                    avatar: avatarData,
                    timestamp: Date.now(),
                });
                channel.close();
            }

            // 同时触发 localStorage 事件作为兼容性备份
            localStorage.setItem(
                'avatarUpdate',
                JSON.stringify({
                    avatar: avatarData,
                    timestamp: Date.now(),
                }),
            );
            // 立即删除，避免影响下次更新
            localStorage.removeItem('avatarUpdate');
        } catch (error) {
            console.error('广播头像更新失败:', error);
        }
    }

    async savePersonalInfo() {
        const username = document.getElementById('username').value.trim();
        const email = document.getElementById('email').value.trim();
        const gender = document.getElementById('gender').value;
        const ageValue = document.getElementById('age').value.trim();
        const heightValue = document.getElementById('height').value.trim();
        const weightValue = document.getElementById('weight').value.trim();

        if (!username) {
            this.showError('用户名不能为空');
            return;
        }

        if (email && !this.isValidEmail(email)) {
            this.showError('请输入有效的邮箱地址');
            return;
        }

        const age = ageValue ? Number(ageValue) : null;
        const height = heightValue ? Number(heightValue) : null;
        const weight = weightValue ? Number(weightValue) : null;

        if (ageValue && (!Number.isFinite(age) || age < 0 || age > 150)) {
            this.showError('请输入有效的年龄');
            return;
        }

        if (heightValue && (!Number.isFinite(height) || height <= 0)) {
            this.showError('请输入有效的身高');
            return;
        }

        if (weightValue && (!Number.isFinite(weight) || weight <= 0)) {
            this.showError('请输入有效的体重');
            return;
        }

        try {
            const updateData = {
                nickname: username,
                email: email || null,
                gender,
                age,
                height,
                weight,
            };

            const response = await this.apiService.updateCurrentUserProfile(updateData);
            const responseData = response?.data || response;
            if (!responseData) {
                throw new Error('保存响应数据格式错误');
            }

            const profileDraft = {
                ...updateData,
                username: this.currentUser?.username || '',
            };
            const sessionLoginInfo = JSON.parse(sessionStorage.getItem('loginInfo') || 'null');
            const localLoginInfo = JSON.parse(localStorage.getItem('loginInfo') || 'null');
            const mergedUser = {
                ...(localLoginInfo?.user || {}),
                ...(sessionLoginInfo?.user || {}),
                ...profileDraft,
                ...responseData,
                username: responseData.username || sessionLoginInfo?.user?.username || localLoginInfo?.user?.username || this.currentUser?.username || '',
            };

            const persistLoginInfo = rawLoginInfo => rawLoginInfo && rawLoginInfo.user
                ? {
                    ...rawLoginInfo,
                    username: mergedUser.username || rawLoginInfo.username,
                    user: {
                        ...rawLoginInfo.user,
                        ...mergedUser,
                    },
                }
                : null;

            const nextSessionLoginInfo = persistLoginInfo(sessionLoginInfo) || persistLoginInfo(localLoginInfo);
            const nextLocalLoginInfo = persistLoginInfo(localLoginInfo) || persistLoginInfo(sessionLoginInfo);

            if (nextSessionLoginInfo) {
                sessionStorage.setItem('loginInfo', JSON.stringify(nextSessionLoginInfo));
            }
            if (nextLocalLoginInfo) {
                localStorage.setItem('loginInfo', JSON.stringify(nextLocalLoginInfo));
            }

            try {
                const users = JSON.parse(localStorage.getItem('users') || '[]');
                const userIndex = users.findIndex(item => item.id === mergedUser.id || item.username === mergedUser.username);
                if (userIndex !== -1) {
                    users[userIndex] = {
                        ...users[userIndex],
                        ...mergedUser,
                    };
                    localStorage.setItem('users', JSON.stringify(users));
                }
            } catch (storageError) {
                console.error('同步 users 档案失败:', storageError);
            }

            try {
                const accounts = JSON.parse(localStorage.getItem('accounts') || '{}');
                const accountUsers = Array.isArray(accounts.user) ? accounts.user : [];
                const accountUserIndex = accountUsers.findIndex(item => item.id === mergedUser.id || item.username === mergedUser.username);
                if (accountUserIndex !== -1) {
                    accountUsers[accountUserIndex] = {
                        ...accountUsers[accountUserIndex],
                        ...mergedUser,
                    };
                    accounts.user = accountUsers;
                    localStorage.setItem('accounts', JSON.stringify(accounts));
                }
            } catch (storageError) {
                console.error('同步 accounts.user 档案失败:', storageError);
            }

            this.currentUser = {
                ...this.currentUser,
                ...mergedUser,
            };
            this.populateUserInfo();
            this.showSuccess('个人信息保存成功');

            try {
                localStorage.setItem('profileCompletionUpdatedAt', String(Date.now()));
                localStorage.removeItem('profileCompletionUpdatedAt');
                window.dispatchEvent(new CustomEvent('profileCompletionUpdated'));
            } catch (storageError) {
                console.error('广播档案更新失败:', storageError);
            }
        } catch (error) {
            this.showError(error.message || '保存失败');
        }
    }

    async changePassword() {
        const currentPassword = document.getElementById('current-password').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        if (!currentPassword || !newPassword || !confirmPassword) {
            return;
        }

        if (newPassword !== confirmPassword) {
            return;
        }

        if (newPassword.length < 6) {
            return;
        }

        try {
            const loginInfo = JSON.parse(sessionStorage.getItem('loginInfo'));
            if (loginInfo && loginInfo.user && loginInfo.token) {
                const response = await fetch(`/api/users/change-password`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${loginInfo.token}`,
                    },
                    body: JSON.stringify({
                        userId: loginInfo.user.id,
                        currentPassword,
                        newPassword,
                        confirmPassword,
                    }),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || '密码修改失败');
                }

                document.getElementById('current-password').value = '';
                document.getElementById('new-password').value = '';
                document.getElementById('confirm-password').value = '';
            }
        } catch (error) {
        }
    }

    async deactivateUserAccount() {
        const confirmed = confirm('⚠️ 注销账号后将清除当前用户登录状态和本地资料，此操作不可恢复。\n\n确定要继续吗？');
        if (!confirmed) {
            return;
        }

        const confirmedAgain = confirm('请再次确认：您真的要注销用户账号吗？');
        if (!confirmedAgain) {
            return;
        }

        try {
            await this.apiService.deleteCurrentUserAccount();

            if (window.AuthGuard && typeof window.AuthGuard.clearAuthState === 'function') {
                window.AuthGuard.clearAuthState();
            } else if (window.AuthGuard && typeof window.AuthGuard.logout === 'function') {
                window.AuthGuard.logout();
                return;
            }

            window.location.href = '/views/auth/login.html?logout=true';
        } catch (error) {
            console.error('注销用户账号失败:', error);
            window.alert(error?.message || '注销账号失败，请稍后重试');
        }
    }

    async saveNotificationSettings() {
        const checkboxes = document.querySelectorAll(
            '.settings-section:nth-of-type(4) .switch input',
        );
        const settings = {
            healthReminders: checkboxes[0]?.checked,
            appointmentNotifications: checkboxes[1]?.checked,
            activityPush: checkboxes[2]?.checked,
        };

        if (window.settingsSyncManager) {
            await window.settingsSyncManager.updateSetting('notification', 'healthReminders', settings.healthReminders);
            await window.settingsSyncManager.updateSetting('notification', 'appointmentNotifications', settings.appointmentNotifications);
            await window.settingsSyncManager.updateSetting('notification', 'activityPush', settings.activityPush);
            await window.settingsSyncManager.pushSettings();
        } else {
            this.saveScopedSettings('notificationSettings', settings);
        }

    }

    async requestNotificationPermission() {
        if (!('Notification' in window)) {
            this.updateNotificationPermissionStatus('unsupported');
            return;
        }

        const permission = await Notification.requestPermission();
        this.updateNotificationPermissionStatus(permission);
        if (permission === 'granted') {
            return;
        }

        if (permission === 'denied') {
            return;
        }

    }

    updateNotificationPermissionStatus(permission = null) {
        const statusElement = document.getElementById('notification-permission-status');
        if (!statusElement) {
            return;
        }

        const currentPermission = permission || ('Notification' in window ? Notification.permission : 'unsupported');
        const labelMap = {
            granted: '通知权限状态：已授权，可接收系统通知',
            denied: '通知权限状态：已拒绝，请前往浏览器设置开启',
            default: '通知权限状态：尚未选择，可点击上方按钮授权',
            unsupported: '通知权限状态：当前浏览器不支持系统通知',
        };
        statusElement.textContent = labelMap[currentPermission] || '通知权限状态：未知';
    }

    async sendTestNotification() {
        const checkboxes = document.querySelectorAll(
            '.settings-section:nth-of-type(4) .switch input',
        );

        if (!checkboxes[0]?.checked && !checkboxes[1]?.checked && !checkboxes[2]?.checked) {
            return;
        }

        const title = '健康管理平台测试通知';
        const body = '这是一条真实测试消息，已写入站内通知，并会尽量触发系统通知。';

        try {
            await this.apiService.createAdminNotification({
                title,
                content: body,
                level: 'info',
                type: 'system-test',
            });
            window.dispatchEvent(new CustomEvent('userNotificationUpdated'));

        } catch (error) {
            return;
        }

        if (!('Notification' in window)) {
            this.updateNotificationPermissionStatus('unsupported');
            return;
        }

        let permission = Notification.permission;
        if (permission === 'default') {
            permission = await Notification.requestPermission();
        }
        this.updateNotificationPermissionStatus(permission);

        if (permission === 'granted') {
            const notification = new Notification(title, {
                body,
                icon: '/assets/icons/favicon.svg',
                tag: 'health-guardian-test-notification',
            });

            notification.onclick = () => {
                window.focus();
                notification.close();
            };

            setTimeout(() => notification.close(), 5000);
            return;
        }

    }

    async loadNotificationSettings() {
        if (window.settingsSyncManager) {
            const savedSettings = await window.settingsSyncManager.getLocalSettings();
            if (savedSettings && savedSettings.notification) {
                const checkboxes = document.querySelectorAll(
                    '.settings-section:nth-of-type(4) .switch input',
                );
                if (checkboxes[0]) {
                    checkboxes[0].checked = savedSettings.notification.healthReminders !== false;
                }
                if (checkboxes[1]) {
                    checkboxes[1].checked = savedSettings.notification.appointmentNotifications !== false;
                }
                if (checkboxes[2]) {
                    checkboxes[2].checked = savedSettings.notification.activityPush === true;
                }
            }
        } else {
            const settings = this.getAllScopedSettings().notificationSettings;
            if (settings) {
                const checkboxes = document.querySelectorAll(
                    '.settings-section:nth-of-type(4) .switch input',
                );
                if (checkboxes[0]) {
                    checkboxes[0].checked = settings.healthReminders !== false;
                }
                if (checkboxes[1]) {
                    checkboxes[1].checked = settings.appointmentNotifications !== false;
                }
                if (checkboxes[2]) {
                    checkboxes[2].checked = settings.activityPush === true;
                }
            }
        }

        this.updateNotificationPermissionStatus();
    }

    async savePrivacySettings() {
        const checkboxes = document.querySelectorAll(
            '.settings-section:nth-of-type(5) .switch input',
        );
        const settings = {
            dataCollection: checkboxes[0]?.checked,
            locationAccess: checkboxes[1]?.checked,
        };

        if (window.settingsSyncManager) {
            await window.settingsSyncManager.updateSetting('privacy', 'dataCollection', settings.dataCollection);
            await window.settingsSyncManager.updateSetting('privacy', 'locationAccess', settings.locationAccess);
            await window.settingsSyncManager.pushSettings();
        } else {
            this.saveScopedSettings('privacySettings', settings);
        }

    }

    requestLocationPermission() {
        if (!navigator.geolocation) {
            this.updateLocationPermissionStatus('unsupported');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            position => {
                const { latitude, longitude } = position.coords;
                this.updateLocationPermissionStatus('granted', {
                    latitude,
                    longitude,
                });
            },
            error => {
                const status = error.code === 1 ? 'denied' : 'prompt';
                this.updateLocationPermissionStatus(status);
                const messageMap = {
                    1: '位置权限已被拒绝，请在浏览器设置中手动开启',
                    2: '暂时无法获取当前位置，请稍后重试',
                    3: '获取当前位置超时，请稍后重试',
                };
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0,
            },
        );
    }

    async updateLocationPermissionStatus(status = null, position = null) {
        const statusElement = document.getElementById('location-permission-status');
        if (!statusElement) {
            return;
        }

        let nextStatus = status;
        if (!nextStatus && navigator.permissions?.query) {
            try {
                const permissionStatus = await navigator.permissions.query({ name: 'geolocation' });
                nextStatus = permissionStatus.state;
                permissionStatus.onchange = () => {
                    this.updateLocationPermissionStatus(permissionStatus.state);
                };
            } catch (_error) {
                nextStatus = null;
            }
        }

        if (!nextStatus) {
            nextStatus = navigator.geolocation ? 'prompt' : 'unsupported';
        }

        const labelMap = {
            granted: '位置权限状态：已授权',
            denied: '位置权限状态：已拒绝，请前往浏览器设置开启',
            prompt: '位置权限状态：尚未选择，可点击上方按钮请求授权',
            unsupported: '位置权限状态：当前浏览器不支持定位能力',
        };

        let text = labelMap[nextStatus] || '位置权限状态：未知';
        if (nextStatus === 'granted' && position?.latitude && position?.longitude) {
            text += `（最近坐标：${position.latitude.toFixed(4)}, ${position.longitude.toFixed(4)}）`;
        }
        statusElement.textContent = text;
    }

    showPrivacyPolicySummary() {
        const modal = document.getElementById('privacy-policy-modal');
        if (modal) {
            modal.style.display = 'flex';
        }
    }

    hidePrivacyPolicyModal() {
        const modal = document.getElementById('privacy-policy-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    async loadPrivacySettings() {
        if (window.settingsSyncManager) {
            const savedSettings = await window.settingsSyncManager.getLocalSettings();
            if (savedSettings && savedSettings.privacy) {
                const checkboxes = document.querySelectorAll(
                    '.settings-section:nth-of-type(5) .switch input',
                );
                if (checkboxes[0]) {
                    checkboxes[0].checked = savedSettings.privacy.dataCollection !== false;
                }
                if (checkboxes[1]) {
                    checkboxes[1].checked = savedSettings.privacy.locationAccess !== false;
                }
            }
        } else {
            const settings = this.getAllScopedSettings().privacySettings;
            if (settings) {
                const checkboxes = document.querySelectorAll(
                    '.settings-section:nth-of-type(5) .switch input',
                );
                if (checkboxes[0]) {
                    checkboxes[0].checked = settings.dataCollection !== false;
                }
                if (checkboxes[1]) {
                    checkboxes[1].checked = settings.locationAccess !== false;
                }
            }
        }

        this.updateLocationPermissionStatus();
    }

    loadSettings() {
        this.loadNotificationSettings();
        this.loadPrivacySettings();
    }

    checkUpdate() {
    }

    showSuccess(message) {
        if (typeof window.showSuccessToast === 'function') {
            window.showSuccessToast(message);
            return;
        }
        window.alert(message);
    }

    showError(message) {
        if (typeof window.showErrorToast === 'function') {
            window.showErrorToast(message);
            return;
        }
        window.alert(message);
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
}

function savePersonalInfo() {
    if (window.settingsPage) {
        window.settingsPage.savePersonalInfo();
    }
}

function changePassword() {
    if (window.settingsPage) {
        window.settingsPage.changePassword();
    }
}

function checkUpdate() {
    if (window.settingsPage) {
        window.settingsPage.checkUpdate();
    }
}

function closeCropModal() {
    if (window.settingsPage) {
        window.settingsPage.closeCropModal();
    }
}

function applyCrop() {
    if (window.settingsPage) {
        window.settingsPage.applyCrop();
    }
}

function triggerManualSync() {
    if (window.settingsPage) {
        window.settingsPage.triggerManualSync();
    }
}

function deactivateUserAccount() {
    if (window.settingsPage) {
        window.settingsPage.deactivateUserAccount();
    }
}

async function logout() {
    if (confirm('确定要退出登录吗？')) {
        if (window.AuthGuard) {
            AuthGuard.logout();
        }
    }
}

// 设置头像同步监听（用于设置页面顶部导航栏）
function setupSettingsAvatarSync() {
    // 使用 BroadcastChannel 监听头像更新
    if (typeof BroadcastChannel !== 'undefined') {
        const channel = new BroadcastChannel('avatar_sync');
        channel.onmessage = event => {
            if (event.data && event.data.type === 'AVATAR_UPDATED') {
                updateSettingsAvatarDisplay(event.data.avatar);
            }
        };
    }

    // 兼容性备份：监听 localStorage 变化
    window.addEventListener('storage', e => {
        if (e.key === 'avatarUpdate' && e.newValue) {
            try {
                const data = JSON.parse(e.newValue);
                if (data && data.avatar) {
                    updateSettingsAvatarDisplay(data.avatar);
                }
            } catch (error) {
                console.error('解析头像更新数据失败:', error);
            }
        }
    });
}

// 更新设置页面头像显示
function updateSettingsAvatarDisplay(avatarData) {
    // 更新顶部导航栏头像
    const headerAvatar = document.querySelector('.avatar');
    if (headerAvatar) {
        headerAvatar.style.backgroundImage = `url(${avatarData})`;
    }
    // 更新设置页面的头像预览
    const avatarImg = document.getElementById('current-avatar');
    if (avatarImg) {
        avatarImg.src = avatarData;
    }
    if (window.settingsPage) {
        window.settingsPage.updateAvatarStatus(avatarData);
    }
    // 同时更新 sessionStorage
    try {
        const loginInfo = JSON.parse(sessionStorage.getItem('loginInfo'));
        if (loginInfo && loginInfo.user) {
            loginInfo.user.avatar = avatarData;
            sessionStorage.setItem('loginInfo', JSON.stringify(loginInfo));
        }
    } catch (error) {
        console.error('更新 sessionStorage 头像失败:', error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.settingsPage = new SettingsPage();
    setupSettingsAvatarSync();
});

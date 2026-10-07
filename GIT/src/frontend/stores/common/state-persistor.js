/**
 * 页面状态持久化模块
 * 功能：保存和恢复页面状态，包括滚动位置、表单数据、标签页状态等
 * 版本: 2.0 - 优化版，支持URL hash和更早的状态恢复
 */

const StatePersistor = (function () {
    'use strict';

    const STORAGE_PREFIX = 'health-guardian-state-';
    const FORM_DATA_KEY = 'form-data';
    const SCROLL_POSITION_KEY = 'scroll-position';
    const TAB_STATE_KEY = 'tab-state';
    const NAVIGATION_STATE_KEY = 'navigation-state';
    const EXPIRATION_TIME = 30 * 60 * 1000; // 30分钟过期

    let currentPageKey = '';
    let isRestoring = false;
    let pendingScrollPosition = null;

    function init() {
        console.log('===== 页面状态持久化模块初始化 =====');
        
        currentPageKey = getPageKey();
        
        // 立即尝试从URL hash恢复页面，不等待DOMContentLoaded
        restoreFromHashImmediately();
        
        saveStateBeforeUnload();
        setupHashListener();
        restoreStateOnLoad();
        
        console.log('当前页面键:', currentPageKey);
        console.log('===== 页面状态持久化模块初始化完成 =====');
    }

    function getPageKey() {
        return window.location.pathname;
    }

    function getStorageKey(suffix) {
        return STORAGE_PREFIX + currentPageKey + '-' + suffix;
    }

    function setupHashListener() {
        window.addEventListener('hashchange', function() {
            const hashPage = getPageFromHash();
            if (hashPage && !isRestoring) {
                if (typeof window.showPage === 'function') {
                    console.log('Hash变化，切换到页面:', hashPage);
                    window.showPage(hashPage, true);
                }
            }
        });
    }

    function getPageFromHash() {
        const hash = window.location.hash.slice(1);
        if (hash && (hash === 'home' || hash === 'diet' || hash === 'hospital' || hash === 'ai')) {
            return hash;
        }
        return null;
    }

    function restoreFromHashImmediately() {
        const hashPage = getPageFromHash();
        if (hashPage) {
            console.log('从URL hash立即恢复页面:', hashPage);
            // 保存到sessionStorage以便后续恢复
            const navState = {
                currentPage: hashPage,
                timestamp: Date.now(),
                fromHash: true
            };
            sessionStorage.setItem(getStorageKey(NAVIGATION_STATE_KEY), JSON.stringify(navState));
        }
    }

    function saveStateBeforeUnload() {
        window.addEventListener('beforeunload', function () {
            if (!isRestoring) {
                saveScrollPosition();
                saveFormData();
                saveTabState();
                saveNavigationState();
            }
        });

        window.addEventListener('pagehide', function () {
            if (!isRestoring) {
                saveScrollPosition();
                saveFormData();
                saveTabState();
                saveNavigationState();
            }
        });

        window.addEventListener('scroll', function() {
            if (!isRestoring) {
                pendingScrollPosition = {
                    x: window.scrollX || window.pageXOffset,
                    y: window.scrollY || window.pageYOffset,
                    timestamp: Date.now()
                };
            }
        });
    }

    function restoreStateOnLoad() {
        let restoredNavState = null;

        const earlyRestore = function() {
            try {
                isRestoring = true;
                restoredNavState = restoreNavigationStateEarly();
                if (restoredNavState && restoredNavState.fromHash) {
                    console.log('早期恢复成功:', restoredNavState);
                }
            } catch (e) {
                console.warn('早期恢复失败:', e);
            }
        };

        earlyRestore();

        document.addEventListener('DOMContentLoaded', function () {
            isRestoring = true;
            
            requestAnimationFrame(function() {
                restoreNavigationState(restoredNavState);
                requestAnimationFrame(function() {
                    restoreFormData();
                    restoreTabState();
                    requestAnimationFrame(function() {
                        restoreScrollPosition();
                        isRestoring = false;
                    });
                });
            });
        });

        window.addEventListener('pageshow', function (event) {
            if (event.persisted) {
                isRestoring = true;
                requestAnimationFrame(function() {
                    restoreScrollPosition();
                    isRestoring = false;
                });
            }
        });
    }

    function restoreNavigationStateEarly() {
        try {
            const navStateStr = sessionStorage.getItem(getStorageKey(NAVIGATION_STATE_KEY));
            if (!navStateStr) return null;

            const navState = JSON.parse(navStateStr);
            
            if (Date.now() - navState.timestamp > EXPIRATION_TIME) {
                sessionStorage.removeItem(getStorageKey(NAVIGATION_STATE_KEY));
                console.log('导航状态数据已过期');
                return null;
            }

            if (navState.currentPage && navState.fromHash) {
                updateHash(navState.currentPage);
                return navState;
            }
        } catch (e) {
            console.warn('早期恢复导航状态失败:', e);
        }
        return null;
    }

    function saveNavigationState() {
        try {
            const navState = {};
            
            const activeNavButton = document.querySelector('.nav-button.active');
            if (activeNavButton && activeNavButton.dataset.page) {
                navState.currentPage = activeNavButton.dataset.page;
                updateHash(navState.currentPage);
            }

            if (Object.keys(navState).length > 0) {
                navState.timestamp = Date.now();
                sessionStorage.setItem(getStorageKey(NAVIGATION_STATE_KEY), JSON.stringify(navState));
                console.log('导航状态已保存:', navState);
            }
        } catch (e) {
            console.warn('保存导航状态失败:', e);
        }
    }

    function updateHash(pageId) {
        if (window.location.hash !== '#' + pageId) {
            history.replaceState(null, '', '#' + pageId);
        }
    }

    function restoreNavigationState(savedState = null) {
        try {
            let navState = savedState;
            if (!navState) {
                const navStateStr = sessionStorage.getItem(getStorageKey(NAVIGATION_STATE_KEY));
                if (!navStateStr) {
                    const hashPage = getPageFromHash();
                    if (hashPage) {
                        navState = { currentPage: hashPage, timestamp: Date.now() };
                    } else {
                        return;
                    }
                } else {
                    navState = JSON.parse(navStateStr);
                }
            }
            
            if (navState.timestamp && Date.now() - navState.timestamp > EXPIRATION_TIME) {
                sessionStorage.removeItem(getStorageKey(NAVIGATION_STATE_KEY));
                console.log('导航状态数据已过期');
                return;
            }

            if (navState.currentPage) {
                updateHash(navState.currentPage);
                
                if (typeof window.showPage === 'function') {
                    console.log('调用 showPage 恢复导航状态:', navState);
                    window.showPage(navState.currentPage, true);
                } else {
                    const navButtons = document.querySelectorAll('.nav-button');
                    const pageContents = document.querySelectorAll('.page-content');
                    
                    navButtons.forEach(btn => {
                        if (btn.dataset.page === navState.currentPage) {
                            btn.classList.add('active');
                            btn.setAttribute('aria-selected', 'true');
                            btn.setAttribute('tabindex', '0');
                        } else {
                            btn.classList.remove('active');
                            btn.setAttribute('aria-selected', 'false');
                            btn.setAttribute('tabindex', '-1');
                        }
                    });

                    pageContents.forEach(page => {
                        if (page.id === `${navState.currentPage}-page`) {
                            page.classList.add('active');
                        } else {
                            page.classList.remove('active');
                        }
                    });

                    console.log('导航状态已恢复:', navState);
                }
            }
        } catch (e) {
            console.warn('恢复导航状态失败:', e);
        }
    }

    function saveCurrentPage(pageId) {
        try {
            updateHash(pageId);
            const navState = {
                currentPage: pageId,
                timestamp: Date.now()
            };
            sessionStorage.setItem(getStorageKey(NAVIGATION_STATE_KEY), JSON.stringify(navState));
            console.log('当前页面已保存:', navState);
        } catch (e) {
            console.warn('保存当前页面失败:', e);
        }
    }

    function saveScrollPosition() {
        try {
            const scrollData = pendingScrollPosition || {
                x: window.scrollX || window.pageXOffset,
                y: window.scrollY || window.pageYOffset,
                timestamp: Date.now()
            };
            sessionStorage.setItem(getStorageKey(SCROLL_POSITION_KEY), JSON.stringify(scrollData));
            console.log('滚动位置已保存:', scrollData);
        } catch (e) {
            console.warn('保存滚动位置失败:', e);
        }
    }

    function restoreScrollPosition() {
        try {
            const scrollDataStr = sessionStorage.getItem(getStorageKey(SCROLL_POSITION_KEY));
            if (scrollDataStr) {
                const scrollData = JSON.parse(scrollDataStr);
                
                if (Date.now() - scrollData.timestamp < EXPIRATION_TIME) {
                    if ('scrollBehavior' in document.documentElement.style) {
                        window.scrollTo({
                            top: scrollData.y,
                            left: scrollData.x,
                            behavior: 'auto'
                        });
                    } else {
                        window.scrollTo(scrollData.x, scrollData.y);
                    }
                    console.log('滚动位置已恢复:', scrollData);
                } else {
                    sessionStorage.removeItem(getStorageKey(SCROLL_POSITION_KEY));
                    console.log('滚动位置数据已过期');
                }
            }
        } catch (e) {
            console.warn('恢复滚动位置失败:', e);
        }
    }

    function saveFormData() {
        try {
            const formData = {};
            const inputs = document.querySelectorAll('input, textarea, select');
            
            inputs.forEach((input, index) => {
                const key = getElementKey(input, index);
                if (!key) return;

                if (input.type === 'checkbox' || input.type === 'radio') {
                    formData[key] = input.checked;
                } else if (input.type !== 'password' && input.type !== 'file') {
                    formData[key] = input.value;
                }
            });

            if (Object.keys(formData).length > 0) {
                formData.timestamp = Date.now();
                sessionStorage.setItem(getStorageKey(FORM_DATA_KEY), JSON.stringify(formData));
                console.log('表单数据已保存:', Object.keys(formData).length, '个字段');
            }
        } catch (e) {
            console.warn('保存表单数据失败:', e);
        }
    }

    function restoreFormData() {
        try {
            const formDataStr = sessionStorage.getItem(getStorageKey(FORM_DATA_KEY));
            if (!formDataStr) return;

            const formData = JSON.parse(formDataStr);
            
            if (Date.now() - formData.timestamp > EXPIRATION_TIME) {
                sessionStorage.removeItem(getStorageKey(FORM_DATA_KEY));
                console.log('表单数据已过期');
                return;
            }

            const inputs = document.querySelectorAll('input, textarea, select');
            let restoredCount = 0;

            inputs.forEach((input, index) => {
                const key = getElementKey(input, index);
                if (!key || !(key in formData)) return;

                if (input.type === 'checkbox' || input.type === 'radio') {
                    input.checked = formData[key];
                } else if (input.type !== 'password' && input.type !== 'file') {
                    input.value = formData[key];
                }
                restoredCount++;
            });

            console.log('表单数据已恢复:', restoredCount, '个字段');
        } catch (e) {
            console.warn('恢复表单数据失败:', e);
        }
    }

    function getElementKey(element, index) {
        if (element.id) {
            return 'id-' + element.id;
        }
        if (element.name) {
            return 'name-' + element.name;
        }
        return 'index-' + index;
    }

    function saveTabState() {
        try {
            const tabState = {};
            
            const profileTab = sessionStorage.getItem('currentProfileTab');
            if (profileTab) {
                tabState.profileTab = profileTab;
            }

            const activePlanTab = document.querySelector('.plan-tabs .tab-btn.active');
            if (activePlanTab) {
                tabState.planTab = activePlanTab.dataset.plan;
            }

            if (Object.keys(tabState).length > 0) {
                tabState.timestamp = Date.now();
                sessionStorage.setItem(getStorageKey(TAB_STATE_KEY), JSON.stringify(tabState));
                console.log('标签页状态已保存:', tabState);
            }
        } catch (e) {
            console.warn('保存标签页状态失败:', e);
        }
    }

    function restoreTabState() {
        try {
            const tabStateStr = sessionStorage.getItem(getStorageKey(TAB_STATE_KEY));
            if (!tabStateStr) return;

            const tabState = JSON.parse(tabStateStr);
            
            if (Date.now() - tabState.timestamp > EXPIRATION_TIME) {
                sessionStorage.removeItem(getStorageKey(TAB_STATE_KEY));
                console.log('标签页状态数据已过期');
                return;
            }

            if (tabState.profileTab && typeof window.showProfileTab === 'function') {
                window.showProfileTab(tabState.profileTab);
            }

            if (tabState.planTab && typeof window.switchExercisePlan === 'function') {
                window.switchExercisePlan(tabState.planTab);
            }

            console.log('标签页状态已恢复:', tabState);
        } catch (e) {
            console.warn('恢复标签页状态失败:', e);
        }
    }

    function clearPageState() {
        try {
            sessionStorage.removeItem(getStorageKey(FORM_DATA_KEY));
            sessionStorage.removeItem(getStorageKey(SCROLL_POSITION_KEY));
            sessionStorage.removeItem(getStorageKey(TAB_STATE_KEY));
            console.log('页面状态已清除');
        } catch (e) {
            console.warn('清除页面状态失败:', e);
        }
    }

    function clearAllStates() {
        try {
            const keys = Object.keys(sessionStorage);
            keys.forEach(key => {
                if (key.startsWith(STORAGE_PREFIX)) {
                    sessionStorage.removeItem(key);
                }
            });
            history.replaceState(null, '', window.location.pathname);
            console.log('所有页面状态已清除');
        } catch (e) {
            console.warn('清除所有页面状态失败:', e);
        }
    }

    function isInRestoreMode() {
        return isRestoring;
    }

    return {
        init: init,
        clearPageState: clearPageState,
        clearAllStates: clearAllStates,
        saveCurrentPage: saveCurrentPage,
        isInRestoreMode: isInRestoreMode
    };
})();

if (typeof document !== 'undefined') {
    StatePersistor.init();
}

window.StatePersistor = StatePersistor;

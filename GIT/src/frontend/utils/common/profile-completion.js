(function () {
    function safeNumber(value) {
        const number = Number(value);
        return Number.isFinite(number) ? number : null;
    }

    function parseUserAge(user = {}) {
        const directAge = safeNumber(user.age);
        if (directAge !== null) {
            return directAge;
        }

        const birthDate = user.birthDate || user.birth_date;
        if (!birthDate) {
            return null;
        }

        const birth = new Date(birthDate);
        if (Number.isNaN(birth.getTime())) {
            return null;
        }

        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const hasBirthdayPassed =
            today.getMonth() > birth.getMonth()
            || (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate());

        if (!hasBirthdayPassed) {
            age -= 1;
        }

        return age > 0 ? age : null;
    }

    function getCurrentUserProfile(loginInfo) {
        const user = loginInfo?.user || {};
        return {
            age: parseUserAge(user),
            gender: user.gender || null,
            height: safeNumber(user.height),
            weight: safeNumber(user.weight),
            nickname: user.nickname || user.username || '',
            birthDate: user.birthDate || user.birth_date || null,
            email: user.email || '',
        };
    }

    function hasCompletedBasicProfile(profile = {}) {
        return Boolean(
            profile.gender
            && Number.isFinite(profile.age)
            && Number.isFinite(profile.height)
            && Number.isFinite(profile.weight)
        );
    }

    function getMissingBasicProfileFields(profile = {}) {
        const missingFields = [];

        if (!profile.gender) {
            missingFields.push('性别');
        }
        if (!Number.isFinite(profile.age)) {
            missingFields.push('年龄');
        }
        if (!Number.isFinite(profile.height)) {
            missingFields.push('身高');
        }
        if (!Number.isFinite(profile.weight)) {
            missingFields.push('体重');
        }

        return missingFields;
    }

    function getProfileFromStorage() {
        try {
            const sessionLoginInfo = JSON.parse(sessionStorage.getItem('loginInfo') || 'null');
            const localLoginInfo = JSON.parse(localStorage.getItem('loginInfo') || 'null');
            const loginInfo = sessionLoginInfo || localLoginInfo || {};
            const sessionUser = sessionLoginInfo?.user || {};
            const localUser = localLoginInfo?.user || {};
            let mergedUser = {
                ...localUser,
                ...sessionUser,
            };

            try {
                const users = JSON.parse(localStorage.getItem('users') || '[]');
                const accounts = JSON.parse(localStorage.getItem('accounts') || '{}');
                const accountUsers = Array.isArray(accounts?.user) ? accounts.user : [];
                const identity = mergedUser.id || mergedUser.userId || mergedUser.username || loginInfo.username;
                const storedUser = users.find(item => item.id === identity || item.username === identity)
                    || accountUsers.find(item => item.id === identity || item.username === identity);

                if (storedUser) {
                    mergedUser = {
                        ...storedUser,
                        ...mergedUser,
                    };
                }
            } catch (storageError) {
                console.error('读取本地用户档案失败:', storageError);
            }

            return {
                age: parseUserAge(mergedUser),
                gender: mergedUser.gender || null,
                height: safeNumber(mergedUser.height),
                weight: safeNumber(mergedUser.weight),
                nickname: mergedUser.nickname || mergedUser.username || '',
                birthDate: mergedUser.birthDate || mergedUser.birth_date || null,
                email: mergedUser.email || '',
            };
        } catch (_error) {
            return getCurrentUserProfile(null);
        }
    }

    window.ProfileCompletion = {
        safeNumber,
        parseUserAge,
        getCurrentUserProfile,
        getProfileFromStorage,
        hasCompletedBasicProfile,
        getMissingBasicProfileFields,
    };
})();

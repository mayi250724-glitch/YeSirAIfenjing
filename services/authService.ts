
import { UserProfile } from "../types";

const USER_STORAGE_KEY = 'yesir_certified_user';
const TOKEN_STORAGE_KEY = 'yesir_auth_token';
// 使用相对路径，这样前端会自动使用当前域名来访问后端API
const API_BASE_URL = '/api';

// Get MAC address (machine code) - simulate since browser doesn't provide real MAC
export const getMachineCode = (): string => {
    // Try to get from local storage if already generated
    let mac = localStorage.getItem('yesir_machine_code');
    if (mac) return mac;
    
    // Generate a unique machine code based on browser fingerprint
    const fingerprint = `${navigator.userAgent}${navigator.language}${screen.width}x${screen.height}${navigator.hardwareConcurrency}${navigator.platform}`;
    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
        const char = fingerprint.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    
    // Format as MAC address
    mac = Math.abs(hash).toString(16).padStart(12, '0');
    mac = mac.match(/.{2}/g)?.join(':') || '00:00:00:00:00:00';
    
    // Store in local storage
    localStorage.setItem('yesir_machine_code', mac);
    return mac;
};

// Check if this "computer" (browser storage) is already certified
export const isCertified = (): boolean => {
    return !!localStorage.getItem(TOKEN_STORAGE_KEY) && !!localStorage.getItem(USER_STORAGE_KEY);
};

// Get current user profile
export const getCurrentUser = (): UserProfile | null => {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
};

// Get auth token
export const getAuthToken = (): string | null => {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
};

// Login user with backend API
export const loginUser = async (username: string, password?: string): Promise<{ user: UserProfile; token: string }> => {
    try {
        const response = await fetch(`${API_BASE_URL}/users/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || '登录失败');
        }

        const data = await response.json();
        
        // Store user data and token in local storage
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));
        localStorage.setItem(TOKEN_STORAGE_KEY, data.token);
        
        return data;
    } catch (error: any) {
        console.error('Login error:', error);
        throw error;
    }
};

// Register user with backend API
export const registerUser = async (username: string, password?: string, email?: string, phone?: string, invitationCode?: string): Promise<{ user: { id: string; username: string } }> => {
    try {
        const response = await fetch(`${API_BASE_URL}/users/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password, email, phone, invitationCode })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || '注册失败');
        }

        return await response.json();
    } catch (error: any) {
        console.error('Register error:', error);
        throw error;
    }
};

// Activate user with activation code
export const activateUser = async (username: string, activationCode: string): Promise<{ message: string }> => {
    try {
        const response = await fetch(`${API_BASE_URL}/users/activate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, activationCode })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || '激活失败');
        }

        return await response.json();
    } catch (error: any) {
        console.error('Activate error:', error);
        throw error;
    }
};

// Validate activation code
export const validateActivationCode = async (code: string): Promise<{ message: string; code: string; package: any; duration: number }> => {
    try {
        const response = await fetch(`${API_BASE_URL}/activation-codes/validate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ code })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || '激活码无效');
        }

        return await response.json();
    } catch (error: any) {
        console.error('Validate activation code error:', error);
        throw error;
    }
};

// Use activation code
export const useActivationCode = async (code: string, username: string): Promise<{ message: string; user: any }> => {
    try {
        const response = await fetch(`${API_BASE_URL}/activation-codes/use`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ code, username })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || '激活码使用失败');
        }

        const data = await response.json();
        
        // Update user data in local storage
        const currentUser = getCurrentUser();
        if (currentUser) {
            const updatedUser = {
                ...currentUser,
                ...data.user,
                level: data.user.level,
                status: '已认证 (Certified)',
                isActivated: true
            };
            localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));
        }
        
        return data;
    } catch (error: any) {
        console.error('Use activation code error:', error);
        throw error;
    }
};

// Update user profile
export const updateUserProfile = async (updates: Partial<UserProfile>): Promise<{ message: string; user: UserProfile }> => {
    try {
        const token = getAuthToken();
        if (!token) {
            throw new Error('未登录');
        }

        const response = await fetch(`${API_BASE_URL}/users/profile`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(updates)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || '更新失败');
        }

        const data = await response.json();
        
        // Update user data in local storage
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));
        
        return data;
    } catch (error: any) {
        console.error('Update profile error:', error);
        throw error;
    }
};

// Logout user
export const logout = () => {
    localStorage.removeItem(USER_STORAGE_KEY);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
};

// 兼容旧版认证函数
export const certifyUser = (username: string): UserProfile => {
    const newUser: UserProfile = {
        username,
        level: 'LV.1 认证导演',
        status: '已认证 (Certified)',
        avatar: `https://api.dicebear.com/7.x/micah/svg?seed=${username}`,
        phone: '未绑定',
        email: '未绑定',
        wallet: 0.00,
        memberType: 'Pro Plan',
        registrationDate: new Date().toLocaleDateString()
    };

    // 生成一个简单的token，用于认证
    const token = `yesir-certified-token-${Date.now()}-${Math.random().toString(36).substring(2)}`;
    
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newUser));
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    
    return newUser;
};

// Get active page design from backend
export const getActivePageDesign = async (): Promise<any> => {
    try {
        const response = await fetch(`${API_BASE_URL}/page-designs/active`);
        if (!response.ok) {
            throw new Error('Failed to fetch page design');
        }
        const data = await response.json();
        return data.pageDesign;
    } catch (error: any) {
        console.error('Get page design error:', error);
        return null;
    }
};

// Get page designs by type
export const getPageDesignsByType = async (type: string): Promise<any[]> => {
    try {
        const response = await fetch(`${API_BASE_URL}/page-designs/type/${type}`);
        if (!response.ok) {
            throw new Error('Failed to fetch page designs by type');
        }
        const data = await response.json();
        return data.pageDesigns;
    } catch (error: any) {
        console.error('Get page designs by type error:', error);
        return [];
    }
};

// Get active page design by type
export const getActivePageDesignByType = async (type: string): Promise<any> => {
    try {
        const response = await fetch(`${API_BASE_URL}/page-designs/active/${type}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch active ${type} page design`);
        }
        const data = await response.json();
        return data.pageDesign;
    } catch (error: any) {
        console.error('Get active page design by type error:', error);
        return null;
    }
};

// Get all packages from backend
export const getAllPackages = async (): Promise<any[]> => {
    try {
        const response = await fetch(`${API_BASE_URL}/packages`);
        if (!response.ok) {
            throw new Error('Failed to fetch packages');
        }
        const data = await response.json();
        return data.packages;
    } catch (error: any) {
        console.error('Get packages error:', error);
        return [];
    }
};

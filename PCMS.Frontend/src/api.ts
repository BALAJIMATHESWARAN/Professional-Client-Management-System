export interface LoginResponse {
  userId: number;
  userName: string;
  isSuperAdmin: boolean;
  token?: string;
  tenants?: TenantInfo[];
  needsPasswordReset?: boolean;
  resetToken?: string;
  email?: string;
}

export interface TenantInfo {
  tenantId: number;
  tenantName: string;
  role: string;
}

export interface TokenResponse {
  token: string;
}

export interface Tenant {
  id: number;
  name: string;
  code: string;
  description?: string;
  assignedModuleIds?: string;
  isActive: boolean;
}

export interface CreateTenantRequest {
  name: string;
  code: string;
  description?: string;
  assignedModuleIds?: string;
}

export interface RegisterAdminRequest {
  tenantId: number;
  userName: string;
  email: string;
  password: string;
}

export interface UpdateAdminRequest {
  userName: string;
  email: string;
  password?: string;
  tenantId: number;
  moduleIds: number[];
}

export interface AssignedModule {
  moduleId: number;
  moduleName: string;
}

export interface AdminUser {
  userId: number;
  userName: string;
  email: string;
  tenantId: number;
  tenantName: string;
  isActive: boolean;
  assignedModules?: string[];
}

export interface SystemModule {
  id: number;
  name: string;
}

export interface DynamicField {
  id: number;
  moduleId: number;
  tenantId: number;
  fieldName: string;
  fieldType: string;
  isRequired: boolean;
  displayOrder: number;
  isActive: boolean;
}

export interface DynamicRecord {
  id: number;
  displayId: string;
  moduleId: number;
  tenantId: number;
  createdBy: number;
  createdAt: string;
  fieldValues: Record<number, string>; // Map FieldId -> Value
}

export interface AuditLog {
  id: number;
  userId?: number;
  userEmail?: string;
  tenantId?: number;
  action: string;
  entityName?: string;
  entityId?: string;
  details?: string;
  timestamp: string;
  ipAddress?: string;
}

// Token helper functions
const TOKEN_KEY = 'pcms_token';
const USER_KEY = 'pcms_user';

export const getStoredToken = (): string | null => localStorage.getItem(TOKEN_KEY);
export const setStoredToken = (token: string) => localStorage.setItem(TOKEN_KEY, token);
export const removeStoredToken = () => localStorage.removeItem(TOKEN_KEY);

export const getStoredUser = (): any | null => {
  const user = localStorage.getItem(USER_KEY);
  return user ? JSON.parse(user) : null;
};
export const setStoredUser = (user: any) => localStorage.setItem(USER_KEY, JSON.stringify(user));
export const removeStoredUser = () => localStorage.removeItem(USER_KEY);

// Base fetch request
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  
  const token = getStoredToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  if (options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(path, { ...options, headers });

  if (!response.ok) {
    let errorMessage = `HTTP error! Status: ${response.status}`;
    try {
      const errorJson = await response.json();
      errorMessage = errorJson.message || errorJson.error || errorMessage;
    } catch {
      // JSON parsing failed, use generic error
    }
    throw new Error(errorMessage);
  }

  // Handle empty responses
  const text = await response.text();
  return text ? (JSON.parse(text) as T) : ({} as T);
}

export const api = {
  // Auth
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const res = await request<LoginResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    if (res.token) {
      setStoredToken(res.token);
      setStoredUser({
        userId: res.userId,
        userName: res.userName,
        isSuperAdmin: res.isSuperAdmin,
        selectedTenantId: null,
      });
    }
    return res;
  },

  selectTenant: async (userId: number, tenantId: number): Promise<TokenResponse> => {
    const res = await request<TokenResponse>('/api/auth/select-tenant', {
      method: 'POST',
      body: JSON.stringify({ userId, tenantId }),
    });
    
    if (res.token) {
      setStoredToken(res.token);
      const user = getStoredUser();
      if (user) {
        user.selectedTenantId = tenantId;
        setStoredUser(user);
      }
    }
    return res;
  },

  logout: () => {
    removeStoredToken();
    removeStoredUser();
  },

  forgotPassword: async (email: string): Promise<{ message: string }> => {
    return request<{ message: string }>('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  resetPassword: async (email: string, token: string, newPassword: string): Promise<{ message: string }> => {
    return request<{ message: string }>('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, token, newPassword }),
    });
  },

  changePassword: async (currentPassword: string, newPassword: string): Promise<{ message: string }> => {
    return request<{ message: string }>('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },

  // Tenants (Super Admin)
  getTenants: async (): Promise<Tenant[]> => {
    return request<Tenant[]>('/api/tenant');
  },

  createTenant: async (data: CreateTenantRequest): Promise<{ tenantId: number; message: string }> => {
    return request<{ tenantId: number; message: string }>('/api/tenant', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateTenant: async (id: number, data: CreateTenantRequest): Promise<{ message: string }> => {
    return request<{ message: string }>(`/api/tenant/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  toggleTenantStatus: async (id: number, active: boolean): Promise<{ message: string }> => {
    return request<{ message: string }>(`/api/tenant/${id}/status?active=${active}`, {
      method: 'POST'
    });
  },

  registerAdmin: async (data: RegisterAdminRequest): Promise<{ userId: number; message: string }> => {
    return request<{ userId: number; message: string }>('/api/admin/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateAdmin: async (userId: number, data: UpdateAdminRequest): Promise<{ message: string }> => {
    return request<{ message: string }>(`/api/admin/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  assignModule: async (userId: number, tenantId: number, moduleId: number): Promise<{ message: string }> => {
    return request<{ message: string }>('/api/admin/assign-module', {
      method: 'POST',
      body: JSON.stringify({ userId, tenantId, moduleId }),
    });
  },

  getAssignedModules: async (userId: number, tenantId: number): Promise<AssignedModule[]> => {
    return request<AssignedModule[]>(`/api/admin/modules/${userId}/${tenantId}`);
  },

  getAllAdmins: async (): Promise<AdminUser[]> => {
    return request<AdminUser[]>('/api/admin/all');
  },

  getAllModules: async (): Promise<SystemModule[]> => {
    return request<SystemModule[]>('/api/admin/modules');
  },

  toggleAdminStatus: async (userId: number, active: boolean): Promise<{ message: string }> => {
    return request<{ message: string }>(`/api/admin/${userId}/status?active=${active}`, {
      method: 'POST'
    });
  },

  assignAdminToTenant: async (userId: number, tenantId: number): Promise<{ message: string }> => {
    return request<{ message: string }>('/api/admin/assign-tenant', {
      method: 'POST',
      body: JSON.stringify({ userId, tenantId })
    });
  },

  // Dynamic Fields
  getFields: async (moduleId: number): Promise<DynamicField[]> => {
    return request<DynamicField[]>(`/api/dynamic-field/module/${moduleId}`);
  },

  createField: async (data: { moduleId: number; tenantId: number; fieldName: string; fieldType: string; isRequired: boolean; displayOrder: number }): Promise<DynamicField> => {
    return request<DynamicField>('/api/dynamic-field', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateField: async (id: number, data: { fieldName: string; fieldType: string; isRequired: boolean; displayOrder: number; isActive: boolean }): Promise<{ message: string }> => {
    return request<{ message: string }>(`/api/dynamic-field/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteField: async (id: number): Promise<{ message: string }> => {
    return request<{ message: string }>(`/api/dynamic-field/${id}`, {
      method: 'DELETE',
    });
  },

  // Dynamic Records
  getRecords: async (moduleId: number): Promise<DynamicRecord[]> => {
    return request<DynamicRecord[]>(`/api/dynamic-record/module/${moduleId}`);
  },

  createRecord: async (data: { moduleId: number; tenantId: number; fieldValues: Record<number, string> }): Promise<DynamicRecord> => {
    return request<DynamicRecord>('/api/dynamic-record', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateRecord: async (id: number, data: { fieldValues: Record<number, string> }): Promise<{ message: string }> => {
    return request<{ message: string }>(`/api/dynamic-record/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteRecord: async (id: number): Promise<{ message: string }> => {
    return request<{ message: string }>(`/api/dynamic-record/${id}`, {
      method: 'DELETE',
    });
  },

  getAuditLogs: async (): Promise<AuditLog[]> => {
    return request<AuditLog[]>('/api/AuditLog');
  },
};

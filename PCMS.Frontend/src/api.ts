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
  entityName?: string;
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
    
    if (res.userId) {
      if (res.token) {
        setStoredToken(res.token);
      }
      setStoredUser({
        userId: res.userId,
        userName: res.userName,
        isSuperAdmin: res.isSuperAdmin,
        selectedTenantId: null,
        availableTenants: res.tenants || [],
      });
    }
    return res;
  },

  // OTP verification for password reset
  verifyOtpResetPassword: async (email: string, otp: string, newPassword: string): Promise<{ message: string }> =>
    request<{ message: string }>('/api/auth/reset-password-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp, newPassword }),
    }),

  verifyOtp: async (email: string, otp: string): Promise<{ valid: boolean; message: string }> =>
    request<{ valid: boolean; message: string }>('/api/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
    }),

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
    const keys = [
      'pcms_user_active_tab',
      'pcms_user_active_module_id',
      'pcms_sa_active_tab',
      'pcms_workspace_tab',
      'pcms_doctor_subview',
      'pcms_editing_record',
      'pcms_record_form_open',
      'pcms_form_field_values',
      'pcms_doctor_drawer_open',
      'pcms_editing_doctor',
      'pcms_doc_form',
      'pcms_staff_tab',
      'pcms_staff_drawer_open',
      'pcms_editing_staff',
      'pcms_staff_form',
      'pcms_patient_drawer_open',
      'pcms_editing_patient',
      'pcms_patient_form',
      'pcms_appointment_drawer_open',
      'pcms_appointment_form',
      'pcms_role_drawer_open',
      'pcms_editing_role',
      'pcms_role_form'
    ];
    keys.forEach(k => localStorage.removeItem(k));
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
  getFields: async (moduleId: number, entityName?: string): Promise<DynamicField[]> => {
    const url = entityName 
      ? `/api/dynamic-field/module/${moduleId}?entityName=${encodeURIComponent(entityName)}`
      : `/api/dynamic-field/module/${moduleId}`;
    return request<DynamicField[]>(url);
  },

  createField: async (data: { moduleId: number; tenantId: number; fieldName: string; fieldType: string; entityName?: string; isRequired: boolean; displayOrder: number }): Promise<DynamicField> => {
    return request<DynamicField>('/api/dynamic-field', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateField: async (id: number, data: { fieldName: string; fieldType: string; entityName?: string; isRequired: boolean; displayOrder: number; isActive: boolean }): Promise<{ message: string }> => {
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

  // Doctors
  getDoctors: async (search?: string, specialization?: string): Promise<any[]> => {
    let url = '/api/doctor';
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (specialization) params.append('specialization', specialization);
    const qs = params.toString();
    if (qs) url += `?${qs}`;
    return request<any[]>(url);
  },
  getDoctorById: async (id: number): Promise<any> => {
    return request<any>(`/api/doctor/${id}`);
  },
  createDoctor: async (data: any): Promise<any> => {
    return request<any>('/api/doctor', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  updateDoctor: async (id: number, data: any): Promise<any> => {
    return request<any>(`/api/doctor/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  toggleDoctorStatus: async (id: number): Promise<any> => {
    return request<any>(`/api/doctor/${id}/toggle`, {
      method: 'POST',
    });
  },
  getDoctorSpecializations: async (): Promise<string[]> => {
    return request<string[]>('/api/doctor/specializations');
  },

  // Staff (Receptionist)
  getReceptionists: async (): Promise<any[]> => {
    return request<any[]>('/api/receptionist');
  },
  createReceptionist: async (data: any): Promise<any> => {
    return request<any>('/api/receptionist', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  updateReceptionist: async (id: number, data: any): Promise<any> => {
    return request<any>(`/api/receptionist/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  toggleReceptionistStatus: async (id: number): Promise<any> => {
    return request<any>(`/api/receptionist/${id}/toggle`, {
      method: 'POST',
    });
  },

  // Staff (Nurse)
  getNurses: async (): Promise<any[]> => {
    return request<any[]>('/api/nurse');
  },
  createNurse: async (data: any): Promise<any> => {
    return request<any>('/api/nurse', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  updateNurse: async (id: number, data: any): Promise<any> => {
    return request<any>(`/api/nurse/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  toggleNurseStatus: async (id: number): Promise<any> => {
    return request<any>(`/api/nurse/${id}/toggle`, {
      method: 'POST',
    });
  },

  // Patients
  getPatients: async (search?: string, pageNumber: number = 1, pageSize: number = 10): Promise<{ patients: any[]; totalCount: number }> => {
    let url = `/api/patient?pageNumber=${pageNumber}&pageSize=${pageSize}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    return request<{ patients: any[]; totalCount: number }>(url);
  },
  getPatientById: async (id: number): Promise<any> => {
    return request<any>(`/api/patient/${id}`);
  },
  createPatient: async (data: any): Promise<any> => {
    return request<any>('/api/patient', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  updatePatient: async (id: number, data: any): Promise<any> => {
    return request<any>(`/api/patient/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  deletePatient: async (id: number): Promise<any> => {
    return request<any>(`/api/patient/${id}`, {
      method: 'DELETE',
    });
  },

  // Appointments
  getAppointments: async (date?: string, patientId?: number, doctorId?: number): Promise<any[]> => {
    let url = '/api/appointment';
    const params = new URLSearchParams();
    if (date) params.append('date', date);
    if (patientId) params.append('patientId', patientId.toString());
    if (doctorId) params.append('doctorId', doctorId.toString());
    const qs = params.toString();
    if (qs) url += `?${qs}`;
    return request<any[]>(url);
  },
  createAppointment: async (data: any): Promise<any> => {
    return request<any>('/api/appointment', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  updateAppointment: async (id: number, data: any): Promise<any> => {
    return request<any>(`/api/appointment/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  updateAppointmentStatus: async (id: number, status: string): Promise<any> => {
    return request<any>(`/api/appointment/${id}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(status),
    });
  },

  // Roles & Permissions
  getRoles: async (): Promise<any[]> => {
    return request<any[]>('/api/rolepermission/role');
  },
  createRole: async (data: any): Promise<any> => {
    return request<any>('/api/rolepermission/role', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  updateRole: async (id: number, data: any): Promise<any> => {
    return request<any>(`/api/rolepermission/role/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  getPermissions: async (): Promise<any[]> => {
    return request<any[]>('/api/rolepermission/permissions');
  },
  getUserPermissions: async (): Promise<string[]> => {
    return request<string[]>('/api/rolepermission/user-permissions');
  },
  getDashboardWidgets: async (roleId: number): Promise<string[]> => {
    return request<string[]>(`/api/rolepermission/dashboard-widgets/${roleId}`);
  },
  updateDashboardWidgets: async (roleId: number, widgetKeys: string[]): Promise<any> => {
    return request<any>(`/api/rolepermission/dashboard-widgets/${roleId}`, {
      method: 'PUT',
      body: JSON.stringify(widgetKeys),
    });
  },
};

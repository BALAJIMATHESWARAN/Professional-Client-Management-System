import React, { useState, useEffect } from 'react';
import { api } from '../api';
import type { Tenant, AdminUser, SystemModule } from '../api';
import { CalendarWidget } from './CalendarWidget';
import logoImg from '../assets/logo.png';
import { formatAppDate, formatLiveTime, translations, themePatterns, applyThemePattern } from '../themeUtils';


interface SuperAdminDashboardProps {
  userName: string;
  onLogout: () => void;
}

type TabType = 'dashboard' | 'tenants' | 'admins' | 'auditLogs' | 'settings';

export const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({
  userName,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    return (localStorage.getItem('pcms_sa_active_tab') as TabType) || 'dashboard';
  });
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [systemModules, setSystemModules] = useState<SystemModule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sidebar Layout States
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('pcms_sa_sidebar_collapsed') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('pcms_sa_active_tab', activeTab);
  }, [activeTab]);

  // Settings State Flags
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('pcms_dark_mode') === 'true';
  });
  const [denseTable] = useState(() => {
    return localStorage.getItem('pcms_dense_table') === 'true';
  });

  // Effect: Dark Mode Toggle Sync
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
    localStorage.setItem('pcms_dark_mode', String(darkMode));
  }, [darkMode]);

  // Effect: Dense Toggle Sync
  useEffect(() => {
    localStorage.setItem('pcms_dense_table', String(denseTable));
  }, [denseTable]);

  // Effect: Sidebar collapse sync
  useEffect(() => {
    localStorage.setItem('pcms_sa_sidebar_collapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed]);


  // Settings: Change Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<{ status: 'success' | 'error'; message: string } | null>(null);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Additional Settings States
  const [profileName, setProfileName] = useState(userName);
  const [profileEmail, setProfileEmail] = useState('superadmin@pcms.com');
  const [profilePhone, setProfilePhone] = useState('+1 (555) 019-2834');
  const [language, setLanguage] = useState(() => localStorage.getItem('pcms_language') || 'en');
  const [timezone, setTimezone] = useState(() => localStorage.getItem('pcms_timezone') || 'UTC');
  const [dateFormat, setDateFormat] = useState(() => localStorage.getItem('pcms_date_format') || 'YYYY-MM-DD');
  const [themePattern, setThemePattern] = useState<'classic' | 'ocean' | 'forest' | 'sunset' | 'midnight'>(
    () => (localStorage.getItem('pcms_theme_pattern') as any) || 'classic'
  );
  const [profileSuccessMessage, setProfileSuccessMessage] = useState<string | null>(null);

  const [settingsSubTab, setSettingsSubTab] = useState<'profile' | 'security' | 'appearance' | 'preferences'>('profile');
  const [preferencesExpanded, setPreferencesExpanded] = useState(false);
  const [customBrandColor, setCustomBrandColor] = useState(() => {
    const initialPattern = localStorage.getItem('pcms_theme_pattern') || 'classic';
    const patternColors = themePatterns[initialPattern as keyof typeof themePatterns] || themePatterns.classic;
    return patternColors.colors['--zoho-blue'];
  });

  // Effect: Preferences sync
  useEffect(() => {
    localStorage.setItem('pcms_language', language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem('pcms_timezone', timezone);
  }, [timezone]);

  useEffect(() => {
    localStorage.setItem('pcms_date_format', dateFormat);
  }, [dateFormat]);

  useEffect(() => {
    localStorage.setItem('pcms_theme_pattern', themePattern);
    applyThemePattern(themePattern);
    const patternColors = themePatterns[themePattern] || themePatterns.classic;
    setCustomBrandColor(patternColors.colors['--zoho-blue']);
  }, [themePattern]);

  const handleBrandColorChange = (newColor: string) => {
    setCustomBrandColor(newColor);
    document.documentElement.style.setProperty('--zoho-blue', newColor);
    document.documentElement.style.setProperty('--zoho-blue-hover', newColor);
    if (/^#[0-9A-F]{6}$/i.test(newColor)) {
      const r = parseInt(newColor.slice(1, 3), 16);
      const g = parseInt(newColor.slice(3, 5), 16);
      const b = parseInt(newColor.slice(5, 7), 16);
      document.documentElement.style.setProperty('--zoho-blue-glow', `rgba(${r}, ${g}, ${b}, 0.18)`);
    }
  };

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSuccessMessage('Profile details updated successfully!');
    setTimeout(() => setProfileSuccessMessage(null), 4000);
  };

  const handleSettingsChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordFeedback(null);
    
    if (newPassword !== confirmPassword) {
      setPasswordFeedback({ status: 'error', message: 'Confirm password does not match new password.' });
      return;
    }
    
    try {
      setPasswordLoading(true);
      const res = await api.changePassword(currentPassword, newPassword);
      setPasswordFeedback({ status: 'success', message: res.message || 'Password updated successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordFeedback({ status: 'error', message: err.message || 'Failed to change password.' });
    } finally {
      setPasswordLoading(false);
    }
  };

  const getTabColor = (tab: TabType) => {
    switch (tab) {
      case 'dashboard':
        return { color: 'var(--zoho-red)', shadow: 'rgba(228, 37, 39, 0.25)', glow: 'var(--zoho-red-glow)', btnClass: 'btn-zoho-red' };
      case 'tenants':
        return { color: 'var(--zoho-green)', shadow: 'rgba(8, 153, 73, 0.25)', glow: 'var(--zoho-green-glow)', btnClass: 'btn-zoho-green' };
      case 'admins':
        return { color: 'var(--zoho-blue)', shadow: 'rgba(34, 109, 180, 0.25)', glow: 'var(--zoho-blue-glow)', btnClass: 'btn-zoho-blue' };
      case 'auditLogs':
        return { color: 'var(--zoho-blue)', shadow: 'rgba(34, 109, 180, 0.25)', glow: 'var(--zoho-blue-glow)', btnClass: 'btn-zoho-blue' };
      case 'settings':
        return { color: 'var(--zoho-yellow)', shadow: 'rgba(249, 178, 29, 0.25)', glow: 'var(--zoho-yellow-glow)', btnClass: 'btn-zoho-yellow' };
      default:
        return { color: 'var(--zoho-blue)', shadow: 'rgba(34, 109, 180, 0.25)', glow: 'var(--zoho-blue-glow)', btnClass: 'btn-zoho-blue' };
    }
  };
  const activeTheme = getTabColor(activeTab);

  // Form states: Create / Edit Tenant
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [tName, setTName] = useState('');
  const [tCode, setTCode] = useState('');
  const [tDesc, setTDesc] = useState('');
  const [tenantModuleIds, setTenantModuleIds] = useState<number[]>([]);
  const [creatingTenant, setCreatingTenant] = useState(false);
  const [tenantSuccess, setTenantSuccess] = useState<string | null>(null);
  const [tenantFormError, setTenantFormError] = useState<string | null>(null);

  // Form states: Register Admin / Edit Admin
  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminTenantId, setAdminTenantId] = useState<string>('');
  const [adminModuleIds, setAdminModuleIds] = useState<number[]>([]);
  const [registeringAdmin, setRegisteringAdmin] = useState(false);
  const [registerAdminSuccess, setRegisterAdminSuccess] = useState<string | null>(null);
  const [registerAdminError, setRegisterAdminError] = useState<string | null>(null);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditActionFilter, setAuditActionFilter] = useState('all');

  const loadAuditLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const logData = await api.getAuditLogs();
      setAuditLogs(logData);
    } catch (err: any) {
      setError(err.message || 'Failed to load audit logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'auditLogs') {
      loadAuditLogs();
    }
  }, [activeTab]);

  const [liveTime, setLiveTime] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarDate, setCalendarDate] = useState(new Date());

  // Holiday Events State
  const [holidays, setHolidays] = useState<Array<{ date: string; localName: string; name: string }>>([]);

  // Sliding Drawer States
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerType, setDrawerType] = useState<'tenant' | 'admin' | null>(null);
  const [drawerMode, setDrawerMode] = useState<'view' | 'edit' | 'create'>('view');


  useEffect(() => {
    const fetchHolidays = async () => {
      const currentYear = new Date().getFullYear();
      const yearsToFetch = [currentYear - 1, currentYear, currentYear + 1];
      let allHolidays: Array<{ date: string; localName: string; name: string }> = [];

      // Add local fallbacks for these years first (Option 2)
      yearsToFetch.forEach(y => {
        const fallbacks = [
          { date: `${y}-01-01`, localName: "New Year's Day", name: "New Year's Day" },
          { date: `${y}-01-26`, localName: "Republic Day", name: "Republic Day" },
          { date: `${y}-01-14`, localName: "Makar Sankranti", name: "Makar Sankranti" },
          { date: `${y}-04-14`, localName: "Ambedkar Jayanti", name: "Ambedkar Jayanti" },
          { date: `${y}-05-01`, localName: "May Day / Labour Day", name: "Labour Day" },
          { date: `${y}-08-15`, localName: "Independence Day", name: "Independence Day" },
          { date: `${y}-10-02`, localName: "Mahatma Gandhi Jayanti", name: "Mahatma Gandhi Jayanti" },
          { date: `${y}-12-25`, localName: "Christmas Day", name: "Christmas Day" }
        ];
        allHolidays = [...allHolidays, ...fallbacks];
      });

      // Try to fetch from external API (Option 3)
      for (const y of yearsToFetch) {
        try {
          const res = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${y}/IN`);
          if (res.ok && res.status !== 204) {
            const text = await res.text();
            if (text) {
              const data = JSON.parse(text);
              if (Array.isArray(data) && data.length > 0) {
                // Merge: filter out local fallbacks for this year and use API data
                allHolidays = allHolidays.filter(h => !h.date.startsWith(`${y}-`));
                allHolidays = [...allHolidays, ...data];
              }
            }
          }
        } catch (err) {
          console.warn(`Failed to fetch API holidays for year ${y}:`, err);
        }
      }

      // De-duplicate by date just in case
      const uniqueHolidays = Array.from(new Map(allHolidays.map(item => [item.date, item])).values());
      setHolidays(uniqueHolidays);
    };
    fetchHolidays();
  }, []);

  // Tenant Filters / Sorting / Views
  const [tenantSearch, setTenantSearch] = useState('');
  const [tenantSort, setTenantSort] = useState<'name' | 'code' | 'status'>('name');
  const [tenantFilter, setTenantFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [tenantView, setTenantView] = useState<'card' | 'table'>('table');

  // Admin Filters / Sorting / Views
  const [adminSearch, setAdminSearch] = useState('');
  const [adminSort, setAdminSort] = useState<'name' | 'email' | 'status'>('name');
  const [adminFilter, setAdminFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [adminView, setAdminView] = useState<'card' | 'table'>('table');

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const tenantData = await api.getTenants();
      setTenants(tenantData);

      const adminData = await api.getAllAdmins();
      setAdmins(adminData);

      const moduleData = await api.getAllModules();
      setSystemModules(moduleData);
    } catch (err: any) {
      setError(err.message || 'Failed to load platform data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const updateTime = () => {
      setLiveTime(formatLiveTime(new Date(), language, timezone, dateFormat));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [language, timezone, dateFormat]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.calendar-pill')) {
        setShowCalendar(false);
      }
    };
    window.addEventListener('click', handleOutsideClick);
    return () => {
      window.removeEventListener('click', handleOutsideClick);
    };
  }, []);

  // Drawer Helper Functions
  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setDrawerType(null);
    setEditingTenant(null);
    setEditingAdmin(null);
    setTName('');
    setTCode('');
    setTDesc('');
    setTenantModuleIds([]);
    setAdminName('');
    setAdminEmail('');
    setAdminPassword('');
    setAdminTenantId('');
    setAdminModuleIds([]);
    setTenantFormError(null);
    setTenantSuccess(null);
    setRegisterAdminError(null);
    setRegisterAdminSuccess(null);
  };

  const openTenantCreate = () => {
    setEditingTenant(null);
    setTName('');
    setTCode('');
    setTDesc('');
    setTenantModuleIds([]);
    setTenantFormError(null);
    setTenantSuccess(null);
    setDrawerType('tenant');
    setDrawerMode('create');
    setIsDrawerOpen(true);
  };

  const openTenantView = (tenant: Tenant) => {
    setEditingTenant(tenant);
    setTName(tenant.name);
    setTCode(tenant.code);
    setTDesc(tenant.description || '');
    if (tenant.assignedModuleIds) {
      setTenantModuleIds(tenant.assignedModuleIds.split(',').map(Number).filter(id => !isNaN(id)));
    } else {
      setTenantModuleIds([]);
    }
    setTenantFormError(null);
    setTenantSuccess(null);
    setDrawerType('tenant');
    setDrawerMode('view');
    setIsDrawerOpen(true);
  };

  const openAdminCreate = () => {
    setEditingAdmin(null);
    setAdminName('');
    setAdminEmail('');
    setAdminPassword('');
    setAdminTenantId('');
    setAdminModuleIds([]);
    setRegisterAdminError(null);
    setRegisterAdminSuccess(null);
    setDrawerType('admin');
    setDrawerMode('create');
    setIsDrawerOpen(true);
  };

  const openAdminView = (admin: AdminUser) => {
    setEditingAdmin(admin);
    setAdminName(admin.userName);
    setAdminEmail(admin.email);
    setAdminPassword('');
    setAdminTenantId(String(admin.tenantId));
    const existingModuleIds = systemModules.filter(m => admin.assignedModules?.includes(m.name)).map(m => m.id);
    setAdminModuleIds(existingModuleIds);
    setRegisterAdminError(null);
    setRegisterAdminSuccess(null);
    setDrawerType('admin');
    setDrawerMode('view');
    setIsDrawerOpen(true);
  };

  const handleCreateOrEditTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tName || !tCode) {
      setTenantFormError('Name and Code are required.');
      return;
    }

    setCreatingTenant(true);
    setTenantFormError(null);
    setTenantSuccess(null);

    try {
      const assignedModuleIdsStr = tenantModuleIds.join(',');
      if (editingTenant) {
        await api.updateTenant(editingTenant.id, { name: tName, code: tCode, description: tDesc, assignedModuleIds: assignedModuleIdsStr });
        setTenantSuccess('Tenant updated successfully!');
      } else {
        await api.createTenant({ name: tName, code: tCode, description: tDesc, assignedModuleIds: assignedModuleIdsStr });
        setTenantSuccess('Tenant created successfully!');
      }
      await loadData();

      // Delay closing slightly so user sees success confirmation
      setTimeout(() => {
        closeDrawer();
      }, 800);
    } catch (err: any) {
      setTenantFormError(err.message || 'Failed to process tenant.');
    } finally {
      setCreatingTenant(false);
    }
  };

  const handleToggleTenantStatus = async (tenantId: number, currentStatus: boolean) => {
    try {
      await api.toggleTenantStatus(tenantId, !currentStatus);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to toggle tenant status.');
    }
  };

  const handleToggleAdminStatus = async (userId: number, currentStatus: boolean) => {
    try {
      await api.toggleAdminStatus(userId, !currentStatus);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to toggle admin status.');
    }
  };

  const handleRegisterAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminName || !adminEmail || (!adminPassword && !editingAdmin) || !adminTenantId) {
      setRegisterAdminError('Name, email, password, and tenant workspace are required.');
      return;
    }

    // Validate Email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(adminEmail)) {
      setRegisterAdminError('Please enter a valid email address.');
      return;
    }

    // Block common disposable domains
    const disposableDomains = [
      'mailinator.com', 'yopmail.com', 'tempmail.com', 'temp-mail.org', '10minutemail.com',
      'guerrillamail.com', 'sharklasers.com', 'dispostable.com', 'getairmail.com', 'burnermail.io',
      'fakeinbox.com', 'trashmail.com', 'maildrop.cc', 'maildrop.org', 'tempmailaddress.com',
      'throwawaymail.com', 'mailnesia.com', 'mailcatch.com', 'mytemp.email'
    ];
    const emailParts = adminEmail.split('@');
    if (emailParts.length === 2) {
      const domain = emailParts[1].trim().toLowerCase();
      if (disposableDomains.includes(domain)) {
        setRegisterAdminError('Disposable or temporary email addresses are not allowed.');
        return;
      }
    }

    // Validate Password Complexity (Only for new passwords)
    if (!editingAdmin || adminPassword) {
      const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d]).{8,}$/;
      if (!strongPasswordRegex.test(adminPassword)) {
        setRegisterAdminError('Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character/symbol.');
        return;
      }
    }

    setRegisteringAdmin(true);
    setRegisterAdminError(null);
    setRegisterAdminSuccess(null);

    try {
      const selectedTenantId = Number(adminTenantId);
      const tenant = tenants.find(t => t.id === selectedTenantId);
      if (!tenant) {
        throw new Error('Selected tenant workspace not found.');
      }

      if (editingAdmin) {
        // Edit mode
        await api.updateAdmin(editingAdmin.userId, {
          userName: adminName,
          email: adminEmail,
          password: adminPassword || undefined,
          tenantId: selectedTenantId,
          moduleIds: adminModuleIds
        });
        setRegisterAdminSuccess(`Admin updated successfully under ${tenant.name}.`);
      } else {
        // Create mode
        const res = await api.registerAdmin({
          tenantId: selectedTenantId,
          userName: adminName,
          email: adminEmail,
          password: adminPassword,
        });

        // Now assign each of the selected modules
        for (const moduleId of adminModuleIds) {
          await api.assignModule(res.userId, selectedTenantId, moduleId);
        }

        setRegisterAdminSuccess(`Admin registered successfully under ${tenant.name} and modules assigned.`);
      }

      await loadData();

      // Delay closing slightly so user sees success confirmation
      setTimeout(() => {
        closeDrawer();
      }, 800);
    } catch (err: any) {
      setRegisterAdminError(err.message || 'Failed to process admin.');
    } finally {
      setRegisteringAdmin(false);
    }
  };

  // Filtered & Sorted Tenants
  const filteredTenants = tenants
    .filter(t => {
      const matchesSearch = t.name.toLowerCase().includes(tenantSearch.toLowerCase()) ||
        t.code.toLowerCase().includes(tenantSearch.toLowerCase()) ||
        (t.description || '').toLowerCase().includes(tenantSearch.toLowerCase());
      const matchesFilter = tenantFilter === 'all' ||
        (tenantFilter === 'active' && t.isActive) ||
        (tenantFilter === 'inactive' && !t.isActive);
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      if (tenantSort === 'name') return a.name.localeCompare(b.name);
      if (tenantSort === 'code') return a.code.localeCompare(b.code);
      if (tenantSort === 'status') return (a.isActive === b.isActive) ? 0 : a.isActive ? -1 : 1;
      return 0;
    });

  // Filtered & Sorted Admins
  const filteredAdmins = admins
    .filter(a => {
      const matchesSearch = a.userName.toLowerCase().includes(adminSearch.toLowerCase()) ||
        a.email.toLowerCase().includes(adminSearch.toLowerCase()) ||
        a.tenantName.toLowerCase().includes(adminSearch.toLowerCase());
      const matchesFilter = adminFilter === 'all' ||
        (adminFilter === 'active' && a.isActive) ||
        (adminFilter === 'inactive' && !a.isActive);
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      if (adminSort === 'name') return a.userName.localeCompare(b.userName);
      if (adminSort === 'email') return a.email.localeCompare(b.email);
      if (adminSort === 'status') return (a.isActive === b.isActive) ? 0 : a.isActive ? -1 : 1;
      return 0;
    });

  // Compute Stats
  const totalTenants = tenants.length;
  const activeTenants = tenants.filter(t => t.isActive).length;
  // Count unique admins by UserId
  const uniqueAdmins = Array.from(new Set(admins.map(a => a.userId)));
  const totalAdmins = uniqueAdmins.length;
  const activeAdmins = Array.from(new Set(admins.filter(a => a.isActive).map(a => a.userId))).length;

  // Dynamic Email Checks
  const isEmailValidSyntax = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail);
  const disposableDomains = [
    'mailinator.com', 'yopmail.com', 'tempmail.com', 'temp-mail.org', '10minutemail.com',
    'guerrillamail.com', 'sharklasers.com', 'dispostable.com', 'getairmail.com', 'burnermail.io',
    'fakeinbox.com', 'trashmail.com', 'maildrop.cc', 'maildrop.org', 'tempmailaddress.com',
    'throwawaymail.com', 'mailnesia.com', 'mailcatch.com', 'mytemp.email'
  ];
  const emailParts = adminEmail.split('@');
  const isEmailDisposable = emailParts.length === 2 && disposableDomains.includes(emailParts[1].trim().toLowerCase());

  // Dynamic Password Checks
  const isLengthValid = adminPassword.length >= 8;
  const hasUpperCase = /[A-Z]/.test(adminPassword);
  const hasLowerCase = /[a-z]/.test(adminPassword);
  const hasNumber = /\d/.test(adminPassword);
  const hasSpecial = /[^a-zA-Z\d]/.test(adminPassword);

  // Form Validation Checks
  const isAdminFormInvalid = drawerType === 'admin' && (
    !adminName.trim() ||
    !adminEmail.trim() ||
    !isEmailValidSyntax ||
    isEmailDisposable ||
    ((!editingAdmin || adminPassword) && (!isLengthValid || !hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecial)) ||
    !adminTenantId
  );

  const isTenantFormInvalid = drawerType === 'tenant' && (
    !tName.trim() ||
    !tCode.trim()
  );

  const isSubmitDisabled = creatingTenant || registeringAdmin || (drawerType === 'admin' && isAdminFormInvalid) || (drawerType === 'tenant' && isTenantFormInvalid);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>

      {/* 1. SIDEBAR WRAPPER with floating arrow button */}
      <div style={{ position: 'relative', display: 'flex', flexShrink: 0 }}>
        <aside
          className="sidebar-zoho-gradient"
          style={{
            width: sidebarCollapsed ? '72px' : '190px',
            backgroundColor: '#182238',
            borderRight: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            flexDirection: 'column',
            padding: '1.75rem 0',
            transition: 'width 0.25s ease-in-out',
            overflowX: 'hidden'
          }}
        >
          {/* Brand Header */}
          <div style={{
            padding: sidebarCollapsed ? '0 0.5rem 1.5rem 0.5rem' : '0 1.5rem 1.5rem 1.5rem',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
            gap: '0.65rem',
            marginBottom: '1.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', justifyContent: sidebarCollapsed ? 'center' : 'flex-start', width: '100%' }}>
              <img 
                src={logoImg} 
                alt="PCMS Logo" 
                style={{ 
                  width: '28px', 
                  height: '28px', 
                  flexShrink: 0, 
                  borderRadius: '50%', 
                  border: '1.5px solid rgba(255, 255, 255, 0.2)', 
                  boxShadow: '0 0 8px rgba(88,166,255,0.3)', 
                  objectFit: 'cover' 
                }} 
              />
              {!sidebarCollapsed && (
                <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 850, fontSize: '1.25rem', color: '#ffffff', letterSpacing: '-0.02em' }}>
                  PCMS
                </span>
              )}
            </div>
          </div>

        {/* Sidebar Tabs */}
        <div style={{ flex: 1, padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.45rem', overflowY: 'auto', overflowX: 'hidden' }}>
          <button
            onClick={() => setActiveTab('dashboard')}
            title="Dashboard Overview"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: sidebarCollapsed ? '0' : '0.75rem',
              justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
              width: '100%',
              padding: '0.7rem 0.85rem',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              fontWeight: 500,
              fontFamily: 'var(--font-heading)',
              fontSize: '0.9rem',
              textAlign: 'left',
              transition: 'all 0.15s ease',
              backgroundColor: activeTab === 'dashboard' ? 'var(--zoho-red)' : 'transparent',
              color: activeTab === 'dashboard' ? '#ffffff' : '#94a3b8',
              boxShadow: activeTab === 'dashboard' ? '0 3px 8px rgba(228, 37, 39, 0.25)' : 'none'
            }}
          >
            <svg style={{ width: '18px', height: '18px', flexShrink: 0 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="9" />
              <rect x="14" y="3" width="7" height="5" />
              <rect x="14" y="12" width="7" height="9" />
              <rect x="3" y="16" width="7" height="5" />
            </svg>
            {!sidebarCollapsed && <span>Dashboard</span>}
          </button>

          <button
            onClick={() => setActiveTab('tenants')}
            title="Tenants Workspace"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: sidebarCollapsed ? '0' : '0.75rem',
              justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
              width: '100%',
              padding: '0.7rem 0.85rem',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              fontWeight: 500,
              fontFamily: 'var(--font-heading)',
              fontSize: '0.9rem',
              textAlign: 'left',
              transition: 'all 0.15s ease',
              backgroundColor: activeTab === 'tenants' ? 'var(--zoho-green)' : 'transparent',
              color: activeTab === 'tenants' ? '#ffffff' : '#94a3b8',
              boxShadow: activeTab === 'tenants' ? '0 3px 8px rgba(8, 153, 73, 0.25)' : 'none'
            }}
          >
            <svg style={{ width: '18px', height: '18px', flexShrink: 0 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
              <line x1="9" y1="22" x2="9" y2="16" />
              <line x1="15" y1="22" x2="15" y2="16" />
              <line x1="9" y1="16" x2="15" y2="16" />
              <path d="M8 6h.01M16 6h.01M8 10h.01M16 10h.01" />
            </svg>
            {!sidebarCollapsed && <span>Tenants</span>}
          </button>

          <button
            onClick={() => setActiveTab('admins')}
            title="Administrators"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: sidebarCollapsed ? '0' : '0.75rem',
              justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
              width: '100%',
              padding: '0.7rem 0.85rem',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              fontWeight: 500,
              fontFamily: 'var(--font-heading)',
              fontSize: '0.9rem',
              textAlign: 'left',
              transition: 'all 0.15s ease',
              backgroundColor: activeTab === 'admins' ? 'var(--zoho-blue)' : 'transparent',
              color: activeTab === 'admins' ? '#ffffff' : '#94a3b8',
              boxShadow: activeTab === 'admins' ? '0 3px 8px rgba(34, 109, 180, 0.25)' : 'none'
            }}
          >
            <svg style={{ width: '18px', height: '18px', flexShrink: 0 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            {!sidebarCollapsed && <span>Admins</span>}
          </button>

          <button
            onClick={() => setActiveTab('auditLogs')}
            title="Audit Logs"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: sidebarCollapsed ? '0' : '0.75rem',
              justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
              width: '100%',
              padding: '0.7rem 0.85rem',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              fontWeight: 500,
              fontFamily: 'var(--font-heading)',
              fontSize: '0.9rem',
              textAlign: 'left',
              transition: 'all 0.15s ease',
              backgroundColor: activeTab === 'auditLogs' ? 'var(--zoho-blue)' : 'transparent',
              color: activeTab === 'auditLogs' ? '#ffffff' : '#94a3b8',
              boxShadow: activeTab === 'auditLogs' ? '0 3px 8px rgba(34, 109, 180, 0.25)' : 'none'
            }}
          >
            <svg style={{ width: '18px', height: '18px', flexShrink: 0 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
              <line x1="9" y1="10" x2="15" y2="10" />
              <line x1="9" y1="14" x2="15" y2="14" />
              <line x1="9" y1="18" x2="13" y2="18" />
            </svg>
            {!sidebarCollapsed && <span>Audit Logs</span>}
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            title="Settings & Theme"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: sidebarCollapsed ? '0' : '0.75rem',
              justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
              width: '100%',
              padding: '0.7rem 0.85rem',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              fontWeight: 500,
              fontFamily: 'var(--font-heading)',
              fontSize: '0.9rem',
              textAlign: 'left',
              transition: 'all 0.15s ease',
              backgroundColor: activeTab === 'settings' ? 'var(--zoho-yellow)' : 'transparent',
              color: activeTab === 'settings' ? '#ffffff' : '#94a3b8',
              boxShadow: activeTab === 'settings' ? '0 3px 8px rgba(249, 178, 29, 0.25)' : 'none'
            }}
          >
            <svg style={{ width: '18px', height: '18px', flexShrink: 0 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            {!sidebarCollapsed && <span>Settings</span>}
          </button>
        </div>

        {/* Profile / Logout at Bottom */}
        {/* Profile / Logout at Bottom */}
        <div style={{ padding: sidebarCollapsed ? '1rem 0' : '0 1rem', borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '1.25rem' }}>
          <div style={{
            display: 'flex',
            flexDirection: sidebarCollapsed ? 'column' : 'row',
            alignItems: 'center',
            justifyContent: sidebarCollapsed ? 'center' : 'space-between',
            gap: '0.75rem',
            padding: sidebarCollapsed ? '0' : '0.25rem 0.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'var(--zoho-blue)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                fontSize: '0.9rem',
                flexShrink: 0
              }}>{userName.substring(0, 1).toUpperCase()}</div>
              {!sidebarCollapsed && (
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100px' }} title={userName}>{userName}</div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>Platform Owner</div>
                </div>
              )}
            </div>
            <button
              onClick={onLogout}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '0.5rem',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.3s ease',
                width: '32px',
                height: '32px',
                marginTop: sidebarCollapsed ? '0.25rem' : '0'
              }}
              title="Logout"
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#ef4444';
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#94a3b8';
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '16px', height: '16px' }}>
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Floating Toggle Arrow Button attached to the edge */}
      <button
        type="button"
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        style={{
          position: 'absolute',
          top: '28px',
          right: '-12px',
          zIndex: 1000,
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          backgroundColor: '#182238',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.3)',
          transition: 'transform 0.2s, background-color 0.2s',
          padding: 0
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--zoho-blue)';
          e.currentTarget.style.transform = 'scale(1.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#182238';
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        {sidebarCollapsed ? (
          <svg style={{ width: '12px', height: '12px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        ) : (
          <svg style={{ width: '12px', height: '12px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        )}
      </button>
    </div>

      {/* 2. MAIN WORKSPACE (Light grey dashboard panel) */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflowY: 'auto' }}>

        {/* Top Header */}
        <header style={{
          backgroundColor: '#ffffff',
          padding: '1.25rem 2.25rem',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: 'var(--shadow-sm)',
          position: 'relative',
          zIndex: 99
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {activeTab === 'dashboard' && 'Dashboard Overview'}
              {activeTab === 'tenants' && 'Tenants Management'}
              {activeTab === 'admins' && 'Administrators Directory'}
              {activeTab === 'auditLogs' && 'Audit History Log'}
              {activeTab === 'settings' && 'Settings Console'}
            </h1>
          </div>

          {/* User profile capsule */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div
              className="calendar-pill"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                padding: '0.45rem 0.9rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.82rem',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                position: 'relative',
                userSelect: 'none'
              }}
              onClick={(e) => { e.stopPropagation(); setShowCalendar(!showCalendar); }}
            >
              📅 {liveTime}
              {showCalendar && (
                <div
                  className="animate-scale-in"
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    zIndex: 1000,
                    backgroundColor: 'var(--surface-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '16px',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.18)',
                    padding: '1.25rem',
                    minWidth: '320px',
                    color: 'var(--text-primary)'
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <CalendarWidget
                    value={calendarDate}
                    onChange={(value) => {
                      setCalendarDate(value);
                    }}
                    holidays={holidays}
                    accentColor={activeTheme.color}
                  />
                </div>
              )}
            </div>
            <div className="badge badge-success" style={{ padding: '0.45rem 0.9rem', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--zoho-green)', display: 'inline-block' }}></span>
              Super Admin
            </div>
            <button
              onClick={() => setDarkMode(!darkMode)}
              title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              style={{
                background: 'transparent',
                border: '1px solid var(--border-color)',
                borderRadius: '50%',
                width: '34px',
                height: '34px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                padding: 0
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--bg-primary)';
                e.currentTarget.style.transform = 'scale(1.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              {darkMode ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="var(--zoho-yellow)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: '16px', height: '16px' }}>
                  <circle cx="12" cy="12" r="5"></circle>
                  <line x1="12" y1="1" x2="12" y2="3"></line>
                  <line x1="12" y1="21" x2="12" y2="23"></line>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                  <line x1="1" y1="12" x2="3" y2="12"></line>
                  <line x1="21" y1="12" x2="23" y2="12"></line>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="var(--zoho-blue)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: '16px', height: '16px' }}>
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                </svg>
              )}
            </button>
            <button
              className="btn btn-secondary"
              onClick={loadData}
              style={{
                padding: '0.45rem',
                borderRadius: '50%',
                width: '34px',
                height: '34px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderColor: 'var(--border-color)',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}
              title="Sync Data"
              disabled={loading}
              onMouseEnter={(e) => {
                const icon = e.currentTarget.querySelector('svg');
                if (icon) icon.style.transform = 'rotate(180deg)';
              }}
              onMouseLeave={(e) => {
                const icon = e.currentTarget.querySelector('svg');
                if (icon) icon.style.transform = 'rotate(0deg)';
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={loading ? 'animate-spin-sync' : ''}
                style={{
                  width: '15px',
                  height: '15px',
                  transition: 'transform 0.5s ease',
                  color: 'var(--text-secondary)'
                }}
              >
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
            </button>
          </div>
        </header>

        {/* Dashboard Panels Container */}
        <div style={{ padding: '2.25rem', maxWidth: '1400px', width: '100%' }}>

          {/* GREETING BANNER */}
          {activeTab === 'dashboard' && (
            <div className="saas-card" style={{
              padding: '1.75rem 2.25rem',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '2rem',
              backgroundImage: darkMode ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.8) 100%)' : 'linear-gradient(135deg, #ffffff 0%, rgba(245, 248, 250, 0.5) 100%)',
              position: 'relative',
              overflow: 'hidden',
              border: darkMode ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid var(--border-color)',
              borderLeft: `5px solid ${activeTheme.color}`,
              transition: 'transform 0.25s ease, box-shadow 0.25s ease'
            }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = 'var(--shadow-md)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
              }}
            >
              <div>
                <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {(() => {
                    const dict = translations[language] || translations.en;
                    const hours = new Date().getHours();
                    if (hours < 12) return dict.morning;
                    if (hours < 17) return dict.afternoon;
                    return dict.evening;
                  })()}, {userName} 👋
                </h2>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
                  {translations[language]?.welcomeSuperAdmin || translations.en.welcomeSuperAdmin}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', opacity: 0.85 }}>
                <svg style={{ width: '85px', height: '85px' }} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="25" y="20" width="50" height="60" rx="10" fill={activeTheme.glow} stroke={activeTheme.color} strokeWidth="2" />
                  <rect x="42" y="10" width="16" height="10" rx="3" fill={activeTheme.color} />
                  <line x1="50" y1="35" x2="50" y2="65" stroke={activeTheme.color} strokeWidth="5" strokeLinecap="round" />
                  <line x1="35" y1="50" x2="65" y2="50" stroke={activeTheme.color} strokeWidth="5" strokeLinecap="round" />
                </svg>
              </div>
            </div>
          )}

          {/* Grid of 4 Stats Cards (Always visible on dashboard) */}
          {activeTab === 'dashboard' && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '1.5rem',
              marginBottom: '2rem'
            }}>
              <div className="saas-card" style={{ borderLeft: '4px solid var(--zoho-red)', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 700, letterSpacing: '0.05em' }}>Total Tenants</span>
                <span style={{ fontSize: '2.1rem', fontWeight: 800, color: 'var(--zoho-red)' }}>{totalTenants}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Registered workspaces</span>
              </div>
              <div className="saas-card" style={{ borderLeft: '4px solid var(--zoho-green)', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 700, letterSpacing: '0.05em' }}>Active Tenants</span>
                <span style={{ fontSize: '2.1rem', fontWeight: 800, color: 'var(--zoho-green)' }}>{activeTenants}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Online & functioning</span>
              </div>
              <div className="saas-card" style={{ borderLeft: '4px solid var(--zoho-blue)', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 700, letterSpacing: '0.05em' }}>Total Admins</span>
                <span style={{ fontSize: '2.1rem', fontWeight: 800, color: 'var(--zoho-blue)' }}>{totalAdmins}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Unique admin accounts</span>
              </div>
              <div className="saas-card" style={{ borderLeft: '4px solid var(--zoho-yellow)', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 700, letterSpacing: '0.05em' }}>Active Admins</span>
                <span style={{ fontSize: '2.1rem', fontWeight: 800, color: 'var(--zoho-yellow-hover)' }}>{activeAdmins}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Currently authorized</span>
              </div>
            </div>
          )}

          {error && (
            <div className="alert alert-error" style={{ marginBottom: '1.5rem' }}>
              <svg style={{ width: '18px', height: '18px', flexShrink: 0 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* MAIN PAGE GRIDS */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

            {/* TAB: DASHBOARD (Graph only) */}
            {activeTab === 'dashboard' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {/* ANALYTICS GRAPH (High-fidelity inline SVG line chart matching reference UI Order Summary) */}
                <div className="saas-card" style={{ padding: '2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Subscription Growth</span>
                      <h2 style={{ fontSize: '1.65rem', fontWeight: 800, marginTop: '0.15rem', color: 'var(--text-primary)' }}>
                        $14,840 <span className="badge badge-success" style={{ fontSize: '0.75rem', verticalAlign: 'middle', marginLeft: '0.5rem' }}>+12% vs last month</span>
                      </h2>
                    </div>
                  </div>
                  {/* SVG Line Graph */}
                  <svg viewBox="0 0 500 150" style={{ width: '100%', height: '220px' }}>
                    <defs>
                      <linearGradient id="chart-glow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={activeTheme.color} stopOpacity="0.25" />
                        <stop offset="100%" stopColor={activeTheme.color} stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    {/* Grid Lines */}
                    <line x1="0" y1="30" x2="500" y2="30" stroke="#e9eff5" strokeWidth="1" />
                    <line x1="0" y1="70" x2="500" y2="70" stroke="#e9eff5" strokeWidth="1" />
                    <line x1="0" y1="110" x2="500" y2="110" stroke="#e9eff5" strokeWidth="1" />

                    {/* Fill Area */}
                    <path d="M 0 150 Q 80 120, 150 90 T 300 50 T 450 70 L 500 60 L 500 150 Z" fill="url(#chart-glow)" />

                    {/* Chart Line */}
                    <path d="M 0 150 Q 80 120, 150 90 T 300 50 T 450 70 L 500 60" fill="none" stroke={activeTheme.color} strokeWidth="3" strokeLinecap="round" />

                    {/* Highlight Dot */}
                    <circle cx="300" cy="50" r="5" fill="var(--zoho-yellow)" stroke="#ffffff" strokeWidth="2" />
                  </svg>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                    <span>Jan</span>
                    <span>Feb</span>
                    <span>Mar</span>
                    <span>Apr</span>
                    <span>May</span>
                    <span>Jun</span>
                  </div>
                </div>
              </div>
            )}
          </div>

            {/* TAB DIRECTORY: TENANTS */}
            {activeTab === 'tenants' && (
              <div className="saas-card" style={{ padding: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h2 style={{ fontSize: '1.35rem', color: 'var(--text-primary)' }}>Active Tenant Workspaces</h2>
                  <button className={`btn ${activeTheme.btnClass}`} onClick={openTenantCreate} title="Create Workspace" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', borderRadius: 'var(--radius-sm)' }}>
                    ➕
                  </button>
                </div>

                {/* CONTROL TOOLBAR: Search, Sort, Filter, Card/Table Toggle */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '1rem',
                  marginBottom: '1.5rem',
                  flexWrap: 'wrap',
                  background: 'var(--bg-primary)',
                  padding: '1rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', position: 'relative', flex: 1, minWidth: '240px' }}>
                    <input
                      type="text"
                      placeholder="Search tenants..."
                      className="form-input"
                      style={{ width: '100%', paddingLeft: '2.5rem', height: '40px' }}
                      value={tenantSearch}
                      onChange={(e) => setTenantSearch(e.target.value)}
                    />
                    <span style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }}>🔍</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Filter:</span>
                      <select
                        value={tenantFilter}
                        onChange={(e) => setTenantFilter(e.target.value as any)}
                        className="form-input"
                        style={{ padding: '0.4rem 1.8rem 0.4rem 0.8rem', fontSize: '0.85rem', height: '40px', background: 'var(--bg-secondary)', cursor: 'pointer' }}
                      >
                        <option value="all">All Workspaces</option>
                        <option value="active">Active Only</option>
                        <option value="inactive">Inactive Only</option>
                      </select>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Sort:</span>
                      <select
                        value={tenantSort}
                        onChange={(e) => setTenantSort(e.target.value as any)}
                        className="form-input"
                        style={{ padding: '0.4rem 1.8rem 0.4rem 0.8rem', fontSize: '0.85rem', height: '40px', background: 'var(--bg-secondary)', cursor: 'pointer' }}
                      >
                        <option value="name">Sort by Name</option>
                        <option value="code">Sort by Code</option>
                        <option value="status">Sort by Status</option>
                      </select>
                    </div>
                    <div style={{ display: 'flex', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', height: '40px' }}>
                      <button
                        type="button"
                        onClick={() => setTenantView('table')}
                        style={{
                          border: 'none',
                          padding: '0 0.85rem',
                          background: tenantView === 'table' ? activeTheme.color : '#ffffff',
                          color: tenantView === 'table' ? '#ffffff' : 'var(--text-secondary)',
                          cursor: 'pointer',
                          fontWeight: 600,
                          transition: 'all 0.15s ease'
                        }}
                      >
                        📋 Table
                      </button>
                      <button
                        type="button"
                        onClick={() => setTenantView('card')}
                        style={{
                          border: 'none',
                          padding: '0 0.85rem',
                          background: tenantView === 'card' ? activeTheme.color : '#ffffff',
                          color: tenantView === 'card' ? '#ffffff' : 'var(--text-secondary)',
                          cursor: 'pointer',
                          fontWeight: 600,
                          transition: 'all 0.15s ease'
                        }}
                      >
                        📇 Card
                      </button>
                    </div>
                  </div>
                </div>

                {loading ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 0' }}>
                    <div className="spinner" />
                  </div>
                ) : filteredTenants.length === 0 ? (
                  <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '3rem' }}>No matching tenants found.</div>
                ) : tenantView === 'table' ? (
                  <div className={`table-container ${denseTable ? 'dense-table' : ''}`}>
                    <table>
                      <thead>
                        <tr>
                          <th>Workspace Name</th>
                          <th>Code Prefix</th>
                          <th>Description</th>
                          <th>Status</th>
                          <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTenants.map(t => (
                          <tr key={t.id}>
                            <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{t.name}</td>
                            <td>
                              <code style={{ fontSize: '0.75rem', padding: '0.2rem 0.4rem', background: 'var(--bg-tertiary)', borderRadius: '4px', color: 'var(--zoho-blue)', fontWeight: 600 }}>{t.code}</code>
                            </td>
                            <td style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{t.description || 'No description'}</td>
                            <td>
                              <span className={`badge ${t.isActive ? 'badge-success' : 'badge-error'}`}>
                                {t.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                                <button
                                  className="btn btn-secondary"
                                  style={{
                                    padding: '0.35rem 0.6rem',
                                    fontSize: '0.85rem',
                                    borderRadius: 'var(--radius-sm)',
                                    borderColor: 'rgba(34, 109, 180, 0.25)',
                                    color: 'var(--zoho-blue)',
                                    background: 'rgba(34, 109, 180, 0.05)'
                                  }}
                                  onClick={() => openTenantView(t)}
                                  title="View Details"
                                >
                                  👁️
                                </button>
                                <button
                                  className="btn btn-secondary"
                                  style={{ padding: '0.35rem 0.6rem', fontSize: '0.85rem', borderRadius: 'var(--radius-sm)' }}
                                  onClick={() => { openTenantView(t); setDrawerMode('edit'); }}
                                  title="Edit Tenant"
                                >
                                  ✏️
                                </button>
                                <button
                                  onClick={() => handleToggleTenantStatus(t.id, t.isActive)}
                                  title={t.isActive ? "Deactivate Tenant" : "Activate Tenant"}
                                  style={{
                                    border: 'none',
                                    background: 'none',
                                    padding: 0,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    outline: 'none',
                                    verticalAlign: 'middle',
                                    margin: '0 0.5rem'
                                  }}
                                >
                                  <div style={{
                                    position: 'relative',
                                    width: '38px',
                                    height: '20px',
                                    backgroundColor: t.isActive ? 'var(--zoho-green)' : 'rgba(120, 120, 120, 0.3)',
                                    borderRadius: '10px',
                                    transition: 'background-color 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                                    border: '1px solid rgba(0, 0, 0, 0.1)'
                                  }}>
                                    <div style={{
                                      position: 'absolute',
                                      top: '2px',
                                      left: t.isActive ? '20px' : '2px',
                                      width: '14px',
                                      height: '14px',
                                      borderRadius: '50%',
                                      backgroundColor: '#ffffff',
                                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                                      transition: 'left 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
                                    }} />
                                  </div>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '1.5rem' }}>
                    {filteredTenants.map(t => (
                      <div
                        key={t.id}
                        className="saas-card animate-fade-in"
                        style={{
                          borderLeft: `4px solid ${t.isActive ? 'var(--zoho-green)' : 'var(--zoho-red)'}`,
                          padding: '1.5rem',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          height: '180px',
                          position: 'relative'
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                            <code style={{ fontSize: '0.75rem', padding: '0.2rem 0.4rem', background: 'var(--bg-tertiary)', borderRadius: '4px', color: 'var(--zoho-blue)', fontWeight: 600 }}>
                              {t.code}
                            </code>
                            <span className={`badge ${t.isActive ? 'badge-success' : 'badge-error'}`}>
                              {t.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                            {t.name}
                          </h3>
                          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                            {t.description || 'No description provided'}
                          </p>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
                          <button
                            className="btn btn-secondary"
                            style={{
                              padding: '0.3rem 0.55rem',
                              fontSize: '0.8rem',
                              borderColor: 'rgba(34, 109, 180, 0.25)',
                              color: 'var(--zoho-blue)',
                              background: 'rgba(34, 109, 180, 0.05)'
                            }}
                            onClick={() => openTenantView(t)}
                            title="View Details"
                          >
                            👁️
                          </button>
                          <button
                            className="btn btn-secondary"
                            style={{ padding: '0.3rem 0.55rem', fontSize: '0.8rem' }}
                            onClick={() => { openTenantView(t); setDrawerMode('edit'); }}
                            title="Edit Tenant"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleToggleTenantStatus(t.id, t.isActive)}
                            title={t.isActive ? "Deactivate Tenant" : "Activate Tenant"}
                            style={{
                              border: 'none',
                              background: 'none',
                              padding: 0,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              outline: 'none',
                              alignSelf: 'center'
                            }}
                          >
                            <div style={{
                              position: 'relative',
                              width: '38px',
                              height: '20px',
                              backgroundColor: t.isActive ? 'var(--zoho-green)' : 'rgba(120, 120, 120, 0.3)',
                              borderRadius: '10px',
                              transition: 'background-color 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                              border: '1px solid rgba(0, 0, 0, 0.1)'
                            }}>
                              <div style={{
                                position: 'absolute',
                                top: '2px',
                                left: t.isActive ? '20px' : '2px',
                                width: '14px',
                                height: '14px',
                                borderRadius: '50%',
                                backgroundColor: '#ffffff',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                                transition: 'left 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
                              }} />
                            </div>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB DIRECTORY: ADMINS */}
            {activeTab === 'admins' && (
              <div className="saas-card" style={{ padding: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h2 style={{ fontSize: '1.35rem', color: 'var(--text-primary)' }}>Administrators Directory</h2>
                  <button className={`btn ${activeTheme.btnClass}`} onClick={openAdminCreate} title="Register Admin" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', borderRadius: 'var(--radius-sm)' }}>
                    👤
                  </button>
                </div>

                {/* CONTROL TOOLBAR: Search, Sort, Filter, Card/Table Toggle */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '1rem',
                  marginBottom: '1.5rem',
                  flexWrap: 'wrap',
                  background: 'var(--bg-primary)',
                  padding: '1rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', position: 'relative', flex: 1, minWidth: '240px' }}>
                    <input
                      type="text"
                      placeholder="Search admins..."
                      className="form-input"
                      style={{ width: '100%', paddingLeft: '2.5rem', height: '40px' }}
                      value={adminSearch}
                      onChange={(e) => setAdminSearch(e.target.value)}
                    />
                    <span style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }}>🔍</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Filter:</span>
                      <select
                        value={adminFilter}
                        onChange={(e) => setAdminFilter(e.target.value as any)}
                        className="form-input"
                        style={{ padding: '0.4rem 1.8rem 0.4rem 0.8rem', fontSize: '0.85rem', height: '40px', background: 'var(--bg-secondary)', cursor: 'pointer' }}
                      >
                        <option value="all">All Admins</option>
                        <option value="active">Active Only</option>
                        <option value="inactive">Inactive Only</option>
                      </select>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Sort:</span>
                      <select
                        value={adminSort}
                        onChange={(e) => setAdminSort(e.target.value as any)}
                        className="form-input"
                        style={{ padding: '0.4rem 1.8rem 0.4rem 0.8rem', fontSize: '0.85rem', height: '40px', background: 'var(--bg-secondary)', cursor: 'pointer' }}
                      >
                        <option value="name">Sort by Name</option>
                        <option value="email">Sort by Email</option>
                        <option value="status">Sort by Status</option>
                      </select>
                    </div>
                    <div style={{ display: 'flex', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', height: '40px' }}>
                      <button
                        type="button"
                        onClick={() => setAdminView('table')}
                        style={{
                          border: 'none',
                          padding: '0 0.85rem',
                          background: adminView === 'table' ? activeTheme.color : '#ffffff',
                          color: adminView === 'table' ? '#ffffff' : 'var(--text-secondary)',
                          cursor: 'pointer',
                          fontWeight: 600,
                          transition: 'all 0.15s ease'
                        }}
                      >
                        📋 Table
                      </button>
                      <button
                        type="button"
                        onClick={() => setAdminView('card')}
                        style={{
                          border: 'none',
                          padding: '0 0.85rem',
                          background: adminView === 'card' ? activeTheme.color : '#ffffff',
                          color: adminView === 'card' ? '#ffffff' : 'var(--text-secondary)',
                          cursor: 'pointer',
                          fontWeight: 600,
                          transition: 'all 0.15s ease'
                        }}
                      >
                        📇 Card
                      </button>
                    </div>
                  </div>
                </div>

                {loading ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 0' }}>
                    <div className="spinner" />
                  </div>
                ) : filteredAdmins.length === 0 ? (
                  <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '3rem' }}>No matching administrators found.</div>
                ) : adminView === 'table' ? (
                  <div className={`table-container ${denseTable ? 'dense-table' : ''}`}>
                    <table>
                      <thead>
                        <tr>
                          <th>Admin User</th>
                          <th>Email Address</th>
                          <th>Workspace</th>
                          <th>Feature Modules</th>
                          <th>Status</th>
                          <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredAdmins.map(a => (
                          <tr key={`${a.userId}-${a.tenantId}`}>
                            <td>
                              <div>
                                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{a.userName}</span>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: '0.4rem' }}>(ID: {a.userId})</span>
                              </div>
                            </td>
                            <td style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{a.email}</td>
                            <td>
                              <span className="badge badge-blue">🏢 {a.tenantName}</span>
                            </td>
                            <td>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                                {(a.assignedModules || []).length > 0 ? (
                                  (a.assignedModules || []).map(mod => (
                                    <span key={mod} className="badge badge-warning" style={{ fontSize: '0.68rem' }}>{mod}</span>
                                  ))
                                ) : (
                                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>None Assigned</span>
                                )}
                              </div>
                            </td>
                            <td>
                              <span className={`badge ${a.isActive ? 'badge-success' : 'badge-error'}`}>
                                {a.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                                <button
                                  className="btn btn-secondary"
                                  style={{
                                    padding: '0.35rem 0.6rem',
                                    fontSize: '0.85rem',
                                    borderRadius: 'var(--radius-sm)',
                                    borderColor: 'rgba(34, 109, 180, 0.25)',
                                    color: 'var(--zoho-blue)',
                                    background: 'rgba(34, 109, 180, 0.05)'
                                  }}
                                  onClick={() => openAdminView(a)}
                                  title="View Details"
                                >
                                  👁️
                                </button>
                                <button
                                  className="btn btn-secondary"
                                  style={{ padding: '0.35rem 0.6rem', fontSize: '0.85rem', borderRadius: 'var(--radius-sm)' }}
                                  onClick={() => {
                                    openAdminView(a);
                                    setDrawerMode('edit');
                                  }}
                                  title="Edit Admin"
                                >
                                  ✏️
                                </button>
                                <button
                                  onClick={() => handleToggleAdminStatus(a.userId, a.isActive)}
                                  title={a.isActive ? "Deactivate Admin" : "Activate Admin"}
                                  style={{
                                    border: 'none',
                                    background: 'none',
                                    padding: 0,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    outline: 'none',
                                    verticalAlign: 'middle',
                                    margin: '0 0.5rem'
                                  }}
                                >
                                  <div style={{
                                    position: 'relative',
                                    width: '38px',
                                    height: '20px',
                                    backgroundColor: a.isActive ? 'var(--zoho-green)' : 'rgba(120, 120, 120, 0.3)',
                                    borderRadius: '10px',
                                    transition: 'background-color 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                                    border: '1px solid rgba(0, 0, 0, 0.1)'
                                  }}>
                                    <div style={{
                                      position: 'absolute',
                                      top: '2px',
                                      left: a.isActive ? '20px' : '2px',
                                      width: '14px',
                                      height: '14px',
                                      borderRadius: '50%',
                                      backgroundColor: '#ffffff',
                                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                                      transition: 'left 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
                                    }} />
                                  </div>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '1.5rem' }}>
                    {filteredAdmins.map(a => (
                      <div
                        key={`${a.userId}-${a.tenantId}`}
                        className="saas-card animate-fade-in"
                        style={{
                          borderLeft: `4px solid ${a.isActive ? 'var(--zoho-green)' : 'var(--zoho-red)'}`,
                          padding: '1.5rem',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          height: '210px'
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                            <span className="badge badge-blue">🏢 {a.tenantName}</span>
                            <span className={`badge ${a.isActive ? 'badge-success' : 'badge-error'}`}>
                              {a.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
                            {a.userName}
                          </h3>
                          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                            ✉️ {a.email}
                          </p>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                            {(a.assignedModules || []).length > 0 ? (
                              (a.assignedModules || []).map(mod => (
                                <span key={mod} className="badge badge-warning" style={{ fontSize: '0.65rem' }}>{mod}</span>
                              ))
                            ) : (
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No modules assigned</span>
                            )}
                          </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
                          <button
                            className="btn btn-secondary"
                            style={{
                              padding: '0.3rem 0.55rem',
                              fontSize: '0.8rem',
                              borderColor: 'rgba(34, 109, 180, 0.25)',
                              color: 'var(--zoho-blue)',
                              background: 'rgba(34, 109, 180, 0.05)'
                            }}
                            onClick={() => openAdminView(a)}
                            title="View Details"
                          >
                            👁️
                          </button>
                          <button
                            className="btn btn-secondary"
                            style={{ padding: '0.3rem 0.55rem', fontSize: '0.8rem' }}
                            onClick={() => {
                              openAdminView(a);
                              setDrawerMode('edit');
                            }}
                            title="Edit Admin"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleToggleAdminStatus(a.userId, a.isActive)}
                            title={a.isActive ? "Deactivate Admin" : "Activate Admin"}
                            style={{
                              border: 'none',
                              background: 'none',
                              padding: 0,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              outline: 'none',
                              alignSelf: 'center'
                            }}
                          >
                            <div style={{
                              position: 'relative',
                              width: '38px',
                              height: '20px',
                              backgroundColor: a.isActive ? 'var(--zoho-green)' : 'rgba(120, 120, 120, 0.3)',
                              borderRadius: '10px',
                              transition: 'background-color 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                              border: '1px solid rgba(0, 0, 0, 0.1)'
                            }}>
                              <div style={{
                                position: 'absolute',
                                top: '2px',
                                left: a.isActive ? '20px' : '2px',
                                width: '14px',
                                height: '14px',
                                borderRadius: '50%',
                                backgroundColor: '#ffffff',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                                transition: 'left 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
                              }} />
                            </div>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
                  {activeTab === 'settings' && (() => {
              const hasMinLength = newPassword.length >= 8;
              const hasUppercase = /[A-Z]/.test(newPassword);
              const hasNumber = /[0-9]/.test(newPassword);
              const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);
              const isPasswordValid = hasMinLength && hasUppercase && hasNumber && hasSpecial && (newPassword === confirmPassword);

              const currentLangLabel = language === 'en' ? 'English (US)' : language === 'es' ? 'Español' : 'Français';
              const currentTimezoneLabel = timezone === 'UTC' ? 'UTC' : timezone === 'EST' ? 'EST' : timezone === 'PST' ? 'PST' : 'IST';

              const renderThemeMockup = (colors: Record<string, string>) => {
                const primaryColor = colors['--zoho-blue'];
                const redColor = colors['--zoho-red'];
                const greenColor = colors['--zoho-green'];
                const yellowColor = colors['--zoho-yellow'];
                
                return (
                  <div style={{
                    width: '100%',
                    height: '60px',
                    borderRadius: 'var(--radius-sm)',
                    background: darkMode ? '#1e293b' : '#f8fafc',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    overflow: 'hidden',
                    padding: '2px',
                    gap: '2px',
                    boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.05)'
                  }}>
                    {/* Sidebar Mockup */}
                    <div style={{ width: '18px', background: darkMode ? '#0f172a' : '#ffffff', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '3px', padding: '3px 1px' }}>
                      <div style={{ height: '4px', width: '80%', background: primaryColor, borderRadius: '1px' }} />
                      <div style={{ height: '3px', width: '60%', background: 'var(--text-secondary)', opacity: 0.3, borderRadius: '1px' }} />
                      <div style={{ height: '3px', width: '70%', background: 'var(--text-secondary)', opacity: 0.3, borderRadius: '1px' }} />
                    </div>
                    {/* Content Mockup */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      {/* Header Mockup */}
                      <div style={{ height: '8px', background: darkMode ? '#0f172a' : '#ffffff', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', padding: '0 4px' }}>
                        <div style={{ height: '3px', width: '15px', background: primaryColor, borderRadius: '1px' }} />
                      </div>
                      {/* Body Grid Mockup */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '2px', padding: '2px' }}>
                        <div style={{ height: '12px', background: redColor, opacity: 0.15, borderRadius: '1px', border: `1px solid ${redColor}` }} />
                        <div style={{ height: '12px', background: greenColor, opacity: 0.15, borderRadius: '1px', border: `1px solid ${greenColor}` }} />
                        <div style={{ height: '12px', background: yellowColor, opacity: 0.15, borderRadius: '1px', border: `1px solid ${yellowColor}` }} />
                      </div>
                    </div>
                  </div>
                );
              };

              return (
                <div className="animate-fade-in" style={{ width: '100%', maxWidth: '850px', margin: '0 auto' }}>
                  {/* Settings Tab Headers */}
                  <div style={{
                    display: 'flex',
                    borderBottom: '1px solid var(--border-color)',
                    marginBottom: '1.5rem',
                    gap: '1.5rem',
                    paddingBottom: '0.25rem',
                    overflowX: 'auto'
                  }}>
                    {[
                      { id: 'profile', label: 'Profile', icon: '👤' },
                      { id: 'security', label: 'Security', icon: '🔑' },
                      { id: 'appearance', label: 'Appearance', icon: '🎨' },
                      { id: 'preferences', label: 'Preferences', icon: '⚙️' }
                    ].map((tab) => {
                      const isSubActive = settingsSubTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setSettingsSubTab(tab.id as any)}
                          style={{
                            background: 'none',
                            border: 'none',
                            borderBottom: isSubActive ? '3px solid var(--zoho-blue)' : '3px solid transparent',
                            padding: '0.75rem 0.5rem',
                            cursor: 'pointer',
                            fontWeight: isSubActive ? 700 : 500,
                            color: isSubActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            fontSize: '0.95rem',
                            transition: 'all 0.2s',
                            outline: 'none',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          <span>{tab.icon}</span>
                          <span>{tab.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    
                    {/* PROFILE SETTINGS TAB */}
                    {settingsSubTab === 'profile' && (
                      <div className="saas-card animate-fade-in" style={{ padding: '2rem', borderTop: `4px solid ${activeTheme.color}` }}>
                        <h3 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', fontWeight: 800, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          👤 Profile Settings
                        </h3>
                        <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                          {/* Profile Picture */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                            <div style={{
                              width: '70px',
                              height: '70px',
                              borderRadius: '50%',
                              background: 'var(--zoho-blue)',
                              color: '#ffffff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: '1.75rem',
                              border: '3px solid rgba(255,255,255,0.1)',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                              position: 'relative',
                              cursor: 'pointer'
                            }} title="Change Profile Picture">
                              {profileName.substring(0, 1).toUpperCase()}
                              <div style={{
                                position: 'absolute',
                                inset: 0,
                                borderRadius: '50%',
                                backgroundColor: 'rgba(0,0,0,0.4)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                opacity: 0,
                                transition: 'opacity 0.2s',
                                fontSize: '0.75rem',
                                fontWeight: 500
                              }}
                              className="avatar-overlay"
                              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
                              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0'; }}
                              >
                                Edit
                              </div>
                            </div>
                            <div>
                              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>Profile Picture</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>PNG, JPG up to 2MB</div>
                              <input type="file" style={{ display: 'none' }} id="profile-pic-upload" disabled />
                              <label htmlFor="profile-pic-upload" style={{ display: 'inline-block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--zoho-blue)', cursor: 'pointer', marginTop: '0.35rem' }}>Upload New Photo</label>
                            </div>
                          </div>

                          {/* Profile Inputs */}
                          <div className="form-group">
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Full Name</label>
                            <input
                              type="text"
                              required
                              value={profileName}
                              onChange={(e) => setProfileName(e.target.value)}
                              className="form-input"
                              placeholder="Name"
                            />
                          </div>

                          <div className="form-group">
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Email Address</label>
                            <input
                              type="email"
                              required
                              value={profileEmail}
                              onChange={(e) => setProfileEmail(e.target.value)}
                              className="form-input"
                              placeholder="email@domain.com"
                            />
                          </div>

                          <div className="form-group">
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Phone Number</label>
                            <input
                              type="text"
                              value={profilePhone}
                              onChange={(e) => setProfilePhone(e.target.value)}
                              className="form-input"
                              placeholder="+1 (555) 000-0000"
                            />
                          </div>

                          {profileSuccessMessage && (
                            <div style={{
                              padding: '0.75rem',
                              borderRadius: 'var(--radius-sm)',
                              fontSize: '0.85rem',
                              backgroundColor: 'var(--zoho-green-glow)',
                              color: 'var(--zoho-green)',
                              border: '1px solid rgba(8,153,73,0.2)'
                            }}>
                              ✓ {profileSuccessMessage}
                            </div>
                          )}

                          <button
                            type="submit"
                            className="btn btn-secondary"
                            style={{ alignSelf: 'flex-start', padding: '0.6rem 1.5rem', fontWeight: 600, backgroundColor: 'var(--zoho-blue)', color: '#ffffff', border: 'none' }}
                          >
                            Update Profile
                          </button>
                        </form>
                      </div>
                    )}

                    {/* APPEARANCE TAB */}
                    {settingsSubTab === 'appearance' && (
                      <div className="saas-card animate-fade-in" style={{ padding: '2rem', borderTop: `4px solid ${activeTheme.color}`, display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        <div>
                          <h3 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            🎨 Appearance & Theme
                          </h3>
                          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                            Customize how PCMS looks and feels. Customize your brand color, choose a theme preset, or toggle dark mode.
                          </p>
                        </div>

                        {/* Brand Color Swatch & Customization */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
                          <label style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>Custom Brand Color</label>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div 
                              onClick={() => document.getElementById('custom-brand-color-picker')?.click()}
                              style={{
                                width: '44px',
                                height: '44px',
                                borderRadius: '50%',
                                backgroundColor: customBrandColor,
                                border: '3px solid var(--border-color)',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                                cursor: 'pointer',
                                position: 'relative',
                                transition: 'transform 0.15s'
                              }}
                              className="color-swatch-circle"
                              title="Click to pick a color"
                              onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.08)'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                            >
                              <input 
                                type="color" 
                                id="custom-brand-color-picker" 
                                value={customBrandColor} 
                                onChange={(e) => handleBrandColorChange(e.target.value)}
                                style={{ position: 'absolute', opacity: 0, width: 0, height: 0, padding: 0, border: 'none' }}
                              />
                            </div>
                            <div style={{ position: 'relative', width: '130px' }}>
                              <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.85rem' }}>#</span>
                              <input 
                                type="text" 
                                maxLength={7}
                                value={customBrandColor.startsWith('#') ? customBrandColor.substring(1) : customBrandColor}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  const formatted = val.startsWith('#') ? val : '#' + val;
                                  if (formatted.length <= 7) {
                                    setCustomBrandColor(formatted);
                                    if (/^#[0-9A-F]{6}$/i.test(formatted)) {
                                      handleBrandColorChange(formatted);
                                    }
                                  }
                                }}
                                className="form-input" 
                                placeholder="444CE7"
                                style={{ paddingLeft: '1.75rem', width: '100%', fontFamily: 'monospace', fontWeight: 600 }}
                              />
                            </div>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Click the swatch or type a hex code to dynamically theme the system.</span>
                          </div>
                        </div>

                        {/* Theme presets selection */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
                          <label style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>Theme Preset Palette</label>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem' }}>
                            {Object.entries(themePatterns).map(([key, value]) => {
                              const isSelected = themePattern === key;
                              return (
                                <div
                                  key={key}
                                  onClick={() => setThemePattern(key as any)}
                                  style={{
                                    padding: '0.75rem',
                                    borderRadius: 'var(--radius-md)',
                                    border: isSelected ? '2px solid var(--zoho-blue)' : '1px solid var(--border-color)',
                                    background: isSelected ? 'var(--bg-secondary)' : 'var(--bg-primary)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.65rem',
                                    transition: 'all 0.2s',
                                    boxShadow: isSelected ? '0 4px 12px var(--zoho-blue-glow)' : 'none'
                                  }}
                                >
                                  {renderThemeMockup(value.colors)}
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'center' }}>
                                    <div style={{
                                      width: '10px',
                                      height: '10px',
                                      borderRadius: '50%',
                                      backgroundColor: value.colors['--zoho-blue']
                                    }} />
                                    <span style={{ fontSize: '0.78rem', fontWeight: isSelected ? 700 : 500, color: 'var(--text-primary)', textAlign: 'center' }}>
                                      {value.name.split(' (')[0]}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Theme Contrast Mode */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          <label style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>Theme Contrast</label>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                            {/* Light Mode Card */}
                            <div
                              onClick={() => setDarkMode(false)}
                              style={{
                                borderRadius: 'var(--radius-md)',
                                border: !darkMode ? '2px solid var(--zoho-blue)' : '1px solid var(--border-color)',
                                background: '#ffffff',
                                cursor: 'pointer',
                                padding: '1rem',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.75rem',
                                transition: 'all 0.2s',
                                boxShadow: !darkMode ? '0 4px 12px var(--zoho-blue-glow)' : 'none'
                              }}
                            >
                              <div style={{
                                height: '50px',
                                background: '#f8fafc',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid #e2e8f0',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem'
                              }}>
                                <span style={{ fontSize: '1.25rem' }}>☀️</span>
                                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155' }}>Light Theme</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155' }}>Light Mode</span>
                                <div style={{
                                  width: '16px',
                                  height: '16px',
                                  borderRadius: '50%',
                                  border: '1px solid #cbd5e1',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  background: !darkMode ? 'var(--zoho-blue)' : 'transparent'
                                }}>
                                  {!darkMode && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ffffff' }} />}
                                </div>
                              </div>
                            </div>

                            {/* Dark Mode Card */}
                            <div
                              onClick={() => setDarkMode(true)}
                              style={{
                                borderRadius: 'var(--radius-md)',
                                border: darkMode ? '2px solid var(--zoho-blue)' : '1px solid var(--border-color)',
                                background: '#0f172a',
                                cursor: 'pointer',
                                padding: '1rem',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.75rem',
                                transition: 'all 0.2s',
                                boxShadow: darkMode ? '0 4px 12px var(--zoho-blue-glow)' : 'none'
                              }}
                            >
                              <div style={{
                                height: '50px',
                                background: '#1e293b',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid #334155',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem'
                              }}>
                                <span style={{ fontSize: '1.25rem' }}>🌙</span>
                                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f8fafc' }}>Dark Theme</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8' }}>Dark Mode</span>
                                <div style={{
                                  width: '16px',
                                  height: '16px',
                                  borderRadius: '50%',
                                  border: '1px solid #475569',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  background: darkMode ? 'var(--zoho-blue)' : 'transparent'
                                }}>
                                  {darkMode && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ffffff' }} />}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* SECURITY & PASSWORD TAB */}
                    {settingsSubTab === 'security' && (
                      <div className="saas-card animate-fade-in" style={{ padding: '2rem', borderTop: `4px solid ${activeTheme.color}` }}>
                        <h3 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', fontWeight: 800, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          🔑 Security & Password
                        </h3>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                          Choose a strong, complex password to secure your account.
                        </p>
                        <form onSubmit={handleSettingsChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                          <div className="form-group">
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Current Password</label>
                            <div style={{ position: 'relative' }}>
                              <svg style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: 'var(--text-secondary)', zIndex: 2 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                              </svg>
                              <input
                                type={showCurrentPassword ? "text" : "password"}
                                required
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                className="form-input"
                                placeholder="••••••••"
                                style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem', width: '100%', background: 'var(--bg-secondary)' }}
                              />
                              <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px', display: 'flex', alignItems: 'center', zIndex: 2 }}>
                                {showCurrentPassword ? (
                                  <svg style={{ width: '16px', height: '16px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                    <line x1="1" y1="1" x2="23" y2="23" />
                                  </svg>
                                ) : (
                                  <svg style={{ width: '16px', height: '16px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                    <circle cx="12" cy="12" r="3" />
                                  </svg>
                                )}
                              </button>
                            </div>
                          </div>
                          
                          <div className="form-group">
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>New Password</label>
                            <div style={{ position: 'relative' }}>
                              <svg style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: 'var(--text-secondary)', zIndex: 2 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                              </svg>
                              <input
                                type={showNewPassword ? "text" : "password"}
                                required
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="form-input"
                                placeholder="••••••••"
                                style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem', width: '100%', background: 'var(--bg-secondary)' }}
                              />
                              <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px', display: 'flex', alignItems: 'center', zIndex: 2 }}>
                                {showNewPassword ? (
                                  <svg style={{ width: '16px', height: '16px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                    <line x1="1" y1="1" x2="23" y2="23" />
                                  </svg>
                                ) : (
                                  <svg style={{ width: '16px', height: '16px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                    <circle cx="12" cy="12" r="3" />
                                  </svg>
                                )}
                              </button>
                            </div>
                            
                            {newPassword && (
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.65rem', padding: '0.65rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-primary)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', color: hasMinLength ? 'var(--zoho-green)' : 'var(--text-secondary)', fontWeight: 600 }}>
                                  <span style={{ fontSize: '0.9rem' }}>{hasMinLength ? '✓' : '•'}</span> 8+ characters
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', color: hasUppercase ? 'var(--zoho-green)' : 'var(--text-secondary)', fontWeight: 600 }}>
                                  <span style={{ fontSize: '0.9rem' }}>{hasUppercase ? '✓' : '•'}</span> 1 uppercase letter
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', color: hasNumber ? 'var(--zoho-green)' : 'var(--text-secondary)', fontWeight: 600 }}>
                                  <span style={{ fontSize: '0.9rem' }}>{hasNumber ? '✓' : '•'}</span> 1 number
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', color: hasSpecial ? 'var(--zoho-green)' : 'var(--text-secondary)', fontWeight: 600 }}>
                                  <span style={{ fontSize: '0.9rem' }}>{hasSpecial ? '✓' : '•'}</span> 1 special char
                                </div>
                              </div>
                            )}
                          </div>
                          
                          <div className="form-group">
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Confirm New Password</label>
                            <div style={{ position: 'relative' }}>
                              <svg style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: 'var(--text-secondary)', zIndex: 2 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                              </svg>
                              <input
                                type={showConfirmPassword ? "text" : "password"}
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="form-input"
                                placeholder="••••••••"
                                style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem', width: '100%', background: 'var(--bg-secondary)' }}
                              />
                              <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px', display: 'flex', alignItems: 'center', zIndex: 2 }}>
                                {showConfirmPassword ? (
                                  <svg style={{ width: '16px', height: '16px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                    <line x1="1" y1="1" x2="23" y2="23" />
                                  </svg>
                                ) : (
                                  <svg style={{ width: '16px', height: '16px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                    <circle cx="12" cy="12" r="3" />
                                  </svg>
                                )}
                              </button>
                            </div>
                            
                            {confirmPassword && (
                              <div style={{ marginTop: '0.5rem', fontSize: '0.78rem', fontWeight: 600, color: newPassword === confirmPassword ? 'var(--zoho-green)' : 'var(--zoho-red)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                {newPassword === confirmPassword ? (
                                  <>
                                    <span style={{ fontSize: '0.9rem' }}>✓</span> Passwords match
                                  </>
                                ) : (
                                  <>
                                    <span style={{ fontSize: '0.9rem' }}>✗</span> Passwords do not match
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                          
                          {passwordFeedback && (
                            <div style={{
                              padding: '0.75rem',
                              borderRadius: 'var(--radius-sm)',
                              fontSize: '0.85rem',
                              backgroundColor: passwordFeedback.status === 'success' ? 'var(--zoho-green-glow)' : 'var(--zoho-red-glow)',
                              color: passwordFeedback.status === 'success' ? 'var(--zoho-green)' : 'var(--zoho-red)',
                              border: `1px solid ${passwordFeedback.status === 'success' ? 'rgba(8,153,73,0.2)' : 'rgba(228,37,39,0.2)'}`
                            }}>
                              {passwordFeedback.message}
                            </div>
                          )}
                          
                          <button
                            type="submit"
                            disabled={passwordLoading || !isPasswordValid}
                            className={`btn ${activeTheme.btnClass}`}
                            style={{ alignSelf: 'flex-start', padding: '0.6rem 1.5rem', fontWeight: 600, opacity: (!isPasswordValid && !passwordLoading) ? 0.6 : 1, cursor: (!isPasswordValid && !passwordLoading) ? 'not-allowed' : 'pointer' }}
                          >
                            {passwordLoading ? <div className="spinner" style={{ borderTopColor: '#ffffff', width: '16px', height: '16px' }} /> : 'Update Password'}
                          </button>
                        </form>
                      </div>
                    )}

                    {/* GENERAL PREFERENCES TAB */}
                    {settingsSubTab === 'preferences' && (
                      <div className="saas-card animate-fade-in" style={{ padding: '2rem', borderTop: `4px solid ${activeTheme.color}` }}>
                        <h3 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', fontWeight: 800, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          ⚙️ General Preferences
                        </h3>

                        {/* Collapsed Summary View */}
                        <div 
                          onClick={() => setPreferencesExpanded(!preferencesExpanded)}
                          style={{
                            padding: '1.25rem 1.5rem',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border-color)',
                            background: 'var(--bg-secondary)',
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            transition: 'all 0.2s',
                            userSelect: 'none'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <span style={{ fontSize: '1.25rem' }}>⚙️</span>
                            <div>
                              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block' }}>System Localization & Formats</span>
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                Language: <strong style={{ color: 'var(--zoho-blue)' }}>{currentLangLabel}</strong> • Timezone: <strong style={{ color: 'var(--zoho-blue)' }}>{currentTimezoneLabel}</strong> • Date Format: <strong style={{ color: 'var(--zoho-blue)' }}>{dateFormat}</strong>
                              </span>
                            </div>
                          </div>
                          <span style={{ fontSize: '1rem', color: 'var(--text-secondary)', transition: 'transform 0.2s', transform: preferencesExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                            ▼
                          </span>
                        </div>

                        {/* Expanded Inline Form Row */}
                        {preferencesExpanded && (
                          <div className="animate-fade-in" style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                            gap: '1.5rem',
                            marginTop: '1.5rem',
                            padding: '1.5rem',
                            border: '1px dashed var(--border-color)',
                            borderRadius: 'var(--radius-md)',
                            background: 'var(--bg-primary)'
                          }}>
                            <div className="form-group" style={{ margin: 0 }}>
                              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Language</label>
                              <select 
                                value={language} 
                                onChange={(e) => setLanguage(e.target.value)} 
                                className="form-input"
                                style={{ width: '100%', cursor: 'pointer', appearance: 'auto', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                              >
                                <option value="en">English (US)</option>
                                <option value="es">Español (Spanish)</option>
                                <option value="fr">Français (French)</option>
                              </select>
                            </div>

                            <div className="form-group" style={{ margin: 0 }}>
                              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Timezone</label>
                              <select 
                                value={timezone} 
                                onChange={(e) => setTimezone(e.target.value)} 
                                className="form-input"
                                style={{ width: '100%', cursor: 'pointer', appearance: 'auto', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                              >
                                <option value="UTC">Coordinated Universal Time (UTC)</option>
                                <option value="EST">Eastern Standard Time (EST)</option>
                                <option value="PST">Pacific Standard Time (PST)</option>
                                <option value="IST">Indian Standard Time (IST)</option>
                              </select>
                            </div>

                            <div className="form-group" style={{ margin: 0 }}>
                              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Date Format</label>
                              <select 
                                value={dateFormat} 
                                onChange={(e) => setDateFormat(e.target.value)} 
                                className="form-input"
                                style={{ width: '100%', cursor: 'pointer', appearance: 'auto', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                              >
                                <option value="YYYY-MM-DD">YYYY-MM-DD (e.g. 2026-06-25)</option>
                                <option value="DD/MM/YYYY">DD/MM/YYYY (e.g. 25/06/2026)</option>
                                <option value="MM/DD/YYYY">MM/DD/YYYY (e.g. 06/25/2026)</option>
                              </select>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                  </div>
                </div>
              );
            })()}
            {/* TAB CONTENT: AUDIT LOGS CONSOLE */}
            {activeTab === 'auditLogs' && (
              <div className="saas-card animate-fade-in" style={{ padding: '2rem', borderTop: `4px solid ${activeTheme.color}`, minHeight: '400px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', fontWeight: 800, margin: 0 }}>
                      📋 Audit History Log
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                      Security audit events recorded across the entire system.
                    </p>
                  </div>
                  <button 
                    onClick={loadAuditLogs}
                    className="btn btn-secondary"
                    title="Refresh Logs"
                    style={{ padding: '0.45rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem' }}
                  >
                    🔄
                  </button>
                </div>

                {/* Filters */}
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: '1', minWidth: '250px' }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Search by user email, details, IP address..."
                      value={auditSearch}
                      onChange={(e) => setAuditSearch(e.target.value)}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div style={{ width: '200px' }}>
                    <select
                      className="form-input"
                      value={auditActionFilter}
                      onChange={(e) => setAuditActionFilter(e.target.value)}
                      style={{ width: '100%' }}
                    >
                      <option value="all">All Action Types</option>
                      <option value="LOGIN">LOGIN</option>
                      <option value="SELECT_TENANT">SELECT_TENANT</option>
                      <option value="CREATE_TENANT">CREATE_TENANT</option>
                      <option value="UPDATE_TENANT">UPDATE_TENANT</option>
                      <option value="REGISTER_ADMIN">REGISTER_ADMIN</option>
                      <option value="UPDATE_ADMIN">UPDATE_ADMIN</option>
                      <option value="ASSIGN_MODULE">ASSIGN_MODULE</option>
                      <option value="CREATE_FIELD">CREATE_FIELD</option>
                      <option value="UPDATE_FIELD">UPDATE_FIELD</option>
                      <option value="DELETE_FIELD">DELETE_FIELD</option>
                      <option value="CREATE_RECORD">CREATE_RECORD</option>
                      <option value="UPDATE_RECORD">UPDATE_RECORD</option>
                      <option value="DELETE_RECORD">DELETE_RECORD</option>
                    </select>
                  </div>
                </div>

                {loading && auditLogs.length === 0 ? (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
                    <div className="spinner" />
                  </div>
                ) : (
                  <div className="table-responsive" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                    <table className={`saas-table ${denseTable ? 'dense' : ''}`} style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th>Timestamp</th>
                          <th>Action</th>
                          <th>User Email</th>
                          <th>Workspace / Target</th>
                          <th>IP Address</th>
                          <th>Details</th>
                        </tr>
                      </thead>
                      <tbody>
                        {auditLogs
                          .filter(log => {
                            const matchSearch = 
                              (log.userEmail?.toLowerCase() || '').includes(auditSearch.toLowerCase()) ||
                              (log.details?.toLowerCase() || '').includes(auditSearch.toLowerCase()) ||
                              (log.ipAddress?.toLowerCase() || '').includes(auditSearch.toLowerCase()) ||
                              (log.action?.toLowerCase() || '').includes(auditSearch.toLowerCase());
                            const matchAction = auditActionFilter === 'all' || log.action === auditActionFilter;
                            return matchSearch && matchAction;
                          })
                          .map((log) => {
                            let badgeStyle = { backgroundColor: 'var(--zoho-blue-glow)', color: 'var(--zoho-blue)' };
                            if (log.action.includes('CREATE')) {
                              badgeStyle = { backgroundColor: 'var(--zoho-green-glow)', color: 'var(--zoho-green)' };
                            } else if (log.action.includes('DELETE')) {
                              badgeStyle = { backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' };
                            } else if (log.action.includes('LOGIN')) {
                              badgeStyle = { backgroundColor: 'var(--zoho-red-glow)', color: 'var(--zoho-red)' };
                            } else if (log.action.includes('UPDATE')) {
                              badgeStyle = { backgroundColor: 'var(--zoho-yellow-glow)', color: '#b27a00' };
                            }

                            return (
                              <tr key={log.id}>
                                <td style={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                                  {formatAppDate(log.timestamp, language, timezone, dateFormat, true)}
                                </td>
                                <td>
                                  <span className="badge" style={badgeStyle}>
                                    {log.action}
                                  </span>
                                </td>
                                <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                  {log.userEmail || 'System / Unauthenticated'}
                                </td>
                                <td style={{ fontSize: '0.85rem' }}>
                                  {log.entityName ? `${log.entityName} (${log.entityId})` : 'N/A'}
                                  {log.tenantId && <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Tenant ID: {log.tenantId}</div>}
                                </td>
                                <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                                  {log.ipAddress || 'unknown'}
                                </td>
                                <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                  {log.details}
                                </td>
                              </tr>
                            );
                          })}
                        {auditLogs.filter(log => {
                          const matchSearch = 
                            (log.userEmail?.toLowerCase() || '').includes(auditSearch.toLowerCase()) ||
                            (log.details?.toLowerCase() || '').includes(auditSearch.toLowerCase()) ||
                            (log.ipAddress?.toLowerCase() || '').includes(auditSearch.toLowerCase()) ||
                            (log.action?.toLowerCase() || '').includes(auditSearch.toLowerCase());
                          const matchAction = auditActionFilter === 'all' || log.action === auditActionFilter;
                          return matchSearch && matchAction;
                        }).length === 0 && (
                          <tr>
                            <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                              No audit logs found matching the filters.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

          </div>
      </main>

      {/* 3. GLASSMORPHIC SLIDE-OUT DRAWER */}
      {isDrawerOpen && (
        <div
          className="backdrop-fade-in"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            display: 'flex',
            justifyContent: 'flex-end',
            background: 'rgba(15, 23, 42, 0.4)',
            backdropFilter: 'blur(6px)'
          }}
          onClick={closeDrawer}
        >
          <div
            className="drawer-content-slide"
            style={{
              width: '100%',
              maxWidth: '520px',
              height: '100vh',
              background: 'var(--surface-card)',
              borderLeft: '1px solid var(--border-color)',
              boxShadow: '-10px 0 45px rgba(0, 0, 0, 0.2)',
              display: 'flex',
              flexDirection: 'column',
              zIndex: 1001,
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{
              padding: '1.5rem 2rem',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--bg-primary)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.5rem' }}>
                  {drawerType === 'tenant' ? '🏢' : '👤'}
                </span>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                    {drawerType === 'tenant'
                      ? (drawerMode === 'create' ? 'Create Tenant Workspace' : drawerMode === 'edit' ? 'Edit Workspace' : 'Workspace Details')
                      : (drawerMode === 'create' ? 'Register Admin User' : drawerMode === 'edit' ? 'Edit Admin Settings' : 'Admin Profile')
                    }
                  </h3>
                  {drawerMode === 'view' && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      ID: {drawerType === 'tenant' ? editingTenant?.id : editingAdmin?.userId}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={closeDrawer}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                  padding: '0.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                ×
              </button>
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '2rem' }}>
              {drawerType === 'tenant' && (
                <>
                  {drawerMode === 'view' && editingTenant && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                      <div className="saas-card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--zoho-green)' }}>
                        <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>Workspace Code</span>
                        <h4 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.2rem' }}>{tName}</h4>
                        <code style={{ fontSize: '0.8rem', padding: '0.2rem 0.45rem', background: 'var(--bg-tertiary)', borderRadius: '4px', color: 'var(--zoho-blue)', fontWeight: 600, display: 'inline-block', marginTop: '0.4rem' }}>
                          {tCode}
                        </code>
                      </div>

                      <div>
                        <h4 style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 700, margin: '0 0 0.35rem 0', letterSpacing: '0.05em' }}>Description</h4>
                        <p style={{ margin: 0, fontSize: '0.925rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                          {tDesc || 'No description provided for this tenant.'}
                        </p>
                      </div>

                      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                        <div>
                          <h4 style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 700, margin: '0 0 0.35rem 0', letterSpacing: '0.05em' }}>Status</h4>
                          <span className={`badge ${editingTenant.isActive ? 'badge-success' : 'badge-error'}`} style={{ display: 'inline-block' }}>
                            {editingTenant.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <div>
                          <h4 style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 700, margin: '0 0 0.35rem 0', letterSpacing: '0.05em' }}>Mapped Admins</h4>
                          <span className="badge badge-blue">
                            👤 {admins.filter(a => a.tenantId === editingTenant.id).length} Admins
                          </span>
                        </div>
                      </div>

                      <div>
                        <h4 style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 700, margin: '0 0 0.65rem 0', letterSpacing: '0.05em' }}>Enabled Workspace Modules</h4>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
                          {(() => {
                            const allowedModuleIds = editingTenant.assignedModuleIds
                              ? editingTenant.assignedModuleIds.split(',').map(Number).filter(id => !isNaN(id))
                              : [];
                            const assignedMods = systemModules.filter(m => allowedModuleIds.includes(m.id));

                            if (assignedMods.length === 0) {
                              return <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No feature modules assigned to this workspace.</span>;
                            }

                            return assignedMods.map(m => (
                              <span key={m.id} className="badge badge-warning" style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                ⚙️ {m.name}
                              </span>
                            ));
                          })()}
                        </div>
                      </div>
                    </div>
                  )}

                  {(drawerMode === 'edit' || drawerMode === 'create') && (
                    <form onSubmit={handleCreateOrEditTenant} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                      {tenantFormError && <div className="alert alert-error" style={{ fontSize: '0.85rem' }}>{tenantFormError}</div>}
                      {tenantSuccess && <div className="alert alert-success" style={{ fontSize: '0.85rem' }}>{tenantSuccess}</div>}

                      <div className="form-group">
                        <label className="form-label">Workspace Name</label>
                        <input type="text" placeholder="e.g. ABC Corporate" className="form-input" value={tName} onChange={e => setTName(e.target.value)} required />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Code Prefix</label>
                        <input type="text" placeholder="e.g. ABCC" className="form-input" value={tCode} onChange={e => setTCode(e.target.value)} disabled={drawerMode === 'edit'} required />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Description</label>
                        <textarea placeholder="Workspace purpose and notes..." className="form-input" style={{ minHeight: '80px', resize: 'vertical' }} value={tDesc} onChange={e => setTDesc(e.target.value)} />
                      </div>

                      <div className="form-group">
                        <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Assign Feature Modules</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            {tenantModuleIds.length} of {systemModules.length} selected
                          </span>
                        </label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', background: 'var(--bg-primary)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                          {systemModules.map(m => {
                            const isChecked = tenantModuleIds.includes(m.id);
                            return (
                              <label key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontWeight: 500, color: 'var(--text-primary)', fontSize: '0.88rem' }}>
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setTenantModuleIds([...tenantModuleIds, m.id]);
                                    } else {
                                      setTenantModuleIds(tenantModuleIds.filter(id => id !== m.id));
                                    }
                                  }}
                                  style={{ width: '16px', height: '16px', accentColor: activeTheme.color, cursor: 'pointer' }}
                                />
                                ⚙️ {m.name} Module
                              </label>
                            );
                          })}
                          {systemModules.length === 0 && (
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>No system modules available.</div>
                          )}
                        </div>
                      </div>

                      {/* Hidden Submit Button to allow enter key submit */}
                      <button type="submit" style={{ display: 'none' }} />
                    </form>
                  )}
                </>
              )}

              {drawerType === 'admin' && (
                <>
                  {drawerMode === 'view' && editingAdmin && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                      <div className="saas-card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--zoho-blue)' }}>
                        <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>Email Address</span>
                        <h4 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.2rem' }}>{adminName}</h4>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>{adminEmail}</p>
                      </div>

                      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                        <div>
                          <h4 style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 700, margin: '0 0 0.35rem 0', letterSpacing: '0.05em' }}>Status</h4>
                          <span className={`badge ${editingAdmin.isActive ? 'badge-success' : 'badge-error'}`} style={{ display: 'inline-block' }}>
                            {editingAdmin.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <div>
                          <h4 style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 700, margin: '0 0 0.35rem 0', letterSpacing: '0.05em' }}>Tenant Workspace</h4>
                          <span className="badge badge-blue">
                            🏢 {editingAdmin.tenantName}
                          </span>
                        </div>
                      </div>

                      <div>
                        <h4 style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 700, margin: '0 0 0.65rem 0', letterSpacing: '0.05em' }}>Assigned Feature Modules</h4>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
                          {(editingAdmin.assignedModules || []).length > 0 ? (
                            (editingAdmin.assignedModules || []).map(mod => (
                              <span key={mod} className="badge badge-warning" style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                ⚙️ {mod}
                              </span>
                            ))
                          ) : (
                            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No feature modules assigned to this administrator.</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {(drawerMode === 'edit' || drawerMode === 'create') && (
                    <form onSubmit={handleRegisterAdmin} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                      {registerAdminError && <div className="alert alert-error" style={{ fontSize: '0.85rem' }}>{registerAdminError}</div>}
                      {registerAdminSuccess && <div className="alert alert-success" style={{ fontSize: '0.85rem' }}>{registerAdminSuccess}</div>}

                      <div className="form-group">
                        <label className="form-label">Admin Name</label>
                        <input type="text" placeholder="John Admin" className="form-input" value={adminName} onChange={e => setAdminName(e.target.value)} required />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Email Address</label>
                        <input type="email" placeholder="admin@example.com" className="form-input" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} required />
                        {adminEmail && (
                          <div style={{ fontSize: '0.78rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.35rem' }}>
                            {!isEmailValidSyntax && (
                              <div style={{ color: 'var(--zoho-yellow-hover)' }}>• Please enter a valid email format</div>
                            )}
                            {isEmailValidSyntax && !isEmailDisposable && (
                              <div style={{ color: 'var(--zoho-green)' }}>✓ Email format is valid</div>
                            )}
                            {isEmailDisposable && (
                              <div style={{ color: 'var(--zoho-red)' }}>✗ Temporary/disposable emails are not allowed</div>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="form-group">
                        <label className="form-label">{editingAdmin ? 'New Password (Optional)' : 'Temporary Password'}</label>
                        <input
                          type="password"
                          placeholder={editingAdmin ? "Leave blank to keep current" : "••••••••"}
                          className="form-input"
                          value={adminPassword}
                          onChange={e => setAdminPassword(e.target.value)}
                          required={!editingAdmin}
                        />
                        {adminPassword && (
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', padding: '0.6rem 0.75rem', background: 'var(--bg-tertiary)', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.45rem' }}>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.15rem' }}>Password Requirements:</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: isLengthValid ? 'var(--zoho-green)' : 'var(--text-muted)' }}>
                              <span>{isLengthValid ? '✓' : '•'}</span> <span>At least 8 characters ({adminPassword.length}/8)</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: hasUpperCase ? 'var(--zoho-green)' : 'var(--text-muted)' }}>
                              <span>{hasUpperCase ? '✓' : '•'}</span> <span>At least one uppercase letter (A-Z)</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: hasLowerCase ? 'var(--zoho-green)' : 'var(--text-muted)' }}>
                              <span>{hasLowerCase ? '✓' : '•'}</span> <span>At least one lowercase letter (a-z)</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: hasNumber ? 'var(--zoho-green)' : 'var(--text-muted)' }}>
                              <span>{hasNumber ? '✓' : '•'}</span> <span>At least one number (0-9)</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: hasSpecial ? 'var(--zoho-green)' : 'var(--text-muted)' }}>
                              <span>{hasSpecial ? '✓' : '•'}</span> <span>At least one special symbol</span>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="form-group">
                        <label className="form-label">Select Tenant Workspace</label>
                        <select
                          className="form-input"
                          style={{ background: '#ffffff', color: 'var(--text-primary)', cursor: 'pointer' }}
                          value={adminTenantId}
                          onChange={e => {
                            setAdminTenantId(e.target.value);
                            setAdminModuleIds([]);
                          }}
                          required
                        >
                          <option value="">-- Choose Tenant Workspace --</option>
                          {tenants.filter(t => t.isActive).map(t => (
                            <option key={t.id} value={t.id}>
                              {t.name} ({t.code})
                            </option>
                          ))}
                        </select>
                      </div>

                      {adminTenantId && (
                        <div className="form-group">
                          <label className="form-label">Choose Feature Modules</label>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', background: 'var(--bg-primary)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                            {(() => {
                              const selectedTenant = tenants.find(t => t.id === Number(adminTenantId));
                              const allowedModuleIds = selectedTenant?.assignedModuleIds
                                ? selectedTenant.assignedModuleIds.split(',').map(Number).filter(id => !isNaN(id))
                                : [];
                              const filteredModules = systemModules.filter(m => allowedModuleIds.includes(m.id));

                              if (filteredModules.length === 0) {
                                return (
                                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>
                                    No modules are enabled for this workspace. Configure tenant modules first.
                                  </div>
                                );
                              }

                              return filteredModules.map(m => {
                                const isChecked = adminModuleIds.includes(m.id);
                                return (
                                  <label key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontWeight: 500, color: 'var(--text-primary)', fontSize: '0.88rem' }}>
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setAdminModuleIds([...adminModuleIds, m.id]);
                                        } else {
                                          setAdminModuleIds(adminModuleIds.filter(id => id !== m.id));
                                        }
                                      }}
                                      style={{ width: '16px', height: '16px', accentColor: activeTheme.color, cursor: 'pointer' }}
                                    />
                                    ⚙️ {m.name} Module
                                  </label>
                                );
                              });
                            })()}
                          </div>
                        </div>
                      )}

                      {/* Hidden Submit Button to allow enter key submit */}
                      <button type="submit" style={{ display: 'none' }} />
                    </form>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div style={{
              padding: '1.25rem 2rem',
              borderTop: '1px solid var(--border-color)',
              display: 'flex',
              gap: '0.75rem',
              justifyContent: 'flex-end',
              background: 'var(--bg-primary)'
            }}>
              {drawerMode === 'view' ? (
                <>
                  <button
                    className={`btn ${activeTheme.btnClass}`}
                    onClick={() => setDrawerMode('edit')}
                    style={{ padding: '0.55rem 1.5rem', borderRadius: 'var(--radius-sm)' }}
                  >
                    ✏️ Edit Settings
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={closeDrawer}
                    style={{ padding: '0.55rem 1.5rem', borderRadius: 'var(--radius-sm)' }}
                  >
                    Back
                  </button>
                </>
              ) : (
                <>
                  <button
                    className={`btn ${activeTheme.btnClass}`}
                    onClick={(e) => {
                      // Trigger form submit inside body
                      const form = e.currentTarget.closest('.drawer-content-slide')?.querySelector('form');
                      if (form) form.requestSubmit();
                    }}
                    style={{ padding: '0.55rem 1.5rem', borderRadius: 'var(--radius-sm)' }}
                    disabled={isSubmitDisabled}
                  >
                    {creatingTenant || registeringAdmin ? (
                      <div className="spinner" style={{ borderTopColor: '#ffffff' }} />
                    ) : drawerMode === 'edit' ? (
                      'Save Changes'
                    ) : drawerType === 'tenant' ? (
                      'Create Workspace'
                    ) : (
                      'Register Admin'
                    )}
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      if (drawerMode === 'edit') {
                        // Return to view mode
                        setDrawerMode('view');
                        // Reset forms
                        if (drawerType === 'tenant' && editingTenant) {
                          setTName(editingTenant.name);
                          setTCode(editingTenant.code);
                          setTDesc(editingTenant.description || '');
                          setTenantModuleIds(editingTenant.assignedModuleIds?.split(',').map(Number).filter(id => !isNaN(id)) || []);
                        } else if (drawerType === 'admin' && editingAdmin) {
                          setAdminName(editingAdmin.userName);
                          setAdminEmail(editingAdmin.email);
                          setAdminPassword('');
                          setAdminTenantId(String(editingAdmin.tenantId));
                          const existingModuleIds = systemModules.filter(m => editingAdmin.assignedModules?.includes(m.name)).map(m => m.id);
                          setAdminModuleIds(existingModuleIds);
                        }
                      } else {
                        closeDrawer();
                      }
                    }}
                    style={{ padding: '0.55rem 1.5rem', borderRadius: 'var(--radius-sm)' }}
                  >
                    {drawerMode === 'edit' ? 'Back' : 'Cancel'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


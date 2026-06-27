import React, { useState, useEffect } from 'react';
import { api } from '../api';
import type { AssignedModule, DynamicField, DynamicRecord } from '../api';
import { CalendarWidget } from './CalendarWidget';
import logoImg from '../assets/logo.png';
import { formatAppDate, formatLiveTime, translations, themePatterns, applyThemePattern } from '../themeUtils';


interface UserDashboardProps {
  userId: number;
  userName: string;
  tenantId: number;
  role: string;
  onLogout: () => void;
  onSwitchWorkspace: () => void;
}

export const UserDashboard: React.FC<UserDashboardProps> = ({
  userId,
  userName,
  tenantId,
  role,
  onLogout,
  onSwitchWorkspace,
}) => {
  const [modules, setModules] = useState<AssignedModule[]>([]);
  const [activeModule, setActiveModule] = useState<AssignedModule | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const zohoColors = [
    { color: 'var(--zoho-red)', glow: 'var(--zoho-red-glow)', borderClass: 'border-left-zoho-red', btnClass: 'btn-zoho-red' },
    { color: 'var(--zoho-green)', glow: 'var(--zoho-green-glow)', borderClass: 'border-left-zoho-green', btnClass: 'btn-zoho-green' },
    { color: 'var(--zoho-blue)', glow: 'var(--zoho-blue-glow)', borderClass: 'border-left-zoho-blue', btnClass: 'btn-zoho-blue' },
    { color: 'var(--zoho-yellow)', glow: 'var(--zoho-yellow-glow)', borderClass: 'border-left-zoho-yellow', btnClass: 'btn-zoho-yellow' }
  ];

  const activeModuleIndex = activeModule ? modules.findIndex(m => m.moduleId === activeModule.moduleId) : -1;
  const activeTheme = activeModuleIndex !== -1 ? zohoColors[activeModuleIndex % 4] : {
    color: 'var(--zoho-blue)',
    glow: 'var(--zoho-blue-glow)',
    borderClass: 'border-left-zoho-blue',
    btnClass: 'btn-zoho-blue'
  };

  // User Console Navigation / Layout States
  const [activeTab, setActiveTab] = useState<'modules' | 'settings' | 'auditLogs'>('modules');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('pcms_user_sidebar_collapsed') === 'true';
  });

  // Audit Logs State (Tenant Admin only)
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

  // Settings Flags
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('pcms_dark_mode') === 'true';
  });
  const [denseTable] = useState(() => {
    return localStorage.getItem('pcms_dense_table') === 'true';
  });

  // Live time ticker
  const [liveTime, setLiveTime] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarDate, setCalendarDate] = useState(new Date());

  // Holiday Events State
  const [holidays, setHolidays] = useState<Array<{ date: string; localName: string; name: string }>>([]);

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

  // Module Workspace States
  const [workspaceTab, setWorkspaceTab] = useState<'records' | 'fields'>('records');
  const [fields, setFields] = useState<DynamicField[]>([]);
  const [records, setRecords] = useState<DynamicRecord[]>([]);

  // Record Filters / Sorting / Views
  const [recordSearch, setRecordSearch] = useState('');
  const [recordFilter, setRecordFilter] = useState<'all' | 'my-entries'>('all');
  const [recordSort, setRecordSort] = useState<'newest' | 'oldest' | 'id' | 'status'>('status');
  const [recordView, setRecordView] = useState<'table' | 'card'>('table');

  // Field Settings Form States (Admin Only)
  const [editingField, setEditingField] = useState<DynamicField | null>(null);
  const [fieldName, setFieldName] = useState('');
  const [fieldType, setFieldType] = useState('Text');
  const [isRequired, setIsRequired] = useState(false);
  const [displayOrder, setDisplayOrder] = useState('0');
  const [fieldSuccess, setFieldSuccess] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);

  // Record Form States (Create / Edit)
  const [editingRecord, setEditingRecord] = useState<DynamicRecord | null>(null);
  const [isRecordFormOpen, setIsRecordFormOpen] = useState(false);
  const [formFieldValues, setFormFieldValues] = useState<Record<number, string>>({});
  const [recordSuccess, setRecordSuccess] = useState<string | null>(null);
  const [recordError, setRecordError] = useState<string | null>(null);

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
    localStorage.setItem('pcms_user_sidebar_collapsed', String(sidebarCollapsed));
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
  const [profileEmail, setProfileEmail] = useState('user@pcms.com');
  const [profilePhone, setProfilePhone] = useState('+1 (555) 987-6543');
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
      passwordLoading || setPasswordLoading(true);
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

  // Effect: Live clock update
  useEffect(() => {
    const updateTime = () => {
      setLiveTime(formatLiveTime(new Date(), language, timezone, dateFormat));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [language, timezone, dateFormat]);

  const fetchModules = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getAssignedModules(userId, tenantId);
      setModules(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load assigned modules.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModules();
  }, [userId, tenantId]);

  // Close calendar on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.calendar-pill')) {
        setShowCalendar(false);
      }
    };
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, []);

  const enterModuleWorkspace = async (module: AssignedModule) => {
    setActiveModule(module);
    setActiveTab('modules');
    setWorkspaceTab('records');
    setLoading(true);
    setError(null);
    setEditingField(null);
    setEditingRecord(null);
    setIsRecordFormOpen(false);

    // Reset toolbar settings when routing to a new workspace tab
    setRecordSearch('');
    setRecordFilter('all');
    setRecordSort('status');
    setRecordView('table');

    try {
      const fieldsData = await api.getFields(module.moduleId);
      setFields(fieldsData);

      const recordsData = await api.getRecords(module.moduleId);
      setRecords(recordsData);
    } catch (err: any) {
      setError(err.message || 'Failed to load module workspace.');
    } finally {
      setLoading(false);
    }
  };

  // Filtered & Sorted Workspace Records
  const filteredRecords = records
    .filter(r => {
      const matchesSearch =
        r.displayId.toLowerCase().includes(recordSearch.toLowerCase()) ||
        Object.keys(r.fieldValues).some(fieldId => {
          const val = r.fieldValues[Number(fieldId)] || '';
          return val.toLowerCase().includes(recordSearch.toLowerCase());
        });

      const matchesFilter =
        recordFilter === 'all' ||
        (recordFilter === 'my-entries' && r.createdBy === userId);

      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      if (recordSort === 'status') {
        const statusField = fields.find(f => f.fieldName.toLowerCase() === 'status');
        if (statusField) {
          const valA = a.fieldValues[statusField.id] || '';
          const valB = b.fieldValues[statusField.id] || '';
          return valA.localeCompare(valB);
        }
        return b.id - a.id; // Fallback to newest if no status field exists
      }
      if (recordSort === 'id') return a.displayId.localeCompare(b.displayId);
      if (recordSort === 'newest') return b.id - a.id;
      if (recordSort === 'oldest') return a.id - b.id;
      return 0;
    });

  const reloadWorkspaceData = async () => {
    if (!activeModule) return;
    try {
      const fieldsData = await api.getFields(activeModule.moduleId);
      setFields(fieldsData);

      const recordsData = await api.getRecords(activeModule.moduleId);
      setRecords(recordsData);
    } catch (err: any) {
      setError(err.message || 'Failed to refresh workspace data.');
    }
  };

  // --- Field Config Management ---
  const handleSaveField = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fieldName) {
      setFieldError('Field name is required.');
      return;
    }
    if (!activeModule) return;

    setFieldError(null);
    setFieldSuccess(null);

    try {
      if (editingField) {
        await api.updateField(editingField.id, {
          fieldName,
          fieldType,
          isRequired,
          displayOrder: Number(displayOrder),
          isActive: true
        });
        setFieldSuccess('Field configuration updated!');
        setEditingField(null);
      } else {
        await api.createField({
          moduleId: activeModule.moduleId,
          tenantId,
          fieldName,
          fieldType,
          isRequired,
          displayOrder: Number(displayOrder)
        });
        setFieldSuccess('Field configuration added successfully!');
      }
      setFieldName('');
      setFieldType('Text');
      setIsRequired(false);
      setDisplayOrder('0');
      await reloadWorkspaceData();
    } catch (err: any) {
      setFieldError(err.message || 'Failed to configure field.');
    }
  };

  const handleEditField = (field: DynamicField) => {
    setEditingField(field);
    setFieldName(field.fieldName);
    setFieldType(field.fieldType);
    setIsRequired(field.isRequired);
    setDisplayOrder(field.displayOrder.toString());
    setFieldError(null);
    setFieldSuccess(null);
  };

  const handleDeleteField = async (fieldId: number) => {
    if (!confirm('Are you sure you want to deactivate/delete this field? Old records containing this field value will remain, but this field will no longer be visible in new forms.')) return;
    try {
      await api.deleteField(fieldId);
      await reloadWorkspaceData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete field.');
    }
  };

  // --- Record Management ---
  const openRecordCreateForm = () => {
    setEditingRecord(null);
    // Initialize form empty values
    const initialVals: Record<number, string> = {};
    fields.forEach(f => {
      initialVals[f.id] = '';
    });
    setFormFieldValues(initialVals);
    setRecordError(null);
    setRecordSuccess(null);
    setIsRecordFormOpen(true);
  };

  const openRecordEditForm = (record: DynamicRecord) => {
    setEditingRecord(record);
    const formVals: Record<number, string> = {};
    fields.forEach(f => {
      formVals[f.id] = record.fieldValues[f.id] || '';
    });
    setFormFieldValues(formVals);
    setRecordError(null);
    setRecordSuccess(null);
    setIsRecordFormOpen(true);
  };

  const handleRecordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeModule) return;

    setRecordError(null);
    setRecordSuccess(null);

    // Simple client-side validation
    for (const f of fields) {
      if (f.isRequired && (!formFieldValues[f.id] || formFieldValues[f.id].trim() === '')) {
        setRecordError(`Field "${f.fieldName}" is required.`);
        return;
      }
    }

    try {
      if (editingRecord) {
        await api.updateRecord(editingRecord.id, { fieldValues: formFieldValues });
        setRecordSuccess('Record updated successfully!');
      } else {
        await api.createRecord({
          moduleId: activeModule.moduleId,
          tenantId,
          fieldValues: formFieldValues
        });
        setRecordSuccess('Record created successfully!');
      }
      setIsRecordFormOpen(false);
      setEditingRecord(null);
      await reloadWorkspaceData();
    } catch (err: any) {
      setRecordError(err.message || 'Failed to save record.');
    }
  };

  const handleDeleteRecord = async (recordId: number) => {
    if (!confirm('Are you sure you want to delete this record?')) return;
    try {
      await api.deleteRecord(recordId);
      await reloadWorkspaceData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete record.');
    }
  };

  // Helper to render HTML Input Elements based on type
  const renderDynamicInput = (field: DynamicField) => {
    const value = formFieldValues[field.id] || '';
    const onChange = (val: string) => {
      setFormFieldValues({
        ...formFieldValues,
        [field.id]: val
      });
    };

    switch (field.fieldType) {
      case 'Number':
        return (
          <input
            type="number"
            className="form-input"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            required={field.isRequired}
          />
        );
      case 'Date':
        return (
          <input
            type="date"
            className="form-input"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            required={field.isRequired}
          />
        );
      case 'Email':
        return (
          <input
            type="email"
            className="form-input"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            required={field.isRequired}
          />
        );
      case 'Phone':
        return (
          <input
            type="tel"
            className="form-input"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            required={field.isRequired}
          />
        );
      case 'Textarea':
        return (
          <textarea
            className="form-input"
            style={{ minHeight: '80px', resize: 'vertical' }}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            required={field.isRequired}
          />
        );
      case 'Checkbox':
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
            <input
              type="checkbox"
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              checked={value === 'true'}
              onChange={(e) => onChange(e.target.checked ? 'true' : 'false')}
            />
            <span style={{ fontSize: '0.9rem' }}>Check if Yes/True</span>
          </div>
        );
      case 'Dropdown':
        return (
          <select
            className="form-input"
            style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            required={field.isRequired}
          >
            <option value="">-- Select --</option>
            <option value="Yes">Yes</option>
            <option value="No">No</option>
            <option value="Standard">Standard</option>
            <option value="Premium">Premium</option>
          </select>
        );
      case 'Radio':
        return (
          <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.25rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}>
              <input
                type="radio"
                name={`radio-${field.id}`}
                checked={value === 'OptionA'}
                onChange={() => onChange('OptionA')}
              />
              Option A
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}>
              <input
                type="radio"
                name={`radio-${field.id}`}
                checked={value === 'OptionB'}
                onChange={() => onChange('OptionB')}
              />
              Option B
            </label>
          </div>
        );
      default:
        return (
          <input
            type="text"
            className="form-input"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            required={field.isRequired}
          />
        );
    }
  };

  const getModuleIcon = (name: string, iconColor: string) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('doctor')) {
      return (
        <svg style={{ width: '32px', height: '32px', color: iconColor }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
      );
    } else if (lowerName.includes('advocate') || lowerName.includes('legal')) {
      return (
        <svg style={{ width: '32px', height: '32px', color: iconColor }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="12" rx="2" />
          <path d="M12 4v16" />
          <path d="M8 20h8" />
        </svg>
      );
    } else {
      return (
        <svg style={{ width: '32px', height: '32px', color: iconColor }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <line x1="9" y1="9" x2="15" y2="9" />
          <line x1="9" y1="13" x2="15" y2="13" />
          <line x1="9" y1="17" x2="15" y2="17" />
        </svg>
      );
    }
  };

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
            onClick={() => { setActiveModule(null); setActiveTab('modules'); }}
            title="Feature Modules"
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
              backgroundColor: activeTab === 'modules' && !activeModule ? 'var(--zoho-red)' : 'transparent',
              color: activeTab === 'modules' && !activeModule ? '#ffffff' : '#94a3b8',
              boxShadow: activeTab === 'modules' && !activeModule ? '0 3px 8px rgba(228, 37, 39, 0.25)' : 'none'
            }}
          >
            <svg style={{ width: '18px', height: '18px', flexShrink: 0 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="16.5" y1="9.4" x2="7.5" y2="4.21" />
              <polygon points="12 22.08 12 12 3 6.92 3 17.08 12 22.08" />
              <polygon points="12 22.08 12 12 21 6.92 21 17.08 12 22.08" />
              <polygon points="12 12 3 6.92 12 1.84 21 6.92 12 12" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
            {!sidebarCollapsed && <span>Modules</span>}
          </button>

          {activeModule && (
            <>
              {!sidebarCollapsed && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  paddingLeft: '0.75rem',
                  marginTop: '0.5rem',
                  marginBottom: '0.2rem',
                  fontSize: '0.7rem',
                  color: 'var(--zoho-green)',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--zoho-green)', display: 'inline-block' }}></span>
                  {activeModule.moduleName.substring(0, 15)}
                </div>
              )}
              <button
                onClick={() => { setActiveTab('modules'); setWorkspaceTab('records'); }}
                title="Records Registry"
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
                  backgroundColor: activeTab === 'modules' && activeModule && workspaceTab === 'records' ? activeTheme.color : 'transparent',
                  color: activeTab === 'modules' && activeModule && workspaceTab === 'records' ? '#ffffff' : '#94a3b8',
                  boxShadow: activeTab === 'modules' && activeModule && workspaceTab === 'records' ? `0 3px 8px ${activeTheme.color}40` : 'none',
                  paddingLeft: sidebarCollapsed ? '0.85rem' : '1.25rem'
                }}
              >
                <svg style={{ width: '18px', height: '18px', flexShrink: 0 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                  <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                  <line x1="9" y1="10" x2="15" y2="10" />
                  <line x1="9" y1="14" x2="15" y2="14" />
                  <line x1="9" y1="18" x2="13" y2="18" />
                </svg>
                {!sidebarCollapsed && <span>Records</span>}
              </button>
              {role === 'Admin' && (
                <button
                  onClick={() => { setActiveTab('modules'); setWorkspaceTab('fields'); }}
                  title="Fields Configuration"
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
                    backgroundColor: activeTab === 'modules' && activeModule && workspaceTab === 'fields' ? activeTheme.color : 'transparent',
                    color: activeTab === 'modules' && activeModule && workspaceTab === 'fields' ? '#ffffff' : '#94a3b8',
                    boxShadow: activeTab === 'modules' && activeModule && workspaceTab === 'fields' ? `0 3px 8px ${activeTheme.color}40` : 'none',
                    paddingLeft: sidebarCollapsed ? '0.85rem' : '1.25rem'
                  }}
                >
                  <svg style={{ width: '18px', height: '18px', flexShrink: 0 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="4" y1="21" x2="4" y2="14" />
                    <line x1="4" y1="10" x2="4" y2="3" />
                    <line x1="12" y1="21" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12" y2="3" />
                    <line x1="20" y1="21" x2="20" y2="16" />
                    <line x1="20" y1="12" x2="20" y2="3" />
                    <line x1="1" y1="14" x2="7" y2="14" />
                    <line x1="9" y1="8" x2="15" y2="8" />
                    <line x1="17" y1="16" x2="23" y2="16" />
                  </svg>
                  {!sidebarCollapsed && <span>Field Config</span>}
                </button>
              )}
            </>
          )}

          {role === 'Admin' && (
            <button
              onClick={() => { setActiveModule(null); setActiveTab('auditLogs'); }}
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
          )}

          <button
            onClick={() => setActiveTab('settings')}
            title="Settings & Display"
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
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>Workspace {role}</div>
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
              {activeTab === 'settings' && 'Settings'}
              {activeTab === 'auditLogs' && 'Audit History Log'}
              {activeTab === 'modules' && !activeModule && 'Modules'}
              {activeTab === 'modules' && activeModule && `${activeModule.moduleName} Workspace`}
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
            <div className="badge badge-blue" style={{ padding: '0.45rem 0.9rem', fontSize: '0.8rem', fontWeight: 600 }}>
              👤 {role}
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
            <button className="btn btn-secondary" onClick={onSwitchWorkspace} style={{ padding: '0.45rem 0.9rem', fontSize: '0.8rem', borderRadius: 'var(--radius-sm)' }}>
              Switch Workspace
            </button>
          </div>
        </header>

        {/* Dashboard Panels Container */}
        <div style={{ padding: '2.25rem', maxWidth: '1400px', width: '100%' }}>

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

          {/* MAIN PAGE VIEW SWAP */}

          {/* TAB: AUDIT LOGS VIEW (Tenant Admin only) */}
          {activeTab === 'auditLogs' && role === 'Admin' && (
            <div className="saas-card animate-fade-in" style={{ padding: '2rem', borderTop: `4px solid ${activeTheme.color}`, minHeight: '400px', width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', fontWeight: 800, margin: 0 }}>
                    📋 Workspace Audit History
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                    Security audit logs recorded within this workspace.
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
                        <th>Target Entity</th>
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

          {/* TAB 2: MODULES SELECT / ACTION CONSOLE VIEW */}
          {activeTab === 'modules' && (
            <div style={{ width: '100%' }}>
              {!activeModule ? (
                <div>
                  {/* GREETING BANNER */}
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
                        {translations[language]?.welcome || translations.en.welcome}
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', opacity: 0.85 }}>
                      <svg style={{ width: '85px', height: '85px' }} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="25" y="20" width="50" height="60" rx="10" fill="var(--zoho-blue-glow)" stroke="var(--zoho-blue)" strokeWidth="2" />
                        <rect x="42" y="10" width="16" height="10" rx="3" fill="var(--zoho-blue)" />
                        <line x1="50" y1="35" x2="50" y2="65" stroke="var(--zoho-blue)" strokeWidth="5" strokeLinecap="round" />
                        <line x1="35" y1="50" x2="65" y2="50" stroke="var(--zoho-blue)" strokeWidth="5" strokeLinecap="round" />
                      </svg>
                    </div>
                  </div>

                  <h2 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: '1.5rem', color: 'var(--text-primary)' }}>Assigned Features & Modules</h2>
                  {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem 0' }}>
                      <div className="spinner" />
                    </div>
                  ) : modules.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '4rem 2rem' }} className="saas-card">
                      <div style={{ fontSize: '3.5rem', marginBottom: '1.25rem', opacity: 0.35 }}>📦</div>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.35rem', color: 'var(--text-primary)' }}>No active feature modules</h3>
                      <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Contact your Super Administrator to map modules to this Workspace.</p>
                    </div>
                  ) : (
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                      gap: '1.75rem'
                    }}>
                      {modules.map((m, idx) => {
                        const theme = zohoColors[idx % 4];
                        return (
                          <div
                            key={m.moduleId}
                            className={`saas-card saas-card-premium animate-fade-in ${theme.borderClass}`}
                            onClick={() => enterModuleWorkspace(m)}
                            style={{
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '1.25rem',
                              padding: '1.75rem'
                            }}
                          >
                            <div style={{
                              padding: '0.75rem',
                              background: theme.glow,
                              borderRadius: 'var(--radius-sm)',
                              border: `1px solid ${theme.color}30`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}>
                              {getModuleIcon(m.moduleName, theme.color)}
                            </div>
                            <div>
                              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>{m.moduleName}</h3>
                              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Open workspace console</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                /* VIEW 2: MODULE WORKSPACE */
                <div className="saas-card animate-fade-in" style={{ padding: '2.25rem', backgroundColor: '#ffffff' }}>

                  {/* Workspace Header */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: '1px solid var(--border-color)',
                    paddingBottom: '1.5rem',
                    marginBottom: '2rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                      <div style={{
                        padding: '0.65rem',
                        background: activeTheme.glow,
                        borderRadius: 'var(--radius-sm)',
                        border: `1px solid ${activeTheme.color}30`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        {getModuleIcon(activeModule.moduleName, activeTheme.color)}
                      </div>
                      <div>
                        <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-primary)' }}>{activeModule.moduleName} Workspace</h1>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Configure layout fields and manage client entries</p>
                      </div>
                    </div>

                    {/* Tab Navigation */}
                    <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-primary)', padding: '0.35rem', borderRadius: 'var(--radius-sm)' }}>
                      <button
                        className="btn"
                        style={{
                          padding: '0.5rem 1rem',
                          fontSize: '0.85rem',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: workspaceTab === 'records' ? '#ffffff' : 'transparent',
                          color: workspaceTab === 'records' ? activeTheme.color : 'var(--text-secondary)',
                          boxShadow: workspaceTab === 'records' ? 'var(--shadow-sm)' : 'none',
                          fontWeight: 600
                        }}
                        onClick={() => setWorkspaceTab('records')}
                      >
                        Records Directory
                      </button>
                      {role === 'Admin' && (
                        <button
                          className="btn"
                          style={{
                            padding: '0.5rem 1rem',
                            fontSize: '0.85rem',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: workspaceTab === 'fields' ? '#ffffff' : 'transparent',
                            color: workspaceTab === 'fields' ? activeTheme.color : 'var(--text-secondary)',
                            boxShadow: workspaceTab === 'fields' ? 'var(--shadow-sm)' : 'none',
                            fontWeight: 600
                          }}
                          onClick={() => setWorkspaceTab('fields')}
                        >
                          Fields Settings
                        </button>
                      )}
                    </div>
                  </div>

                  {/* TAB CONTENT 1: RECORDS DIRECTORY */}
                  {workspaceTab === 'records' && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h2 style={{ fontSize: '1.3rem', color: 'var(--text-primary)' }}>Entries Registry</h2>
                        <button className={`btn ${activeTheme.btnClass}`} onClick={openRecordCreateForm} style={{ padding: '0.5rem 1.25rem', borderRadius: 'var(--radius-sm)' }}>
                          ➕ New Entry
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
                            placeholder="Search entries..."
                            className="form-input"
                            style={{ width: '100%', paddingLeft: '2.5rem', height: '40px' }}
                            value={recordSearch}
                            onChange={(e) => setRecordSearch(e.target.value)}
                          />
                          <span style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }}>🔍</span>
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Filter:</span>
                            <select
                              value={recordFilter}
                              onChange={(e) => setRecordFilter(e.target.value as any)}
                              className="form-input"
                              style={{ padding: '0.4rem 1.8rem 0.4rem 0.8rem', fontSize: '0.85rem', height: '40px', background: 'var(--bg-secondary)', cursor: 'pointer' }}
                            >
                              <option value="all">All Entries</option>
                              <option value="my-entries">My Entries Only</option>
                            </select>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Sort:</span>
                            <select
                              value={recordSort}
                              onChange={(e) => setRecordSort(e.target.value as any)}
                              className="form-input"
                              style={{ padding: '0.4rem 1.8rem 0.4rem 0.8rem', fontSize: '0.85rem', height: '40px', background: 'var(--bg-secondary)', cursor: 'pointer' }}
                            >
                              <option value="status">Status</option>
                              <option value="newest">Newest First</option>
                              <option value="oldest">Oldest First</option>
                              <option value="id">Record ID</option>
                            </select>
                          </div>
                          <div style={{ display: 'flex', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', height: '40px' }}>
                            <button
                              type="button"
                              onClick={() => setRecordView('table')}
                              style={{
                                border: 'none',
                                padding: '0 0.85rem',
                                background: recordView === 'table' ? activeTheme.color : '#ffffff',
                                color: recordView === 'table' ? '#ffffff' : 'var(--text-secondary)',
                                cursor: 'pointer',
                                fontWeight: 600,
                                transition: 'all 0.15s ease'
                              }}
                            >
                              📋 Table
                            </button>
                            <button
                              type="button"
                              onClick={() => setRecordView('card')}
                              style={{
                                border: 'none',
                                padding: '0 0.85rem',
                                background: recordView === 'card' ? activeTheme.color : '#ffffff',
                                color: recordView === 'card' ? '#ffffff' : 'var(--text-secondary)',
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

                      {isRecordFormOpen && (
                        <div className="saas-card animate-fade-in" style={{
                          padding: '2rem',
                          marginBottom: '2.5rem',
                          background: '#ffffff',
                          border: `1.5px solid ${activeTheme.color}`,
                          borderTop: `4px solid ${activeTheme.color}`
                        }}>
                          <h3 style={{ marginBottom: '1.25rem', color: 'var(--text-primary)', fontWeight: 800 }}>
                            {editingRecord ? '✍️ Edit Entry Details' : '➕ Create New Entry'}
                          </h3>

                          {recordError && (
                            <div className="alert alert-error" style={{ fontSize: '0.85rem' }}>
                              <span>{recordError}</span>
                            </div>
                          )}

                          {recordSuccess && (
                            <div className="alert alert-success" style={{ fontSize: '0.85rem' }}>
                              <span>{recordSuccess}</span>
                            </div>
                          )}

                          {fields.length === 0 ? (
                            <div style={{ padding: '1rem 0', color: 'var(--zoho-yellow-hover)', fontSize: '0.95rem', fontWeight: 600 }}>
                              ⚠️ You must configure dynamic fields in the "Fields Settings" tab before adding entries!
                            </div>
                          ) : (
                            <form onSubmit={handleRecordSubmit}>
                              <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                                gap: '1.5rem',
                                marginBottom: '1.75rem'
                              }}>
                                {fields.map((f) => (
                                  <div key={f.id} className="form-group">
                                    <label className="form-label">
                                      {f.fieldName} {f.isRequired && <span style={{ color: 'var(--zoho-red)' }}>*</span>}
                                    </label>
                                    {renderDynamicInput(f)}
                                  </div>
                                ))}
                              </div>
                              <div style={{ display: 'flex', gap: '0.75rem' }}>
                                <button type="submit" className={`btn ${activeTheme.btnClass}`} style={{ borderRadius: 'var(--radius-sm)' }}>
                                  Save Entry
                                </button>
                                <button type="button" className="btn btn-secondary" onClick={() => setIsRecordFormOpen(false)} style={{ borderRadius: 'var(--radius-sm)' }}>
                                  Cancel
                                </button>
                              </div>
                            </form>
                          )}
                        </div>
                      )}

                      {/* Records Listing */}
                      {records.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '3.5rem 0', color: 'var(--text-secondary)' }} className="saas-card">
                          No entries found in registry. Click "+ New Entry" to populate records.
                        </div>
                      ) : filteredRecords.length === 0 ? (
                        <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '3.5rem 0' }} className="saas-card">
                          No matching entries found for your filter/search criteria.
                        </div>
                      ) : recordView === 'table' ? (
                        <div className={`table-container ${denseTable ? 'dense-table' : ''}`}>
                          <table>
                            <thead>
                              <tr>
                                <th>Record ID</th>
                                {fields.map(f => (
                                  <th key={f.id}>{f.fieldName}</th>
                                ))}
                                <th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredRecords.map((r) => (
                                <tr key={r.id}>
                                  <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{r.displayId}</td>
                                  {fields.map(f => (
                                    <td key={f.id} style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                      {r.fieldValues[f.id] === 'true' ? (
                                        <span className="badge badge-success">Yes</span>
                                      ) : r.fieldValues[f.id] === 'false' ? (
                                        <span className="badge badge-error">No</span>
                                      ) : r.fieldValues[f.id] || '-'}
                                    </td>
                                  ))}
                                  <td style={{ textAlign: 'right' }}>
                                    <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                                      <button
                                        className="btn btn-secondary"
                                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', borderRadius: 'var(--radius-sm)' }}
                                        onClick={() => openRecordEditForm(r)}
                                      >
                                        Edit
                                      </button>
                                      <button
                                        className="btn btn-secondary"
                                        style={{
                                          padding: '0.35rem 0.75rem',
                                          fontSize: '0.8rem',
                                          color: 'var(--zoho-red)',
                                          borderColor: 'rgba(228, 37, 39, 0.2)',
                                          background: 'var(--zoho-red-glow)',
                                          borderRadius: 'var(--radius-sm)'
                                        }}
                                        onClick={() => handleDeleteRecord(r.id)}
                                      >
                                        Delete
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
                          {filteredRecords.map((r) => (
                            <div
                              key={r.id}
                              className="saas-card animate-fade-in"
                              style={{
                                borderLeft: `4px solid ${activeTheme.color}`,
                                padding: '1.5rem',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                minHeight: '220px',
                                backgroundColor: '#ffffff'
                              }}
                            >
                              <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                  <span style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '1.1rem' }}>
                                    {r.displayId}
                                  </span>
                                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                    📅 {formatAppDate(r.createdAt, language, timezone, dateFormat)}
                                  </span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '1rem' }}>
                                  {fields.map(f => {
                                    const val = r.fieldValues[f.id];
                                    return (
                                      <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                        <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>{f.fieldName}:</span>
                                        <span style={{ color: 'var(--text-primary)', fontWeight: 600, textAlign: 'right', maxWidth: '65%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                          {val === 'true' ? (
                                            <span className="badge badge-success" style={{ padding: '0.1rem 0.4rem', fontSize: '0.75rem' }}>Yes</span>
                                          ) : val === 'false' ? (
                                            <span className="badge badge-error" style={{ padding: '0.1rem 0.4rem', fontSize: '0.75rem' }}>No</span>
                                          ) : val || '-'}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                              <div style={{
                                display: 'flex',
                                justifyContent: 'flex-end',
                                gap: '0.5rem',
                                borderTop: '1px solid var(--border-color)',
                                paddingTop: '0.85rem',
                                marginTop: 'auto'
                              }}>
                                <button
                                  className="btn btn-secondary"
                                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', borderRadius: 'var(--radius-sm)' }}
                                  onClick={() => openRecordEditForm(r)}
                                >
                                  Edit
                                </button>
                                <button
                                  className="btn btn-secondary"
                                  style={{
                                    padding: '0.35rem 0.75rem',
                                    fontSize: '0.75rem',
                                    color: 'var(--zoho-red)',
                                    borderColor: 'rgba(228, 37, 39, 0.2)',
                                    background: 'var(--zoho-red-glow)',
                                    borderRadius: 'var(--radius-sm)'
                                  }}
                                  onClick={() => handleDeleteRecord(r.id)}
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB CONTENT 2: FIELDS SETTINGS (Admin Only) */}
                  {workspaceTab === 'fields' && role === 'Admin' && (
                    <div className="grid-2 animate-fade-in">
                      {/* Column A: Field Config Form */}
                      <div className="saas-card" style={{ padding: '1.75rem', backgroundColor: 'var(--bg-primary)', borderTop: `4px solid ${activeTheme.color}` }}>
                        <h3 style={{ marginBottom: '1.25rem', fontSize: '1.25rem', color: 'var(--text-primary)', fontWeight: 800 }}>
                          {editingField ? '⚙️ Edit Form Field' : '➕ Add Custom Field'}
                        </h3>

                        {fieldError && (
                          <div className="alert alert-error" style={{ fontSize: '0.85rem', padding: '0.5rem' }}>
                            <span>{fieldError}</span>
                          </div>
                        )}
                        {fieldSuccess && (
                          <div className="alert alert-success" style={{ fontSize: '0.85rem', padding: '0.5rem' }}>
                            <span>{fieldSuccess}</span>
                          </div>
                        )}

                        <form onSubmit={handleSaveField}>
                          <div className="form-group">
                            <label className="form-label">Field Name</label>
                            <input
                              type="text"
                              placeholder="e.g. Specialty"
                              className="form-input"
                              value={fieldName}
                              onChange={(e) => setFieldName(e.target.value)}
                              required
                            />
                          </div>

                          <div className="form-group">
                            <label className="form-label">Input Control Type</label>
                            <select
                              className="form-input"
                              style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', cursor: 'pointer' }}
                              value={fieldType}
                              onChange={(e) => setFieldType(e.target.value)}
                              required
                            >
                              <option value="Text">Text Input</option>
                              <option value="Number">Number Input</option>
                              <option value="Date">Date Picker</option>
                              <option value="Email">Email Field</option>
                              <option value="Phone">Phone Number</option>
                              <option value="Dropdown">Dropdown Select</option>
                              <option value="Checkbox">Checkbox Toggle</option>
                              <option value="Radio">Radio Selection</option>
                              <option value="Textarea">Multiline Textarea</option>
                            </select>
                          </div>

                          <div className="form-group">
                            <label className="form-label">Display Order (Sort Index)</label>
                            <input
                              type="number"
                              className="form-input"
                              value={displayOrder}
                              onChange={(e) => setDisplayOrder(e.target.value)}
                              required
                            />
                          </div>

                          <div className="form-group">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                              <input
                                type="checkbox"
                                style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: activeTheme.color }}
                                checked={isRequired}
                                onChange={(e) => setIsRequired(e.target.checked)}
                              />
                              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>Is this field required?</span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem' }}>
                            <button type="submit" className={`btn ${activeTheme.btnClass}`} style={{ flex: 1, borderRadius: 'var(--radius-sm)' }}>
                              {editingField ? 'Save Config' : 'Add Field'}
                            </button>
                            {editingField && (
                              <button
                                type="button"
                                className="btn btn-secondary"
                                style={{ borderRadius: 'var(--radius-sm)' }}
                                onClick={() => {
                                  setEditingField(null);
                                  setFieldName('');
                                  setFieldType('Text');
                                  setIsRequired(false);
                                  setDisplayOrder('0');
                                  setFieldSuccess(null);
                                }}
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        </form>
                      </div>

                      {/* Column B: Active Fields List */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <h3 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', fontWeight: 800 }}>Workspace Form Fields</h3>
                        {fields.length === 0 ? (
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>
                            No custom fields configured. Configure layout on the left.
                          </div>
                        ) : (
                          <div style={{ display: 'grid', gap: '0.75rem' }}>
                            {fields.map((f) => (
                              <div key={f.id} className="saas-card" style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '1rem 1.25rem',
                                backgroundColor: '#ffffff'
                              }}>
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>{f.fieldName}</h4>
                                    {f.isRequired && (
                                      <span className="badge badge-error" style={{ fontSize: '0.65rem' }}>Required</span>
                                    )}
                                  </div>
                                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                    Control: <strong>{f.fieldType}</strong> | Order: {f.displayOrder}
                                  </span>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                  <button
                                    className="btn btn-secondary"
                                    style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', borderRadius: 'var(--radius-sm)' }}
                                    onClick={() => handleEditField(f)}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    className="btn btn-secondary"
                                    style={{
                                      padding: '0.35rem 0.65rem',
                                      fontSize: '0.75rem',
                                      color: 'var(--zoho-red)',
                                      borderColor: 'rgba(228, 37, 39, 0.2)',
                                      background: 'var(--zoho-red-glow)',
                                      borderRadius: 'var(--radius-sm)'
                                    }}
                                    onClick={() => handleDeleteField(f.id)}
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

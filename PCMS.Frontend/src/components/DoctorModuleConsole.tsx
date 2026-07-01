import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { api, getStoredToken } from '../api';

interface DoctorModuleConsoleProps {
  tenantId: number;
  userId?: number;
  role: string;
  themeColor: string;
  btnClass: string;
  moduleId: number;
}

// ──────────────────────────────────────────────────────────────────────────────
// REGISTER MODAL COMPONENT — Centered Dialog Style
// ──────────────────────────────────────────────────────────────────────────────
interface RegisterModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: string;
  themeColor: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
}
const RegisterModal: React.FC<RegisterModalProps> = ({ open, onClose, title, subtitle, icon, themeColor, children, footer, wide }) => {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) {
      window.addEventListener('keydown', handler);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="reg-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`reg-modal animate-scale-in${wide ? ' reg-modal-wide' : ''}`}>
        {/* Top accent bar */}
        <div className="reg-modal-accent-bar" style={{ background: `linear-gradient(90deg, ${themeColor}, ${themeColor}aa)` }} />
        {/* Header */}
        <div className="reg-modal-header">
          <div className="reg-modal-header-left">
            {icon && (
              <div className="reg-modal-icon" style={{ background: `${themeColor}18`, border: `1.5px solid ${themeColor}30` }}>
                <span style={{ fontSize: '1.3rem' }}>{icon}</span>
              </div>
            )}
            <div>
              <div className="reg-modal-title">{title}</div>
              {subtitle && <div className="reg-modal-subtitle">{subtitle}</div>}
            </div>
          </div>
          <button className="reg-modal-close" onClick={onClose} title="Close">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="1" y1="1" x2="12" y2="12" /><line x1="12" y1="1" x2="1" y2="12" />
            </svg>
          </button>
        </div>
        {/* Body */}
        <div className="reg-modal-body">{children}</div>
        {/* Footer */}
        {footer && <div className="reg-modal-footer">{footer}</div>}
      </div>
    </div>,
    document.body
  );
};

// ──────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ──────────────────────────────────────────────────────────────────────────────
export const DoctorModuleConsole: React.FC<DoctorModuleConsoleProps> = ({
  role,
  themeColor,
  btnClass,
  moduleId,
}) => {
  type SubView = 'dashboard' | 'doctors' | 'staff' | 'patients' | 'appointments' | 'roles';
  const [subView, setSubView] = useState<SubView>('dashboard');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Role helpers
  const isAdmin      = role === 'Admin';
  const isDoctor     = role === 'Doctor';
  const isReception  = role === 'Receptionist' || role === 'receptionist';
  const isNurse      = role === 'Nurse' || role === 'nurse';
  const canRegisterPatient    = isDoctor || isReception || isNurse;
  const canBookAppointment    = isDoctor || isReception || isNurse;
  const canManageStaff        = isAdmin;
  const canManageRoles        = isAdmin;
  const canRegisterDoctor     = isAdmin;

  // ── State ──────────────────────────────────────────────────────────────────

  // Metrics
  const [metrics, setMetrics] = useState({
    totalDoctors: 0, activeDoctors: 0, totalPatients: 0,
    todayAppointments: 0, pendingAppointments: 0, completedAppointments: 0,
  });
  const [visibleWidgets, setVisibleWidgets] = useState<string[]>([
    "total_doctors", "active_doctors", "total_patients",
    "today_appointments", "pending_appointments", "completed_appointments"
  ]);

  // Doctors
  const [doctors, setDoctors]           = useState<any[]>([]);
  const [specializations, setSpecializations] = useState<string[]>([]);
  const [docSearch, setDocSearch]       = useState('');
  const [docSpecFilter, setDocSpecFilter] = useState('');
  const [isDocDrawerOpen, setIsDocDrawerOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<any | null>(null);
  const [docForm, setDocForm] = useState({
    userName: '', email: '', password: '', doctorCode: '',
    specialization: '', qualification: '', experienceYears: 0,
    consultationFee: 0, phoneNumber: '', status: 'Active', isActive: true,
  });

  // Staff
  const [staffTab, setStaffTab]         = useState<'receptionist' | 'nurse'>('receptionist');
  const [receptionists, setReceptionists] = useState<any[]>([]);
  const [nurses, setNurses]             = useState<any[]>([]);
  const [isStaffDrawerOpen, setIsStaffDrawerOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any | null>(null);
  const [staffForm, setStaffForm] = useState({
    userName: '', email: '', password: '', employeeCode: '',
    phoneNumber: '', department: '', status: 'Active', isActive: true,
  });

  // Patients
  const [patients, setPatients]         = useState<any[]>([]);
  const [patSearch, setPatSearch]       = useState('');
  const [patPage, setPatPage]           = useState(1);
  const [patTotalCount, setPatTotalCount] = useState(0);
  const [dynamicFields, setDynamicFields] = useState<any[]>([]);
  const [isPatDrawerOpen, setIsPatDrawerOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<any | null>(null);
  const [patientForm, setPatientForm] = useState({
    patientCode: '', fullName: '', dateOfBirth: '', gender: 'Male',
    phoneNumber: '', email: '', address: '', emergencyContact: '',
    bloodGroup: 'O+', whatsAppNumber: '', whatsAppConsent: false,
    customFields: {} as Record<string, string>,
  });

  // Appointments
  const [appointments, setAppointments] = useState<any[]>([]);
  const [appFilterDate, setAppFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [isAppDrawerOpen, setIsAppDrawerOpen] = useState(false);
  const [appForm, setAppForm] = useState({
    patientId: 0, doctorId: 0,
    appointmentDate: new Date().toISOString().substring(0, 16),
    appointmentType: 'Scheduled', notes: '',
  });

  // Roles
  const [rolesList, setRolesList]           = useState<any[]>([]);
  const [permissionsList, setPermissionsList] = useState<any[]>([]);
  const [isRoleDrawerOpen, setIsRoleDrawerOpen] = useState(false);
  const [editingRole, setEditingRole]       = useState<any | null>(null);
  const [roleForm, setRoleForm] = useState({
    name: '', isActive: true, permissionIds: [] as number[], widgetKeys: [] as string[],
  });

  // ── Data Loaders ───────────────────────────────────────────────────────────

  const loadDashboard = useCallback(async () => {
    const [docsList, patsRes, appsList, roles] = await Promise.all([
      api.getDoctors(), api.getPatients('', 1, 1000),
      api.getAppointments(), api.getRoles(),
    ]);
    const todayStr = new Date().toISOString().split('T')[0];
    const todayApps = appsList.filter((a: any) => a.appointmentDate?.startsWith(todayStr));
    setMetrics({
      totalDoctors: docsList.length,
      activeDoctors: docsList.filter((d: any) => d.status === 'Active').length,
      totalPatients: patsRes.totalCount,
      todayAppointments: todayApps.length,
      pendingAppointments: appsList.filter((a: any) => a.status === 'Pending').length,
      completedAppointments: appsList.filter((a: any) => a.status === 'Completed').length,
    });
    if (roles.length > 0) {
      const adminRole = roles.find((r: any) => r.name.toLowerCase() === 'admin');
      if (adminRole) {
        try {
          const w = await api.getDashboardWidgets(adminRole.id);
          if (w.length > 0) setVisibleWidgets(w);
        } catch { /* use defaults */ }
      }
    }
  }, []);

  const loadDoctors = useCallback(async () => {
    const [list, specs] = await Promise.all([
      api.getDoctors(docSearch, docSpecFilter),
      api.getDoctorSpecializations(),
    ]);
    setDoctors(list);
    setSpecializations(specs);
  }, [docSearch, docSpecFilter]);

  const loadStaff = useCallback(async () => {
    if (staffTab === 'receptionist') {
      setReceptionists(await api.getReceptionists());
    } else {
      setNurses(await api.getNurses());
    }
  }, [staffTab]);

  const loadPatients = useCallback(async () => {
    const [res, fields] = await Promise.all([
      api.getPatients(patSearch, patPage, 10),
      api.getFields(moduleId),
    ]);
    setPatients(res.patients);
    setPatTotalCount(res.totalCount);
    setDynamicFields(fields);
  }, [patSearch, patPage, moduleId]);

  const loadAppointments = useCallback(async () => {
    const [list, docsList, patsRes] = await Promise.all([
      api.getAppointments(appFilterDate),
      api.getDoctors(),
      api.getPatients('', 1, 100),
    ]);
    setAppointments(list);
    setDoctors(docsList);
    setPatients(patsRes.patients);
  }, [appFilterDate]);

  const loadRoles = useCallback(async () => {
    const [roles, perms] = await Promise.all([api.getRoles(), api.getPermissions()]);
    setRolesList(roles);
    setPermissionsList(perms);
  }, []);

  useEffect(() => {
    setError(null);
    setLoading(true);
    const loaders: Record<SubView, () => Promise<void>> = {
      dashboard: loadDashboard, doctors: loadDoctors, staff: loadStaff,
      patients: loadPatients, appointments: loadAppointments, roles: loadRoles,
    };
    loaders[subView]().catch(e => setError(e.message || 'Failed to load data.')).finally(() => setLoading(false));
  }, [subView, docSearch, docSpecFilter, staffTab, patSearch, patPage, appFilterDate,
      loadDashboard, loadDoctors, loadStaff, loadPatients, loadAppointments, loadRoles]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const withFeedback = async (action: () => Promise<void>, msg: string) => {
    try {
      setLoading(true);
      await action();
      setSuccess(msg);
      setError(null);
    } catch (e: any) {
      setError(e.message || 'Operation failed.');
    } finally {
      setLoading(false);
    }
  };

  // ── Doctor Handlers
  const handleSaveDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    await withFeedback(async () => {
      if (editingDoctor) await api.updateDoctor(editingDoctor.id, docForm);
      else await api.createDoctor(docForm);
      setIsDocDrawerOpen(false);
      setEditingDoctor(null);
      await loadDoctors();
    }, editingDoctor ? 'Doctor profile updated.' : 'Doctor registered successfully.');
  };
  const openDocEdit = (doc: any) => {
    setEditingDoctor(doc);
    setDocForm({ userName: doc.userName, email: doc.email, password: '', doctorCode: doc.doctorCode,
      specialization: doc.specialization, qualification: doc.qualification || '',
      experienceYears: doc.experienceYears, consultationFee: doc.consultationFee,
      phoneNumber: doc.phoneNumber || '', status: doc.status, isActive: doc.isActive });
    setIsDocDrawerOpen(true);
  };
  const openDocCreate = () => {
    setEditingDoctor(null);
    setDocForm({ userName: '', email: '', password: '', doctorCode: '', specialization: '',
      qualification: '', experienceYears: 0, consultationFee: 0, phoneNumber: '', status: 'Active', isActive: true });
    setIsDocDrawerOpen(true);
  };

  // ── Staff Handlers
  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    await withFeedback(async () => {
      if (staffTab === 'receptionist') {
        if (editingStaff) await api.updateReceptionist(editingStaff.id, staffForm);
        else await api.createReceptionist(staffForm);
      } else {
        if (editingStaff) await api.updateNurse(editingStaff.id, staffForm);
        else await api.createNurse(staffForm);
      }
      setIsStaffDrawerOpen(false);
      setEditingStaff(null);
      await loadStaff();
    }, 'Staff profile saved.');
  };
  const openStaffEdit = (s: any) => {
    setEditingStaff(s);
    setStaffForm({ userName: s.userName, email: s.email, password: '', employeeCode: s.employeeCode,
      phoneNumber: s.phoneNumber || '', department: s.department || '', status: s.status, isActive: s.isActive });
    setIsStaffDrawerOpen(true);
  };
  const openStaffCreate = () => {
    setEditingStaff(null);
    setStaffForm({ userName: '', email: '', password: '', employeeCode: '', phoneNumber: '', department: '', status: 'Active', isActive: true });
    setIsStaffDrawerOpen(true);
  };

  // ── Patient Handlers
  const handleSavePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    await withFeedback(async () => {
      if (editingPatient) await api.updatePatient(editingPatient.id, patientForm);
      else await api.createPatient(patientForm);
      setIsPatDrawerOpen(false);
      setEditingPatient(null);
      await loadPatients();
    }, editingPatient ? 'Patient record updated.' : 'Patient registered successfully.');
  };
  const openPatientEdit = (p: any) => {
    setEditingPatient(p);
    setPatientForm({
      patientCode: p.patientCode, fullName: p.fullName,
      dateOfBirth: p.dateOfBirth?.split('T')[0] || '', gender: p.gender,
      phoneNumber: p.phoneNumber, email: p.email || '', address: p.address || '',
      emergencyContact: p.emergencyContact || '', bloodGroup: p.bloodGroup || 'O+',
      whatsAppNumber: p.whatsAppNumber || '', whatsAppConsent: p.whatsAppConsent,
      customFields: p.customFields || {},
    });
    setIsPatDrawerOpen(true);
  };
  const openPatientCreate = () => {
    setEditingPatient(null);
    setPatientForm({ patientCode: '', fullName: '', dateOfBirth: '', gender: 'Male', phoneNumber: '',
      email: '', address: '', emergencyContact: '', bloodGroup: 'O+', whatsAppNumber: '',
      whatsAppConsent: false, customFields: {} });
    setIsPatDrawerOpen(true);
  };

  // ── Appointment Handlers
  const handleSaveAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    await withFeedback(async () => {
      await api.createAppointment(appForm);
      setIsAppDrawerOpen(false);
      await loadAppointments();
    }, 'Appointment scheduled successfully.');
  };
  const handleUpdateAppStatus = async (id: number, status: string) => {
    await withFeedback(async () => {
      await api.updateAppointmentStatus(id, status);
      await loadAppointments();
    }, `Status updated to ${status}.`);
  };
  const openAppCreate = () => {
    setAppForm({
      patientId: patients.length > 0 ? patients[0].id : 0,
      doctorId: doctors.length > 0 ? doctors[0].id : 0,
      appointmentDate: new Date().toISOString().substring(0, 16),
      appointmentType: 'Scheduled', notes: '',
    });
    setIsAppDrawerOpen(true);
  };

  // ── Role Handlers
  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    await withFeedback(async () => {
      if (editingRole) {
        await api.updateRole(editingRole.id, roleForm);
        await api.updateDashboardWidgets(editingRole.id, roleForm.widgetKeys);
      } else {
        await api.createRole(roleForm);
      }
      setIsRoleDrawerOpen(false);
      setEditingRole(null);
      await loadRoles();
    }, editingRole ? 'Role configuration saved.' : 'New role created.');
  };
  const openRoleEdit = async (r: any) => {
    setEditingRole(r);
    let widgets: string[] = [];
    try { widgets = await api.getDashboardWidgets(r.id); } catch { /* ok */ }
    setRoleForm({ name: r.name, isActive: r.isActive,
      permissionIds: (r.permissions || []).map((p: any) => p.id), widgetKeys: widgets });
    setIsRoleDrawerOpen(true);
  };
  const openRoleCreate = () => {
    setEditingRole(null);
    setRoleForm({ name: '', isActive: true, permissionIds: [], widgetKeys: [
      "total_doctors", "active_doctors", "total_patients",
      "today_appointments", "pending_appointments", "completed_appointments"
    ]});
    setIsRoleDrawerOpen(true);
  };
  const togglePermission = (id: number) => setRoleForm(prev => ({
    ...prev, permissionIds: prev.permissionIds.includes(id)
      ? prev.permissionIds.filter(x => x !== id)
      : [...prev.permissionIds, id]
  }));
  const toggleWidget = (key: string) => setRoleForm(prev => ({
    ...prev, widgetKeys: prev.widgetKeys.includes(key)
      ? prev.widgetKeys.filter(x => x !== key)
      : [...prev.widgetKeys, key]
  }));

  // ── Seed permissions
  const handleSeedPermissions = async () => {
    const token = getStoredToken();
    await fetch('/api/rolepermission/seed', { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
    setSuccess('Default permissions seeded.');
    await loadRoles();
  };

  // ────────────────────────────────────────────────────────────────────────────
  //  RENDER HELPERS
  // ────────────────────────────────────────────────────────────────────────────

  const WIDGET_DEFS = [
    { key: 'total_doctors',         label: 'Total Doctors',         icon: '🏥', color: themeColor,              value: metrics.totalDoctors },
    { key: 'active_doctors',        label: 'Active Doctors',        icon: '✅', color: 'var(--zoho-green)',      value: metrics.activeDoctors },
    { key: 'total_patients',        label: 'Total Patients',        icon: '🩹', color: 'var(--zoho-blue)',       value: metrics.totalPatients },
    { key: 'today_appointments',    label: "Today's Appointments",  icon: '📅', color: 'var(--zoho-yellow)',     value: metrics.todayAppointments },
    { key: 'pending_appointments',  label: 'Pending Appointments',  icon: '⏳', color: 'var(--zoho-red)',        value: metrics.pendingAppointments },
    { key: 'completed_appointments',label: 'Completed Appointments',icon: '🎯', color: 'var(--text-secondary)',  value: metrics.completedAppointments },
  ];

  const NAV_TABS = [
    { key: 'dashboard',    label: '📊 Dashboard',           always: true },
    { key: 'doctors',      label: '🩺 Doctors',             always: true },
    { key: 'staff',        label: '👥 Staff',               always: canManageStaff },
    { key: 'patients',     label: '🩹 Patients',            always: true },
    { key: 'appointments', label: '📅 Appointments',        always: true },
    { key: 'roles',        label: '🔑 Roles & Permissions', always: canManageRoles },
  ];

  const statusBadge = (s: string) => {
    const cls = s === 'Active' || s === 'Completed' || s === 'Confirmed' ? 'badge-success'
              : s === 'Pending' ? 'badge-warning'
              : 'badge-error';
    return <span className={`badge ${cls}`}>{s}</span>;
  };

  // ────────────────────────────────────────────────────────────────────────────
  // JSX
  // ────────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>

      {/* ── Top Navigation ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', borderBottom: '2px solid var(--border-color)', paddingBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.25rem', overflowX: 'auto' }}>
          {NAV_TABS.filter(t => t.always).map(t => (
            <button
              key={t.key}
              onClick={() => setSubView(t.key as SubView)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '0.5rem 1rem', fontSize: '0.875rem', fontWeight: 600,
                borderBottom: subView === t.key ? `2px solid ${themeColor}` : '2px solid transparent',
                color: subView === t.key ? themeColor : 'var(--text-secondary)',
                marginBottom: '-2px', transition: 'all 0.15s ease', whiteSpace: 'nowrap',
              }}
            >{t.label}</button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
            padding: '0.3rem 0.7rem', borderRadius: 'var(--radius-full)',
            background: isAdmin ? 'rgba(228,37,39,0.1)' : 'rgba(8,153,73,0.1)',
            border: `1px solid ${isAdmin ? 'var(--zoho-red)' : 'var(--zoho-green)'}30`,
            fontSize: '0.75rem', fontWeight: 700,
            color: isAdmin ? 'var(--zoho-red)' : 'var(--zoho-green)',
          }}>
            {isAdmin ? '👑' : '👤'} {role}
          </div>
          {isAdmin && (
            <button onClick={handleSeedPermissions} className="btn btn-secondary"
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', borderRadius: 'var(--radius-sm)' }}>
              🔄 Sync Permissions
            </button>
          )}
        </div>
      </div>

      {/* ── Alerts ── */}
      {error && (
        <div className="alert alert-error animate-fade-in" style={{ padding: '0.75rem 1.25rem', borderRadius: 'var(--radius-md)' }}>
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: 'inherit', fontWeight: 700, float: 'right', cursor: 'pointer' }}>✕</button>
        </div>
      )}
      {success && (
        <div className="alert alert-success animate-fade-in" style={{ padding: '0.75rem 1.25rem', borderRadius: 'var(--radius-md)' }}>
          <span>✅ {success}</span>
          <button onClick={() => setSuccess(null)} style={{ background: 'none', border: 'none', color: 'inherit', fontWeight: 700, float: 'right', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {/* Loading bar */}
      {loading && (
        <div style={{ height: '3px', background: `linear-gradient(90deg, ${themeColor}00, ${themeColor}, ${themeColor}00)`,
          borderRadius: '9999px', animation: 'shimmer 1.2s infinite' }} />
      )}

      {/* ════════════════════════════════════
          DASHBOARD
      ════════════════════════════════════ */}
      {subView === 'dashboard' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }} className="animate-fade-in">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.25rem' }}>
            {WIDGET_DEFS.filter(w => visibleWidgets.includes(w.key)).map(w => (
              <div key={w.key} className="saas-card metric-card animate-fade-in" style={{ borderLeft: `4px solid ${w.color}` }}>
                <h3>{w.label}</h3>
                <div className="value" style={{ color: w.color }}>{w.value}</div>
                <div className="metric-icon">{w.icon}</div>
              </div>
            ))}
          </div>

          {/* Quick actions */}
          <div className="saas-card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Quick Actions
            </h3>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              {canRegisterPatient && (
                <button onClick={() => { setSubView('patients'); setTimeout(openPatientCreate, 100); }}
                  className={`btn ${btnClass}`} style={{ borderRadius: 'var(--radius-sm)' }}>
                  ➕ Register Patient
                </button>
              )}
              {canBookAppointment && (
                <button onClick={() => { setSubView('appointments'); setTimeout(openAppCreate, 100); }}
                  className="btn btn-secondary" style={{ borderRadius: 'var(--radius-sm)' }}>
                  📅 Book Appointment
                </button>
              )}
              {canRegisterDoctor && (
                <button onClick={() => { setSubView('doctors'); setTimeout(openDocCreate, 100); }}
                  className="btn btn-secondary" style={{ borderRadius: 'var(--radius-sm)' }}>
                  🩺 Add Doctor
                </button>
              )}
              <button onClick={() => setSubView('appointments')} className="btn btn-secondary" style={{ borderRadius: 'var(--radius-sm)' }}>
                📋 View Appointments
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════
          DOCTORS
      ════════════════════════════════════ */}
      {subView === 'doctors' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }} className="animate-fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '0.5rem', flex: 1, minWidth: '240px', flexWrap: 'wrap' }}>
              <input type="text" placeholder="Search by name or code..." className="form-input"
                value={docSearch} onChange={e => setDocSearch(e.target.value)} style={{ flex: 1, minWidth: '180px' }} />
              <select className="form-input" value={docSpecFilter} onChange={e => setDocSpecFilter(e.target.value)}
                style={{ maxWidth: '200px' }}>
                <option value="">All Specializations</option>
                {specializations.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            {canRegisterDoctor && (
              <button onClick={openDocCreate} className={`btn ${btnClass}`} style={{ borderRadius: 'var(--radius-sm)' }}>
                ➕ Register Doctor
              </button>
            )}
          </div>

          <div className="saas-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="saas-table text-left" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th>Code</th><th>Doctor Name</th><th>Specialization</th>
                    <th>Qualification</th><th>Experience</th><th>Fee</th>
                    <th>Phone</th><th>Status</th>
                    {canRegisterDoctor && <th style={{ textAlign: 'center' }}>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {doctors.length === 0
                    ? <tr><td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>No doctors found. {canRegisterDoctor ? 'Register one to get started.' : ''}</td></tr>
                    : doctors.map(d => (
                      <tr key={d.id}>
                        <td><code style={{ fontWeight: 700, fontSize: '0.8rem', background: 'var(--bg-primary)', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>{d.doctorCode}</code></td>
                        <td>
                          <div style={{ fontWeight: 700 }}>Dr. {d.userName}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{d.email}</div>
                        </td>
                        <td><span className="badge badge-info">{d.specialization}</span></td>
                        <td style={{ fontSize: '0.85rem' }}>{d.qualification || '—'}</td>
                        <td style={{ fontSize: '0.85rem' }}>{d.experienceYears} yrs</td>
                        <td style={{ fontWeight: 700 }}>₹{Number(d.consultationFee).toLocaleString()}</td>
                        <td style={{ fontSize: '0.85rem' }}>{d.phoneNumber || '—'}</td>
                        <td>{statusBadge(d.status)}</td>
                        {canRegisterDoctor && (
                          <td>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.4rem' }}>
                              <button onClick={() => openDocEdit(d)} className="btn btn-secondary"
                                style={{ padding: '0.2rem 0.55rem', fontSize: '0.75rem', borderRadius: 'var(--radius-sm)' }}>Edit</button>
                              <button onClick={() => withFeedback(() => api.toggleDoctorStatus(d.id).then(() => loadDoctors()), 'Status updated.')}
                                className="btn btn-secondary"
                                style={{ padding: '0.2rem 0.55rem', fontSize: '0.75rem', borderRadius: 'var(--radius-sm)',
                                  color: d.status === 'Active' ? 'var(--zoho-red)' : 'var(--zoho-green)' }}>
                                {d.status === 'Active' ? 'Deactivate' : 'Activate'}
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════
          STAFF
      ════════════════════════════════════ */}
      {subView === 'staff' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }} className="animate-fade-in">
          {!canManageStaff ? (
            <div className="role-restriction-banner">
              🔒 Staff management is restricted to Administrators only.
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', borderBottom: '2px solid var(--border-color)' }}>
                  {(['receptionist', 'nurse'] as const).map(t => (
                    <button key={t} onClick={() => setStaffTab(t)}
                      className={`sub-tab-btn ${staffTab === t ? 'active' : ''}`}
                      style={{ color: staffTab === t ? themeColor : undefined }}>
                      {t === 'receptionist' ? '🗂️ Receptionists' : '💉 Nurses'}
                    </button>
                  ))}
                </div>
                <button onClick={openStaffCreate} className={`btn ${btnClass}`} style={{ borderRadius: 'var(--radius-sm)' }}>
                  ➕ Register {staffTab === 'receptionist' ? 'Receptionist' : 'Nurse'}
                </button>
              </div>

              <div className="saas-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table className="saas-table text-left" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr><th>Code</th><th>Name</th><th>Email</th><th>Department</th><th>Phone</th><th>Status</th><th style={{ textAlign: 'center' }}>Actions</th></tr>
                    </thead>
                    <tbody>
                      {(staffTab === 'receptionist' ? receptionists : nurses).length === 0
                        ? <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>No records. Register one to get started.</td></tr>
                        : (staffTab === 'receptionist' ? receptionists : nurses).map((s: any) => (
                          <tr key={s.id}>
                            <td><code style={{ fontWeight: 700, fontSize: '0.8rem', background: 'var(--bg-primary)', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>{s.employeeCode}</code></td>
                            <td><div style={{ fontWeight: 700 }}>{s.userName}</div></td>
                            <td style={{ fontSize: '0.85rem' }}>{s.email}</td>
                            <td style={{ fontSize: '0.85rem' }}>{s.department || '—'}</td>
                            <td style={{ fontSize: '0.85rem' }}>{s.phoneNumber || '—'}</td>
                            <td>{statusBadge(s.status)}</td>
                            <td>
                              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.4rem' }}>
                                <button onClick={() => openStaffEdit(s)} className="btn btn-secondary"
                                  style={{ padding: '0.2rem 0.55rem', fontSize: '0.75rem', borderRadius: 'var(--radius-sm)' }}>Edit</button>
                                <button onClick={() => withFeedback(async () => {
                                  if (staffTab === 'receptionist') await api.toggleReceptionistStatus(s.id);
                                  else await api.toggleNurseStatus(s.id);
                                  await loadStaff();
                                }, 'Status updated.')} className="btn btn-secondary"
                                  style={{ padding: '0.2rem 0.55rem', fontSize: '0.75rem', borderRadius: 'var(--radius-sm)',
                                    color: s.status === 'Active' ? 'var(--zoho-red)' : 'var(--zoho-green)' }}>
                                  {s.status === 'Active' ? 'Deactivate' : 'Activate'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ════════════════════════════════════
          PATIENTS
      ════════════════════════════════════ */}
      {subView === 'patients' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }} className="animate-fade-in">
          {isAdmin && (
            <div className="role-restriction-banner">
              🔒 You have <strong>view-only access</strong> to the patient registry. Patient registration is performed by Doctors, Receptionists, or Nurses.
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
            <input type="text" placeholder="Search by name, code or phone..." className="form-input"
              value={patSearch} onChange={e => { setPatSearch(e.target.value); setPatPage(1); }}
              style={{ flex: 1, maxWidth: '400px' }} />
            {canRegisterPatient && (
              <button onClick={openPatientCreate} className={`btn ${btnClass}`} style={{ borderRadius: 'var(--radius-sm)' }}>
                ➕ Register Patient
              </button>
            )}
          </div>

          <div className="saas-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="saas-table text-left" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr><th>Code</th><th>Full Name</th><th>Age / Gender</th><th>Phone</th><th>Blood Group</th><th>Emergency Contact</th>{canRegisterPatient && <th style={{ textAlign: 'center' }}>Actions</th>}</tr>
                </thead>
                <tbody>
                  {patients.length === 0
                    ? <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>No patient records found.</td></tr>
                    : patients.map((p: any) => {
                        const age = p.dateOfBirth ? new Date().getFullYear() - new Date(p.dateOfBirth).getFullYear() : '—';
                        return (
                          <tr key={p.id}>
                            <td><code style={{ fontWeight: 700, fontSize: '0.8rem', background: 'var(--bg-primary)', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>{p.patientCode}</code></td>
                            <td>
                              <div style={{ fontWeight: 700 }}>{p.fullName}</div>
                              {p.email && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.email}</div>}
                            </td>
                            <td style={{ fontSize: '0.85rem' }}>{age} yrs / {p.gender}</td>
                            <td style={{ fontSize: '0.85rem' }}>
                              {p.phoneNumber}
                              {p.whatsAppConsent && <span title="WhatsApp Enabled" style={{ marginLeft: '0.35rem', cursor: 'help' }}>💬</span>}
                            </td>
                            <td><span className="badge badge-info">{p.bloodGroup}</span></td>
                            <td style={{ fontSize: '0.85rem' }}>{p.emergencyContact || '—'}</td>
                            {canRegisterPatient && (
                              <td>
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '0.4rem' }}>
                                  <button onClick={() => openPatientEdit(p)} className="btn btn-secondary"
                                    style={{ padding: '0.2rem 0.55rem', fontSize: '0.75rem', borderRadius: 'var(--radius-sm)' }}>Edit</button>
                                  <button onClick={() => { if (window.confirm('Delete this patient record?')) withFeedback(() => api.deletePatient(p.id).then(() => loadPatients()), 'Patient deleted.'); }}
                                    className="btn btn-secondary"
                                    style={{ padding: '0.2rem 0.55rem', fontSize: '0.75rem', borderRadius: 'var(--radius-sm)', color: 'var(--zoho-red)' }}>Delete</button>
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {patTotalCount > 10 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem' }}>
              <button disabled={patPage === 1} onClick={() => setPatPage(p => Math.max(p - 1, 1))}
                className="btn btn-secondary" style={{ padding: '0.3rem 0.8rem' }}>← Prev</button>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Page <strong>{patPage}</strong> of <strong>{Math.ceil(patTotalCount / 10)}</strong>
              </span>
              <button disabled={patPage * 10 >= patTotalCount} onClick={() => setPatPage(p => p + 1)}
                className="btn btn-secondary" style={{ padding: '0.3rem 0.8rem' }}>Next →</button>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════
          APPOINTMENTS
      ════════════════════════════════════ */}
      {subView === 'appointments' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }} className="animate-fade-in">
          {isAdmin && (
            <div className="role-restriction-banner">
              🔒 You have <strong>view-only access</strong> to appointments. Scheduling is performed by Doctors, Receptionists, or Nurses.
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Date:</label>
              <input type="date" className="form-input" value={appFilterDate} onChange={e => setAppFilterDate(e.target.value)} style={{ maxWidth: '200px' }} />
            </div>
            {canBookAppointment && (
              <button onClick={openAppCreate} className={`btn ${btnClass}`} style={{ borderRadius: 'var(--radius-sm)' }}>
                📅 Schedule Appointment
              </button>
            )}
          </div>

          <div className="saas-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="saas-table text-left" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr><th>Time</th><th>Patient</th><th>Doctor</th><th>Specialization</th><th>Type</th><th>Status</th>{canBookAppointment && <th style={{ textAlign: 'center' }}>Action</th>}</tr>
                </thead>
                <tbody>
                  {appointments.length === 0
                    ? <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>No appointments on this date.</td></tr>
                    : appointments.map((a: any) => {
                        const timeStr = new Date(a.appointmentDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        return (
                          <tr key={a.id}>
                            <td style={{ fontWeight: 800 }}>⏰ {timeStr}</td>
                            <td>
                              <div style={{ fontWeight: 700 }}>{a.patientName}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{a.patientCode}</div>
                            </td>
                            <td style={{ fontWeight: 600 }}>Dr. {a.doctorName}</td>
                            <td><span className="badge badge-info">{a.specialization}</span></td>
                            <td>
                              <span className={`badge ${a.appointmentType === 'WalkIn' ? 'badge-warning' : 'badge-success'}`}>
                                {a.appointmentType === 'WalkIn' ? '🚶 Walk-In' : '📋 Scheduled'}
                              </span>
                            </td>
                            <td>
                              {canBookAppointment ? (
                                <select value={a.status} onChange={e => handleUpdateAppStatus(a.id, e.target.value)}
                                  style={{ padding: '0.25rem 0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', background: 'var(--bg-secondary)' }}>
                                  <option>Pending</option>
                                  <option>Confirmed</option>
                                  <option>Completed</option>
                                  <option>Cancelled</option>
                                </select>
                              ) : statusBadge(a.status)}
                            </td>
                            {canBookAppointment && (
                              <td style={{ textAlign: 'center' }}>
                                <button disabled={a.status === 'Completed'} onClick={() => handleUpdateAppStatus(a.id, 'Completed')}
                                  className="btn btn-secondary"
                                  style={{ padding: '0.2rem 0.55rem', fontSize: '0.75rem', color: 'var(--zoho-green)', borderRadius: 'var(--radius-sm)' }}>
                                  ✓ Done
                                </button>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════
          ROLES
      ════════════════════════════════════ */}
      {subView === 'roles' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }} className="animate-fade-in">
          {!canManageRoles ? (
            <div className="role-restriction-banner">
              🔒 Role & Permission management is restricted to Administrators only.
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={openRoleCreate} className={`btn ${btnClass}`} style={{ borderRadius: 'var(--radius-sm)' }}>
                  ➕ Create Custom Role
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
                {rolesList.map((r: any) => (
                  <div key={r.id} className="saas-card animate-fade-in" style={{ borderTop: `4px solid ${themeColor}`, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '1.2rem' }}>🔑</span>
                        <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>{r.name}</span>
                      </div>
                      <span className={`badge ${r.isActive ? 'badge-success' : 'badge-error'}`}>{r.isActive ? 'Active' : 'Disabled'}</span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                      <strong>Permissions: </strong>
                      {(r.permissions || []).length === 0 ? 'None assigned' :
                        (r.permissions as any[]).slice(0, 4).map((p: any) =>
                          <span key={p.id} className="badge badge-info" style={{ fontSize: '0.7rem', marginRight: '0.25rem', marginBottom: '0.2rem' }}>{p.permissionCode?.split('.')[1]}</span>
                        )}
                      {(r.permissions || []).length > 4 && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>+{r.permissions.length - 4} more</span>}
                    </div>
                    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                      <button onClick={() => openRoleEdit(r)} className="btn btn-secondary"
                        style={{ width: '100%', padding: '0.45rem', fontSize: '0.8rem', borderRadius: 'var(--radius-sm)' }}>
                        ⚙️ Configure Permissions & Widgets
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          GLASS DRAWERS (All Registration / Edit Forms)
      ══════════════════════════════════════════════════════ */}

      {/* ── Doctor Registration Modal ── */}
      <RegisterModal
        open={isDocDrawerOpen}
        onClose={() => { setIsDocDrawerOpen(false); setEditingDoctor(null); }}
        title={editingDoctor ? 'Edit Doctor Profile' : 'Register New Doctor'}
        subtitle={editingDoctor ? 'Update the doctor\'s profile and consultation details.' : 'Create login credentials and professional profile for the doctor.'}
        icon="🩺"
        themeColor={themeColor}
        wide
        footer={
          <>
            <button type="button" onClick={() => { setIsDocDrawerOpen(false); setEditingDoctor(null); }} className="btn btn-secondary" style={{ minWidth: '100px' }}>
              Cancel
            </button>
            <button form="docForm" type="submit" className={`btn ${btnClass}`} style={{ minWidth: '140px' }}>
              {editingDoctor ? 'Save Changes' : 'Register Doctor'}
            </button>
          </>
        }
      >
        <form id="docForm" onSubmit={handleSaveDoctor}>
          <div className="reg-form-section">
            <div className="reg-form-section-label">Account Details</div>
            <div className="reg-form-grid-2">
              <div className="form-group">
                <label className="form-label">Full Name <span style={{ color: themeColor }}>*</span></label>
                <input type="text" className="form-input reg-modal-input" required value={docForm.userName} onChange={e => setDocForm({ ...docForm, userName: e.target.value })} placeholder="e.g. Dr. Rajesh Kumar" />
              </div>
              <div className="form-group">
                <label className="form-label">Email Address <span style={{ color: themeColor }}>*</span></label>
                <input type="email" className="form-input reg-modal-input" required disabled={!!editingDoctor} value={docForm.email} onChange={e => setDocForm({ ...docForm, email: e.target.value })} placeholder="doctor@clinic.com" />
              </div>
            </div>
            {!editingDoctor && (
              <div className="form-group">
                <label className="form-label">Temporary Password <span style={{ color: themeColor }}>*</span></label>
                <input type="text" className="form-input reg-modal-input" required value={docForm.password} onChange={e => setDocForm({ ...docForm, password: e.target.value })} placeholder="Will be shared in welcome email" />
              </div>
            )}
          </div>

          <div className="reg-form-section">
            <div className="reg-form-section-label">Professional Details</div>
            <div className="reg-form-grid-2">
              <div className="form-group">
                <label className="form-label">Doctor Code <span style={{ color: themeColor }}>*</span></label>
                <input type="text" className="form-input reg-modal-input" required value={docForm.doctorCode} onChange={e => setDocForm({ ...docForm, doctorCode: e.target.value })} placeholder="e.g. DOC001" />
              </div>
              <div className="form-group">
                <label className="form-label">Specialization <span style={{ color: themeColor }}>*</span></label>
                <input type="text" className="form-input reg-modal-input" required value={docForm.specialization} onChange={e => setDocForm({ ...docForm, specialization: e.target.value })} placeholder="e.g. Cardiology" />
              </div>
              <div className="form-group">
                <label className="form-label">Qualification</label>
                <input type="text" className="form-input reg-modal-input" value={docForm.qualification} onChange={e => setDocForm({ ...docForm, qualification: e.target.value })} placeholder="e.g. MBBS, MD" />
              </div>
              <div className="form-group">
                <label className="form-label">Experience (Years) <span style={{ color: themeColor }}>*</span></label>
                <input type="number" className="form-input reg-modal-input" required min={0} value={docForm.experienceYears} onChange={e => setDocForm({ ...docForm, experienceYears: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="form-group">
                <label className="form-label">Consultation Fee (₹) <span style={{ color: themeColor }}>*</span></label>
                <input type="number" className="form-input reg-modal-input" required min={0} step="0.01" value={docForm.consultationFee} onChange={e => setDocForm({ ...docForm, consultationFee: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input type="text" className="form-input reg-modal-input" value={docForm.phoneNumber} onChange={e => setDocForm({ ...docForm, phoneNumber: e.target.value })} placeholder="+91 98765 43210" />
              </div>
            </div>
          </div>
        </form>
      </RegisterModal>

      {/* ── Staff Registration Modal (Receptionist / Nurse) ── */}
      <RegisterModal
        open={isStaffDrawerOpen}
        onClose={() => { setIsStaffDrawerOpen(false); setEditingStaff(null); }}
        title={editingStaff ? `Edit ${staffTab === 'receptionist' ? 'Receptionist' : 'Nurse'}` : `Register ${staffTab === 'receptionist' ? 'Receptionist' : 'Nurse'}`}
        subtitle={`Provide login credentials and ${staffTab === 'receptionist' ? 'receptionist' : 'nursing'} profile information.`}
        icon={staffTab === 'receptionist' ? '🏥' : '💉'}
        themeColor={themeColor}
        wide
        footer={
          <>
            <button type="button" onClick={() => { setIsStaffDrawerOpen(false); setEditingStaff(null); }} className="btn btn-secondary" style={{ minWidth: '100px' }}>
              Cancel
            </button>
            <button form="staffForm" type="submit" className={`btn ${btnClass}`} style={{ minWidth: '140px' }}>
              {editingStaff ? 'Save Changes' : `Register ${staffTab === 'receptionist' ? 'Receptionist' : 'Nurse'}`}
            </button>
          </>
        }
      >
        <form id="staffForm" onSubmit={handleSaveStaff}>
          <div className="reg-form-section">
            <div className="reg-form-section-label">Account Details</div>
            <div className="reg-form-grid-2">
              <div className="form-group">
                <label className="form-label">Full Name <span style={{ color: themeColor }}>*</span></label>
                <input type="text" className="form-input reg-modal-input" required value={staffForm.userName} onChange={e => setStaffForm({ ...staffForm, userName: e.target.value })} placeholder="e.g. Priya Sharma" />
              </div>
              <div className="form-group">
                <label className="form-label">Email Address <span style={{ color: themeColor }}>*</span></label>
                <input type="email" className="form-input reg-modal-input" required disabled={!!editingStaff} value={staffForm.email} onChange={e => setStaffForm({ ...staffForm, email: e.target.value })} placeholder="staff@clinic.com" />
              </div>
            </div>
            {!editingStaff && (
              <div className="form-group">
                <label className="form-label">Temporary Password <span style={{ color: themeColor }}>*</span></label>
                <input type="text" className="form-input reg-modal-input" required value={staffForm.password} onChange={e => setStaffForm({ ...staffForm, password: e.target.value })} placeholder="Will be shared in welcome email" />
              </div>
            )}
          </div>

          <div className="reg-form-section">
            <div className="reg-form-section-label">Employment Details</div>
            <div className="reg-form-grid-2">
              <div className="form-group">
                <label className="form-label">Employee Code <span style={{ color: themeColor }}>*</span></label>
                <input type="text" className="form-input reg-modal-input" required value={staffForm.employeeCode} onChange={e => setStaffForm({ ...staffForm, employeeCode: e.target.value })} placeholder="e.g. RCP001" />
              </div>
              <div className="form-group">
                <label className="form-label">Department</label>
                <input type="text" className="form-input reg-modal-input" value={staffForm.department} onChange={e => setStaffForm({ ...staffForm, department: e.target.value })} placeholder="e.g. Outpatient" />
              </div>
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input type="text" className="form-input reg-modal-input" value={staffForm.phoneNumber} onChange={e => setStaffForm({ ...staffForm, phoneNumber: e.target.value })} placeholder="+91 98765 43210" />
              </div>
            </div>
          </div>
        </form>
      </RegisterModal>

      {/* ── Patient Registration Modal ── */}
      <RegisterModal
        open={isPatDrawerOpen}
        onClose={() => { setIsPatDrawerOpen(false); setEditingPatient(null); }}
        title={editingPatient ? 'Edit Patient File' : 'Register New Patient'}
        subtitle={editingPatient ? 'Update the patient\'s core demographic and contact information.' : 'Create a new patient health record with demographics and optional custom fields.'}
        icon="🩹"
        themeColor={themeColor}
        wide
        footer={
          <>
            <button type="button" onClick={() => { setIsPatDrawerOpen(false); setEditingPatient(null); }} className="btn btn-secondary" style={{ minWidth: '100px' }}>
              Cancel
            </button>
            <button form="patForm" type="submit" className={`btn ${btnClass}`} style={{ minWidth: '140px' }}>
              {editingPatient ? 'Update Patient' : 'Register Patient'}
            </button>
          </>
        }
      >
        <form id="patForm" onSubmit={handleSavePatient}>
          <div className="reg-form-section">
            <div className="reg-form-section-label">Identity</div>
            <div className="reg-form-grid-2">
              <div className="form-group">
                <label className="form-label">Patient Code <span style={{ color: themeColor }}>*</span></label>
                <input type="text" className="form-input reg-modal-input" required disabled={!!editingPatient} value={patientForm.patientCode} onChange={e => setPatientForm({ ...patientForm, patientCode: e.target.value })} placeholder="e.g. PAT1001" />
              </div>
              <div className="form-group">
                <label className="form-label">Full Name <span style={{ color: themeColor }}>*</span></label>
                <input type="text" className="form-input reg-modal-input" required value={patientForm.fullName} onChange={e => setPatientForm({ ...patientForm, fullName: e.target.value })} placeholder="Patient full name" />
              </div>
              <div className="form-group">
                <label className="form-label">Date of Birth <span style={{ color: themeColor }}>*</span></label>
                <input type="date" className="form-input reg-modal-input" required value={patientForm.dateOfBirth} onChange={e => setPatientForm({ ...patientForm, dateOfBirth: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Gender <span style={{ color: themeColor }}>*</span></label>
                <select className="form-input reg-modal-input" value={patientForm.gender} onChange={e => setPatientForm({ ...patientForm, gender: e.target.value })}>
                  <option>Male</option><option>Female</option><option>Other</option>
                </select>
              </div>
            </div>
          </div>

          <div className="reg-form-section">
            <div className="reg-form-section-label">Contact &amp; Medical</div>
            <div className="reg-form-grid-2">
              <div className="form-group">
                <label className="form-label">Phone Number <span style={{ color: themeColor }}>*</span></label>
                <input type="text" className="form-input reg-modal-input" required value={patientForm.phoneNumber} onChange={e => setPatientForm({ ...patientForm, phoneNumber: e.target.value })} placeholder="+91 98765 43210" />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input type="email" className="form-input reg-modal-input" value={patientForm.email} onChange={e => setPatientForm({ ...patientForm, email: e.target.value })} placeholder="patient@email.com" />
              </div>
              <div className="form-group">
                <label className="form-label">Blood Group</label>
                <select className="form-input reg-modal-input" value={patientForm.bloodGroup} onChange={e => setPatientForm({ ...patientForm, bloodGroup: e.target.value })}>
                  {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(bg => <option key={bg}>{bg}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Emergency Contact</label>
                <input type="text" className="form-input reg-modal-input" value={patientForm.emergencyContact} onChange={e => setPatientForm({ ...patientForm, emergencyContact: e.target.value })} placeholder="Name / Phone" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Address</label>
              <textarea className="form-input reg-modal-input" style={{ minHeight: '64px', resize: 'vertical' }} value={patientForm.address} onChange={e => setPatientForm({ ...patientForm, address: e.target.value })} placeholder="Street, City, State" />
            </div>
          </div>

          <div className="reg-form-section">
            <div className="reg-form-section-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>💬 WhatsApp Reminders</div>
            <div className="reg-whatsapp-box">
              <label className="reg-whatsapp-label">
                <input type="checkbox" checked={patientForm.whatsAppConsent} onChange={e => setPatientForm({ ...patientForm, whatsAppConsent: e.target.checked })}
                  style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: themeColor }} />
                Allow automated appointment reminders via WhatsApp
              </label>
              {patientForm.whatsAppConsent && (
                <div className="form-group" style={{ marginTop: '0.75rem', marginBottom: 0 }}>
                  <label className="form-label">WhatsApp Number (with country code)</label>
                  <input type="text" className="form-input reg-modal-input" value={patientForm.whatsAppNumber} onChange={e => setPatientForm({ ...patientForm, whatsAppNumber: e.target.value })} placeholder="+919876543210" />
                </div>
              )}
            </div>
          </div>

          {dynamicFields.length > 0 && (
            <div className="reg-form-section">
              <div className="reg-form-section-label">Custom Health Fields</div>
              <div className="reg-form-grid-2">
                {dynamicFields.map((f: any) => (
                  <div className="form-group" key={f.id}>
                    <label className="form-label">
                      {f.fieldName} {f.isRequired && <span style={{ color: themeColor }}>*</span>}
                    </label>
                    <input
                      type={f.fieldType === 'Number' ? 'number' : f.fieldType === 'Date' ? 'date' : 'text'}
                      className="form-input reg-modal-input" required={f.isRequired}
                      value={patientForm.customFields[f.fieldName] || ''}
                      onChange={e => {
                        const copy = { ...patientForm.customFields };
                        copy[f.fieldName] = e.target.value;
                        setPatientForm({ ...patientForm, customFields: copy });
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </form>
      </RegisterModal>

      {/* ── Appointment Scheduling Modal ── */}
      <RegisterModal
        open={isAppDrawerOpen}
        onClose={() => setIsAppDrawerOpen(false)}
        title="Schedule Medical Consultation"
        subtitle="Select patient, doctor, and time slot to book an appointment."
        icon="📅"
        themeColor={themeColor}
        footer={
          <>
            <button type="button" onClick={() => setIsAppDrawerOpen(false)} className="btn btn-secondary" style={{ minWidth: '100px' }}>
              Cancel
            </button>
            <button form="appForm" type="submit" className={`btn ${btnClass}`} style={{ minWidth: '160px' }}>
              Confirm Appointment
            </button>
          </>
        }
      >
        <form id="appForm" onSubmit={handleSaveAppointment}>
          <div className="reg-form-section">
            <div className="reg-form-section-label">Participants</div>
            <div className="form-group">
              <label className="form-label">Patient <span style={{ color: themeColor }}>*</span></label>
              <select className="form-input reg-modal-input" required value={appForm.patientId} onChange={e => setAppForm({ ...appForm, patientId: parseInt(e.target.value) || 0 })}>
                <option value={0} disabled>— Select Patient —</option>
                {patients.map((p: any) => <option key={p.id} value={p.id}>{p.fullName} ({p.patientCode})</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Doctor <span style={{ color: themeColor }}>*</span></label>
              <select className="form-input reg-modal-input" required value={appForm.doctorId} onChange={e => setAppForm({ ...appForm, doctorId: parseInt(e.target.value) || 0 })}>
                <option value={0} disabled>— Select Doctor —</option>
                {doctors.filter((d: any) => d.status === 'Active').map((d: any) => <option key={d.id} value={d.id}>Dr. {d.userName} – {d.specialization}</option>)}
              </select>
            </div>
          </div>
          <div className="reg-form-section">
            <div className="reg-form-section-label">Schedule</div>
            <div className="reg-form-grid-2">
              <div className="form-group">
                <label className="form-label">Date &amp; Time <span style={{ color: themeColor }}>*</span></label>
                <input type="datetime-local" className="form-input reg-modal-input" required value={appForm.appointmentDate} onChange={e => setAppForm({ ...appForm, appointmentDate: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Visit Type</label>
                <select className="form-input reg-modal-input" value={appForm.appointmentType} onChange={e => setAppForm({ ...appForm, appointmentType: e.target.value })}>
                  <option value="Scheduled">📋 Scheduled Visit</option>
                  <option value="WalkIn">🚶 Walk-In</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Symptoms / Notes</label>
              <textarea className="form-input reg-modal-input" style={{ minHeight: '80px', resize: 'vertical' }} value={appForm.notes} onChange={e => setAppForm({ ...appForm, notes: e.target.value })} placeholder="Brief description of complaint or reason for visit..." />
            </div>
          </div>
        </form>
      </RegisterModal>

      {/* ── Role Permissions Modal ── */}
      <RegisterModal
        open={isRoleDrawerOpen}
        onClose={() => { setIsRoleDrawerOpen(false); setEditingRole(null); }}
        title={editingRole ? `Configure Role: ${editingRole.name}` : 'Create Custom Role'}
        subtitle="Define which permissions this role has and which dashboard widgets are visible."
        icon="🔑"
        themeColor={themeColor}
        wide
        footer={
          <>
            <button type="button" onClick={() => { setIsRoleDrawerOpen(false); setEditingRole(null); }} className="btn btn-secondary" style={{ minWidth: '100px' }}>
              Cancel
            </button>
            <button form="roleForm" type="submit" className={`btn ${btnClass}`} style={{ minWidth: '160px' }}>
              {editingRole ? 'Save Configuration' : 'Create Role'}
            </button>
          </>
        }
      >
        <form id="roleForm" onSubmit={handleSaveRole}>
          <div className="form-group">
            <label className="form-label">Role Name *</label>
            <input type="text" className="form-input" required disabled={!!editingRole} value={roleForm.name} onChange={e => setRoleForm({ ...roleForm, name: e.target.value })} placeholder="e.g. Nurse, Lab Technician" />
          </div>

          <div className="form-section-title" style={{ marginTop: '0.5rem' }}>Module Permissions</div>
          <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1rem', marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '1rem', background: 'var(--bg-primary)' }}>
            {Array.from(new Set(permissionsList.map((p: any) => p.moduleName))).map(mod => (
              <div key={String(mod)}>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: themeColor, marginBottom: '0.5rem' }}>{String(mod)}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                  {permissionsList.filter((p: any) => p.moduleName === mod).map((p: any) => (
                    <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', cursor: 'pointer', padding: '0.3rem', borderRadius: '4px' }}>
                      <input type="checkbox" checked={roleForm.permissionIds.includes(p.id)} onChange={() => togglePermission(p.id)} style={{ cursor: 'pointer', accentColor: themeColor }} />
                      <span style={{ color: 'var(--text-primary)' }}>{p.permissionCode?.split('.')[1] || p.permissionCode}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="form-section-title" style={{ marginTop: '0.5rem' }}>Dashboard Widgets Visibility</div>
          <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1rem', marginTop: '0.75rem', display: 'grid', gridTemplateColumns: '1fr', gap: '0.5rem', background: 'var(--bg-primary)' }}>
            {WIDGET_DEFS.map(w => (
              <label key={w.key} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem', cursor: 'pointer', padding: '0.4rem', borderRadius: '4px' }}>
                <input type="checkbox" checked={roleForm.widgetKeys.includes(w.key)} onChange={() => toggleWidget(w.key)} style={{ cursor: 'pointer', accentColor: themeColor }} />
                <span>{w.icon} {w.label}</span>
              </label>
            ))}
          </div>
        </form>
      </RegisterModal>

    </div>
  );
};

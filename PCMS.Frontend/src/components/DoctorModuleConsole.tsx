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
  const [subView, setSubView] = useState<SubView>(() => {
    return (localStorage.getItem('pcms_doctor_subview') as SubView) || 'dashboard';
  });

  useEffect(() => {
    localStorage.setItem('pcms_doctor_subview', subView);
  }, [subView]);

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
  const [doctorFields, setDoctorFields] = useState<any[]>([]);
  const [isQualDropdownOpen, setIsQualDropdownOpen] = useState(false);
  const [isSpecDropdownOpen, setIsSpecDropdownOpen] = useState(false);

  const qualificationsList = ["MBBS", "MD", "MS", "BDS", "MDS", "BAMS", "BHMS", "PhD", "Others"];
  const defaultSpecializationsList = ["Cardiology", "Pediatrics", "Dermatology", "General Medicine", "Orthopedics", "Neurology", "Gynecology", "Psychiatry", "Radiology", "Others"];

  const handleQualCheckboxChange = (qual: string) => {
    const currentQuals = docForm.qualification ? docForm.qualification.split(',').map((x: string) => x.trim()).filter(Boolean) : [];
    const newQuals = currentQuals.includes(qual) ? currentQuals.filter((x: string) => x !== qual) : [...currentQuals, qual];
    setDocForm({ ...docForm, qualification: newQuals.join(', ') });
  };

  const handleSpecCheckboxChange = (spec: string) => {
    const currentSpecs = docForm.specialization ? docForm.specialization.split(',').map((x: string) => x.trim()).filter(Boolean) : [];
    const newSpecs = currentSpecs.includes(spec) ? currentSpecs.filter((x: string) => x !== spec) : [...currentSpecs, spec];
    setDocForm({ ...docForm, specialization: newSpecs.join(', ') });
  };

  const isPasswordStrong = (pwd: string) => {
    if (!pwd || pwd.length < 8) return false;
    if (!/[A-Z]/.test(pwd)) return false;
    if (!/[a-z]/.test(pwd)) return false;
    if (!/[0-9]/.test(pwd)) return false;
    if (!/[^A-Za-z0-9]/.test(pwd)) return false;
    return true;
  };

  const [isDocDrawerOpen, setIsDocDrawerOpen] = useState(() => {
    return localStorage.getItem('pcms_doctor_drawer_open') === 'true';
  });
  const [editingDoctor, setEditingDoctor] = useState<any | null>(() => {
    const val = localStorage.getItem('pcms_editing_doctor');
    return val ? JSON.parse(val) : null;
  });
  const [docForm, setDocForm] = useState(() => {
    const val = localStorage.getItem('pcms_doc_form');
    return val ? JSON.parse(val) : {
      userName: '', email: '', password: '', doctorCode: '',
      specialization: '', qualification: '', experienceYears: 0,
      consultationFee: 0, phoneNumber: '', status: 'Active', isActive: true,
      fullLegalName: '', mobileNumber: '', registrationNumber: '',
      medicalCouncil: 'State Medical Council', registrationCertificate: '',
      verificationStatus: 'Pending',
      customFields: {} as Record<string, string>,
    };
  });

  useEffect(() => {
    localStorage.setItem('pcms_doctor_drawer_open', String(isDocDrawerOpen));
  }, [isDocDrawerOpen]);

  useEffect(() => {
    if (editingDoctor) {
      localStorage.setItem('pcms_editing_doctor', JSON.stringify(editingDoctor));
    } else {
      localStorage.removeItem('pcms_editing_doctor');
    }
  }, [editingDoctor]);

  useEffect(() => {
    localStorage.setItem('pcms_doc_form', JSON.stringify(docForm));
  }, [docForm]);

  // Staff
  const [staffTab, setStaffTab]         = useState<'receptionist' | 'nurse'>(() => {
    return (localStorage.getItem('pcms_staff_tab') as any) || 'receptionist';
  });
  const [receptionists, setReceptionists] = useState<any[]>([]);
  const [nurses, setNurses]             = useState<any[]>([]);
  const [activeActionMenu, setActiveActionMenu] = useState<{ type: string; id: number } | null>(null);
  const [isStaffDrawerOpen, setIsStaffDrawerOpen] = useState(() => {
    return localStorage.getItem('pcms_staff_drawer_open') === 'true';
  });
  const [editingStaff, setEditingStaff] = useState<any | null>(() => {
    const val = localStorage.getItem('pcms_editing_staff');
    return val ? JSON.parse(val) : null;
  });
  const [staffForm, setStaffForm] = useState(() => {
    const val = localStorage.getItem('pcms_staff_form');
    return val ? JSON.parse(val) : {
      userName: '', email: '', password: '', employeeCode: '',
      phoneNumber: '', department: '', status: 'Active', isActive: true,
      doctorId: '' as string | number | null,
    };
  });

  useEffect(() => {
    localStorage.setItem('pcms_staff_tab', staffTab);
  }, [staffTab]);

  useEffect(() => {
    localStorage.setItem('pcms_staff_drawer_open', String(isStaffDrawerOpen));
  }, [isStaffDrawerOpen]);

  useEffect(() => {
    if (editingStaff) {
      localStorage.setItem('pcms_editing_staff', JSON.stringify(editingStaff));
    } else {
      localStorage.removeItem('pcms_editing_staff');
    }
  }, [editingStaff]);

  useEffect(() => {
    localStorage.setItem('pcms_staff_form', JSON.stringify(staffForm));
  }, [staffForm]);

  // Patients
  const [patients, setPatients]         = useState<any[]>([]);
  const [patSearch, setPatSearch]       = useState('');
  const [patPage, setPatPage]           = useState(1);
  const [patTotalCount, setPatTotalCount] = useState(0);
  const [dynamicFields, setDynamicFields] = useState<any[]>([]);
  const [isPatDrawerOpen, setIsPatDrawerOpen] = useState(() => {
    return localStorage.getItem('pcms_patient_drawer_open') === 'true';
  });
  const [editingPatient, setEditingPatient] = useState<any | null>(() => {
    const val = localStorage.getItem('pcms_editing_patient');
    return val ? JSON.parse(val) : null;
  });
  const [patientForm, setPatientForm] = useState(() => {
    const val = localStorage.getItem('pcms_patient_form');
    return val ? JSON.parse(val) : {
      patientCode: '', fullName: '', dateOfBirth: '', gender: 'Male',
      phoneNumber: '', email: '', address: '', emergencyContact: '',
      bloodGroup: 'O+', whatsAppNumber: '', whatsAppConsent: false,
      customFields: {} as Record<string, string>,
    };
  });

  useEffect(() => {
    localStorage.setItem('pcms_patient_drawer_open', String(isPatDrawerOpen));
  }, [isPatDrawerOpen]);

  useEffect(() => {
    if (editingPatient) {
      localStorage.setItem('pcms_editing_patient', JSON.stringify(editingPatient));
    } else {
      localStorage.removeItem('pcms_editing_patient');
    }
  }, [editingPatient]);

  useEffect(() => {
    localStorage.setItem('pcms_patient_form', JSON.stringify(patientForm));
  }, [patientForm]);

  // Helper: Format Date to YYYY-MM-DD local
  const formatDateLocal = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // Appointments
  const [appointments, setAppointments] = useState<any[]>([]);
  const [appFilterDate, setAppFilterDate] = useState(() => formatDateLocal(new Date()));
  const [calendarViewDate, setCalendarViewDate] = useState(() => new Date());
  const [isAppDrawerOpen, setIsAppDrawerOpen] = useState(() => {
    return localStorage.getItem('pcms_appointment_drawer_open') === 'true';
  });
  const [appForm, setAppForm] = useState(() => {
    const val = localStorage.getItem('pcms_appointment_form');
    return val ? JSON.parse(val) : {
      patientId: 0, doctorId: 0,
      appointmentDate: new Date().toISOString().substring(0, 16),
      appointmentType: 'Scheduled', notes: '',
    };
  });

  useEffect(() => {
    localStorage.setItem('pcms_appointment_drawer_open', String(isAppDrawerOpen));
  }, [isAppDrawerOpen]);

  useEffect(() => {
    localStorage.setItem('pcms_appointment_form', JSON.stringify(appForm));
  }, [appForm]);

  // Roles
  const [rolesList, setRolesList]           = useState<any[]>([]);
  const [permissionsList, setPermissionsList] = useState<any[]>([]);
  const [isRoleDrawerOpen, setIsRoleDrawerOpen] = useState(() => {
    return localStorage.getItem('pcms_role_drawer_open') === 'true';
  });
  const [editingRole, setEditingRole]       = useState<any | null>(() => {
    const val = localStorage.getItem('pcms_editing_role');
    return val ? JSON.parse(val) : null;
  });
  const [roleForm, setRoleForm] = useState(() => {
    const val = localStorage.getItem('pcms_role_form');
    return val ? JSON.parse(val) : {
      name: '', isActive: true, permissionIds: [] as number[], widgetKeys: [] as string[],
    };
  });

  useEffect(() => {
    localStorage.setItem('pcms_role_drawer_open', String(isRoleDrawerOpen));
  }, [isRoleDrawerOpen]);

  useEffect(() => {
    if (editingRole) {
      localStorage.setItem('pcms_editing_role', JSON.stringify(editingRole));
    } else {
      localStorage.removeItem('pcms_editing_role');
    }
  }, [editingRole]);

  useEffect(() => {
    localStorage.setItem('pcms_role_form', JSON.stringify(roleForm));
  }, [roleForm]);

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
    const [list, specs, fields] = await Promise.all([
      api.getDoctors(docSearch, docSpecFilter),
      api.getDoctorSpecializations(),
      api.getFields(moduleId, 'Doctor'),
    ]);
    setDoctors(list);
    setSpecializations(specs);
    setDoctorFields(fields);
  }, [docSearch, docSpecFilter, moduleId]);

  const loadStaff = useCallback(async () => {
    const [recepts, nurs, docs] = await Promise.all([
      api.getReceptionists(),
      api.getNurses(),
      api.getDoctors(),
    ]);
    setDoctors(docs);
    setReceptionists(recepts);
    setNurses(nurs);
  }, []);

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
      api.getAppointments(),
      api.getDoctors(),
      api.getPatients('', 1, 100),
    ]);
    setAppointments(list);
    setDoctors(docsList);
    setPatients(patsRes.patients);
  }, []);

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
  }, [subView, docSearch, docSpecFilter, staffTab, patSearch, patPage,
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
    if (!editingDoctor && !isPasswordStrong(docForm.password)) {
      setError('Password must meet strength criteria (minimum 8 characters, containing uppercase, lowercase, digit, and special character).');
      return;
    }
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
      phoneNumber: doc.phoneNumber || '', status: doc.status, isActive: doc.isActive,
      fullLegalName: doc.fullLegalName || '', mobileNumber: doc.mobileNumber || '',
      registrationNumber: doc.registrationNumber || '', medicalCouncil: doc.medicalCouncil || 'State Medical Council',
      registrationCertificate: doc.registrationCertificate || '', verificationStatus: doc.verificationStatus || 'Pending',
      customFields: doc.customFields || {} });
    setIsDocDrawerOpen(true);
  };
  const openDocCreate = () => {
    setEditingDoctor(null);
    setDocForm({ userName: '', email: '', password: '', doctorCode: '', specialization: '',
      qualification: '', experienceYears: 0, consultationFee: 0, phoneNumber: '', status: 'Active', isActive: true,
      fullLegalName: '', mobileNumber: '', registrationNumber: '', medicalCouncil: 'State Medical Council',
      registrationCertificate: '', verificationStatus: 'Pending',
      customFields: {} });
    setIsDocDrawerOpen(true);
  };

  // ── Staff Handlers
  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff && !isPasswordStrong(staffForm.password)) {
      setError('Password must meet strength criteria (minimum 8 characters, containing uppercase, lowercase, digit, and special character).');
      return;
    }
    const payload = {
      ...staffForm,
      doctorId: staffForm.doctorId ? Number(staffForm.doctorId) : null
    };
    await withFeedback(async () => {
      if (staffTab === 'receptionist') {
        if (editingStaff) await api.updateReceptionist(editingStaff.id, payload);
        else await api.createReceptionist(payload);
      } else {
        if (editingStaff) await api.updateNurse(editingStaff.id, payload);
        else await api.createNurse(payload);
      }
      setIsStaffDrawerOpen(false);
      setEditingStaff(null);
      await loadStaff();
    }, 'Staff profile saved.');
  };
  const openStaffEdit = (s: any) => {
    setEditingStaff(s);
    setStaffForm({ userName: s.userName, email: s.email, password: '', employeeCode: s.employeeCode,
      phoneNumber: s.phoneNumber || '', department: s.department || '', status: s.status, isActive: s.isActive,
      doctorId: s.doctorId || '' });
    setIsStaffDrawerOpen(true);
  };
  const openStaffCreate = () => {
    setEditingStaff(null);
    setStaffForm({ userName: '', email: '', password: '', employeeCode: '', phoneNumber: '', department: '', status: 'Active', isActive: true, doctorId: '' });
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
  const togglePermission = (id: number) => setRoleForm((prev: any) => ({
    ...prev, permissionIds: prev.permissionIds.includes(id)
      ? prev.permissionIds.filter((x: number) => x !== id)
      : [...prev.permissionIds, id]
  }));
  const toggleWidget = (key: string) => setRoleForm((prev: any) => ({
    ...prev, widgetKeys: prev.widgetKeys.includes(key)
      ? prev.widgetKeys.filter((x: string) => x !== key)
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
      <div style={{
        position: 'sticky',
        top: 0,
        backgroundColor: '#ffffff',
        zIndex: 10,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.75rem',
        borderBottom: '2px solid var(--border-color)',
        paddingBottom: '1.25rem',
        paddingTop: '1.25rem',
        marginTop: '-1.5rem',
      }}>
        <div style={{
          display: 'inline-flex',
          gap: '6px',
          overflowX: 'auto',
          backgroundColor: '#f1f5f9',
          padding: '6px',
          borderRadius: '10px',
          border: '1px solid #e2e8f0'
        }}>
          {NAV_TABS.filter(t => t.always).map(t => {
            const isTabActive = subView === t.key;
            const cleanLabel = t.label.replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD00-\uDFFF]/g, '').trim();
            
            let badgeVal = null;
            if (t.key === 'doctors') badgeVal = doctors.length;
            else if (t.key === 'staff') badgeVal = receptionists.length + nurses.length;
            else if (t.key === 'patients') badgeVal = patTotalCount;
            else if (t.key === 'appointments') badgeVal = appointments.length;

            return (
              <button
                key={t.key}
                onClick={() => setSubView(t.key as SubView)}
                style={{
                  background: isTabActive ? '#ffffff' : 'none',
                  border: isTabActive ? '1px solid #cbd5e1' : '1px solid transparent',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  padding: '0.45rem 0.9rem',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  boxShadow: isTabActive ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                  color: isTabActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                <span>{cleanLabel}</span>
                {badgeVal !== null && (
                  <span
                    style={{
                      padding: '0.15rem 0.35rem',
                      borderRadius: '4px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      backgroundColor: isTabActive ? '#22c55e' : '#cbd5e1',
                      color: isTabActive ? '#ffffff' : '#475569'
                    }}
                  >
                    {badgeVal}
                  </span>
                )}
              </button>
            );
          })}
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

          <div style={{ overflowX: 'auto', width: '100%' }}>
            <div style={{ minWidth: '1000px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              
              {/* Header block */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '100px 2.2fr 1.2fr 1fr 100px 100px 1.5fr 100px 60px',
                gap: '1rem',
                padding: '0.75rem 1.25rem',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: 'var(--text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                <div>Code</div>
                <div>Doctor Name</div>
                <div>Specialization</div>
                <div>Qualification</div>
                <div>Experience</div>
                <div>Fee</div>
                <div>Contact</div>
                <div>Status</div>
                <div style={{ textAlign: 'center' }}>Actions</div>
              </div>

              {doctors.length === 0 ? (
                <div className="saas-card" style={{ padding: '3rem', textAlign: 'center', backgroundColor: '#ffffff', border: '1px solid var(--border-color)', borderRadius: '10px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>No doctors found. {canRegisterDoctor ? 'Register one to get started.' : ''}</span>
                </div>
              ) : (
                doctors.map(d => (
                  <div
                    key={d.id}
                    className="saas-card animate-fade-in"
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '100px 2.2fr 1.2fr 1fr 100px 100px 1.5fr 100px 60px',
                      gap: '1rem',
                      alignItems: 'center',
                      padding: '1.25rem',
                      backgroundColor: '#ffffff',
                      border: '1px solid var(--border-color)',
                      borderRadius: '10px',
                      boxShadow: 'var(--shadow-sm)',
                      position: 'relative'
                    }}
                  >
                    <div>
                      <code style={{ fontWeight: 700, fontSize: '0.8rem', background: 'var(--bg-primary)', padding: '0.15rem 0.4rem', borderRadius: '4px', color: 'var(--text-primary)' }}>
                        {d.doctorCode}
                      </code>
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Dr. {d.userName}</span>
                        {d.verificationStatus === 'Approved' ? (
                          <span title="Verified Credentials" style={{ fontSize: '0.7rem', padding: '0.1rem 0.35rem', background: '#e8f5e9', color: '#2e7d32', borderRadius: '3px', fontWeight: 600 }}>Verified ✓</span>
                        ) : d.verificationStatus === 'Rejected' ? (
                          <span title="Verification Rejected" style={{ fontSize: '0.7rem', padding: '0.1rem 0.35rem', background: '#ffebee', color: '#c62828', borderRadius: '3px', fontWeight: 600 }}>Rejected</span>
                        ) : (
                          <span title="Verification Pending" style={{ fontSize: '0.7rem', padding: '0.1rem 0.35rem', background: '#fff8e1', color: '#f57f17', borderRadius: '3px', fontWeight: 600 }}>Pending</span>
                        )}
                      </div>
                      {d.fullLegalName && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                          Legal Name: <strong>{d.fullLegalName}</strong>
                        </div>
                      )}
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{d.email}</div>
                      {d.registrationNumber && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                          Reg: <strong>{d.registrationNumber}</strong> ({d.medicalCouncil})
                        </div>
                      )}
                      {d.customFields && Object.keys(d.customFields).length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.2rem', marginTop: '0.25rem' }}>
                          {Object.entries(d.customFields).map(([key, value]) => (
                            <span key={key} style={{ fontSize: '0.7rem', padding: '0.1rem 0.3rem', backgroundColor: 'var(--bg-primary)', borderRadius: '3px', color: 'var(--text-secondary)' }}>
                              <strong>{key}:</strong> {String(value)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div>
                      <span className="badge badge-info">{d.specialization}</span>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                      {d.qualification || '—'}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {d.experienceYears} yrs
                    </div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                      ₹{Number(d.consultationFee).toLocaleString()}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      <div>Phone: {d.phoneNumber || '—'}</div>
                      {d.mobileNumber && <div style={{ marginTop: '0.15rem' }}>Mobile: {d.mobileNumber}</div>}
                    </div>
                    <div>{statusBadge(d.status)}</div>
                    <div style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
                      {canRegisterDoctor ? (
                        <>
                          <button
                            onClick={() => setActiveActionMenu(activeActionMenu?.type === 'doctor' && activeActionMenu?.id === d.id ? null : { type: 'doctor', id: d.id })}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem', color: 'var(--text-secondary)', padding: '0.25rem', fontWeight: 'bold' }}
                          >
                            ⋮
                          </button>
                          {activeActionMenu?.type === 'doctor' && activeActionMenu?.id === d.id && (
                            <div style={{
                              position: 'absolute',
                              right: '24px',
                              top: '-10px',
                              backgroundColor: '#ffffff',
                              border: '1px solid var(--border-color)',
                              borderRadius: '8px',
                              boxShadow: 'var(--shadow-md)',
                              zIndex: 100,
                              minWidth: '120px',
                              padding: '0.4rem 0',
                              display: 'flex',
                              flexDirection: 'column'
                            }}>
                              <button
                                onClick={() => { openDocEdit(d); setActiveActionMenu(null); }}
                                style={{ width: '100%', padding: '0.5rem 1rem', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 600 }}
                              >
                                📝 Edit Details
                              </button>
                              <button
                                onClick={() => {
                                  withFeedback(() => api.toggleDoctorStatus(d.id).then(() => loadDoctors()), 'Status updated.');
                                  setActiveActionMenu(null);
                                }}
                                style={{
                                  width: '100%',
                                  padding: '0.5rem 1rem',
                                  border: 'none',
                                  background: 'none',
                                  textAlign: 'left',
                                  cursor: 'pointer',
                                  fontSize: '0.8rem',
                                  color: d.status === 'Active' ? 'var(--zoho-red)' : 'var(--zoho-green)',
                                  fontWeight: 600
                                }}
                              >
                                {d.status === 'Active' ? '🚫 Deactivate' : '✅ Activate'}
                              </button>
                            </div>
                          )}
                        </>
                      ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                    </div>
                  </div>
                ))
              )}
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

              <div style={{ overflowX: 'auto', width: '100%' }}>
                <div style={{ minWidth: '900px', display: 'flex', flexDirection: 'column', gap: '8px' }}>

                  {/* Header row */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '110px 1.6fr 1.8fr 1.2fr 1.2fr 1.5fr 100px 60px',
                    gap: '1rem',
                    padding: '0.75rem 1.25rem',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: 'var(--text-secondary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    <div>Code</div>
                    <div>Name</div>
                    <div>Email</div>
                    <div>Department</div>
                    <div>Phone</div>
                    <div>Assigned Doctor</div>
                    <div>Status</div>
                    <div style={{ textAlign: 'center' }}>Actions</div>
                  </div>

                  {(staffTab === 'receptionist' ? receptionists : nurses).length === 0 ? (
                    <div className="saas-card" style={{ padding: '3rem', textAlign: 'center', backgroundColor: '#ffffff', border: '1px solid var(--border-color)', borderRadius: '10px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>No records. Register one to get started.</span>
                    </div>
                  ) : (
                    (staffTab === 'receptionist' ? receptionists : nurses).map((s: any) => (
                      <div
                        key={s.id}
                        className="saas-card animate-fade-in"
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '110px 1.6fr 1.8fr 1.2fr 1.2fr 1.5fr 100px 60px',
                          gap: '1rem',
                          alignItems: 'center',
                          padding: '1.25rem',
                          backgroundColor: '#ffffff',
                          border: '1px solid var(--border-color)',
                          borderRadius: '10px',
                          boxShadow: 'var(--shadow-sm)',
                          position: 'relative'
                        }}
                      >
                        <div>
                          <code style={{ fontWeight: 700, fontSize: '0.8rem', background: 'var(--bg-primary)', padding: '0.15rem 0.4rem', borderRadius: '4px', color: 'var(--text-primary)' }}>
                            {s.employeeCode}
                          </code>
                        </div>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{s.userName}</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{s.email}</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{s.department || '—'}</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{s.phoneNumber || '—'}</div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: s.doctorName ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                          {s.doctorName ? `🩺 ${s.doctorName}` : 'All Doctors'}
                        </div>
                        <div>{statusBadge(s.status)}</div>
                        <div style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
                          <button
                            onClick={() => setActiveActionMenu(activeActionMenu?.type === 'staff' && activeActionMenu?.id === s.id ? null : { type: 'staff', id: s.id })}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem', color: 'var(--text-secondary)', padding: '0.25rem', fontWeight: 'bold' }}
                          >
                            ⋮
                          </button>
                          {activeActionMenu?.type === 'staff' && activeActionMenu?.id === s.id && (
                            <div style={{
                              position: 'absolute',
                              right: '24px',
                              top: '-10px',
                              backgroundColor: '#ffffff',
                              border: '1px solid var(--border-color)',
                              borderRadius: '8px',
                              boxShadow: 'var(--shadow-md)',
                              zIndex: 100,
                              minWidth: '130px',
                              padding: '0.4rem 0',
                              display: 'flex',
                              flexDirection: 'column'
                            }}>
                              <button
                                onClick={() => { openStaffEdit(s); setActiveActionMenu(null); }}
                                style={{ width: '100%', padding: '0.5rem 1rem', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 600 }}
                              >
                                📝 Edit Details
                              </button>
                              <button
                                onClick={() => {
                                  withFeedback(async () => {
                                    if (staffTab === 'receptionist') await api.toggleReceptionistStatus(s.id);
                                    else await api.toggleNurseStatus(s.id);
                                    await loadStaff();
                                  }, 'Status updated.');
                                  setActiveActionMenu(null);
                                }}
                                style={{
                                  width: '100%',
                                  padding: '0.5rem 1rem',
                                  border: 'none',
                                  background: 'none',
                                  textAlign: 'left',
                                  cursor: 'pointer',
                                  fontSize: '0.8rem',
                                  color: s.status === 'Active' ? 'var(--zoho-red)' : 'var(--zoho-green)',
                                  fontWeight: 600
                                }}
                              >
                                {s.status === 'Active' ? '🚫 Deactivate' : '✅ Activate'}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
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

          <div style={{ overflowX: 'auto', width: '100%' }}>
            <div style={{ minWidth: '860px', display: 'flex', flexDirection: 'column', gap: '8px' }}>

              {/* Header row */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '110px 2fr 1fr 1.2fr 100px 1.5fr 60px',
                gap: '1rem',
                padding: '0.75rem 1.25rem',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: 'var(--text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                <div>Code</div>
                <div>Full Name</div>
                <div>Age / Gender</div>
                <div>Phone</div>
                <div>Blood Group</div>
                <div>Emergency Contact</div>
                <div style={{ textAlign: 'center' }}>Actions</div>
              </div>

              {patients.length === 0 ? (
                <div className="saas-card" style={{ padding: '3rem', textAlign: 'center', backgroundColor: '#ffffff', border: '1px solid var(--border-color)', borderRadius: '10px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>No patient records found.</span>
                </div>
              ) : (
                patients.map((p: any) => {
                  const age = p.dateOfBirth ? new Date().getFullYear() - new Date(p.dateOfBirth).getFullYear() : '—';
                  return (
                    <div
                      key={p.id}
                      className="saas-card animate-fade-in"
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '110px 2fr 1fr 1.2fr 100px 1.5fr 60px',
                        gap: '1rem',
                        alignItems: 'center',
                        padding: '1.25rem',
                        backgroundColor: '#ffffff',
                        border: '1px solid var(--border-color)',
                        borderRadius: '10px',
                        boxShadow: 'var(--shadow-sm)',
                        position: 'relative'
                      }}
                    >
                      <div>
                        <code style={{ fontWeight: 700, fontSize: '0.8rem', background: 'var(--bg-primary)', padding: '0.15rem 0.4rem', borderRadius: '4px', color: 'var(--text-primary)' }}>
                          {p.patientCode}
                        </code>
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{p.fullName}</div>
                        {p.email && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.email}</div>}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{age} yrs / {p.gender}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        {p.phoneNumber}
                        {p.whatsAppConsent && <span title="WhatsApp Enabled" style={{ marginLeft: '0.35rem', cursor: 'help' }}>💬</span>}
                      </div>
                      <div><span className="badge badge-info">{p.bloodGroup}</span></div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{p.emergencyContact || '—'}</div>
                      <div style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
                        {canRegisterPatient ? (
                          <>
                            <button
                              onClick={() => setActiveActionMenu(activeActionMenu?.type === 'patient' && activeActionMenu?.id === p.id ? null : { type: 'patient', id: p.id })}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem', color: 'var(--text-secondary)', padding: '0.25rem', fontWeight: 'bold' }}
                            >
                              ⋮
                            </button>
                            {activeActionMenu?.type === 'patient' && activeActionMenu?.id === p.id && (
                              <div style={{
                                position: 'absolute',
                                right: '24px',
                                top: '-10px',
                                backgroundColor: '#ffffff',
                                border: '1px solid var(--border-color)',
                                borderRadius: '8px',
                                boxShadow: 'var(--shadow-md)',
                                zIndex: 100,
                                minWidth: '120px',
                                padding: '0.4rem 0',
                                display: 'flex',
                                flexDirection: 'column'
                              }}>
                                <button
                                  onClick={() => { openPatientEdit(p); setActiveActionMenu(null); }}
                                  style={{ width: '100%', padding: '0.5rem 1rem', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 600 }}
                                >
                                  📝 Edit Details
                                </button>
                                <button
                                  onClick={() => {
                                    if (window.confirm('Delete this patient record?')) {
                                      withFeedback(() => api.deletePatient(p.id).then(() => loadPatients()), 'Patient deleted.');
                                    }
                                    setActiveActionMenu(null);
                                  }}
                                  style={{ width: '100%', padding: '0.5rem 1rem', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--zoho-red)', fontWeight: 600 }}
                                >
                                  🗑️ Delete
                                </button>
                              </div>
                            )}
                          </>
                        ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                      </div>
                    </div>
                  );
                })
              )}
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
      {subView === 'appointments' && (() => {
        const year = calendarViewDate.getFullYear();
        const month = calendarViewDate.getMonth();
        const monthNames = [
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'
        ];

        // Generate 42 cells for 7x6 calendar grid
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay();

        const cells: Array<{ date: Date; isCurrentMonth: boolean }> = [];
        // Prev month filler
        const prevMonthYear = month === 0 ? year - 1 : year;
        const prevMonth = month === 0 ? 11 : month - 1;
        const daysInPrevMonth = new Date(prevMonthYear, prevMonth + 1, 0).getDate();
        for (let i = firstDay - 1; i >= 0; i--) {
          cells.push({
            date: new Date(prevMonthYear, prevMonth, daysInPrevMonth - i),
            isCurrentMonth: false,
          });
        }
        // Current month days
        for (let i = 1; i <= daysInMonth; i++) {
          cells.push({
            date: new Date(year, month, i),
            isCurrentMonth: true,
          });
        }
        // Next month filler
        const nextMonthYear = month === 11 ? year + 1 : year;
        const nextMonth = month === 11 ? 0 : month + 1;
        const remaining = 42 - cells.length;
        for (let i = 1; i <= remaining; i++) {
          cells.push({
            date: new Date(nextMonthYear, nextMonth, i),
            isCurrentMonth: false,
          });
        }

        const handlePrevMonth = () => {
          setCalendarViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
        };
        const handleNextMonth = () => {
          setCalendarViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
        };
        const handleTodayMonth = () => {
          setCalendarViewDate(new Date());
          setAppFilterDate(formatDateLocal(new Date()));
        };

        const activeDayApps = appointments.filter((a: any) => a.appointmentDate.startsWith(appFilterDate));

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%' }} className="animate-fade-in">
            {/* Header section */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 850, margin: 0, color: 'var(--text-primary)' }}>Doctor Daily Schedule</h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>Track patient appointments, consults, and clinical schedules.</p>
              </div>
              {canBookAppointment && (
                <button onClick={openAppCreate} className={`btn ${btnClass}`} style={{ borderRadius: 'var(--radius-sm)', padding: '0.5rem 1.25rem', height: 'fit-content' }}>
                  📅 Schedule Appointment
                </button>
              )}
            </div>

            {/* Calendar Card container */}
            <div className="saas-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', backgroundColor: '#ffffff', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
              
              {/* Navigation Controllers */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {monthNames[month]} {year}
                </span>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button onClick={handlePrevMonth} className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.9rem', borderRadius: '4px' }}>
                    &lt;
                  </button>
                  <button onClick={handleTodayMonth} className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.9rem', borderRadius: '4px', fontWeight: 600 }}>
                    Today
                  </button>
                  <button onClick={handleNextMonth} className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.9rem', borderRadius: '4px' }}>
                    &gt;
                  </button>
                </div>
              </div>

              {/* Weekdays Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', fontWeight: 700, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                <div>SUN</div>
                <div>MON</div>
                <div>TUE</div>
                <div>WED</div>
                <div>THU</div>
                <div>FRI</div>
                <div>SAT</div>
              </div>

              {/* Monthly Days Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '10px', marginTop: '0.5rem' }}>
                {cells.map((cell, idx) => {
                  const dateStr = formatDateLocal(cell.date);
                  const isSelected = appFilterDate === dateStr;
                  const isToday = formatDateLocal(new Date()) === dateStr;
                  
                  // Filter appointments for this date
                  const dayApps = appointments.filter((a: any) => a.appointmentDate.startsWith(dateStr));
                  const hasApps = dayApps.length > 0;
                  
                  // Styling depending on month and status
                  let borderStyle = '1px solid var(--border-color)';
                  let bgStyle = '#ffffff';
                  let opacityStyle = '1';
                  
                  if (!cell.isCurrentMonth) {
                    bgStyle = '#fafafa';
                    borderStyle = '1px solid #f1f5f9';
                    opacityStyle = '0.55';
                  } else if (isSelected) {
                    bgStyle = 'var(--zoho-blue-glow)';
                    borderStyle = `2px solid ${themeColor}`;
                  } else if (isToday) {
                    bgStyle = '#ffffff';
                    borderStyle = `1.5px dashed ${themeColor}`;
                  } else if (hasApps) {
                    bgStyle = '#f5f7ff';
                    borderStyle = '1px solid #e0e7ff';
                  }
                  
                  return (
                    <div
                      key={idx}
                      onClick={() => setAppFilterDate(dateStr)}
                      style={{
                        border: borderStyle,
                        borderRadius: '10px',
                        padding: '0.5rem',
                        backgroundColor: bgStyle,
                        opacity: opacityStyle,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.35rem',
                        height: '115px',
                        position: 'relative',
                        boxShadow: isSelected ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
                        outline: 'none'
                      }}
                    >
                      {/* Day Number */}
                      <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
                        <span
                          style={{
                            width: '24px',
                            height: '24px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '50%',
                            fontSize: '0.85rem',
                            fontWeight: isSelected || isToday ? 700 : 500,
                            backgroundColor: isSelected ? themeColor : 'transparent',
                            color: isSelected ? '#ffffff' : isToday ? themeColor : cell.isCurrentMonth ? 'var(--text-primary)' : 'var(--text-muted)'
                          }}
                        >
                          {cell.date.getDate()}
                        </span>
                      </div>

                      {/* Day Appointments */}
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem', overflow: 'hidden' }}>
                        {dayApps.slice(0, 3).map((a: any) => {
                          const tStr = new Date(a.appointmentDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
                          let statusBg = '#e3f2fd';
                          let textColor = '#1565c0';
                          if (a.status === 'Confirmed') { statusBg = '#e8f5e9'; textColor = '#2e7d32'; }
                          else if (a.status === 'Cancelled') { statusBg = '#ffebee'; textColor = '#c62828'; }
                          else if (a.status === 'Completed') { statusBg = '#eceff1'; textColor = '#455a64'; }
                          
                          return (
                            <div
                              key={a.id}
                              title={`Dr. ${a.doctorName} - ${a.patientName} (${a.status})`}
                              style={{
                                fontSize: '0.65rem',
                                padding: '0.15rem 0.3rem',
                                backgroundColor: statusBg,
                                color: textColor,
                                borderRadius: '4px',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                fontWeight: 700
                              }}
                            >
                              {tStr} - {a.patientName.split(' ')[0]}
                            </div>
                          );
                        })}
                        {dayApps.length > 3 && (
                          <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', fontWeight: 700, paddingLeft: '0.2rem' }}>
                            + {dayApps.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Daily Schedule List Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', marginTop: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  📅 Schedule Details: {new Date(appFilterDate).toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
              </div>
              
              {isAdmin && (
                <div className="role-restriction-banner">
                  🔒 You have <strong>view-only access</strong> to appointments. Scheduling is performed by Doctors, Receptionists, or Nurses.
                </div>
              )}

              <div style={{ overflowX: 'auto', width: '100%' }}>
                <div style={{ minWidth: '900px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {/* Header row */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '90px 1.8fr 1.4fr 1.2fr 110px 1fr 60px',
                    gap: '1rem',
                    padding: '0.75rem 1.25rem',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: 'var(--text-secondary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    <div>Time</div>
                    <div>Patient</div>
                    <div>Doctor</div>
                    <div>Specialization</div>
                    <div>Type</div>
                    <div>Status</div>
                    {canBookAppointment && <div style={{ textAlign: 'center' }}>Action</div>}
                  </div>

                  {activeDayApps.length === 0 ? (
                    <div className="saas-card" style={{ padding: '3rem', textAlign: 'center', backgroundColor: '#ffffff', border: '1px solid var(--border-color)', borderRadius: '10px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>No appointments on this date.</span>
                    </div>
                  ) : (
                    activeDayApps.map((a: any) => {
                      const timeStr = new Date(a.appointmentDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      return (
                        <div
                          key={a.id}
                          className="saas-card animate-fade-in"
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '90px 1.8fr 1.4fr 1.2fr 110px 1fr 60px',
                            gap: '1rem',
                            alignItems: 'center',
                            padding: '1.25rem',
                            backgroundColor: '#ffffff',
                            border: '1px solid var(--border-color)',
                            borderRadius: '10px',
                            boxShadow: 'var(--shadow-sm)',
                            borderLeft: a.status === 'Confirmed' ? '3px solid var(--zoho-green)'
                              : a.status === 'Pending' ? '3px solid var(--zoho-blue)'
                              : a.status === 'Cancelled' ? '3px solid var(--zoho-red)'
                              : '3px solid var(--border-color)'
                          }}
                        >
                          <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.9rem' }}>⏰ {timeStr}</div>
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{a.patientName}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{a.patientCode}</div>
                          </div>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Dr. {a.doctorName}</div>
                          <div><span className="badge badge-info">{a.specialization}</span></div>
                          <div>
                            <span className={`badge ${a.appointmentType === 'WalkIn' ? 'badge-warning' : 'badge-success'}`}>
                              {a.appointmentType === 'WalkIn' ? '🚶 Walk-In' : '📋 Scheduled'}
                            </span>
                          </div>
                          <div>
                            {canBookAppointment ? (
                              <select value={a.status} onChange={e => handleUpdateAppStatus(a.id, e.target.value)}
                                style={{ padding: '0.3rem 0.5rem', border: '1px solid var(--border-color)', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', background: 'var(--bg-secondary)', width: '100%' }}>
                                <option>Pending</option>
                                <option>Confirmed</option>
                                <option>Completed</option>
                                <option>Cancelled</option>
                              </select>
                            ) : statusBadge(a.status)}
                          </div>
                          {canBookAppointment && (
                            <div style={{ display: 'flex', justifyContent: 'center' }}>
                              <button
                                disabled={a.status === 'Completed'}
                                onClick={() => handleUpdateAppStatus(a.id, 'Completed')}
                                style={{
                                  background: a.status === 'Completed' ? '#f1f5f9' : '#dcfce7',
                                  border: '1px solid',
                                  borderColor: a.status === 'Completed' ? '#cbd5e1' : '#86efac',
                                  color: a.status === 'Completed' ? '#94a3b8' : 'var(--zoho-green)',
                                  borderRadius: '6px',
                                  padding: '0.3rem 0.6rem',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  cursor: a.status === 'Completed' ? 'not-allowed' : 'pointer'
                                }}
                              >
                                ✓ Done
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

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
                <label className="form-label">Account Username <span style={{ color: themeColor }}>*</span></label>
                <input type="text" className="form-input reg-modal-input" required value={docForm.userName} onChange={e => setDocForm({ ...docForm, userName: e.target.value })} placeholder="e.g. rajeshkumar" />
              </div>
              <div className="form-group">
                <label className="form-label">Email Address <span style={{ color: themeColor }}>*</span></label>
                <input type="email" className="form-input reg-modal-input" required disabled={!!editingDoctor} value={docForm.email} onChange={e => setDocForm({ ...docForm, email: e.target.value })} placeholder="doctor@clinic.com" />
              </div>
              <div className="form-group">
                <label className="form-label">Full Legal Name <span style={{ color: themeColor }}>*</span></label>
                <input type="text" className="form-input reg-modal-input" required value={docForm.fullLegalName} onChange={e => setDocForm({ ...docForm, fullLegalName: e.target.value })} placeholder="Dr. Rajesh Kumar (As in medical register)" />
              </div>
              <div className="form-group">
                <label className="form-label">Mobile Number <span style={{ color: themeColor }}>*</span></label>
                <input type="text" className="form-input reg-modal-input" required value={docForm.mobileNumber} onChange={e => setDocForm({ ...docForm, mobileNumber: e.target.value })} placeholder="+91 98765 43210 (For communication)" />
              </div>
            </div>
            {!editingDoctor && (
              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label className="form-label">Temporary Password <span style={{ color: themeColor }}>*</span></label>
                <input type="text" className="form-input reg-modal-input" required value={docForm.password} onChange={e => setDocForm({ ...docForm, password: e.target.value })} placeholder="Will be shared in welcome email" />
                {docForm.password && !isPasswordStrong(docForm.password) && (
                  <div style={{ color: 'var(--zoho-red)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                    ⚠️ Must be ≥ 8 chars, with uppercase, lowercase, digit, and special char.
                  </div>
                )}
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
              
              {/* Specialization Checkbox Dropdown */}
              <div className="form-group" style={{ position: 'relative' }}>
                <label className="form-label">Specialization <span style={{ color: themeColor }}>*</span></label>
                <button
                  type="button"
                  onClick={() => setIsSpecDropdownOpen(!isSpecDropdownOpen)}
                  className="form-input reg-modal-input"
                  style={{
                    textAlign: 'left',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer'
                  }}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {docForm.specialization ? docForm.specialization : 'Select Specializations...'}
                  </span>
                  <span>{isSpecDropdownOpen ? '▲' : '▼'}</span>
                </button>
                {isSpecDropdownOpen && (
                  <>
                    <div style={{ position: 'fixed', inset: 0, zIndex: 998 }} onClick={() => setIsSpecDropdownOpen(false)} />
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-sm)',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        zIndex: 999,
                        maxHeight: '200px',
                        overflowY: 'auto',
                        padding: '0.5rem'
                      }}
                    >
                      {defaultSpecializationsList.map(spec => {
                        const currentSpecs = docForm.specialization ? docForm.specialization.split(',').map((x: string) => x.trim()).filter(Boolean) : [];
                        const isChecked = currentSpecs.includes(spec);
                        return (
                          <label
                            key={spec}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              padding: '0.25rem 0.5rem',
                              cursor: 'pointer',
                              borderRadius: '4px',
                              color: 'var(--text-primary)',
                              fontSize: '0.85rem'
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleSpecCheckboxChange(spec)}
                              style={{ cursor: 'pointer' }}
                            />
                            {spec}
                          </label>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              {/* Qualification Checkbox Dropdown */}
              <div className="form-group" style={{ position: 'relative' }}>
                <label className="form-label">Qualification</label>
                <button
                  type="button"
                  onClick={() => setIsQualDropdownOpen(!isQualDropdownOpen)}
                  className="form-input reg-modal-input"
                  style={{
                    textAlign: 'left',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer'
                  }}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {docForm.qualification ? docForm.qualification : 'Select Qualifications...'}
                  </span>
                  <span>{isQualDropdownOpen ? '▲' : '▼'}</span>
                </button>
                {isQualDropdownOpen && (
                  <>
                    <div style={{ position: 'fixed', inset: 0, zIndex: 998 }} onClick={() => setIsQualDropdownOpen(false)} />
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-sm)',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        zIndex: 999,
                        maxHeight: '200px',
                        overflowY: 'auto',
                        padding: '0.5rem'
                      }}
                    >
                      {qualificationsList.map(qual => {
                        const currentQuals = docForm.qualification ? docForm.qualification.split(',').map((x: string) => x.trim()).filter(Boolean) : [];
                        const isChecked = currentQuals.includes(qual);
                        return (
                          <label
                            key={qual}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              padding: '0.25rem 0.5rem',
                              cursor: 'pointer',
                              borderRadius: '4px',
                              color: 'var(--text-primary)',
                              fontSize: '0.85rem'
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleQualCheckboxChange(qual)}
                              style={{ cursor: 'pointer' }}
                            />
                            {qual}
                          </label>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Experience (Years) <span style={{ color: themeColor }}>*</span></label>
                <input type="number" className="form-input reg-modal-input" required min={0} value={docForm.experienceYears} onChange={e => setDocForm({ ...docForm, experienceYears: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input type="text" className="form-input reg-modal-input" value={docForm.phoneNumber} onChange={e => setDocForm({ ...docForm, phoneNumber: e.target.value })} placeholder="+91 98765 43210" />
              </div>
            </div>
          </div>
          <div className="reg-form-section">
            <div className="reg-form-section-label">Medical Registry &amp; Verification Details</div>
            <div className="reg-form-grid-2">
              <div className="form-group">
                <label className="form-label">Medical Registration Number <span style={{ color: themeColor }}>*</span></label>
                <input type="text" className="form-input reg-modal-input" required value={docForm.registrationNumber} onChange={e => setDocForm({ ...docForm, registrationNumber: e.target.value })} placeholder="e.g. NMC/12345/REG" />
              </div>
              <div className="form-group">
                <label className="form-label">Medical Council (Registration Authority) <span style={{ color: themeColor }}>*</span></label>
                <select className="form-input reg-modal-input" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', cursor: 'pointer' }} required value={docForm.medicalCouncil} onChange={e => setDocForm({ ...docForm, medicalCouncil: e.target.value })}>
                  <option value="State Medical Council">State Medical Council</option>
                  <option value="National Medical Commission">National Medical Commission (NMC)</option>
                  <option value="Dental Council of India">Dental Council of India (DCI)</option>
                  <option value="Indian Nursing Council">Indian Nursing Council (INC)</option>
                  <option value="Rehabilitation Council of India">Rehabilitation Council of India (RCI)</option>
                  <option value="Others">Others</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Registration Certificate Evidence</label>
                <input type="text" className="form-input reg-modal-input" value={docForm.registrationCertificate} onChange={e => setDocForm({ ...docForm, registrationCertificate: e.target.value })} placeholder="e.g. cert_rajesh.pdf or Ref ID" />
              </div>
              {editingDoctor && (
                <div className="form-group">
                  <label className="form-label">Credential Verification Status <span style={{ color: themeColor }}>*</span></label>
                  <select className="form-input reg-modal-input" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', cursor: 'pointer' }} required value={docForm.verificationStatus} onChange={e => setDocForm({ ...docForm, verificationStatus: e.target.value })}>
                    <option value="Pending">🕒 Pending</option>
                    <option value="Approved">💚 Approved (Verified)</option>
                    <option value="Rejected">❤️ Rejected</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {doctorFields.length > 0 && (
            <div className="reg-form-section">
              <div className="reg-form-section-label">Additional Information (Custom Fields)</div>
              <div className="reg-form-grid-2">
                {doctorFields.map((f: any) => (
                  <div className="form-group" key={f.id}>
                    <label className="form-label">
                      {f.fieldName} {f.isRequired && <span style={{ color: themeColor }}>*</span>}
                    </label>
                    <input
                      type={f.fieldType === 'Number' ? 'number' : f.fieldType === 'Date' ? 'date' : 'text'}
                      className="form-input reg-modal-input"
                      required={f.isRequired}
                      value={docForm.customFields?.[f.fieldName] || ''}
                      onChange={(e) => {
                        const copy = { ...docForm.customFields };
                        copy[f.fieldName] = e.target.value;
                        setDocForm({ ...docForm, customFields: copy });
                      }}
                      placeholder={`Enter ${f.fieldName.toLowerCase()}`}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
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
                <label className="form-label">Email Address</label>
                <input type="email" className="form-input reg-modal-input" disabled={!!editingStaff} value={staffForm.email || ''} onChange={e => setStaffForm({ ...staffForm, email: e.target.value })} placeholder="staff@clinic.com (Optional)" />
              </div>
            </div>
            {!editingStaff && (
              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label className="form-label">Temporary Password <span style={{ color: themeColor }}>*</span></label>
                <input type="text" className="form-input reg-modal-input" required value={staffForm.password} onChange={e => setStaffForm({ ...staffForm, password: e.target.value })} placeholder="Will be shared in welcome email" />
                {staffForm.password && !isPasswordStrong(staffForm.password) && (
                  <div style={{ color: 'var(--zoho-red)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                    ⚠️ Must be ≥ 8 chars, with uppercase, lowercase, digit, and special char.
                  </div>
                )}
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
                <select
                  className="form-input reg-modal-input"
                  style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', cursor: 'pointer' }}
                  value={staffForm.department && !["Outpatient (OPD)", "Inpatient (IPD)", "Emergency & Trauma", "Pediatrics", "Cardiology", "Intensive Care (ICU)", "Billing & Admin"].includes(staffForm.department) ? "Others" : staffForm.department || ''}
                  onChange={e => {
                    const val = e.target.value;
                    if (val === "Others") setStaffForm({ ...staffForm, department: "Custom Dept" });
                    else setStaffForm({ ...staffForm, department: val });
                  }}
                >
                  <option value="">Select Department...</option>
                  <option value="Outpatient (OPD)">Outpatient (OPD)</option>
                  <option value="Inpatient (IPD)">Inpatient (IPD)</option>
                  <option value="Emergency & Trauma">Emergency &amp; Trauma</option>
                  <option value="Pediatrics">Pediatrics</option>
                  <option value="Cardiology">Cardiology</option>
                  <option value="Intensive Care (ICU)">Intensive Care (ICU)</option>
                  <option value="Billing & Admin">Billing &amp; Admin</option>
                  <option value="Others">Others (Custom)</option>
                </select>
                {staffForm.department && !["Outpatient (OPD)", "Inpatient (IPD)", "Emergency & Trauma", "Pediatrics", "Cardiology", "Intensive Care (ICU)", "Billing & Admin"].includes(staffForm.department) && (
                  <input
                    type="text"
                    className="form-input reg-modal-input"
                    style={{ marginTop: '0.5rem' }}
                    required
                    value={staffForm.department === "Others" || staffForm.department === "Custom Dept" ? "" : staffForm.department}
                    onChange={e => setStaffForm({ ...staffForm, department: e.target.value })}
                    placeholder="Enter custom department name"
                  />
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input type="text" className="form-input reg-modal-input" value={staffForm.phoneNumber} onChange={e => setStaffForm({ ...staffForm, phoneNumber: e.target.value })} placeholder="+91 98765 43210" />
              </div>
              <div className="form-group">
                <label className="form-label">Assigned Doctor (Optional)</label>
                <select
                  className="form-input reg-modal-input"
                  style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', cursor: 'pointer' }}
                  value={staffForm.doctorId || ''}
                  onChange={e => setStaffForm({ ...staffForm, doctorId: e.target.value ? Number(e.target.value) : '' })}
                >
                  <option value="">None (All Doctors)</option>
                  {doctors.map((d: any) => (
                    <option key={d.id} value={d.id}>
                      Dr. {d.userName} ({d.specialization})
                    </option>
                  ))}
                </select>
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
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '0.25rem', marginTop: '0.5rem', alignItems: 'center' }}>
              <span>⚠️</span>
              <span>Double-booking validation is active. Scheduling conflicts for the same doctor at the same time will be prevented.</span>
            </div>
            <div className="form-group" style={{ marginTop: '1rem' }}>
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

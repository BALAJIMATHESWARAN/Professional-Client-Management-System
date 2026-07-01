import { useState, useEffect } from 'react';
import { Login } from './components/Login';
import { TenantSelector } from './components/TenantSelector';
import { SuperAdminDashboard } from './components/SuperAdminDashboard';
import { UserDashboard } from './components/UserDashboard';
import { ResetPassword } from './components/ResetPassword';
import { api, getStoredUser, getStoredToken, setStoredUser } from './api';
import type { LoginResponse, TenantInfo } from './api';
import logoImg from './assets/logo.png';
import { applyThemePattern } from './themeUtils';

type ViewState = 'login' | 'tenant-selector' | 'super-admin-dashboard' | 'user-dashboard' | 'reset-password';

interface AppUser {
  userId: number;
  userName: string;
  isSuperAdmin: boolean;
  selectedTenantId: number | null;
  role?: string;
  availableTenants?: TenantInfo[];
}

function App() {
  const [view, setView] = useState<ViewState>('login');
  const [user, setUser] = useState<AppUser | null>(null);
  const [resetEmail, setResetEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  const [transitionMessage, setTransitionMessage] = useState<string>('');
  const [transitionDuration, setTransitionDuration] = useState<number>(1000);

  // Apply theme pattern on load
  useEffect(() => {
    const storedPattern = localStorage.getItem('pcms_theme_pattern') || 'classic';
    applyThemePattern(storedPattern as any);
  }, []);

  // Use transitionMessage to avoid TypeScript unused compiler error
  useEffect(() => {
    if (transitionMessage) {
      console.log('Transition status:', transitionMessage);
    }
  }, [transitionMessage]);

  // Restore session on mount
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const tokenParam = searchParams.get('token');
    const emailParam = searchParams.get('email');

    if (tokenParam && emailParam) {
      setResetToken(tokenParam);
      setResetEmail(emailParam);
      setView('reset-password');
      return;
    }

    const storedUser = getStoredUser();
    const token = getStoredToken();

    if (storedUser && token) {
      setUser(storedUser);
      if (storedUser.isSuperAdmin) {
        setView('super-admin-dashboard');
      } else if (storedUser.selectedTenantId) {
        setView('user-dashboard');
      } else if (storedUser.availableTenants && storedUser.availableTenants.length > 0) {
        setView('tenant-selector');
      } else {
        api.logout();
        setUser(null);
        setView('login');
      }
    } else {
      setView('login');
    }
  }, []);

  const handleLoginSuccess = (res: LoginResponse) => {
    if (res.needsPasswordReset && res.resetToken && res.email) {
      setResetToken(res.resetToken);
      setResetEmail(res.email);
      setView('reset-password');
      return;
    }

    setIsTransitioning(true);
    setTransitionDuration(1200);
    setTransitionMessage('Securing Session & Initializing Workspace...');

    setTimeout(() => {
      if (res.isSuperAdmin) {
        const newUser = {
          userId: res.userId,
          userName: res.userName,
          isSuperAdmin: true,
          selectedTenantId: null,
        };
        setUser(newUser);
        setView('super-admin-dashboard');
        setIsTransitioning(false);
      } else {
        const userTenants = res.tenants || [];

        if (userTenants.length === 0) {
          alert('Your account is not assigned to any tenants. Please contact your system administrator.');
          api.logout();
          setView('login');
          setIsTransitioning(false);
          return;
        }

        if (userTenants.length === 1) {
          const singleTenant = userTenants[0];
          api.selectTenant(res.userId, singleTenant.tenantId)
            .then(() => {
              const newUser = {
                userId: res.userId,
                userName: res.userName,
                isSuperAdmin: false,
                selectedTenantId: singleTenant.tenantId,
                role: singleTenant.role,
                availableTenants: userTenants
              };
              setUser(newUser);
              
              // Persist selection contexts in localStorage
              const storedUser = getStoredUser();
              if (storedUser) {
                storedUser.selectedTenantId = singleTenant.tenantId;
                storedUser.role = singleTenant.role;
                storedUser.availableTenants = userTenants;
                setStoredUser(storedUser);
              }
              
              setView('user-dashboard');
            })
            .catch((err) => {
              alert('Failed to initialize tenant workspace: ' + err.message);
              api.logout();
              setView('login');
            })
            .finally(() => {
              setIsTransitioning(false);
            });
        } else {
          const newUser = {
            userId: res.userId,
            userName: res.userName,
            isSuperAdmin: false,
            selectedTenantId: null,
            availableTenants: userTenants
          };
          setUser(newUser);
          setView('tenant-selector');
          setIsTransitioning(false);
        }
      }
    }, transitionDuration);
  };

  const handleTenantSelected = (tenantId: number, _token: string) => {
    if (!user || !user.availableTenants) return;

    const selectedTenant = user.availableTenants.find(t => t.tenantId === tenantId);
    if (!selectedTenant) return;

    setIsTransitioning(true);
    setTransitionDuration(1000);
    setTransitionMessage(`Loading Workspace for ${selectedTenant.tenantName}...`);

    setTimeout(() => {
      const updatedUser = {
        ...user,
        selectedTenantId: tenantId,
        role: selectedTenant.role
      };
      setUser(updatedUser);

      // Persist selection contexts in localStorage
      const storedUser = getStoredUser();
      if (storedUser) {
        storedUser.selectedTenantId = tenantId;
        storedUser.role = selectedTenant.role;
        storedUser.availableTenants = user.availableTenants;
        setStoredUser(storedUser);
      }

      setView('user-dashboard');
      setIsTransitioning(false);
    }, transitionDuration);
  };

  const handleLogout = () => {
    setIsTransitioning(true);
    setTransitionDuration(1000);
    setTransitionMessage('Closing secure session...');
    setTimeout(() => {
      api.logout();
      setUser(null);
      setView('login');
      setIsTransitioning(false);
    }, transitionDuration);
  };

  const handleClearResetAndGoToLogin = () => {
    window.history.replaceState({}, document.title, window.location.pathname);
    setResetEmail('');
    setResetToken('');
    setView('login');
  };

  const handleSwitchWorkspace = () => {
    setIsTransitioning(true);
    setTransitionDuration(1000);
    setTransitionMessage('Returning to Workspace Selection...');
    setTimeout(() => {
      if (user && !user.isSuperAdmin && user.availableTenants && user.availableTenants.length > 1) {
        const updatedUser = {
          ...user,
          selectedTenantId: null,
          role: undefined
        };
        setUser(updatedUser);
        setView('tenant-selector');
      } else {
        api.logout();
        setUser(null);
        setView('login');
      }
      setIsTransitioning(false);
    }, transitionDuration);
  };

  return (
    <>
      {view === 'login' && (
        <Login
          onLoginStart={() => {
            setIsTransitioning(true);
            setTransitionMessage('Authenticating...');
          }}
          onLoginSuccess={handleLoginSuccess}
          onLoginFailure={() => {
            setIsTransitioning(false);
          }}
        />
      )}

      {view === 'reset-password' && (
        <ResetPassword
          email={resetEmail}
          token={resetToken}
          onGoToLogin={handleClearResetAndGoToLogin}
        />
      )}

      {view === 'tenant-selector' && user && user.availableTenants && (
        <TenantSelector
          userId={user.userId}
          userName={user.userName}
          tenants={user.availableTenants}
          onTenantSelected={handleTenantSelected}
          onLogout={handleLogout}
        />
      )}

      {view === 'super-admin-dashboard' && user && (
        <SuperAdminDashboard
          userName={user.userName}
          onLogout={handleLogout}
        />
      )}

      {view === 'user-dashboard' && user && user.selectedTenantId && user.role && (
        <UserDashboard
          userId={user.userId}
          userName={user.userName}
          tenantId={user.selectedTenantId}
          role={user.role}
          onLogout={handleLogout}
          onSwitchWorkspace={handleSwitchWorkspace}
        />
      )}

      {isTransitioning && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(8px)',
          zIndex: 99999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          animation: 'fadeInApp 0.3s ease-out'
        }}>
          <style>{`
            @keyframes fadeInApp {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes orbitRotation {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            @keyframes counterRotation {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(-360deg); }
            }
            @keyframes pulseCore {
              0%, 100% { transform: scale(1); box-shadow: 0 0 30px rgba(255, 255, 255, 0.1); }
              50% { transform: scale(1.05); box-shadow: 0 0 45px rgba(88, 166, 255, 0.25); }
            }
          `}</style>

          <div style={{ position: 'relative', width: '180px', height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {/* Dashed Orbital Path */}
            <div style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              border: '2px dashed rgba(255, 255, 255, 0.12)',
              animation: 'orbitRotation 8s linear infinite'
            }}>
              {/* Doctor Bubble (Stethoscope) */}
              <div style={{
                position: 'absolute',
                top: '-20px',
                left: 'calc(50% - 20px)',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: '#E42527',
                boxShadow: '0 0 15px rgba(228, 37, 39, 0.6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                animation: 'counterRotation 8s linear infinite'
              }} title="Medical Console">
                <svg style={{ width: '20px', height: '20px' }} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4.8 2.3A2.3 2.3 0 0 0 2.5 4.6v4.5A4.7 4.7 0 0 0 7.2 13.8h9.6a4.7 4.7 0 0 0 4.7-4.7V4.6a2.3 2.3 0 0 0-2.3-2.3" />
                  <path d="M12 13.8v4.5a3.7 3.7 0 0 0 3.7 3.7H17" />
                  <circle cx="19" cy="22" r="2" />
                </svg>
              </div>

              {/* Advocate Bubble (Balance Scales) */}
              <div style={{
                position: 'absolute',
                bottom: '10px',
                left: '-15px',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: '#226DB4',
                boxShadow: '0 0 15px rgba(34, 109, 180, 0.6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                animation: 'counterRotation 8s linear infinite'
              }} title="Legal Console">
                <svg style={{ width: '20px', height: '20px' }} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="2" x2="12" y2="22" />
                  <line x1="5" y1="7" x2="19" y2="7" />
                  <path d="M5 7L2 15h6L5 7zM19 7l-3 15h6l-3-15z" />
                </svg>
              </div>

              {/* Accountant Bubble (Calculator) */}
              <div style={{
                position: 'absolute',
                bottom: '10px',
                right: '-15px',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: '#089949',
                boxShadow: '0 0 15px rgba(8, 153, 73, 0.6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                animation: 'counterRotation 8s linear infinite'
              }} title="Finance Console">
                <svg style={{ width: '20px', height: '20px' }} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
                  <line x1="9" y1="22" x2="9" y2="16" />
                  <line x1="8" y1="6" x2="16" y2="6" />
                  <line x1="16" y1="16" x2="16" y2="22" />
                  <line x1="8" y1="10" x2="16" y2="10" />
                  <line x1="8" y1="14" x2="16" y2="14" />
                </svg>
              </div>
            </div>

            {/* Central Glow Core with Logo */}
            <div style={{
              width: '85px',
              height: '85px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: '2px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 0 30px rgba(255, 255, 255, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'pulseCore 2s ease-in-out infinite',
              zIndex: 3
            }}>
              <img src={logoImg} alt="PCMS Logo" style={{ width: '65px', height: '65px', borderRadius: '50%', objectFit: 'cover' }} />
            </div>
          </div>

        </div>
      )}
    </>
  );
}

export default App;

import React, { useState } from 'react';
import { api } from '../api';
import type { TenantInfo } from '../api';

interface TenantSelectorProps {
  userId: number;
  userName: string;
  tenants: TenantInfo[];
  onTenantSelected: (tenantId: number, token: string) => void;
  onLogout: () => void;
}

export const TenantSelector: React.FC<TenantSelectorProps> = ({
  userId,
  userName,
  tenants,
  onTenantSelected,
  onLogout,
}) => {
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSelect = async (tenantId: number) => {
    setLoadingId(tenantId);
    setError(null);
    try {
      const response = await api.selectTenant(userId, tenantId);
      onTenantSelected(tenantId, response.token);
    } catch (err: any) {
      setError(err.message || 'Failed to select tenant. Please try again.');
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div style={{
      maxWidth: '900px',
      margin: '0 auto',
      padding: '5rem 2rem',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '3rem',
        borderBottom: '1px solid var(--border-color)',
        paddingBottom: '1.5rem'
      }}>
        <div>
          <span style={{
            fontSize: '0.8rem',
            color: 'var(--zoho-blue)',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.1em'
          }}>Logged in as {userName}</span>
          <h1 style={{ marginTop: '0.4rem', fontSize: '2.1rem', fontWeight: 800 }}>Select Workspace Portal</h1>
        </div>
        <button className="btn btn-secondary" onClick={onLogout} style={{ height: '42px', borderRadius: 'var(--radius-sm)' }}>
          <svg style={{ width: '16px', height: '16px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Logout
        </button>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: '2rem' }}>
          <svg style={{ width: '18px', height: '18px', flexShrink: 0 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span style={{ fontWeight: 500 }}>{error}</span>
        </div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))',
        gap: '1.75rem'
      }}>
        {tenants.map((t, index) => {
          const isLoading = loadingId === t.tenantId;
          const zohoColors = [
            { borderClass: 'border-left-zoho-red', badgeClass: 'badge-error', color: 'var(--zoho-red)', glow: 'var(--zoho-red-glow)' },
            { borderClass: 'border-left-zoho-green', badgeClass: 'badge-success', color: 'var(--zoho-green)', glow: 'var(--zoho-green-glow)' },
            { borderClass: 'border-left-zoho-blue', badgeClass: 'badge-blue', color: 'var(--zoho-blue)', glow: 'var(--zoho-blue-glow)' },
            { borderClass: 'border-left-zoho-yellow', badgeClass: 'badge-warning', color: 'var(--zoho-yellow-hover)', glow: 'var(--zoho-yellow-glow)' }
          ];
          const theme = zohoColors[index % 4];
          return (
            <div
              key={t.tenantId}
              className={`saas-card-premium animate-fade-in ${theme.borderClass}`}
              onClick={() => !isLoading && handleSelect(t.tenantId)}
              style={{
                cursor: isLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                height: '190px',
                position: 'relative',
                overflow: 'hidden',
                padding: '1.75rem'
              }}
            >
              <div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '1.25rem'
                }}>
                  {/* Avatar / Initials */}
                  <div style={{
                    width: '42px',
                    height: '42px',
                    background: theme.glow,
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '1.15rem',
                    color: theme.color,
                    border: `1px solid ${theme.color}40`
                  }}>
                    {t.tenantName.substring(0, 2).toUpperCase()}
                  </div>
                  
                  {/* Role Badge */}
                  <span className={`badge ${theme.badgeClass}`}>
                    {t.role}
                  </span>
                </div>

                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>{t.tenantName}</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Click to access console</p>
              </div>

              {isLoading && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(245, 248, 250, 0.85)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backdropFilter: 'blur(3px)'
                }}>
                  <div className="spinner" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api';

interface ResetPasswordProps {
  email: string;
  token: string;
  onGoToLogin: () => void;
}

export const ResetPassword: React.FC<ResetPasswordProps> = ({
  email,
  token,
  onGoToLogin,
}) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);

  // Dynamic Password Checks
  const isLengthValid = password.length >= 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[^a-zA-Z\d]/.test(password);
  const isConfirmMatching = password === confirmPassword && confirmPassword.length > 0;
  const isFormInvalid = !isLengthValid || !hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecial || !isConfirmMatching;

  // Ref for the live wallpaper interactive canvas
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    class Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      color: string;

      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = (Math.random() - 0.5) * 0.35;
        this.vy = (Math.random() - 0.5) * 0.35;
        this.radius = Math.random() * 2 + 1;
        const colors = [
          'rgba(228, 37, 39, 0.35)',  // Zoho Red glow
          'rgba(34, 109, 180, 0.35)', // Zoho Blue glow
          'rgba(8, 153, 73, 0.35)',   // Zoho Green glow
          'rgba(249, 178, 29, 0.35)'  // Zoho Yellow glow
        ];
        this.color = colors[Math.floor(Math.random() * colors.length)];
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;

        // Wrap around boundary margins
        if (this.x < 0 || this.x > width) this.vx *= -1;
        if (this.y < 0 || this.y > height) this.vy *= -1;
      }

      draw() {
        if (!ctx) return;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 8;
        ctx.shadowColor = this.color;
        ctx.fill();
        ctx.shadowBlur = 0; // reset shadow
      }
    }

    class Nebula {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      color: string;

      constructor(color: string, radius: number) {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = (Math.random() - 0.5) * 0.15;
        this.vy = (Math.random() - 0.5) * 0.15;
        this.radius = radius;
        this.color = color;
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;

        if (this.x - this.radius < -this.radius || this.x + this.radius > width + this.radius) this.vx *= -1;
        if (this.y - this.radius < -this.radius || this.y + this.radius > height + this.radius) this.vy *= -1;
      }

      draw() {
        if (!ctx) return;
        const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius);
        grad.addColorStop(0, this.color);
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      }
    }

    const particles: Particle[] = [];
    const particleCount = Math.min(80, Math.floor((width * height) / 18000));
    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle());
    }

    const nebulas = [
      new Nebula('rgba(228, 37, 39, 0.11)', Math.min(width, height) * 0.5),
      new Nebula('rgba(34, 109, 180, 0.13)', Math.min(width, height) * 0.6),
      new Nebula('rgba(8, 153, 73, 0.08)', Math.min(width, height) * 0.45)
    ];

    let mouse = { x: -1000, y: -1000 };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    const handleMouseLeave = () => {
      mouse.x = -1000;
      mouse.y = -1000;
    };

    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw nebulas (aurora atmosphere background)
      nebulas.forEach((n) => {
        n.update();
        n.draw();
      });

      // Draw interactive particle constellations
      particles.forEach((p, index) => {
        p.update();
        p.draw();

        // Connect adjacent dots
        for (let j = index + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dist = Math.hypot(p.x - p2.x, p.y - p2.y);
          if (dist < 100) {
            const alpha = (1 - dist / 100) * 0.15;
            ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }

        // React and connect to user cursor
        const mouseDist = Math.hypot(p.x - mouse.x, p.y - mouse.y);
        if (mouseDist < 150) {
          const alpha = (1 - mouseDist / 150) * 0.25;
          ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.stroke();
        }
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!password) {
      setError('Please enter a new password.');
      return;
    }

    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d]).{8,}$/;
    if (!strongPasswordRegex.test(password)) {
      setError('Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character/symbol.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);

    try {
      const res = await api.resetPassword(email, token, password);
      setSuccess(res.message || 'Your password has been successfully reset. Redirecting to login...');
      setPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        onGoToLogin();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. Please check your reset link or try requesting a new one.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page-bg">
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }} />
      <div className="noise-overlay" />

      {/* Left — transparent branding overlay on the wallpaper characters */}
      <div className="login-left-brand">
        <div className="login-left-brand-inner">
          <div className="login-brand-badge">PCMS PLATFORM</div>
          <h2 className="login-brand-heading">Professional Client<br />Management System</h2>
          <p className="login-brand-sub">One unified platform for Doctors, Advocates &amp; Accountants to manage their clients with intelligence.</p>
          <div className="login-brand-modules">
            <div className="login-brand-module">
              <span className="login-brand-module-dot" style={{ background: 'var(--zoho-red)' }} />
              <span>Doctors</span>
            </div>
            <div className="login-brand-module">
              <span className="login-brand-module-dot" style={{ background: 'var(--zoho-blue)' }} />
              <span>Advocates</span>
            </div>
            <div className="login-brand-module">
              <span className="login-brand-module-dot" style={{ background: 'var(--zoho-green)' }} />
              <span>Accountants</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right — 3D glassmorphic panel */}
      <div className="login-right-panel">
        <div className="login-glass-card animate-fade-in">
          <div className="login-shield-wrap">
            <div className="login-forgot-icon">
              <svg style={{ width: '30px', height: '30px' }} viewBox="0 0 24 24" fill="none" stroke="#58a6ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 9.9-1" />
              </svg>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <h1 className="login-card-title">Reset Password</h1>
            <p className="login-card-sub">Choose a strong password to secure your account</p>
          </div>

          {error && (
            <div className="alert alert-error">
              <svg style={{ width: '16px', height: '16px', flexShrink: 0 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {success ? (
            <div style={{ textAlign: 'center' }}>
              <div className="alert alert-success" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                <svg style={{ width: '18px', height: '18px', flexShrink: 0 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <span>{success}</span>
              </div>
              <button
                onClick={onGoToLogin}
                className="btn login-btn-secondary-3d"
                style={{ width: '100%', height: '44px' }}
              >
                Return to Login Screen
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {/* Email Address Display */}
              <div className="form-group login-input-group">
                <label className="form-label">Account Email</label>
                <input
                  type="email"
                  className="form-input login-input-3d"
                  value={email}
                  disabled
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.04)',
                    cursor: 'not-allowed',
                    color: 'rgba(255, 255, 255, 0.45)',
                    border: '1.5px solid rgba(255, 255, 255, 0.08)'
                  }}
                />
              </div>

              {/* New Password */}
              <div className="form-group login-input-group" style={{ position: 'relative' }}>
                <label className="form-label">New Password</label>
                <div style={{ position: 'relative', marginTop: '0.25rem' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="At least 8 characters"
                    className="form-input login-input-3d"
                    style={{ width: '100%', paddingRight: '2.75rem' }}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setIsPasswordFocused(true)}
                    onBlur={() => setIsPasswordFocused(false)}
                    required
                    disabled={submitting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="show-password-btn"
                  >
                    {showPassword ? (
                      <svg style={{ width: '17px', height: '17px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg style={{ width: '17px', height: '17px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
                {isPasswordFocused && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    zIndex: 100,
                    fontSize: '0.78rem',
                    color: '#94a3b8',
                    padding: '0.6rem 0.75rem',
                    background: 'rgba(23, 23, 37, 0.98)',
                    backdropFilter: 'blur(12px)',
                    border: '1.5px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.35rem',
                    marginTop: '0.45rem',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.6), 0 8px 10px -6px rgba(0, 0, 0, 0.6)'
                  }}>
                    <div style={{ fontWeight: 600, color: '#ffffff', marginBottom: '0.15rem' }}>Password Requirements:</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: isLengthValid ? '#10b981' : '#64748b' }}>
                      <span>{isLengthValid ? '✓' : '•'}</span> <span>At least 8 characters ({password.length}/8)</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: hasUpperCase ? '#10b981' : '#64748b' }}>
                      <span>{hasUpperCase ? '✓' : '•'}</span> <span>At least one uppercase letter (A-Z)</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: hasLowerCase ? '#10b981' : '#64748b' }}>
                      <span>{hasLowerCase ? '✓' : '•'}</span> <span>At least one lowercase letter (a-z)</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: hasNumber ? '#10b981' : '#64748b' }}>
                      <span>{hasNumber ? '✓' : '•'}</span> <span>At least one number (0-9)</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: hasSpecial ? '#10b981' : '#64748b' }}>
                      <span>{hasSpecial ? '✓' : '•'}</span> <span>At least one special symbol</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div className="form-group login-input-group" style={{ marginBottom: '1.75rem' }}>
                <label className="form-label">Confirm New Password</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Confirm password"
                  className="form-input login-input-3d"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={submitting}
                />
                {confirmPassword && (
                  <div style={{ fontSize: '0.78rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.35rem' }}>
                    {isConfirmMatching ? (
                      <div style={{ color: '#10b981' }}>✓ Passwords match</div>
                    ) : (
                      <div style={{ color: 'var(--zoho-red)' }}>✗ Passwords do not match</div>
                    )}
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="btn login-btn-3d"
                style={{ width: '100%', marginBottom: '1.25rem', height: '48px' }}
                disabled={submitting || isFormInvalid}
              >
                {submitting ? (
                  <>
                    <div className="spinner" style={{ borderTopColor: '#ffffff' }} />
                    UPDATING PASSWORD...
                  </>
                ) : 'CONFIRM PASSWORD RESET'}
              </button>

              <div style={{ textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={onGoToLogin}
                  className="btn login-btn-secondary-3d"
                  style={{
                    width: '100%',
                    height: '40px'
                  }}
                >
                  Back to Login
                </button>
              </div>

            </form>
          )}

          <p className="login-card-footer">Secured by PCMS Enterprise &bull; v2.0</p>
        </div>
      </div>
    </div>
  );
};

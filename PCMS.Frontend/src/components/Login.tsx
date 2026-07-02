import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import type { LoginResponse } from '../api';
import logoImg from '../assets/logo.png';

interface LoginProps {
  onLoginStart?: () => void;
  onLoginSuccess: (response: LoginResponse) => void;
  onLoginFailure?: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess, onLoginStart, onLoginFailure }) => {
  const [activeForm, setActiveForm] = useState<'login' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Forgot password state
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);

  // OTP Reset password state
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);


  // Dynamic Email Missing Feedback Logic
  const getEmailMissingFeedback = (emailVal: string) => {
    if (!emailVal) return null;
    const trimmed = emailVal.trim();
    if (!trimmed.includes('@')) {
      return { status: 'error', message: "Missing '@' symbol" };
    }
    const parts = trimmed.split('@');
    if (parts.length > 2) {
      return { status: 'error', message: "Invalid email (multiple '@' symbols)" };
    }
    const domain = parts[1];
    if (!domain) {
      return { status: 'error', message: "Missing domain (e.g. domain.com)" };
    }
    if (!domain.includes('.')) {
      return { status: 'error', message: "Missing dot in domain (e.g. .com)" };
    }
    const domainParts = domain.split('.');
    if (domainParts[domainParts.length - 1].length < 2) {
      return { status: 'error', message: "Domain suffix too short" };
    }
    
    // Disposable domain check
    const disposableDomains = [
      'mailinator.com', 'yopmail.com', 'tempmail.com', 'temp-mail.org', '10minutemail.com',
      'guerrillamail.com', 'sharklasers.com', 'dispostable.com', 'getairmail.com', 'burnermail.io',
      'fakeinbox.com', 'trashmail.com', 'maildrop.cc', 'maildrop.org', 'tempmailaddress.com',
      'throwawaymail.com', 'mailnesia.com', 'mailcatch.com', 'mytemp.email'
    ];
    if (disposableDomains.includes(domain.toLowerCase())) {
      return { status: 'error', message: "Disposable/temporary emails are not allowed" };
    }
    
    return { status: 'success', message: "Email format is valid" };
  };

  const loginEmailFeedback = getEmailMissingFeedback(email);
  const forgotEmailFeedback = getEmailMissingFeedback(forgotEmail);

  // OTP password complexity checks
  const isLengthValid = newPassword.length >= 8;
  const hasUpperCase = /[A-Z]/.test(newPassword);
  const hasLowerCase = /[a-z]/.test(newPassword);
  const hasNumber = /\d/.test(newPassword);
  const hasSpecial = /[^a-zA-Z\d]/.test(newPassword);
  const isConfirmMatching = newPassword === confirmNewPassword && confirmNewPassword.length > 0;
  const isFormInvalid = !isLengthValid || !hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecial || !isConfirmMatching || otp.trim().length !== 6;


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
          'rgba(250, 204, 21, 0.5)',   // Altezza Yellow
          'rgba(34, 197, 94, 0.4)',    // Altezza Green
          'rgba(251, 191, 36, 0.4)',   // Warm amber
          'rgba(163, 230, 53, 0.35)'   // Lime accent
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
      new Nebula('rgba(250, 204, 21, 0.1)', Math.min(width, height) * 0.5),
      new Nebula('rgba(34, 197, 94, 0.09)', Math.min(width, height) * 0.6),
      new Nebula('rgba(251, 191, 36, 0.07)', Math.min(width, height) * 0.45)
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
      // Clear screen
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

      // Interactive 3D floating parallax and bobbing for the SaaS assets
      const time = Date.now() * 0.001;
      const mouseParallaxX = (mouse.x !== -1000 ? (mouse.x - width / 2) * 0.04 : 0);
      const mouseParallaxY = (mouse.y !== -1000 ? (mouse.y - height / 2) * 0.04 : 0);

      const docEl = document.querySelector('.floating-asset-doc') as HTMLElement;
      const advEl = document.querySelector('.floating-asset-adv') as HTMLElement;
      const accEl = document.querySelector('.floating-asset-acc') as HTMLElement;

      if (docEl) {
        const bobY = Math.sin(time * 0.7) * 20;
        const bobX = Math.cos(time * 0.5) * 15;
        docEl.style.transform = `translate(${mouseParallaxX * 1.4 + bobX}px, ${mouseParallaxY * 1.4 + bobY}px) rotate(${Math.sin(time * 0.3) * 5}deg)`;
      }
      if (advEl) {
        const bobY = Math.cos(time * 0.6) * 18;
        const bobX = Math.sin(time * 0.8) * 12;
        advEl.style.transform = `translate(${mouseParallaxX * -1.2 + bobX}px, ${mouseParallaxY * -1.2 + bobY}px) rotate(${Math.cos(time * 0.4) * 6}deg)`;
      }
      if (accEl) {
        const bobY = Math.sin(time * 0.8) * 25;
        const bobX = Math.cos(time * 0.7) * 18;
        accEl.style.transform = `translate(${mouseParallaxX * 1.8 + bobX}px, ${mouseParallaxY * 1.8 + bobY}px) rotate(${Math.sin(time * 0.5) * -4}deg)`;
      }

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
    if (!email || !password) {
      setError('Please enter both your email address and password.');
      return;
    }

    setLoading(true);
    setError(null);
    onLoginStart?.();

    try {
      const response = await api.login(email, password);
      onLoginSuccess(response);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify your credentials.');
      onLoginFailure?.();
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    if (!forgotEmail) {
      setForgotError('Please enter your email address.');
      return;
    }

    setForgotLoading(true);
    setForgotError(null);
    setForgotSuccess(null);

    try {
      const res = await api.forgotPassword(forgotEmail);
      setForgotSuccess(res.message || 'Verification OTP sent to your email. Please enter it below.');
      setOtpSent(true);
    } catch (err: any) {
      setForgotError(err.message || 'We could not find that email address in our system.');
      setOtpSent(false);
    } finally {
      setForgotLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp) {
      setForgotError('Please enter the 6-digit OTP code.');
      return;
    }

    setForgotLoading(true);
    setForgotError(null);
    setForgotSuccess(null);

    try {
      const res = await api.verifyOtp(forgotEmail, otp);
      setForgotSuccess(res.message || 'OTP verified successfully! Please enter your new password.');
      setOtpVerified(true);
    } catch (err: any) {
      setForgotError(err.message || 'Invalid OTP code. Please check and try again.');
      setOtpVerified(false);
    } finally {
      setForgotLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || !newPassword) {
      setForgotError('Please fill out all fields.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setForgotError('Passwords do not match.');
      return;
    }

    setForgotLoading(true);
    setForgotError(null);
    setForgotSuccess(null);

    try {
      const res = await api.verifyOtpResetPassword(forgotEmail, otp, newPassword);
      setForgotSuccess(res.message || 'Password reset successfully! Redirecting...');
      
      // Clear fields
      setOtp('');
      setNewPassword('');
      setConfirmNewPassword('');
      setForgotEmail('');
      setOtpSent(false);
      setOtpVerified(false);

      setTimeout(() => {
        setActiveForm('login');
        setSuccessMessage('Password reset successfully! You can now log in.');
        setForgotSuccess(null);
        // Automatically hide success notification after 5 seconds
        setTimeout(() => {
          setSuccessMessage(null);
        }, 5000);
      }, 2000);
    } catch (err: any) {
      setForgotError(err.message || 'Failed to verify OTP. Please try again.');
    } finally {
      setForgotLoading(false);
    }
  };


  return (
    <div className="login-page-bg">
      {successMessage && (
        <div 
          className="animate-fade-in" 
          style={{
            position: 'absolute',
            top: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.85rem 1.5rem',
            borderRadius: '12px',
            backgroundColor: 'rgba(16, 185, 129, 0.95)',
            backdropFilter: 'blur(10px)',
            border: '1.5px solid rgba(255, 255, 255, 0.2)',
            color: '#ffffff',
            fontWeight: 600,
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 10px 10px -5px rgba(0, 0, 0, 0.4)',
            minWidth: '320px',
            maxWidth: '90%',
            justifyContent: 'center'
          }}
        >
          <svg style={{ width: '20px', height: '20px', stroke: '#ffffff', strokeWidth: 3 }} viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>{successMessage}</span>
          <button 
            type="button" 
            onClick={() => setSuccessMessage(null)} 
            style={{ 
              background: 'none', 
              border: 'none', 
              color: '#ffffff', 
              opacity: 0.8,
              cursor: 'pointer', 
              marginLeft: 'auto',
              paddingLeft: '1rem',
              fontSize: '1rem',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            ✕
          </button>
        </div>
      )}
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
              <span className="login-brand-module-dot" style={{ background: 'var(--altezza-accent)' }} />
              <span>Doctors</span>
            </div>
            <div className="login-brand-module">
              <span className="login-brand-module-dot" style={{ background: '#22c55e' }} />
              <span>Advocates</span>
            </div>
            <div className="login-brand-module">
              <span className="login-brand-module-dot" style={{ background: '#34d399' }} />
              <span>Accountants</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right — 3D glassmorphic login panel */}
      <div className="login-right-panel">
        {activeForm === 'login' && (
          <div className="login-glass-card animate-fade-in">
            <div className="login-shield-wrap" style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
              <img 
                src={logoImg} 
                alt="PCMS Logo" 
                style={{ 
                  width: '85px', 
                  height: '85px', 
                  borderRadius: '50%', 
                  border: '3px solid rgba(88,166,255,0.3)', 
                  boxShadow: '0 0 20px rgba(88,166,255,0.2)', 
                  objectFit: 'cover' 
                }} 
              />
            </div>

            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <h1 className="login-card-title">Welcome Back</h1>
              <p className="login-card-sub">Sign in to your PCMS workspace</p>
            </div>

            {error && (
              <div className="alert alert-error">
                <svg style={{ width: '16px', height: '16px', flexShrink: 0 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span style={{ fontWeight: 500 }}>{error}</span>
              </div>
            )}



            <form onSubmit={handleSubmit}>
              <div className="form-group login-input-group">
                <label className="form-label" htmlFor="email">Username or Email</label>
                <input id="email" type="email" placeholder="Enter your email address" className="form-input login-input-3d" value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} autoComplete="email" required />
                {loginEmailFeedback && (
                  <div style={{ fontSize: '0.78rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.35rem' }}>
                    {loginEmailFeedback.status === 'error' ? (
                      <div style={{ color: '#ffd000' }}>• {loginEmailFeedback.message}</div>
                    ) : (
                      <div style={{ color: '#10b981' }}>✓ {loginEmailFeedback.message}</div>
                    )}
                  </div>
                )}
              </div>

              <div className="form-group login-input-group" style={{ position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="form-label" htmlFor="password">Password</label>
                  <button type="button" onClick={() => { setForgotEmail(email); setActiveForm('forgot'); }} className="forgot-password-link">Forgot Password?</button>
                </div>
                <div style={{ position: 'relative', marginTop: '0.25rem' }}>
                  <input id="password" type={showPassword ? 'text' : 'password'} placeholder="Enter your password" className="form-input login-input-3d" style={{ width: '100%', paddingRight: '2.75rem' }} value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} autoComplete="current-password" required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="show-password-btn">
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

              </div>

              <button type="submit" className="btn login-btn-3d" style={{ width: '100%', marginTop: '1.5rem', height: '50px' }} disabled={loading || !!(loginEmailFeedback && loginEmailFeedback.status === 'error')}>
                {loading ? (
                  <div className="spinner" style={{ borderTopColor: '#ffffff' }} />
                ) : (
                  <>
                    <svg style={{ width: '18px', height: '18px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><polyline points="10 17 15 12 10 7" /><line x1="15" y1="12" x2="3" y2="12" />
                    </svg>
                    LOG IN
                  </>
                )}
              </button>
            </form>

            <p className="login-card-footer">Secured by PCMS Enterprise &bull; v2.0</p>
          </div>
        )}

        {activeForm === 'forgot' && (
          <div className="login-glass-card animate-fade-in">
            <div className="login-shield-wrap" style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
              <div className="login-forgot-icon">
                <svg style={{ width: '30px', height: '30px' }} viewBox="0 0 24 24" fill="none" stroke="#58a6ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 9.9-1" />
                </svg>
              </div>
            </div>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <h1 className="login-card-title">Reset Password</h1>
              <p className="login-card-sub">Enter your email and request verification OTP</p>
            </div>
            
            {forgotError && (
              <div className="alert alert-error">
                <svg style={{ width: '16px', height: '16px', flexShrink: 0 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{forgotError}</span>
              </div>
            )}
            
            {forgotSuccess && (
              <div className="alert alert-success">
                <svg style={{ width: '16px', height: '16px', flexShrink: 0 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <span>{forgotSuccess}</span>
              </div>
            )}

            <form onSubmit={handleForgotSubmit}>
              {/* Email Address with Verify Button next to it */}
              <div className="form-group login-input-group">
                <label className="form-label" htmlFor="forgot-email">Email Address</label>
                <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.25rem' }}>
                  <input
                    id="forgot-email"
                    type="email"
                    placeholder="name@example.com"
                    className="form-input login-input-3d"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    disabled={forgotLoading || otpSent}
                    required
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    className="btn login-btn-3d"
                    style={{ width: '95px', height: '46px', flexShrink: 0, padding: 0 }}
                    disabled={forgotLoading || !forgotEmail || !!(forgotEmailFeedback && forgotEmailFeedback.status === 'error')}
                  >
                    {forgotLoading ? (
                      <div className="spinner" style={{ width: '16px', height: '16px', borderTopColor: '#ffffff' }} />
                    ) : otpSent ? 'Resend' : 'Verify'}
                  </button>
                </div>
                {forgotEmailFeedback && (
                  <div style={{ fontSize: '0.78rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.35rem' }}>
                    {forgotEmailFeedback.status === 'error' ? (
                      <div style={{ color: '#ffd000' }}>• {forgotEmailFeedback.message}</div>
                    ) : (
                      <div style={{ color: '#10b981' }}>✓ {forgotEmailFeedback.message}</div>
                    )}
                  </div>
                )}
              </div>

              {/* Conditional sliding section when OTP is sent */}
              {otpSent && (
                <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                  
                  {/* OTP Code */}
                  <div className="form-group login-input-group">
                    <label className="form-label" htmlFor="otp-code">6-Digit OTP</label>
                    <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.25rem' }}>
                      <input
                        id="otp-code"
                        type="text"
                        maxLength={6}
                        placeholder="123456"
                        className="form-input login-input-3d"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                        disabled={forgotLoading || otpVerified}
                        required
                        style={{ flex: 1, textAlign: 'center', letterSpacing: '0.5rem', fontSize: '1.25rem', fontWeight: 'bold' }}
                      />
                      {!otpVerified ? (
                        <button
                          type="button"
                          onClick={handleVerifyOtp}
                          className="btn login-btn-3d"
                          style={{ width: '95px', height: '46px', flexShrink: 0, padding: 0 }}
                          disabled={forgotLoading || otp.length !== 6}
                        >
                          {forgotLoading ? (
                            <div className="spinner" style={{ width: '16px', height: '16px', borderTopColor: '#ffffff' }} />
                          ) : 'Verify'}
                        </button>
                      ) : (
                        <div style={{
                          width: '95px',
                          height: '46px',
                          backgroundColor: 'rgba(16, 185, 129, 0.15)',
                          border: '1.5px solid rgba(16, 185, 129, 0.3)',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#10b981',
                          flexShrink: 0
                        }}>
                          <svg style={{ width: '22px', height: '22px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Password reset fields appear ONLY after OTP verification succeeds */}
                  {otpVerified && (
                    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {/* New Password */}
                      <div className="form-group login-input-group" style={{ position: 'relative' }}>
                        <label className="form-label">New Password</label>
                        <div style={{ position: 'relative', marginTop: '0.25rem' }}>
                          <input
                            type={showNewPassword ? 'text' : 'password'}
                            placeholder="At least 8 characters"
                            className="form-input login-input-3d"
                            style={{ width: '100%', paddingRight: '2.75rem' }}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            onFocus={() => setIsPasswordFocused(true)}
                            onBlur={() => setIsPasswordFocused(false)}
                            required
                            disabled={forgotLoading}
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="show-password-btn"
                          >
                            {showNewPassword ? (
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
                              <span>{isLengthValid ? '✓' : '•'}</span> <span>At least 8 characters ({newPassword.length}/8)</span>
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
                      <div className="form-group login-input-group" style={{ marginBottom: '0.75rem' }}>
                        <label className="form-label">Confirm New Password</label>
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          placeholder="Confirm password"
                          className="form-input login-input-3d"
                          value={confirmNewPassword}
                          onChange={(e) => setConfirmNewPassword(e.target.value)}
                          required
                          disabled={forgotLoading}
                        />
                        {confirmNewPassword && (
                          <div style={{ fontSize: '0.78rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.35rem' }}>
                            {isConfirmMatching ? (
                              <div style={{ color: '#10b981' }}>✓ Passwords match</div>
                            ) : (
                              <div style={{ color: 'var(--zoho-red)' }}>✗ Passwords do not match</div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Submit Button */}
                      <button
                        type="submit"
                        className="btn login-btn-3d"
                        style={{ width: '100%', marginTop: '1rem', height: '50px' }}
                        disabled={forgotLoading || isFormInvalid}
                      >
                        {forgotLoading ? (
                          <div className="spinner" style={{ borderTopColor: '#ffffff' }} />
                        ) : 'RESET PASSWORD'}
                      </button>
                    </div>
                  )}

                </div>
              )}

              <button
                type="button"
                className="btn login-btn-secondary-3d"
                style={{ width: '100%', marginTop: '0.8rem', height: '44px' }}
                onClick={() => {
                  setActiveForm('login');
                  setForgotSuccess(null);
                  setForgotError(null);
                  setOtpSent(false);
                  setOtpVerified(false);
                  setOtp('');
                  setNewPassword('');
                  setConfirmNewPassword('');
                }}
                disabled={forgotLoading}
              >
                ← Back to Login
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

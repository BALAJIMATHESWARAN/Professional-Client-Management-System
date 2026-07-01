using PCMS.Application.DTOs.Auth;
using PCMS.Application.Exceptions;
using PCMS.Application.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Caching.Memory;
using System.Security.Cryptography;

namespace PCMS.Application.Services;

public class AuthService : IAuthService
{
    private readonly IUserRepository _userRepository;
    private readonly IUserTenantRepository _userTenantRepository;
    private readonly IPasswordService _passwordService;
    private readonly IJwtService _jwtService;
    private readonly IEmailService _emailService;
    private readonly IAuditLogService _auditLogService;
    private readonly IConfiguration _configuration;
private readonly IMemoryCache _memoryCache;

    public AuthService(
        IUserRepository userRepository,
        IUserTenantRepository userTenantRepository,
        IPasswordService passwordService,
        IJwtService jwtService,
        IEmailService emailService,
        IAuditLogService auditLogService,
    IMemoryCache memoryCache,
        IConfiguration configuration)
    {
        _userRepository = userRepository;
        _userTenantRepository = userTenantRepository;
        _passwordService = passwordService;
        _jwtService = jwtService;
        _emailService = emailService;
        _auditLogService = auditLogService;
        _configuration = configuration;
_memoryCache = memoryCache;
    }

    public async Task<LoginResponseDto> Login(LoginRequestDto request)
    {
        var normalizedEmail = (request.Email ?? string.Empty).Trim().ToLowerInvariant();
        var user = await _userRepository.GetByEmail(normalizedEmail);

        if (user == null)
        {
            throw new UnauthorizedException("Incorrect email address");
        }

        if (!user.IsActive)
        {
            throw new UnauthorizedException("Your account has been deactivated. Please contact your system administrator.");
        }

        var isValid = _passwordService.Verify(request.Password, user.PasswordHash);
        if (!isValid)
        {
            throw new UnauthorizedException("Incorrect password");
        }

        var isStrong = _passwordService.IsStrongPassword(request.Password);
        if (!isStrong)
        {
            var resetToken = Convert.ToBase64String(Guid.NewGuid().ToByteArray())
                .Replace("+", "")
                .Replace("/", "")
                .TrimEnd('=');
            user.PasswordResetToken = resetToken;
            user.PasswordResetTokenExpiry = DateTime.UtcNow.AddHours(2);
            await _userRepository.Update(user);

            return new LoginResponseDto
            {
                UserId = user.Id,
                UserName = user.UserName,
                IsSuperAdmin = user.IsSuperAdmin,
                NeedsPasswordReset = true,
                ResetToken = resetToken,
                Email = user.Email
            };
        }

        if (user.IsSuperAdmin)
        {
            var token = _jwtService.GenerateSuperAdminToken(user);
            await _auditLogService.LogAsync("LOGIN", "User", user.Id.ToString(), "Super Admin logged in successfully", user.Id, user.Email);

            return new LoginResponseDto
            {
                UserId = user.Id,
                UserName = user.UserName,
                IsSuperAdmin = true,
                Token = token
            };
        }

        var userTenants = await _userTenantRepository.GetByUserId(user.Id);
        await _auditLogService.LogAsync("LOGIN", "User", user.Id.ToString(), "User authenticated successfully", user.Id, user.Email);

        return new LoginResponseDto
        {
            UserId = user.Id,
            UserName = user.UserName,
            IsSuperAdmin = false,
            Tenants = userTenants
                .Select(x =>
                    new TenantInfoDto
                    {
                        TenantId = x.TenantId,
                        TenantName = x.Tenant!.Name,
                        Role = x.Role
                    })
                .ToList()
        };
    }

    public async Task<TokenResponseDto> SelectTenant(SelectTenantRequestDto request)
    {
        var userTenant = await _userTenantRepository.GetUserTenant(request.UserId, request.TenantId);
        if (userTenant == null)
        {
            throw new UnauthorizedException("Invalid tenant selection or workspace deactivated.");
        }

        var token = _jwtService.GenerateUserToken(request.UserId, request.TenantId, userTenant.Role);
        
        var user = await _userRepository.GetById(request.UserId);
        await _auditLogService.LogAsync("SELECT_TENANT", "Tenant", request.TenantId.ToString(), $"User selected workspace: {userTenant.Tenant?.Name ?? request.TenantId.ToString()} as {userTenant.Role}", request.UserId, user?.Email, request.TenantId);

        return new TokenResponseDto
        {
            Token = token
        };
    }

    public async Task ForgotPassword(ForgotPasswordRequestDto request)
    {
        var user = await _userRepository.GetByEmail(request.Email);
        if (user == null)
        {
            throw new NotFoundException("We couldn't find an account matching that email address.");
        }

        if (!user.IsActive)
        {
            throw new BadRequestException("Your account is deactivated. Reset is not allowed.");
        }

        // Password reset email limit check (max 3 per day per account)
        var emailKey = user.Email?.Trim().ToLowerInvariant() ?? "";
        var cacheKey = $"PasswordReset_{emailKey}";
        var resetCount = _memoryCache.Get<int>(cacheKey);
        if (resetCount >= 3)
        {
            throw new BadRequestException("You have exceeded the daily limit of password reset emails. Please try again tomorrow.");
        }
        // Increment count and set expiration to midnight (next day)
        var expiration = DateTimeOffset.UtcNow.AddDays(1).Date; // midnight UTC next day
        _memoryCache.Set(cacheKey, resetCount + 1, expiration);

        // Generate 6‑digit numeric OTP (valid for 24 hours)
        var otp = RandomNumberGenerator.GetInt32(100000, 999999).ToString();
        user.PasswordResetOtp = otp;
        user.PasswordResetOtpExpiry = DateTime.UtcNow.AddHours(24);
        // Clear any existing token fields (optional)
        user.PasswordResetToken = null;
        user.PasswordResetTokenExpiry = null;
        var token = Guid.NewGuid().ToString("N") + Guid.NewGuid().ToString("N");
        user.PasswordResetToken = token;
        user.PasswordResetTokenExpiry = DateTime.UtcNow.AddHours(2);

        await _userRepository.Update(user);

                // Build OTP email body
        var subject = "PCMS Portal - Password Reset OTP";
        var body = $@"
            <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;'>
                <h2 style='color: #6366f1; text-align: center;'>PCMS Platform Support</h2>
                <hr style='border: none; border-top: 1px solid #f1f5f9; margin: 20px 0;' />
                <p>Hello <strong>{user.UserName}</strong>,</p>
                <p>Your password reset code is <strong>{otp}</strong>. It is valid for 24 hours.</p>
                <p>If you did not request a password reset, you can ignore this email.</p>
                <hr style='border: none; border-top: 1px solid #f1f5f9; margin: 20px 0;' />
                <p style='font-size: 0.8rem; color: #94a3b8; text-align: center;'>This is an automated email, please do not reply directly.</p>
            </div>";
// Removed legacy reset link email generation; OTP email is sent above.

        await _emailService.SendEmailAsync(user.Email, subject, body);
        await _auditLogService.LogAsync("FORGOT_PASSWORD", "User", user.Id.ToString(), $"Password reset instructions sent to {user.Email}", user.Id, user.Email);
    }

    public async Task ResetPassword(ResetPasswordRequestDto request)
    {
        var user = await _userRepository.GetByResetToken(request.Token);
        if (user == null || !string.Equals(user.Email, request.Email, StringComparison.OrdinalIgnoreCase))
        {
            throw new NotFoundException("We couldn't find an account matching that reset link.");
        }

        if (!user.IsActive)
        {
            throw new BadRequestException("Your account is deactivated. Password reset is not permitted.");
        }

        if (user.PasswordResetTokenExpiry == null || user.PasswordResetTokenExpiry < DateTime.UtcNow)
        {
            throw new BadRequestException("The reset link has expired. Please request a new link.");
        }

        // Validate Password Strength (Complexity)
        if (!_passwordService.IsStrongPassword(request.NewPassword))
        {
            throw new BadRequestException("Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one digit, and one special character/symbol.");
        }

        // Hash and save new password
        user.PasswordHash = _passwordService.Hash(request.NewPassword);
        
        // Clear token details
        user.PasswordResetToken = null;
        user.PasswordResetTokenExpiry = null;

        await _userRepository.Update(user);
        await _auditLogService.LogAsync("RESET_PASSWORD", "User", user.Id.ToString(), "Password reset successfully", user.Id, user.Email);
    }

    // Standalone verification of OTP code
    public async Task<bool> VerifyOtp(VerifyOtpRequestDto request)
    {
        var user = await _userRepository.GetByEmail(request.Email);
        if (user == null)
        {
            throw new NotFoundException("We couldn't find an account matching that email address.");
        }

        if (!user.IsActive)
        {
            throw new BadRequestException("Your account is deactivated.");
        }

        if (string.IsNullOrWhiteSpace(user.PasswordResetOtp) || user.PasswordResetOtpExpiry == null || user.PasswordResetOtpExpiry < DateTime.UtcNow)
        {
            throw new BadRequestException("The OTP has expired or is invalid. Please request a new code.");
        }

        if (!string.Equals(user.PasswordResetOtp, request.Otp, StringComparison.Ordinal))
        {
            throw new BadRequestException("Invalid OTP code. Please check and try again.");
        }

        return true;
    }

    // New method: Verify OTP and reset password
    public async Task VerifyOtpAndResetPassword(VerifyOtpResetPasswordRequestDto request)
    {
        // Find user by email
        var user = await _userRepository.GetByEmail(request.Email);
        if (user == null)
        {
            throw new NotFoundException("We couldn't find an account matching that email address.");
        }

        if (!user.IsActive)
        {
            throw new BadRequestException("Your account is deactivated. Reset is not allowed.");
        }

        // Validate OTP existence and expiry
        if (string.IsNullOrWhiteSpace(user.PasswordResetOtp) || user.PasswordResetOtpExpiry == null || user.PasswordResetOtpExpiry < DateTime.UtcNow)
        {
            throw new BadRequestException("The OTP is invalid or has expired. Please request a new password reset.");
        }

        // Verify OTP matches
        if (!string.Equals(user.PasswordResetOtp, request.Otp, StringComparison.Ordinal))
        {
            throw new BadRequestException("Invalid OTP provided.");
        }

        // Validate new password strength
        if (!_passwordService.IsStrongPassword(request.NewPassword))
        {
            throw new BadRequestException("Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one digit, and one special character.");
        }

        // Update password and clear OTP/token fields
        user.PasswordHash = _passwordService.Hash(request.NewPassword);
        user.PasswordResetOtp = null;
        user.PasswordResetOtpExpiry = null;
        user.PasswordResetToken = null;
        user.PasswordResetTokenExpiry = null;

        await _userRepository.Update(user);
        await _auditLogService.LogAsync("RESET_PASSWORD_OTP", "User", user.Id.ToString(), "Password reset via OTP", user.Id, user.Email);
    }

    public async Task ChangePassword(ChangePasswordRequestDto request, int userId)
    {
        var user = await _userRepository.GetById(userId);
        if (user == null)
        {
            throw new NotFoundException("User not found.");
        }

        if (!_passwordService.Verify(request.CurrentPassword, user.PasswordHash))
        {
            throw new BadRequestException("Incorrect current password.");
        }

        if (!_passwordService.IsStrongPassword(request.NewPassword))
        {
            throw new BadRequestException("Password does not meet complexity requirements.");
        }

        // Hash and save new password
        user.PasswordHash = _passwordService.Hash(request.NewPassword);
        await _userRepository.Update(user);
        await _auditLogService.LogAsync("CHANGE_PASSWORD", "User", user.Id.ToString(), "Password changed successfully", user.Id, user.Email);
    }
}
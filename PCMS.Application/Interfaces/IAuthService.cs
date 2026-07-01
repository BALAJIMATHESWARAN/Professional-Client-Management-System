using PCMS.Application.DTOs.Auth;

namespace PCMS.Application.Interfaces;

public interface IAuthService
{
    Task<LoginResponseDto> Login(LoginRequestDto request);
    Task<TokenResponseDto> SelectTenant(SelectTenantRequestDto request);
    Task VerifyOtpAndResetPassword(VerifyOtpResetPasswordRequestDto request);
    Task ForgotPassword(ForgotPasswordRequestDto request);
    Task<bool> VerifyOtp(VerifyOtpRequestDto request);
    Task ResetPassword(ResetPasswordRequestDto request);
    Task ChangePassword(ChangePasswordRequestDto request, int userId);
}

public class ForgotPasswordRequestDto
{
    public required string Email { get; set; }
}

public class ResetPasswordRequestDto
{
    public required string Email { get; set; }
    public required string Token { get; set; }
    public required string NewPassword { get; set; }
}

public class ChangePasswordRequestDto
{
    public required string CurrentPassword { get; set; }
    public required string NewPassword { get; set; }
}
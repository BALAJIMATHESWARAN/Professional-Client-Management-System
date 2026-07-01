using Microsoft.AspNetCore.Mvc;
using PCMS.Application.DTOs.Auth;
using PCMS.Application.Interfaces;
namespace PCMS.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    [HttpPost("login")]
    public async Task<IActionResult>Login(LoginRequestDto request)
    {
        var result = await _authService.Login(request);
        return Ok(result);
    }

    [HttpPost("select-tenant")]
    public async Task<IActionResult>SelectTenant(SelectTenantRequestDto request)
    {
        var result = await _authService.SelectTenant(request);
        return Ok(result);
    }

    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword(ForgotPasswordRequestDto request)
    {
        await _authService.ForgotPassword(request);
        return Ok(new { Message = "Reset password instructions have been sent to your email address." });
    }

    [HttpPost("reset-password-otp")]
    public async Task<IActionResult> VerifyOtpResetPassword(VerifyOtpResetPasswordRequestDto request)
    {
        await _authService.VerifyOtpAndResetPassword(request);
        return Ok(new { Message = "Password reset via OTP successful." });
    }

    [HttpPost("verify-otp")]
    public async Task<IActionResult> VerifyOtp(VerifyOtpRequestDto request)
    {
        var isValid = await _authService.VerifyOtp(request);
        return Ok(new { Valid = isValid, Message = "OTP code verified successfully." });
    }

    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword(ResetPasswordRequestDto request)
    {
        await _authService.ResetPassword(request);
        return Ok(new { Message = "Password has been reset successfully." });
    }

    // Existing endpoints ...
}
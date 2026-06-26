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

    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword(ResetPasswordRequestDto request)
    {
        await _authService.ResetPassword(request);
        return Ok(new { Message = "Your password has been reset successfully." });
    }

    [HttpPost("change-password")]
    [Microsoft.AspNetCore.Authorization.Authorize]
    public async Task<IActionResult> ChangePassword(ChangePasswordRequestDto request)
    {
        var currentUserId = int.Parse(User.FindFirst("UserId")!.Value);
        await _authService.ChangePassword(request, currentUserId);
        return Ok(new { Message = "Password changed successfully." });
    }
}
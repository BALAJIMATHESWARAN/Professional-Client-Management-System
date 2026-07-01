namespace PCMS.Application.DTOs.Auth;

public class VerifyOtpResetPasswordRequestDto
{
    public required string Email { get; set; }
    public required string Otp { get; set; }
    public required string NewPassword { get; set; }
}

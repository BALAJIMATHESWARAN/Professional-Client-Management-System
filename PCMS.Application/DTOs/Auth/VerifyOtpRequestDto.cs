namespace PCMS.Application.DTOs.Auth;

public class VerifyOtpRequestDto
{
    public required string Email { get; set; }
    public required string Otp { get; set; }
}

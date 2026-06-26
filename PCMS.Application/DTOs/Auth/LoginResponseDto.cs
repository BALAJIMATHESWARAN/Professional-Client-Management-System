namespace PCMS.Application.DTOs.Auth;

public class LoginResponseDto
{
    public int UserId { get; set; }

    public string UserName { get; set; } = string.Empty;

    public bool IsSuperAdmin { get; set; }
    public string? Token { get; set; } = string.Empty;

    public List<TenantInfoDto> Tenants { get; set; }  = new();

    public bool NeedsPasswordReset { get; set; }
    public string? ResetToken { get; set; }
    public string? Email { get; set; }
}
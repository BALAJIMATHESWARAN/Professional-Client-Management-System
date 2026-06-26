namespace PCMS.Application.DTOs.Auth;

public class TenantInfoDto
{
    public int TenantId { get; set; }

    public string TenantName { get; set; }  = string.Empty;

    public string Role { get; set; } = string.Empty;
}

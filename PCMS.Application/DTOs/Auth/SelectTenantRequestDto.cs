namespace PCMS.Application.DTOs.Auth;

public class SelectTenantRequestDto
{
    public int UserId { get; set; }

    public int TenantId { get; set; }
}
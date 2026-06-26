namespace PCMS.Application.DTOs.Tenant;

public class CreateTenantResponseDto
{
    public int TenantId { get; set; }

    public string Message { get; set; } = string.Empty;
}
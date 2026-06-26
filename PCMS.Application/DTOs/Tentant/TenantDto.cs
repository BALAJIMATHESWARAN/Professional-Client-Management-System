namespace PCMS.Application.DTOs.Tenant;

public class TenantDto
{
    public int Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public string Code { get; set; } = string.Empty;

    public string? Description { get; set; }

    public string? AssignedModuleIds { get; set; }

    public bool IsActive { get; set; }
}
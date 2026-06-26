namespace PCMS.Application.DTOs.Tenant;

public class CreateTenantRequestDto
{
    public required string Name { get; set; }

    public required string Code { get; set; }

    public string? Description { get; set; }

    public string? AssignedModuleIds { get; set; }
}
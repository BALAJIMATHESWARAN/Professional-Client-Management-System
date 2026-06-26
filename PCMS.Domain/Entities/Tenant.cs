namespace PCMS.Domain.Entities;

public class Tenant : BaseEntity
{
    public required string Name { get; set; }

    public required string Code { get; set; }

    public string? Description { get; set; }

    public string? AssignedModuleIds { get; set; }

    public bool IsActive { get; set; }

    public ICollection<UserTenant> UserTenants { get; set; } = new List<UserTenant>();

    public ICollection<DynamicField> DynamicFields { get; set; } = new List<DynamicField>();
}
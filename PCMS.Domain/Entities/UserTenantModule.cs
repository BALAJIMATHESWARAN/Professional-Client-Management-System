namespace PCMS.Domain.Entities;

public class UserTenantModule : BaseEntity
{
    public int UserId { get; set; }

    public int TenantId { get; set; }

    public int ModuleId { get; set; }

    public bool IsActive { get; set; } = true;

    public User User { get; set; } = null!;

    public Tenant Tenant { get; set; } = null!;

    public Module Module { get; set; } = null!;
}
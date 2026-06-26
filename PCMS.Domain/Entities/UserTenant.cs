namespace PCMS.Domain.Entities;

public class UserTenant : BaseEntity
{
    public int UserId { get; set; }

    public int TenantId { get; set; }

    public required string Role { get; set; }

    public bool IsActive { get; set; }

    public User? User { get; set; }

    public Tenant? Tenant { get; set; }
}
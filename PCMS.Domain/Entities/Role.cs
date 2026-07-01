using PCMS.Domain.Interfaces;

namespace PCMS.Domain.Entities;

public class Role : BaseEntity, IMultiTenant
{
    public int TenantId { get; set; }
    
    public required string Name { get; set; }
    
    public bool IsActive { get; set; }
    
    public ICollection<RolePermission> RolePermissions { get; set; } = new List<RolePermission>();
    
    public ICollection<UserRole> UserRoles { get; set; } = new List<UserRole>();
}

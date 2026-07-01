using PCMS.Domain.Interfaces;

namespace PCMS.Domain.Entities;

public class RolePermission : BaseEntity, IMultiTenant
{
    public int TenantId { get; set; }
    
    public int RoleId { get; set; }
    
    public int PermissionId { get; set; }
    
    // Navigation properties
    public Role? Role { get; set; }
    
    public Permission? Permission { get; set; }
}

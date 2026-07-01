using PCMS.Domain.Interfaces;

namespace PCMS.Domain.Entities;

public class UserRole : BaseEntity, IMultiTenant
{
    public int TenantId { get; set; }
    
    public int UserId { get; set; }
    
    public int RoleId { get; set; }
    
    // Navigation properties
    public User? User { get; set; }
    
    public Role? Role { get; set; }
}

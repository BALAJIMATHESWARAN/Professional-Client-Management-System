using PCMS.Domain.Interfaces;

namespace PCMS.Domain.Entities;

public class DashboardWidgetConfiguration : BaseEntity, IMultiTenant
{
    public int TenantId { get; set; }
    
    public int RoleId { get; set; }
    
    public required string WidgetKey { get; set; }
    
    public bool IsVisible { get; set; }
    
    public int DisplayOrder { get; set; }
    
    // Navigation properties
    public Role? Role { get; set; }
}

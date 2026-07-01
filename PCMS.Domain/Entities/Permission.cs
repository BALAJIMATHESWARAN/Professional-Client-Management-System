namespace PCMS.Domain.Entities;

public class Permission : BaseEntity
{
    public required string ModuleName { get; set; }
    
    public required string PermissionCode { get; set; }
    
    public ICollection<RolePermission> RolePermissions { get; set; } = new List<RolePermission>();
}

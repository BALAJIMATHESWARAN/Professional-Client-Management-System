using System.Collections.Generic;

namespace PCMS.Application.DTOs.Role;

public class UpdateRoleRequest
{
    public required string Name { get; set; }
    public bool IsActive { get; set; }
    public List<int> PermissionIds { get; set; } = new();
}

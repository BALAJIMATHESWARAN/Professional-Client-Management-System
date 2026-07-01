using System.Collections.Generic;

namespace PCMS.Application.DTOs.Role;

public class RoleResponse
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public bool IsActive { get; set; }
    public List<PermissionResponse> Permissions { get; set; } = new();
}

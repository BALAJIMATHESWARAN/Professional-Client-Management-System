using PCMS.Domain.Entities;

namespace PCMS.Application.Interfaces;

public interface IRolePermissionRepository
{
    Task<List<RolePermission>> GetByRoleId(int roleId);
    Task UpdateRolePermissions(int roleId, List<int> permissionIds);
    Task<List<string>> GetPermissionCodesForUser(int userId);
}

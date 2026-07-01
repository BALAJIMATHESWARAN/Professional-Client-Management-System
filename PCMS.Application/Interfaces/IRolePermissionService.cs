using System.Collections.Generic;
using System.Threading.Tasks;
using PCMS.Application.DTOs.Role;

namespace PCMS.Application.Interfaces;

public interface IRolePermissionService
{
    Task<RoleResponse> CreateRole(CreateRoleRequest request);
    Task<RoleResponse> UpdateRole(int id, UpdateRoleRequest request);
    Task<RoleResponse> GetRoleById(int id);
    Task<List<RoleResponse>> GetAllRoles();
    Task<List<PermissionResponse>> GetPermissions();
    Task SeedSystemPermissions();
    Task<List<string>> GetPermissionCodesForUser(int userId);
    Task<List<string>> GetDashboardWidgetsForRole(int roleId);
    Task UpdateDashboardWidgetsForRole(int roleId, List<string> widgetKeys);
}

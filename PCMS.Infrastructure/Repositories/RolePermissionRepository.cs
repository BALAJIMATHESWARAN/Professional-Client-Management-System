using Microsoft.EntityFrameworkCore;
using PCMS.Application.Interfaces;
using PCMS.Domain.Entities;
using PCMS.Infrastructure.Data;

namespace PCMS.Infrastructure.Repositories;

public class RolePermissionRepository : IRolePermissionRepository
{
    private readonly AppDbContext _context;

    public RolePermissionRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<RolePermission>> GetByRoleId(int roleId)
    {
        return await _context.RolePermissions
            .Include(rp => rp.Permission)
            .Where(rp => rp.RoleId == roleId)
            .ToListAsync();
    }

    public async Task UpdateRolePermissions(int roleId, List<int> permissionIds)
    {
        // 1. Remove existing role permissions
        var existing = await _context.RolePermissions.Where(rp => rp.RoleId == roleId).ToListAsync();
        _context.RolePermissions.RemoveRange(existing);

        // 2. Add new ones
        var toAdd = permissionIds.Select(pId => new RolePermission
        {
            RoleId = roleId,
            PermissionId = pId
        });

        await _context.RolePermissions.AddRangeAsync(toAdd);
        await _context.SaveChangesAsync();
    }

    public async Task<List<string>> GetPermissionCodesForUser(int userId)
    {
        // Look up all role IDs assigned to the user
        var roleIds = await _context.UserRoles
            .Where(ur => ur.UserId == userId)
            .Select(ur => ur.RoleId)
            .ToListAsync();

        // Retrieve all unique permission codes tied to those roles
        return await _context.RolePermissions
            .Include(rp => rp.Permission)
            .Where(rp => roleIds.Contains(rp.RoleId))
            .Select(rp => rp.Permission!.PermissionCode)
            .Distinct()
            .ToListAsync();
    }
}

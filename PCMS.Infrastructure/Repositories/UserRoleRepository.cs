using Microsoft.EntityFrameworkCore;
using PCMS.Application.Interfaces;
using PCMS.Domain.Entities;
using PCMS.Infrastructure.Data;

namespace PCMS.Infrastructure.Repositories;

public class UserRoleRepository : IUserRoleRepository
{
    private readonly AppDbContext _context;

    public UserRoleRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<UserRole>> GetByUserId(int userId)
    {
        return await _context.UserRoles
            .Include(ur => ur.Role)
            .Where(ur => ur.UserId == userId)
            .ToListAsync();
    }

    public async Task AssignRoles(int userId, List<int> roleIds)
    {
        // 1. Remove existing roles
        var existing = await _context.UserRoles.Where(ur => ur.UserId == userId).ToListAsync();
        _context.UserRoles.RemoveRange(existing);

        // 2. Add new ones
        var toAdd = roleIds.Select(rId => new UserRole
        {
            UserId = userId,
            RoleId = rId
        });

        await _context.UserRoles.AddRangeAsync(toAdd);
        await _context.SaveChangesAsync();
    }
}

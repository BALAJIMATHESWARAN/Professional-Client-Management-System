using Microsoft.EntityFrameworkCore;
using PCMS.Application.Interfaces;
using PCMS.Domain.Entities;
using PCMS.Infrastructure.Data;

namespace PCMS.Infrastructure.Repositories;

public class PermissionRepository : IPermissionRepository
{
    private readonly AppDbContext _context;

    public PermissionRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<Permission>> GetAll()
    {
        return await _context.Permissions.ToListAsync();
    }

    public async Task AddRange(List<Permission> permissions)
    {
        // Avoid adding duplicate permission codes in global Permissions table
        var existingCodes = await _context.Permissions.Select(p => p.PermissionCode).ToListAsync();
        var toAdd = permissions.Where(p => !existingCodes.Contains(p.PermissionCode)).ToList();

        if (toAdd.Count > 0)
        {
            await _context.Permissions.AddRangeAsync(toAdd);
            await _context.SaveChangesAsync();
        }
    }
}

using Microsoft.EntityFrameworkCore;
using PCMS.Application.Interfaces;
using PCMS.Domain.Entities;
using PCMS.Infrastructure.Data;

namespace PCMS.Infrastructure.Repositories;

public class UserTenantModuleRepository : IUserTenantModuleRepository
{
    private readonly AppDbContext _context;

    public UserTenantModuleRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task Add(UserTenantModule userTenantModule)
    {
        await _context.UserTenantModules.AddAsync(userTenantModule);
        await _context.SaveChangesAsync();
    }

    public async Task<List<UserTenantModule>> GetByUserAndTenant(int userId, int tenantId)
    {
        return await _context.UserTenantModules
            .Include(x => x.Module)
            .Where(x =>
                x.UserId == userId &&
                x.TenantId == tenantId &&
                x.IsActive)
            .ToListAsync();
    }

    public async Task<bool> Exists(int userId, int tenantId, int moduleId)
    {
        return await _context.UserTenantModules
            .AnyAsync(x =>
                x.UserId == userId &&
                x.TenantId == tenantId &&
                x.ModuleId == moduleId);
    }

    public async Task<UserTenantModule?> Get(int userId, int tenantId, int moduleId)
    {
        return await _context.UserTenantModules
            .FirstOrDefaultAsync(x =>
                x.UserId == userId &&
                x.TenantId == tenantId &&
                x.ModuleId == moduleId);
    }

    public async Task Delete(UserTenantModule userTenantModule)
    {
        _context.UserTenantModules.Remove(userTenantModule);
        await _context.SaveChangesAsync();
    }
}
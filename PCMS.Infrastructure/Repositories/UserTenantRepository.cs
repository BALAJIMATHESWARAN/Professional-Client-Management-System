using Microsoft.EntityFrameworkCore;
using PCMS.Application.Interfaces;
using PCMS.Domain.Entities;
using PCMS.Infrastructure.Data;

namespace PCMS.Infrastructure.Repositories;

public class UserTenantRepository : IUserTenantRepository
{
    private readonly AppDbContext _context;

    public UserTenantRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task Add(UserTenant userTenant)
    {
        await _context.UserTenants.AddAsync(userTenant);
        await _context.SaveChangesAsync();
    }

    public async Task<bool> Exists(int userId, int tenantId)
    {
        return await _context.UserTenants.AnyAsync(x => x.UserId == userId && x.TenantId == tenantId);
    }

    public async Task<List<UserTenant>> GetByUserId(int userId)
    {
        return await _context.UserTenants
            .Include(x => x.Tenant)
            .Where(x => x.UserId == userId && x.IsActive && x.Tenant!.IsActive)
            .ToListAsync();
    }

    public async Task<UserTenant?> GetUserTenant(int userId, int tenantId)
    {
        return await _context.UserTenants
            .Include(x => x.Tenant)
            .FirstOrDefaultAsync(x => x.UserId == userId && x.TenantId == tenantId && x.IsActive && x.Tenant!.IsActive);
    }

    public async Task<List<UserTenant>> GetAllAdmins()
    {
        return await _context.UserTenants
            .Include(x => x.User)
            .Include(x => x.Tenant)
            .Where(x => x.Role == "Admin")
            .ToListAsync();
    }

    public async Task Update(UserTenant userTenant)
    {
        _context.UserTenants.Update(userTenant);
        await _context.SaveChangesAsync();
    }

    public async Task Delete(UserTenant userTenant)
    {
        _context.UserTenants.Remove(userTenant);
        await _context.SaveChangesAsync();
    }
}
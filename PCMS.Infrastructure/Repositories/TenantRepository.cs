using Microsoft.EntityFrameworkCore;
using PCMS.Application.Interfaces;
using PCMS.Domain.Entities;
using PCMS.Infrastructure.Data;

namespace PCMS.Infrastructure.Repositories;

public class TenantRepository : ITenantRepository
{
    private readonly AppDbContext _context;

    public TenantRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<bool> CodeExists(string code)
    {
        return await _context.Tenants.AnyAsync(x => x.Code == code);
    }

    public async Task Add(Tenant tenant)
    {
        await _context.Tenants.AddAsync(tenant);
        await _context.SaveChangesAsync();
    }

    public async Task<Tenant?> GetById(int id)
    {
        return await _context.Tenants
            .Include(x => x.UserTenants)
            .FirstOrDefaultAsync(x => x.Id == id);
    }

    public async Task<List<Tenant>> GetAll()
    {
        return await _context.Tenants.ToListAsync();
    }

    public async Task Update(Tenant tenant)
    {
        _context.Tenants.Update(tenant);
        await _context.SaveChangesAsync();
    }
}
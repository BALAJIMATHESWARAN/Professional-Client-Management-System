using Microsoft.EntityFrameworkCore;
using PCMS.Application.Interfaces;
using PCMS.Domain.Entities;
using PCMS.Infrastructure.Data;

namespace PCMS.Infrastructure.Repositories;

public class DynamicFieldRepository : IDynamicFieldRepository
{
    private readonly AppDbContext _context;

    public DynamicFieldRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<DynamicField>> GetFieldsByModule(int moduleId)
    {
        return await _context.DynamicFields
            .Where(x => x.ModuleId == moduleId && x.IsActive)
            .OrderBy(x => x.DisplayOrder)
            .ToListAsync();
    }

    public async Task<List<DynamicField>> GetFieldsByTenantAndModule(int tenantId, int moduleId)
    {
        return await _context.DynamicFields
            .Where(x => x.TenantId == tenantId && x.ModuleId == moduleId && x.IsActive)
            .OrderBy(x => x.DisplayOrder)
            .ToListAsync();
    }

    public async Task<DynamicField?> GetById(int id)
    {
        return await _context.DynamicFields
            .FirstOrDefaultAsync(x => x.Id == id);
    }

    public async Task Add(DynamicField field)
    {
        await _context.DynamicFields.AddAsync(field);
        await _context.SaveChangesAsync();
    }

    public async Task Update(DynamicField field)
    {
        _context.DynamicFields.Update(field);
        await _context.SaveChangesAsync();
    }

    public async Task Delete(DynamicField field)
    {
        _context.DynamicFields.Remove(field);
        await _context.SaveChangesAsync();
    }
}

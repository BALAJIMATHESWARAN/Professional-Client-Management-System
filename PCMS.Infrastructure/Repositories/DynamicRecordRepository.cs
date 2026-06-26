using Microsoft.EntityFrameworkCore;
using PCMS.Application.Interfaces;
using PCMS.Domain.Entities;
using PCMS.Infrastructure.Data;

namespace PCMS.Infrastructure.Repositories;

public class DynamicRecordRepository : IDynamicRecordRepository
{
    private readonly AppDbContext _context;

    public DynamicRecordRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<DynamicRecord?> GetById(int id)
    {
        return await _context.DynamicRecords
            .Include(x => x.Module)
            .Include(x => x.Values)
            .ThenInclude(v => v.DynamicField)
            .FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted);
    }

    public async Task<List<DynamicRecord>> GetRecordsByTenantAndModule(int tenantId, int moduleId)
    {
        return await _context.DynamicRecords
            .Include(x => x.Module)
            .Include(x => x.Values)
            .ThenInclude(v => v.DynamicField)
            .Where(x => x.TenantId == tenantId && x.ModuleId == moduleId && !x.IsDeleted)
            .ToListAsync();
    }

    public async Task Add(DynamicRecord record)
    {
        await _context.DynamicRecords.AddAsync(record);
        await _context.SaveChangesAsync();
    }

    public async Task Update(DynamicRecord record)
    {
        _context.DynamicRecords.Update(record);
        await _context.SaveChangesAsync();
    }

    public async Task Delete(DynamicRecord record)
    {
        // Soft delete the record
        record.IsDeleted = true;
        record.DeletedAt = DateTime.UtcNow;
        _context.DynamicRecords.Update(record);
        await _context.SaveChangesAsync();
    }

    public async Task AddValue(DynamicRecordValue value)
    {
        await _context.DynamicRecordValues.AddAsync(value);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateValue(DynamicRecordValue value)
    {
        _context.DynamicRecordValues.Update(value);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteValues(IEnumerable<DynamicRecordValue> values)
    {
        _context.DynamicRecordValues.RemoveRange(values);
        await _context.SaveChangesAsync();
    }
}

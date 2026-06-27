using Microsoft.EntityFrameworkCore;
using PCMS.Application.Interfaces;
using PCMS.Domain.Entities;
using PCMS.Infrastructure.Data;

namespace PCMS.Infrastructure.Repositories;

public class AuditLogRepository : IAuditLogRepository
{
    private readonly AppDbContext _context;

    public AuditLogRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task AddAsync(AuditLog log)
    {
        await _context.AuditLogs.AddAsync(log);
        await _context.SaveChangesAsync();
    }

    public async Task<List<AuditLog>> GetLogsAsync(int? tenantId = null)
    {
        IQueryable<AuditLog> query = _context.AuditLogs.AsNoTracking();
        
        if (tenantId.HasValue)
        {
            query = query.Where(l => l.TenantId == tenantId.Value);
        }

        return await query.OrderByDescending(l => l.Timestamp).ToListAsync();
    }
}

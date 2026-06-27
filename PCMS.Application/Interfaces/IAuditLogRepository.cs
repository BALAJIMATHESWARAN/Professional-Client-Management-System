using PCMS.Domain.Entities;

namespace PCMS.Application.Interfaces;

public interface IAuditLogRepository
{
    Task AddAsync(AuditLog log);
    Task<List<AuditLog>> GetLogsAsync(int? tenantId = null);
}

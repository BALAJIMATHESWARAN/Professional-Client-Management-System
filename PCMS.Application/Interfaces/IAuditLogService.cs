using PCMS.Application.DTOs.AuditLog;

namespace PCMS.Application.Interfaces;

public interface IAuditLogService
{
    Task LogAsync(string action, string? entityName = null, string? entityId = null, string? details = null, int? userId = null, string? userEmail = null, int? tenantId = null);
    Task<List<AuditLogDto>> GetLogsAsync(int? tenantId = null);
}

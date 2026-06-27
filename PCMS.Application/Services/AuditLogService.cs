using PCMS.Application.DTOs.AuditLog;
using PCMS.Application.Interfaces;
using PCMS.Domain.Entities;

namespace PCMS.Application.Services;

public class AuditLogService : IAuditLogService
{
    private readonly IAuditLogRepository _auditLogRepository;
    private readonly IUserRepository _userRepository;
    private readonly ICurrentUserService _currentUserService;

    public AuditLogService(
        IAuditLogRepository auditLogRepository,
        IUserRepository userRepository,
        ICurrentUserService currentUserService)
    {
        _auditLogRepository = auditLogRepository;
        _userRepository = userRepository;
        _currentUserService = currentUserService;
    }

    public async Task LogAsync(
        string action, 
        string? entityName = null, 
        string? entityId = null, 
        string? details = null, 
        int? userId = null, 
        string? userEmail = null, 
        int? tenantId = null)
    {
        var ipAddress = _currentUserService.IpAddress;
        userId ??= _currentUserService.UserId;
        userEmail ??= _currentUserService.UserEmail;
        tenantId ??= _currentUserService.TenantId;

        if (string.IsNullOrEmpty(userEmail) && userId.HasValue)
        {
            var userObj = await _userRepository.GetById(userId.Value);
            userEmail = userObj?.Email;
        }

        var log = new AuditLog
        {
            UserId = userId,
            UserEmail = userEmail,
            TenantId = tenantId,
            Action = action,
            EntityName = entityName,
            EntityId = entityId,
            Details = details,
            IpAddress = ipAddress,
            Timestamp = DateTime.UtcNow
        };

        await _auditLogRepository.AddAsync(log);
    }

    public async Task<List<AuditLogDto>> GetLogsAsync(int? tenantId = null)
    {
        var logs = await _auditLogRepository.GetLogsAsync(tenantId);

        return logs.Select(l => new AuditLogDto
        {
            Id = l.Id,
            UserId = l.UserId,
            UserEmail = l.UserEmail,
            TenantId = l.TenantId,
            Action = l.Action,
            EntityName = l.EntityName,
            EntityId = l.EntityId,
            Details = l.Details,
            Timestamp = l.Timestamp,
            IpAddress = l.IpAddress
        }).ToList();
    }
}

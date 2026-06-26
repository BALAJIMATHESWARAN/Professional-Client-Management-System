using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using PCMS.Application.DTOs.AuditLog;
using PCMS.Application.Interfaces;
using PCMS.Domain.Entities;
using PCMS.Infrastructure.Data;

namespace PCMS.Infrastructure.Services;

public class AuditLogService : IAuditLogService
{
    private readonly AppDbContext _context;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public AuditLogService(AppDbContext context, IHttpContextAccessor httpContextAccessor)
    {
        _context = context;
        _httpContextAccessor = httpContextAccessor;
    }

    public async Task LogAsync(string action, string? entityName = null, string? entityId = null, string? details = null, int? userId = null, string? userEmail = null, int? tenantId = null)
    {
        var httpContext = _httpContextAccessor.HttpContext;
        
        var ipAddress = httpContext?.Connection?.RemoteIpAddress?.ToString();
        
        // Resolve user if not provided
        if (userId == null && httpContext?.User != null)
        {
            var userIdStr = httpContext.User.FindFirst("UserId")?.Value;
            if (int.TryParse(userIdStr, out var id))
            {
                userId = id;
            }
        }

        if (string.IsNullOrEmpty(userEmail) && httpContext?.User != null)
        {
            userEmail = httpContext.User.FindFirst("Email")?.Value ?? httpContext.User.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value;
            
            // If still empty but we have a userId, look up the user email in the database
            if (string.IsNullOrEmpty(userEmail) && userId.HasValue)
            {
                var userObj = await _context.Users.FindAsync(userId.Value);
                userEmail = userObj?.Email;
            }
        }

        if (tenantId == null && httpContext?.User != null)
        {
            var tenantIdStr = httpContext.User.FindFirst("TenantId")?.Value;
            if (int.TryParse(tenantIdStr, out var tId))
            {
                tenantId = tId;
            }
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

        _context.AuditLogs.Add(log);
        await _context.SaveChangesAsync();
    }

    public async Task<List<AuditLogDto>> GetLogsAsync(int? tenantId = null)
    {
        IQueryable<AuditLog> query = _context.AuditLogs.AsNoTracking();
        
        if (tenantId.HasValue)
        {
            query = query.Where(l => l.TenantId == tenantId.Value);
        }

        var logs = await query.OrderByDescending(l => l.Timestamp).ToListAsync();

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

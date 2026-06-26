using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PCMS.Application.Interfaces;

namespace PCMS.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AuditLogController : ControllerBase
{
    private readonly IAuditLogService _auditLogService;

    public AuditLogController(IAuditLogService auditLogService)
    {
        _auditLogService = auditLogService;
    }

    [HttpGet]
    public async Task<IActionResult> GetLogs()
    {
        var isSuperAdmin = User.FindFirst("IsSuperAdmin")?.Value == "true";
        
        if (isSuperAdmin)
        {
            var logs = await _auditLogService.GetLogsAsync();
            return Ok(logs);
        }

        var tenantIdClaim = User.FindFirst("TenantId")?.Value;
        if (string.IsNullOrEmpty(tenantIdClaim))
        {
            return Forbid();
        }

        var tenantId = int.Parse(tenantIdClaim);
        var role = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;

        // Only allow Tenant Admins to inspect logs for their tenant workspace
        if (role != PCMS.Domain.Constants.Roles.Admin)
        {
            return Forbid();
        }

        var tenantLogs = await _auditLogService.GetLogsAsync(tenantId);
        return Ok(tenantLogs);
    }
}

using Microsoft.AspNetCore.Http;
using PCMS.Application.Interfaces;
using System.Security.Claims;

namespace PCMS.Infrastructure.Services;

public class CurrentUserService : ICurrentUserService
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public CurrentUserService(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public int? UserId
    {
        get
        {
            var userIdStr = _httpContextAccessor.HttpContext?.User?.FindFirst("UserId")?.Value;
            return int.TryParse(userIdStr, out var id) ? id : null;
        }
    }

    public string? UserEmail => 
        _httpContextAccessor.HttpContext?.User?.FindFirst("Email")?.Value ?? 
        _httpContextAccessor.HttpContext?.User?.FindFirst(ClaimTypes.Email)?.Value;

    public int? TenantId
    {
        get
        {
            var tenantIdStr = _httpContextAccessor.HttpContext?.User?.FindFirst("TenantId")?.Value;
            return int.TryParse(tenantIdStr, out var id) ? id : null;
        }
    }

    public string? IpAddress => 
        _httpContextAccessor.HttpContext?.Connection?.RemoteIpAddress?.ToString();
}

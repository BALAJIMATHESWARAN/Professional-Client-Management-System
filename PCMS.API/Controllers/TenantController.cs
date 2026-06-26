using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PCMS.Application.DTOs.Tenant;
using PCMS.Application.Interfaces;

namespace PCMS.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TenantController : ControllerBase
{
    private readonly ITenantService _tenantService;

    public TenantController(ITenantService tenantService)
    {
        _tenantService = tenantService;
    }

    [HttpPost]
    public async Task<IActionResult> CreateTenant(CreateTenantRequestDto request)
    {
        var isSuperAdmin = User.FindFirst("IsSuperAdmin")?.Value;
        if (isSuperAdmin != "true")
        {
            return Forbid();
        }

        var userId = int.Parse(User.FindFirst("UserId")!.Value);
        var result = await _tenantService.CreateTenant(request, userId);
        return Ok(result);
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var isSuperAdmin = User.FindFirst("IsSuperAdmin")?.Value;
        if (isSuperAdmin != "true")
        {
            return Forbid();
        }

        var result = await _tenantService.GetAllTenants();
        return Ok(result);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateTenant(int id, CreateTenantRequestDto request)
    {
        var isSuperAdmin = User.FindFirst("IsSuperAdmin")?.Value;
        if (isSuperAdmin != "true")
        {
            return Forbid();
        }

        var userId = int.Parse(User.FindFirst("UserId")!.Value);
        await _tenantService.UpdateTenant(id, request, userId);
        return Ok(new { Message = "Tenant updated successfully" });
    }

    [HttpPost("{id}/status")]
    public async Task<IActionResult> ToggleStatus(int id, [FromQuery] bool active)
    {
        var isSuperAdmin = User.FindFirst("IsSuperAdmin")?.Value;
        if (isSuperAdmin != "true")
        {
            return Forbid();
        }

        var userId = int.Parse(User.FindFirst("UserId")!.Value);
        await _tenantService.ToggleTenantStatus(id, active, userId);
        return Ok(new { Message = $"Tenant status updated to {(active ? "Active" : "Inactive")}" });
    }
}
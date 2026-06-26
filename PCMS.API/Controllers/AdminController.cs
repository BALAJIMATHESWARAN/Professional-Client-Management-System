using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PCMS.Application.DTOs.Admin;
using PCMS.Application.Interfaces;

namespace PCMS.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AdminController : ControllerBase
{
    private readonly IAdminService _adminService;

    public AdminController(IAdminService adminService)
    {
        _adminService = adminService;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterAdminRequestDto request)
    {
        var isSuperAdmin = User.FindFirst("IsSuperAdmin")?.Value;
        if (isSuperAdmin != "true")
        {
            return Forbid();
        }

        var userId = int.Parse(User.FindFirst("UserId")!.Value);
        var result = await _adminService.RegisterAdmin(request, userId);
        return Ok(result);
    }

    [HttpPost("assign-module")]
    public async Task<IActionResult> AssignModule(AssignModuleRequestDto request)
    {
        var currentUserId =
            int.Parse(
                User.FindFirst("UserId")!.Value);

        await _adminService.AssignModule(
            request,
            currentUserId);

        return Ok(new
        {
            Message = "Module assigned successfully"
        });
    }

    [HttpGet("modules/{userId}/{tenantId}")]
    public async Task<IActionResult> GetAssignedModules(int userId, int tenantId)
    {
        var result =
            await _adminService
                .GetAssignedModules(
                    userId,
                    tenantId);

        return Ok(result);
    }

    [HttpGet("all")]
    public async Task<IActionResult> GetAllAdmins()
    {
        var isSuperAdmin = User.FindFirst("IsSuperAdmin")?.Value;
        if (isSuperAdmin != "true")
        {
            return Forbid();
        }

        var result = await _adminService.GetAllAdmins();
        return Ok(result);
    }

    [HttpGet("modules")]
    public async Task<IActionResult> GetAllModules()
    {
        var result = await _adminService.GetAllModules();
        return Ok(result);
    }

    [HttpPost("{userId}/status")]
    public async Task<IActionResult> ToggleStatus(int userId, [FromQuery] bool active)
    {
        var isSuperAdmin = User.FindFirst("IsSuperAdmin")?.Value;
        if (isSuperAdmin != "true")
        {
            return Forbid();
        }

        var currentUserId = int.Parse(User.FindFirst("UserId")!.Value);
        await _adminService.ToggleAdminStatus(userId, active, currentUserId);
        return Ok(new { Message = $"Admin status updated to {(active ? "Active" : "Inactive")}" });
    }

    [HttpPost("assign-tenant")]
    public async Task<IActionResult> AssignTenant(AssignTenantRequestDto request)
    {
        var isSuperAdmin = User.FindFirst("IsSuperAdmin")?.Value;
        if (isSuperAdmin != "true")
        {
            return Forbid();
        }

        var currentUserId = int.Parse(User.FindFirst("UserId")!.Value);
        await _adminService.AssignAdminToTenant(request.UserId, request.TenantId, currentUserId);
        return Ok(new { Message = "Admin successfully assigned to tenant workspace." });
    }

    [HttpPut("{userId}")]
    public async Task<IActionResult> UpdateAdmin(int userId, UpdateAdminRequestDto request)
    {
        var isSuperAdmin = User.FindFirst("IsSuperAdmin")?.Value;
        if (isSuperAdmin != "true")
        {
            return Forbid();
        }

        var currentUserId = int.Parse(User.FindFirst("UserId")!.Value);
        await _adminService.UpdateAdmin(userId, request, currentUserId);
        return Ok(new { Message = "Admin updated successfully." });
    }
}

public class AssignTenantRequestDto
{
    public int UserId { get; set; }
    public int TenantId { get; set; }
}
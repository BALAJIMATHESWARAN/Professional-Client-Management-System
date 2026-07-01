using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PCMS.Application.DTOs.Role;
using PCMS.Application.Interfaces;

namespace PCMS.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class RolePermissionController : ControllerBase
{
    private readonly IRolePermissionService _rolePermissionService;

    public RolePermissionController(IRolePermissionService rolePermissionService)
    {
        _rolePermissionService = rolePermissionService;
    }

    [HttpPost("role")]
    public async Task<IActionResult> CreateRole(CreateRoleRequest request)
    {
        var response = await _rolePermissionService.CreateRole(request);
        return CreatedAtAction(nameof(GetRoleById), new { id = response.Id }, response);
    }

    [HttpPut("role/{id}")]
    public async Task<IActionResult> UpdateRole(int id, UpdateRoleRequest request)
    {
        var response = await _rolePermissionService.UpdateRole(id, request);
        return Ok(response);
    }

    [HttpGet("role/{id}")]
    public async Task<IActionResult> GetRoleById(int id)
    {
        var response = await _rolePermissionService.GetRoleById(id);
        return Ok(response);
    }

    [HttpGet("role")]
    public async Task<IActionResult> GetAllRoles()
    {
        var list = await _rolePermissionService.GetAllRoles();
        return Ok(list);
    }

    [HttpGet("permissions")]
    public async Task<IActionResult> GetPermissions()
    {
        var list = await _rolePermissionService.GetPermissions();
        return Ok(list);
    }

    [HttpPost("seed")]
    public async Task<IActionResult> SeedPermissions()
    {
        await _rolePermissionService.SeedSystemPermissions();
        return NoContent();
    }

    [HttpGet("user-permissions")]
    public async Task<IActionResult> GetUserPermissions()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdClaim))
        {
            return Unauthorized();
        }

        var userId = int.Parse(userIdClaim);
        var permissions = await _rolePermissionService.GetPermissionCodesForUser(userId);
        return Ok(permissions);
    }

    [HttpGet("dashboard-widgets/{roleId}")]
    public async Task<IActionResult> GetDashboardWidgets(int roleId)
    {
        var widgets = await _rolePermissionService.GetDashboardWidgetsForRole(roleId);
        return Ok(widgets);
    }

    [HttpPut("dashboard-widgets/{roleId}")]
    public async Task<IActionResult> UpdateDashboardWidgets(int roleId, [FromBody] List<string> widgetKeys)
    {
        await _rolePermissionService.UpdateDashboardWidgetsForRole(roleId, widgetKeys);
        return NoContent();
    }
}

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PCMS.Application.Interfaces;
using System.Security.Claims;

namespace PCMS.API.Controllers;

[ApiController]
[Route("api/dynamic-field")]
[Authorize]
public class DynamicFieldController : ControllerBase
{
    private readonly IDynamicFormService _formService;

    public DynamicFieldController(IDynamicFormService formService)
    {
        _formService = formService;
    }

    [HttpPost]
    public async Task<IActionResult> CreateField(CreateFieldDto request)
    {
        // Require DynamicField.Create permission
        if (!HasPermission("DynamicField.Create"))
        {
            return Forbid();
        }

        var currentUserId = int.Parse(User.FindFirst("UserId")!.Value);
        var result = await _formService.CreateField(request, currentUserId);
        return Ok(result);
    }

    [HttpGet("module/{moduleId}")]
    public async Task<IActionResult> GetFields(int moduleId, [FromQuery] string? entityName)
    {
        var tenantIdClaim = User.FindFirst("TenantId")?.Value;
        if (tenantIdClaim == null)
        {
            // Super admins might access fields globally, but typically we want the tenant scoped context.
            // If they are super admin and select a tenant, they will have a tenant scoped token.
            return BadRequest("Tenant context is required.");
        }

        int tenantId = int.Parse(tenantIdClaim);
        var result = await _formService.GetFields(tenantId, moduleId, entityName);
        return Ok(result);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateField(int id, UpdateFieldDto request)
    {
        if (!HasPermission("DynamicField.Update"))
        {
            return Forbid();
        }

        var currentUserId = int.Parse(User.FindFirst("UserId")!.Value);
        await _formService.UpdateField(id, request, currentUserId);
        return Ok(new { Message = "Dynamic Field updated successfully" });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteField(int id)
    {
        if (!HasPermission("DynamicField.Delete"))
        {
            return Forbid();
        }

        var currentUserId = int.Parse(User.FindFirst("UserId")!.Value);
        await _formService.DeleteField(id, currentUserId);
        return Ok(new { Message = "Dynamic Field deleted successfully" });
    }

    private bool HasPermission(string permission)
    {
        // Super admins have all permissions implicitly
        var isSuperAdmin = User.FindFirst("IsSuperAdmin")?.Value;
        if (isSuperAdmin == "true")
        {
            return true;
        }

        var permissions = User.FindAll("Permission").Select(x => x.Value);
        return permissions.Contains(permission);
    }
}

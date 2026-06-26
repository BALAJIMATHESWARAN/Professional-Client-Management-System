using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PCMS.Application.Interfaces;
using System.Security.Claims;

namespace PCMS.API.Controllers;

[ApiController]
[Route("api/dynamic-record")]
[Authorize]
public class DynamicRecordController : ControllerBase
{
    private readonly IDynamicFormService _formService;

    public DynamicRecordController(IDynamicFormService formService)
    {
        _formService = formService;
    }

    [HttpPost]
    public async Task<IActionResult> CreateRecord(CreateRecordDto request)
    {
        if (!HasPermission("DynamicRecord.Create"))
        {
            return Forbid();
        }

        var currentUserId = int.Parse(User.FindFirst("UserId")!.Value);
        var result = await _formService.CreateRecord(request, currentUserId);
        return Ok(result);
    }

    [HttpGet("module/{moduleId}")]
    public async Task<IActionResult> GetRecords(int moduleId)
    {
        var tenantIdClaim = User.FindFirst("TenantId")?.Value;
        if (tenantIdClaim == null)
        {
            return BadRequest("Tenant context is required.");
        }

        int tenantId = int.Parse(tenantIdClaim);
        var result = await _formService.GetRecords(tenantId, moduleId);
        return Ok(result);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateRecord(int id, UpdateRecordDto request)
    {
        if (!HasPermission("DynamicRecord.Update"))
        {
            return Forbid();
        }

        var currentUserId = int.Parse(User.FindFirst("UserId")!.Value);
        await _formService.UpdateRecord(id, request, currentUserId);
        return Ok(new { Message = "Dynamic Record updated successfully" });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteRecord(int id)
    {
        if (!HasPermission("DynamicRecord.Delete"))
        {
            return Forbid();
        }

        var currentUserId = int.Parse(User.FindFirst("UserId")!.Value);
        await _formService.DeleteRecord(id, currentUserId);
        return Ok(new { Message = "Dynamic Record deleted successfully" });
    }

    private bool HasPermission(string permission)
    {
        var isSuperAdmin = User.FindFirst("IsSuperAdmin")?.Value;
        if (isSuperAdmin == "true")
        {
            return true;
        }

        var permissions = User.FindAll("Permission").Select(x => x.Value);
        return permissions.Contains(permission);
    }
}

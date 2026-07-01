using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PCMS.Application.DTOs.Nurse;
using PCMS.Application.Interfaces;

namespace PCMS.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class NurseController : ControllerBase
{
    private readonly INurseService _nurseService;

    public NurseController(INurseService nurseService)
    {
        _nurseService = nurseService;
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateNurseRequest request)
    {
        var response = await _nurseService.CreateNurse(request);
        return CreatedAtAction(nameof(GetById), new { id = response.Id }, response);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, UpdateNurseRequest request)
    {
        var response = await _nurseService.UpdateNurse(id, request);
        return Ok(response);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var response = await _nurseService.GetNurseById(id);
        return Ok(response);
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var list = await _nurseService.GetAllNurses();
        return Ok(list);
    }

    [HttpPost("{id}/toggle")]
    public async Task<IActionResult> ToggleStatus(int id)
    {
        await _nurseService.ToggleStatus(id);
        return NoContent();
    }
}

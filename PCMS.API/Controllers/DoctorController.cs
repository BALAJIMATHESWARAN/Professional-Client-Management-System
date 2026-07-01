using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PCMS.Application.DTOs.Doctor;
using PCMS.Application.Interfaces;

namespace PCMS.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DoctorController : ControllerBase
{
    private readonly IDoctorService _doctorService;

    public DoctorController(IDoctorService doctorService)
    {
        _doctorService = doctorService;
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateDoctorRequest request)
    {
        var response = await _doctorService.CreateDoctor(request);
        return CreatedAtAction(nameof(GetById), new { id = response.Id }, response);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, UpdateDoctorRequest request)
    {
        var response = await _doctorService.UpdateDoctor(id, request);
        return Ok(response);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var response = await _doctorService.GetDoctorById(id);
        return Ok(response);
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? search, [FromQuery] string? specialization)
    {
        var list = await _doctorService.GetAllDoctors(search, specialization);
        return Ok(list);
    }

    [HttpGet("specializations")]
    public async Task<IActionResult> GetSpecializations()
    {
        var list = await _doctorService.GetSpecializations();
        return Ok(list);
    }

    [HttpPost("{id}/toggle")]
    public async Task<IActionResult> ToggleStatus(int id)
    {
        await _doctorService.ToggleStatus(id);
        return NoContent();
    }
}

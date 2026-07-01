using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PCMS.Application.DTOs.Receptionist;
using PCMS.Application.Interfaces;

namespace PCMS.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ReceptionistController : ControllerBase
{
    private readonly IReceptionistService _receptionistService;

    public ReceptionistController(IReceptionistService receptionistService)
    {
        _receptionistService = receptionistService;
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateReceptionistRequest request)
    {
        var response = await _receptionistService.CreateReceptionist(request);
        return CreatedAtAction(nameof(GetById), new { id = response.Id }, response);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, UpdateReceptionistRequest request)
    {
        var response = await _receptionistService.UpdateReceptionist(id, request);
        return Ok(response);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var response = await _receptionistService.GetReceptionistById(id);
        return Ok(response);
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var list = await _receptionistService.GetAllReceptionists();
        return Ok(list);
    }

    [HttpPost("{id}/toggle")]
    public async Task<IActionResult> ToggleStatus(int id)
    {
        await _receptionistService.ToggleStatus(id);
        return NoContent();
    }
}

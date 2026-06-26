using System.Collections.Generic;

namespace PCMS.Application.DTOs.Admin;

public class UpdateAdminRequestDto
{
    public required string UserName { get; set; }

    public required string Email { get; set; }

    public string? Password { get; set; }

    public int TenantId { get; set; }

    public List<int> ModuleIds { get; set; } = new();
}

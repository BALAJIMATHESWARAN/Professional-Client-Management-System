namespace PCMS.Application.DTOs.Admin;

public class AssignModuleRequestDto
{
    public int UserId { get; set; }

    public int TenantId { get; set; }

    public int ModuleId { get; set; }
}
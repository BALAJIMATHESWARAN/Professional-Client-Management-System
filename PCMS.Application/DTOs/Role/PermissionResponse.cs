namespace PCMS.Application.DTOs.Role;

public class PermissionResponse
{
    public int Id { get; set; }
    public required string ModuleName { get; set; }
    public required string PermissionCode { get; set; }
}

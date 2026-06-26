namespace PCMS.Application.DTOs.Admin;

public class RegisterAdminRequestDto
{
    public int TenantId { get; set; }

    public required string UserName { get; set; }

    public required string Email { get; set; }

    public required string Password { get; set; }
}
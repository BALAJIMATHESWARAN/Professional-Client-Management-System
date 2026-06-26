using PCMS.Application.DTOs.Admin;

namespace PCMS.Application.Interfaces;

public interface IAdminService
{
    Task<RegisterAdminResponseDto> RegisterAdmin(RegisterAdminRequestDto request, int currentUserId);

    Task AssignModule(AssignModuleRequestDto request, int currentUserId);
    
    Task<List<AssignedModuleResponseDto>> GetAssignedModules(int userId, int tenantId);

    Task<List<AdminUserDto>> GetAllAdmins();

    Task<List<ModuleDto>> GetAllModules();

    Task ToggleAdminStatus(int userId, bool active, int currentUserId);

    Task AssignAdminToTenant(int userId, int tenantId, int currentUserId);

    Task UpdateAdmin(int userId, UpdateAdminRequestDto request, int currentUserId);
}

public class AdminUserDto
{
    public int UserId { get; set; }
    public required string UserName { get; set; }
    public required string Email { get; set; }
    public int TenantId { get; set; }
    public required string TenantName { get; set; }
    public bool IsActive { get; set; }
    public List<string> AssignedModules { get; set; } = new();
}

public class ModuleDto
{
    public int Id { get; set; }
    public required string Name { get; set; }
}
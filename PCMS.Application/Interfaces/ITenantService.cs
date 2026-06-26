using PCMS.Application.DTOs.Tenant;

namespace PCMS.Application.Interfaces;

public interface ITenantService
{
    Task<CreateTenantResponseDto> CreateTenant(CreateTenantRequestDto request, int currentUserId);

    Task<List<TenantDto>> GetAllTenants();

    Task UpdateTenant(int id, CreateTenantRequestDto request, int currentUserId);

    Task ToggleTenantStatus(int id, bool isActive, int currentUserId);
}
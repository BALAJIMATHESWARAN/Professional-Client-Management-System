using PCMS.Application.DTOs.Tenant;
using PCMS.Application.Exceptions;
using PCMS.Application.Interfaces;
using PCMS.Domain.Entities;

namespace PCMS.Application.Services;

public class TenantService : ITenantService
{
    private readonly ITenantRepository _tenantRepository;
    private readonly IAuditLogService _auditLogService;

    public TenantService(
        ITenantRepository tenantRepository,
        IAuditLogService auditLogService)
    {
        _tenantRepository = tenantRepository;
        _auditLogService = auditLogService;
    }

    public async Task<CreateTenantResponseDto> CreateTenant(CreateTenantRequestDto request, int currentUserId)
    {
        if (await _tenantRepository.CodeExists(request.Code))
        {
            throw new BadRequestException("Tenant code already exists");
        }

        var tenant = new Tenant
        {
            Name = request.Name,
            Code = request.Code,
            Description = request.Description,
            AssignedModuleIds = request.AssignedModuleIds,
            IsActive = true,
            CreatedBy = currentUserId,
            CreatedAt = DateTime.UtcNow
        };

        await _tenantRepository.Add(tenant);
        await _auditLogService.LogAsync("CREATE_TENANT", "Tenant", tenant.Id.ToString(), $"Tenant created: {tenant.Name} ({tenant.Code})", currentUserId, null, tenant.Id);

        return new CreateTenantResponseDto
        {
            TenantId = tenant.Id,
            Message = "Tenant created successfully"
        };
    }

    public async Task<List<TenantDto>> GetAllTenants()
    {
        var tenants = await _tenantRepository.GetAll();

        return tenants.Select(x => new TenantDto
            {
                Id = x.Id,
                Name = x.Name,
                Code = x.Code,
                Description = x.Description,
                AssignedModuleIds = x.AssignedModuleIds,
                IsActive = x.IsActive
            })
            .ToList();
    }

    public async Task UpdateTenant(int id, CreateTenantRequestDto request, int currentUserId)
    {
        var tenant = await _tenantRepository.GetById(id);
        if (tenant == null)
        {
            throw new NotFoundException("Tenant not found");
        }

        tenant.Name = request.Name;
        tenant.Code = request.Code;
        tenant.Description = request.Description;
        tenant.AssignedModuleIds = request.AssignedModuleIds;
        tenant.ModifiedBy = currentUserId;
        tenant.ModifiedAt = DateTime.UtcNow;

        await _tenantRepository.Update(tenant);
        await _auditLogService.LogAsync("UPDATE_TENANT", "Tenant", tenant.Id.ToString(), $"Tenant updated: {tenant.Name} ({tenant.Code})", currentUserId, null, tenant.Id);
    }

    public async Task ToggleTenantStatus(int id, bool isActive, int currentUserId)
    {
        var tenant = await _tenantRepository.GetById(id);
        if (tenant == null)
        {
            throw new NotFoundException("Tenant not found");
        }

        tenant.IsActive = isActive;
        tenant.ModifiedBy = currentUserId;
        tenant.ModifiedAt = DateTime.UtcNow;

        if (tenant.UserTenants != null)
        {
            foreach (var ut in tenant.UserTenants)
            {
                ut.IsActive = isActive;
                ut.ModifiedBy = currentUserId;
                ut.ModifiedAt = DateTime.UtcNow;
            }
        }

        await _tenantRepository.Update(tenant);
        await _auditLogService.LogAsync("TOGGLE_TENANT_STATUS", "Tenant", tenant.Id.ToString(), $"Tenant status changed to {(isActive ? "Active" : "Inactive")}", currentUserId, null, tenant.Id);
    }
}
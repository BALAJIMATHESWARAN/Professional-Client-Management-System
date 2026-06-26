using PCMS.Domain.Entities;

namespace PCMS.Application.Interfaces;

public interface IUserTenantModuleRepository
{
    Task Add(UserTenantModule userTenantModule);

    Task<List<UserTenantModule>> GetByUserAndTenant(int userId, int tenantId);

    Task<bool> Exists(int userId, int tenantId, int moduleId);

    Task<UserTenantModule?> Get(int userId, int tenantId, int moduleId);
    Task Delete(UserTenantModule userTenantModule);
    
}
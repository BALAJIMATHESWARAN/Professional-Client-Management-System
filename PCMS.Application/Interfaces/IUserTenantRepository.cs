using PCMS.Domain.Entities;

namespace PCMS.Application.Interfaces;

public interface IUserTenantRepository
{
    Task Add(UserTenant userTenant);
    Task<bool> Exists(int userId, int tenantId);
    Task<List<UserTenant>> GetByUserId(int userId);
    Task<UserTenant?> GetUserTenant(int userId, int tenantId);
    Task<List<UserTenant>> GetAllAdmins();
    Task Update(UserTenant userTenant);
    Task Delete(UserTenant userTenant);
}
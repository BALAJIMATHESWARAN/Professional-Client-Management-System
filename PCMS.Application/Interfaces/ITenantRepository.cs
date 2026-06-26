using PCMS.Domain.Entities;

namespace PCMS.Application.Interfaces;

public interface ITenantRepository
{
    Task<bool> CodeExists(string code);

    Task Add(Tenant tenant);

    Task<Tenant?> GetById(int id);

    Task<List<Tenant>> GetAll();

    Task Update(Tenant tenant);
}
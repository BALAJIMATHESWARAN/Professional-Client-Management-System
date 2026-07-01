using PCMS.Domain.Entities;

namespace PCMS.Application.Interfaces;

public interface IRoleRepository
{
    Task<Role?> GetById(int id);
    Task<Role?> GetByName(string name);
    Task Add(Role role);
    Task Update(Role role);
    Task<List<Role>> GetAll();
}

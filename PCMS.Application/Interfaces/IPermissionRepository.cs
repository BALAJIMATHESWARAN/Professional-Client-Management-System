using PCMS.Domain.Entities;

namespace PCMS.Application.Interfaces;

public interface IPermissionRepository
{
    Task<List<Permission>> GetAll();
    Task AddRange(List<Permission> permissions);
}

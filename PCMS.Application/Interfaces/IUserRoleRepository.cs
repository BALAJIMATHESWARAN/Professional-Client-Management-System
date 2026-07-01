using PCMS.Domain.Entities;

namespace PCMS.Application.Interfaces;

public interface IUserRoleRepository
{
    Task<List<UserRole>> GetByUserId(int userId);
    Task AssignRoles(int userId, List<int> roleIds);
}

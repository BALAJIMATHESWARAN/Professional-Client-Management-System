using PCMS.Domain.Entities;

namespace PCMS.Application.Interfaces;

public interface IJwtService
{
    string GenerateSuperAdminToken(User user);

    string GenerateUserToken(int userId, int tenantId, string role);
}
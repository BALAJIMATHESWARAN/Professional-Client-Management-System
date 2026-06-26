using PCMS.Domain.Entities;

namespace PCMS.Application.Interfaces;

public interface IUserRepository
{
    Task<User?> GetByEmail(string email);

    Task<User?> GetById(int id);

    Task Add(User user);

    Task Update(User user);

    Task<User?> GetByResetToken(string token);

    Task<bool> EmailExists(string email);

    Task<bool> SuperAdminExists();
}
using Microsoft.EntityFrameworkCore;
using PCMS.Application.Interfaces;
using PCMS.Domain.Entities;
using PCMS.Infrastructure.Data;

namespace PCMS.Infrastructure.Repositories;

public class UserRepository : IUserRepository
{
    private readonly AppDbContext _context;

    public UserRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<User?> GetByEmail(string email)
    {
        var normalizedEmail = (email ?? string.Empty).Trim().ToLowerInvariant();
        return await _context.Users
            .Include(x => x.UserTenants)
            .ThenInclude(x => x.Tenant)
            .FirstOrDefaultAsync(x => x.Email.ToLower() == normalizedEmail);
    }

    public async Task<User?> GetById(int id)
    {
        return await _context.Users.FirstOrDefaultAsync(x => x.Id == id);
    }

    public async Task Add(User user)
    {
        await _context.Users.AddAsync(user);
        await _context.SaveChangesAsync();
    }

    public async Task Update(User user)
    {
        _context.Users.Update(user);
        await _context.SaveChangesAsync();
    }

    public async Task<User?> GetByResetToken(string token)
    {
        return await _context.Users
            .Include(x => x.UserTenants)
            .ThenInclude(x => x.Tenant)
            .FirstOrDefaultAsync(u => u.PasswordResetToken == token);
    }

    public async Task<bool> EmailExists(string email)
    {
        var normalizedEmail = (email ?? string.Empty).Trim().ToLowerInvariant();
        return await _context.Users.AnyAsync(x => x.Email.ToLower() == normalizedEmail);
    }

    public async Task<bool> SuperAdminExists()
    {
        return await _context.Users.AnyAsync(x => x.IsSuperAdmin);
    }
}
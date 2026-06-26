using PCMS.Domain.Entities;
using PCMS.Infrastructure.Security;

namespace PCMS.Infrastructure.Data;

public static class DataSeeder
{
    public static async Task SeedSuperAdminAsync(
        AppDbContext context)
    {
        var passwordService = new PasswordService();

        // Seed Balaji Super Admin
        if (!context.Users.Any(x => x.Email == "balajimatheswaran2004@gmail.com"))
        {
            var balajiSuperAdmin = new User
            {
                UserName = "Super Admin",
                Email = "balajimatheswaran2004@gmail.com",
                PasswordHash = passwordService.Hash("balaji@123"),
                IsSuperAdmin = true,
                IsActive = true,
                IsFirstLogin = false,
                CreatedAt = DateTime.UtcNow
            };
            context.Users.Add(balajiSuperAdmin);
            await context.SaveChangesAsync();
        }

        // Seed original super admin if not exists
        if (!context.Users.Any(x => x.Email == "superadmin@pcms.com"))
        {
            var superAdmin = new User
            {
                UserName = "Super Admin",
                Email = "superadmin@pcms.com",
                PasswordHash = passwordService.Hash("SuperAdmin@123"),
                IsSuperAdmin = true,
                IsActive = true,
                IsFirstLogin = false,
                CreatedAt = DateTime.UtcNow
            };
            context.Users.Add(superAdmin);
            await context.SaveChangesAsync();
        }
    }

    public static async Task SeedModulesAsync(
    AppDbContext context)
{
    if (context.Modules.Any())
    {
        return;
    }

    var modules = new List<Module>
    {
        new()
        {
            Name = "Doctor",
            CreatedAt = DateTime.UtcNow
        },
        new()
        {
            Name = "Advocate",
            CreatedAt = DateTime.UtcNow
        },
        new()
        {
            Name = "Accountant",
            CreatedAt = DateTime.UtcNow
        }
    };

    await context.Modules.AddRangeAsync(modules);
    await context.SaveChangesAsync();
}
}
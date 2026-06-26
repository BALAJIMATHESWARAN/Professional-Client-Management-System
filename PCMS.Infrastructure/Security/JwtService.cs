using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using PCMS.Application.Interfaces;
using PCMS.Domain.Entities;

namespace PCMS.Infrastructure.Security;

public class JwtService : IJwtService
{
    private readonly IConfiguration _configuration;

    private static readonly string[] SuperAdminPermissions = new[]
    {
        "Tenant.Create", "Tenant.Update", "Tenant.Delete",
        "Admin.Create", "Admin.Update", "Admin.Delete",
        "Module.Assign", "Module.Remove",
        "DynamicField.Create", "DynamicField.Update", "DynamicField.Delete",
        "DynamicRecord.Create", "DynamicRecord.Update", "DynamicRecord.Delete"
    };

    private static readonly string[] AdminPermissions = new[]
    {
        "Admin.Create", "Admin.Update",
        "DynamicField.Create", "DynamicField.Update", "DynamicField.Delete",
        "DynamicRecord.Create", "DynamicRecord.Update", "DynamicRecord.Delete"
    };

    private static readonly string[] ManagerPermissions = new[]
    {
        "DynamicRecord.Create", "DynamicRecord.Update", "DynamicRecord.Delete"
    };

    private static readonly string[] StaffPermissions = new[]
    {
        "DynamicRecord.Create", "DynamicRecord.Update"
    };

    public JwtService(
        IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public string GenerateSuperAdminToken(
        User user)
    {
        var claims = new List<Claim>
        {
            new("UserId", user.Id.ToString()),
            new("Email", user.Email),
            new("IsSuperAdmin", "true")
        };

        foreach (var p in SuperAdminPermissions)
        {
            claims.Add(new Claim("Permission", p));
        }

        return GenerateToken(claims);
    }

    public string GenerateUserToken(
        int userId,
        int tenantId,
        string role)
    {
        var claims = new List<Claim>
        {
            new("UserId", userId.ToString()),
            new("TenantId", tenantId.ToString()),
            new(ClaimTypes.Role, role)
        };

        var permissions = role switch
        {
            "SuperAdmin" => SuperAdminPermissions,
            "Admin" => AdminPermissions,
            "Manager" => ManagerPermissions,
            "Staff" => StaffPermissions,
            _ => Array.Empty<string>()
        };

        foreach (var p in permissions)
        {
            claims.Add(new Claim("Permission", p));
        }

        return GenerateToken(claims);
    }

    private string GenerateToken(
        IEnumerable<Claim> claims)
    {
        var key =
            new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(
                    _configuration["Jwt:Key"]!));

        var credentials =
            new SigningCredentials(
                key,
                SecurityAlgorithms.HmacSha256);

        var token =
            new JwtSecurityToken(
                issuer: _configuration["Jwt:Issuer"],
                audience: _configuration["Jwt:Audience"],
                claims: claims,
                expires: DateTime.UtcNow.AddDays(7),
                signingCredentials: credentials);

        return new JwtSecurityTokenHandler()
            .WriteToken(token);
    }
}
namespace PCMS.Domain.Entities;

public class User : BaseEntity
{
    public required string UserName { get; set; }

    public required string Email { get; set; }

    public required string PasswordHash { get; set; }
    
    public bool IsSuperAdmin { get; set; }

    public bool IsActive { get; set; }

    public bool IsFirstLogin { get; set; }

    public DateTime? LastLoginAt { get; set; }

    public string? PasswordResetToken { get; set; }

    public DateTime? PasswordResetTokenExpiry { get; set; }

    public ICollection<UserTenant> UserTenants { get; set; } = new List<UserTenant>();
}
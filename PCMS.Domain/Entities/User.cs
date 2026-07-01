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

    // OTP for password reset (valid for 24 hours)
    public string? PasswordResetOtp { get; set; }
    public DateTime? PasswordResetOtpExpiry { get; set; }

    public ICollection<UserTenant> UserTenants { get; set; } = new List<UserTenant>();

    public virtual DoctorProfile? DoctorProfile { get; set; }
    
    public virtual ReceptionistProfile? ReceptionistProfile { get; set; }
    
    public virtual NurseProfile? NurseProfile { get; set; }
    
    public virtual ICollection<UserRole> UserRoles { get; set; } = new List<UserRole>();
}
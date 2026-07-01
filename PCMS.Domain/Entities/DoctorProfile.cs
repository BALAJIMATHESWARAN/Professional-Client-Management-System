using PCMS.Domain.Interfaces;

namespace PCMS.Domain.Entities;

public class DoctorProfile : BaseEntity, IMultiTenant
{
    public int TenantId { get; set; }
    
    public required string DoctorCode { get; set; }
    
    public required string Specialization { get; set; }
    
    public string? Qualification { get; set; }
    
    public int ExperienceYears { get; set; }
    
    public decimal ConsultationFee { get; set; }
    
    public string? PhoneNumber { get; set; }
    
    public required string Status { get; set; }
    
    public required string FullLegalName { get; set; }
    public required string MobileNumber { get; set; }
    public required string Email { get; set; }
    public required string RegistrationNumber { get; set; }
    public required string MedicalCouncil { get; set; }
    public string? RegistrationCertificate { get; set; }
    public required string VerificationStatus { get; set; } // Default: Pending

    // 1-to-1 Navigation back to User
    public User? User { get; set; }

    public int? DynamicRecordId { get; set; }
    public virtual DynamicRecord? DynamicRecord { get; set; }
}

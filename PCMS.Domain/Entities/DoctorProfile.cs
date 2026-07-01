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
    
    // 1-to-1 Navigation back to User
    public User? User { get; set; }
}

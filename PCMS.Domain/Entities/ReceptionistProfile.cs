using PCMS.Domain.Interfaces;

namespace PCMS.Domain.Entities;

public class ReceptionistProfile : BaseEntity, IMultiTenant
{
    public int TenantId { get; set; }
    
    public required string EmployeeCode { get; set; }
    
    public string? PhoneNumber { get; set; }
    
    public string? Department { get; set; }
    
    public required string Status { get; set; }
    
    // 1-to-1 Navigation back to User
    public User? User { get; set; }

    public int? DoctorId { get; set; }
    public virtual DoctorProfile? Doctor { get; set; }
}

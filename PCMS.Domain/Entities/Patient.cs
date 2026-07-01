using PCMS.Domain.Interfaces;

namespace PCMS.Domain.Entities;

public class Patient : BaseEntity, IMultiTenant
{
    public int TenantId { get; set; }
    
    public required string PatientCode { get; set; }
    
    public required string FullName { get; set; }
    
    public DateTime DateOfBirth { get; set; }
    
    public required string Gender { get; set; }
    
    public required string PhoneNumber { get; set; }
    
    public string? Email { get; set; }
    
    public string? Address { get; set; }
    
    public string? EmergencyContact { get; set; }
    
    public string? BloodGroup { get; set; }
    
    public string? WhatsAppNumber { get; set; }
    
    public bool WhatsAppConsent { get; set; }

    public int? DynamicRecordId { get; set; }
    public DynamicRecord? DynamicRecord { get; set; }
}

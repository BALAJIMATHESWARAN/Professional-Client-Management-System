using PCMS.Domain.Interfaces;

namespace PCMS.Domain.Entities;

public class Appointment : BaseEntity, IMultiTenant
{
    public int TenantId { get; set; }
    
    public int PatientId { get; set; }
    
    public int DoctorId { get; set; }
    
    public DateTime AppointmentDate { get; set; }
    
    public required string AppointmentType { get; set; } // Scheduled, WalkIn
    
    public required string Status { get; set; } // Pending, Confirmed, Completed, Cancelled
    
    public string? Notes { get; set; }
    
    // Navigation properties
    public Patient? Patient { get; set; }
    
    public DoctorProfile? Doctor { get; set; }
}

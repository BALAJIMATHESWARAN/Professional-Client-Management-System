namespace PCMS.Application.DTOs.Doctor;

public class UpdateDoctorRequest
{
    public required string Specialization { get; set; }
    public string? Qualification { get; set; }
    public int ExperienceYears { get; set; }
    public decimal ConsultationFee { get; set; }
    public string? PhoneNumber { get; set; }
    public required string Status { get; set; }
    public bool IsActive { get; set; }
}

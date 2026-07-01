namespace PCMS.Application.DTOs.Doctor;

public class CreateDoctorRequest
{
    public required string UserName { get; set; }
    public required string Email { get; set; }
    public required string Password { get; set; }
    public required string DoctorCode { get; set; }
    public required string Specialization { get; set; }
    public string? Qualification { get; set; }
    public int ExperienceYears { get; set; }
    public decimal ConsultationFee { get; set; }
    public string? PhoneNumber { get; set; }
}

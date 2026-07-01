namespace PCMS.Application.DTOs.Nurse;

public class CreateNurseRequest
{
    public required string UserName { get; set; }
    public string? Email { get; set; }
    public required string Password { get; set; }
    public required string EmployeeCode { get; set; }
    public string? PhoneNumber { get; set; }
    public string? Department { get; set; }
    public int? DoctorId { get; set; }
}

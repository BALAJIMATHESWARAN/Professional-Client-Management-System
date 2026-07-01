namespace PCMS.Application.DTOs.Receptionist;

public class UpdateReceptionistRequest
{
    public required string EmployeeCode { get; set; }
    public string? PhoneNumber { get; set; }
    public string? Department { get; set; }
    public required string Status { get; set; }
    public bool IsActive { get; set; }
    public int? DoctorId { get; set; }
}

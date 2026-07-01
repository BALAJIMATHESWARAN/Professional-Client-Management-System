namespace PCMS.Application.DTOs.Nurse;

public class NurseResponse
{
    public int Id { get; set; }
    public required string UserName { get; set; }
    public required string Email { get; set; }
    public required string EmployeeCode { get; set; }
    public string? PhoneNumber { get; set; }
    public string? Department { get; set; }
    public required string Status { get; set; }
    public bool IsActive { get; set; }
}

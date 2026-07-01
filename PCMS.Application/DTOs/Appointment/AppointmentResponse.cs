using System;

namespace PCMS.Application.DTOs.Appointment;

public class AppointmentResponse
{
    public int Id { get; set; }
    public int PatientId { get; set; }
    public required string PatientName { get; set; }
    public required string PatientCode { get; set; }
    public int DoctorId { get; set; }
    public required string DoctorName { get; set; }
    public required string Specialization { get; set; }
    public DateTime AppointmentDate { get; set; }
    public required string AppointmentType { get; set; }
    public required string Status { get; set; }
    public string? Notes { get; set; }
}

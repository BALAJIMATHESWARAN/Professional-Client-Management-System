using System;

namespace PCMS.Application.DTOs.Appointment;

public class CreateAppointmentRequest
{
    public int PatientId { get; set; }
    public int DoctorId { get; set; }
    public DateTime AppointmentDate { get; set; }
    public required string AppointmentType { get; set; } // Scheduled, WalkIn
    public string? Notes { get; set; }
}

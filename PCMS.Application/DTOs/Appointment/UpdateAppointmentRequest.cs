using System;

namespace PCMS.Application.DTOs.Appointment;

public class UpdateAppointmentRequest
{
    public DateTime AppointmentDate { get; set; }
    public required string AppointmentType { get; set; }
    public required string Status { get; set; } // Pending, Confirmed, Completed, Cancelled
    public string? Notes { get; set; }
}

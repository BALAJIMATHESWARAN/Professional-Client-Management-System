using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using PCMS.Application.DTOs.Appointment;

namespace PCMS.Application.Interfaces;

public interface IAppointmentService
{
    Task<AppointmentResponse> CreateAppointment(CreateAppointmentRequest request);
    Task<AppointmentResponse> UpdateAppointment(int id, UpdateAppointmentRequest request);
    Task<AppointmentResponse> GetAppointmentById(int id);
    Task<List<AppointmentResponse>> GetAppointments(DateTime? date = null, int? patientId = null, int? doctorId = null);
    Task UpdateStatus(int id, string status);
}

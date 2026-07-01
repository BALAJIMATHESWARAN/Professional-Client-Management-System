using PCMS.Domain.Entities;

namespace PCMS.Application.Interfaces;

public interface IAppointmentRepository
{
    Task<Appointment?> GetById(int id);
    Task Add(Appointment appointment);
    Task Update(Appointment appointment);
    Task<List<Appointment>> GetAppointments(DateTime? date = null, int? patientId = null, int? doctorId = null);
    Task<int> GetAppointmentCountForDoctorToday(int doctorId);
}

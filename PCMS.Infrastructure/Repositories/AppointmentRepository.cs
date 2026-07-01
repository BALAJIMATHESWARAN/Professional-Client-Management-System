using Microsoft.EntityFrameworkCore;
using PCMS.Application.Interfaces;
using PCMS.Domain.Entities;
using PCMS.Infrastructure.Data;

namespace PCMS.Infrastructure.Repositories;

public class AppointmentRepository : IAppointmentRepository
{
    private readonly AppDbContext _context;

    public AppointmentRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<Appointment?> GetById(int id)
    {
        return await _context.Appointments
            .Include(a => a.Patient)
            .Include(a => a.Doctor)
            .ThenInclude(d => d!.User)
            .FirstOrDefaultAsync(a => a.Id == id);
    }

    public async Task Add(Appointment appointment)
    {
        await _context.Appointments.AddAsync(appointment);
        await _context.SaveChangesAsync();
    }

    public async Task Update(Appointment appointment)
    {
        _context.Appointments.Update(appointment);
        await _context.SaveChangesAsync();
    }

    public async Task<List<Appointment>> GetAppointments(DateTime? date = null, int? patientId = null, int? doctorId = null)
    {
        IQueryable<Appointment> query = _context.Appointments
            .Include(a => a.Patient)
            .Include(a => a.Doctor)
            .ThenInclude(d => d!.User);

        if (date.HasValue)
        {
            var utcStart = date.Value.Date.ToUniversalTime();
            var utcEnd = date.Value.Date.AddDays(1).ToUniversalTime();
            query = query.Where(a => a.AppointmentDate >= utcStart && a.AppointmentDate < utcEnd);
        }

        if (patientId.HasValue)
        {
            query = query.Where(a => a.PatientId == patientId.Value);
        }

        if (doctorId.HasValue)
        {
            query = query.Where(a => a.DoctorId == doctorId.Value);
        }

        return await query.OrderBy(a => a.AppointmentDate).ToListAsync();
    }

    public async Task<int> GetAppointmentCountForDoctorToday(int doctorId)
    {
        var todayUtcStart = DateTime.UtcNow.Date;
        var todayUtcEnd = todayUtcStart.AddDays(1);

        return await _context.Appointments
            .CountAsync(a => a.DoctorId == doctorId && a.AppointmentDate >= todayUtcStart && a.AppointmentDate < todayUtcEnd && a.Status != "Cancelled");
    }
}

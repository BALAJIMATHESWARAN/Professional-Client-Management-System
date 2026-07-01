using Xunit;
using PCMS.Application.Services;
using PCMS.Application.Interfaces;
using PCMS.Domain.Entities;
using PCMS.Application.DTOs.Appointment;
using PCMS.Application.Exceptions;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace PCMS.Tests;

public class AppointmentServiceTests
{
    private class FakeAppointmentRepository : IAppointmentRepository
    {
        public List<Appointment> Appointments { get; set; } = new();

        public Task<Appointment?> GetById(int id) => Task.FromResult(Appointments.FirstOrDefault(a => a.Id == id));
        
        public Task Add(Appointment appointment)
        {
            appointment.Id = Appointments.Count + 1;
            Appointments.Add(appointment);
            return Task.CompletedTask;
        }

        public Task Update(Appointment appointment)
        {
            var idx = Appointments.FindIndex(a => a.Id == appointment.Id);
            if (idx >= 0) Appointments[idx] = appointment;
            return Task.CompletedTask;
        }

        public Task<List<Appointment>> GetAppointments(DateTime? date = null, int? patientId = null, int? doctorId = null)
        {
            var query = Appointments.AsEnumerable();
            if (date.HasValue)
            {
                var utcDate = date.Value.ToUniversalTime().Date;
                query = query.Where(a => a.AppointmentDate.Date == utcDate);
            }
            if (patientId.HasValue) query = query.Where(a => a.PatientId == patientId.Value);
            if (doctorId.HasValue) query = query.Where(a => a.DoctorId == doctorId.Value);
            return Task.FromResult(query.ToList());
        }

        public Task<int> GetAppointmentCountForDoctorToday(int doctorId)
        {
            var today = DateTime.UtcNow.Date;
            return Task.FromResult(Appointments.Count(a => a.DoctorId == doctorId && a.AppointmentDate.Date == today));
        }
    }

    private class FakePatientRepository : IPatientRepository
    {
        public Task<Patient?> GetById(int id) => Task.FromResult<Patient?>(new Patient { Id = id, PatientCode = "PAT01", FullName = "John Doe", Gender = "Male", PhoneNumber = "123" });
        public Task<Patient?> GetByCode(string patientCode) => Task.FromResult<Patient?>(null);
        public Task Add(Patient patient) => Task.CompletedTask;
        public Task Update(Patient patient) => Task.CompletedTask;
        public Task<(List<Patient> Patients, int TotalCount)> GetAll(string? search = null, int pageNumber = 1, int pageSize = 10) => Task.FromResult((new List<Patient>(), 0));
        public Task<bool> PatientCodeExists(string patientCode) => Task.FromResult(false);
    }

    private class FakeDoctorProfileRepository : IDoctorProfileRepository
    {
        public Task<DoctorProfile?> GetById(int id) => Task.FromResult<DoctorProfile?>(new DoctorProfile 
        { 
            Id = id, 
            DoctorCode = "DOC01", 
            Specialization = "General", 
            Qualification = "MBBS", 
            ExperienceYears = 5, 
            ConsultationFee = 500, 
            Status = "Active",
            FullLegalName = "Dr. John Doe",
            MobileNumber = "1234567890",
            Email = "doctor@clinic.com",
            RegistrationNumber = "REG01",
            MedicalCouncil = "National Medical Commission",
            VerificationStatus = "Pending"
        });
        public Task<DoctorProfile?> GetByCode(string doctorCode) => Task.FromResult<DoctorProfile?>(null);
        public Task Add(DoctorProfile doctor) => Task.CompletedTask;
        public Task Update(DoctorProfile doctor) => Task.CompletedTask;
        public Task<List<DoctorProfile>> GetAll(string? search = null, string? specialization = null) => Task.FromResult(new List<DoctorProfile>());
        public Task<bool> DoctorCodeExists(string doctorCode) => Task.FromResult(false);
    }

    private class FakeUserRepository : IUserRepository
    {
        public Task<User?> GetById(int id) => Task.FromResult<User?>(new User { Id = id, UserName = "Dr. John", Email = "doctor@clinic.com", IsActive = true, PasswordHash = "abc" });
        public Task<User?> GetByEmail(string email) => Task.FromResult<User?>(null);
        public Task<User?> GetByResetToken(string token) => Task.FromResult<User?>(null);
        public Task<bool> EmailExists(string email) => Task.FromResult(false);
        public Task Add(User user) => Task.CompletedTask;
        public Task Update(User user) => Task.CompletedTask;
        public Task<bool> SuperAdminExists() => Task.FromResult(false);
    }

    private class FakeReceptionistProfileRepository : IReceptionistProfileRepository
    {
        public Task<ReceptionistProfile?> GetById(int id) => Task.FromResult<ReceptionistProfile?>(null);
        public Task Add(ReceptionistProfile receptionist) => Task.CompletedTask;
        public Task Update(ReceptionistProfile receptionist) => Task.CompletedTask;
        public Task<List<ReceptionistProfile>> GetAll() => Task.FromResult(new List<ReceptionistProfile>());
        public Task<bool> EmployeeCodeExists(string employeeCode) => Task.FromResult(false);
    }

    private class FakeNurseProfileRepository : INurseProfileRepository
    {
        public Task<NurseProfile?> GetById(int id) => Task.FromResult<NurseProfile?>(null);
        public Task Add(NurseProfile nurse) => Task.CompletedTask;
        public Task Update(NurseProfile nurse) => Task.CompletedTask;
        public Task<List<NurseProfile>> GetAll() => Task.FromResult(new List<NurseProfile>());
        public Task<bool> EmployeeCodeExists(string employeeCode) => Task.FromResult(false);
    }

    private class FakeCurrentUserService : ICurrentUserService
    {
        public int? UserId => null;
        public string? UserEmail => null;
        public int? TenantId => 1;
        public string? IpAddress => null;
    }

    [Fact]
    public async Task CreateAppointment_InPast_ShouldThrowBadRequestException()
    {
        // Arrange
        var appRepo = new FakeAppointmentRepository();
        var patRepo = new FakePatientRepository();
        var docRepo = new FakeDoctorProfileRepository();
        var userRepo = new FakeUserRepository();
        var recepRepo = new FakeReceptionistProfileRepository();
        var nurseRepo = new FakeNurseProfileRepository();
        var currentUser = new FakeCurrentUserService();

        var service = new AppointmentService(appRepo, patRepo, docRepo, userRepo, recepRepo, nurseRepo, currentUser);

        var request = new CreateAppointmentRequest
        {
            PatientId = 1,
            DoctorId = 2,
            AppointmentDate = DateTime.UtcNow.AddHours(-1),
            AppointmentType = "Scheduled",
            Notes = "Checkup"
        };

        // Act & Assert
        var ex = await Assert.ThrowsAsync<BadRequestException>(() => service.CreateAppointment(request));
        Assert.Equal("Appointment date must be in the future.", ex.Message);
    }

    [Fact]
    public async Task CreateAppointment_DoubleBookingConflict_ShouldThrowBadRequestException()
    {
        // Arrange
        var appRepo = new FakeAppointmentRepository();
        var patRepo = new FakePatientRepository();
        var docRepo = new FakeDoctorProfileRepository();
        var userRepo = new FakeUserRepository();
        var recepRepo = new FakeReceptionistProfileRepository();
        var nurseRepo = new FakeNurseProfileRepository();
        var currentUser = new FakeCurrentUserService();

        var service = new AppointmentService(appRepo, patRepo, docRepo, userRepo, recepRepo, nurseRepo, currentUser);

        var date = DateTime.UtcNow.AddDays(1);
        
        // Setup an existing appointment at the exact time
        var existingApp = new Appointment
        {
            Id = 1,
            PatientId = 1,
            DoctorId = 2,
            AppointmentDate = date.ToUniversalTime(),
            AppointmentType = "Scheduled",
            Status = "Pending"
        };
        appRepo.Appointments.Add(existingApp);

        var request = new CreateAppointmentRequest
        {
            PatientId = 3,
            DoctorId = 2, // Same Doctor
            AppointmentDate = date, // Same Time
            AppointmentType = "WalkIn",
            Notes = "Second booking attempt"
        };

        // Act & Assert
        var ex = await Assert.ThrowsAsync<BadRequestException>(() => service.CreateAppointment(request));
        Assert.Equal("Doctor is already booked at this exact date and time.", ex.Message);
    }
}

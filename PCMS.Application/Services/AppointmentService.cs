using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using PCMS.Application.DTOs.Appointment;
using PCMS.Application.Exceptions;
using PCMS.Application.Interfaces;
using PCMS.Domain.Entities;

namespace PCMS.Application.Services;

public class AppointmentService : IAppointmentService
{
    private readonly IAppointmentRepository _appointmentRepository;
    private readonly IPatientRepository _patientRepository;
    private readonly IDoctorProfileRepository _doctorRepository;
    private readonly IUserRepository _userRepository;

    public AppointmentService(
        IAppointmentRepository appointmentRepository,
        IPatientRepository patientRepository,
        IDoctorProfileRepository doctorRepository,
        IUserRepository userRepository)
    {
        _appointmentRepository = appointmentRepository;
        _patientRepository = patientRepository;
        _doctorRepository = doctorRepository;
        _userRepository = userRepository;
    }

    public async Task<AppointmentResponse> CreateAppointment(CreateAppointmentRequest request)
    {
        var patient = await _patientRepository.GetById(request.PatientId) ?? throw new NotFoundException("Patient not found");
        var doctor = await _doctorRepository.GetById(request.DoctorId) ?? throw new NotFoundException("Doctor not found");
        var doctorUser = await _userRepository.GetById(request.DoctorId) ?? throw new NotFoundException("Doctor user not found");

        var appointment = new Appointment
        {
            PatientId = request.PatientId,
            DoctorId = request.DoctorId,
            AppointmentDate = request.AppointmentDate.ToUniversalTime(),
            AppointmentType = request.AppointmentType, // Scheduled, WalkIn
            Status = "Pending", // Default
            Notes = request.Notes
        };

        await _appointmentRepository.Add(appointment);

        return MapToResponse(appointment, patient, doctor, doctorUser);
    }

    public async Task<AppointmentResponse> UpdateAppointment(int id, UpdateAppointmentRequest request)
    {
        var appointment = await _appointmentRepository.GetById(id) ?? throw new NotFoundException("Appointment not found");
        var patient = await _patientRepository.GetById(appointment.PatientId) ?? throw new NotFoundException("Patient not found");
        var doctor = await _doctorRepository.GetById(appointment.DoctorId) ?? throw new NotFoundException("Doctor not found");
        var doctorUser = await _userRepository.GetById(appointment.DoctorId) ?? throw new NotFoundException("Doctor user not found");

        appointment.AppointmentDate = request.AppointmentDate.ToUniversalTime();
        appointment.AppointmentType = request.AppointmentType;
        appointment.Status = request.Status;
        appointment.Notes = request.Notes;

        await _appointmentRepository.Update(appointment);

        return MapToResponse(appointment, patient, doctor, doctorUser);
    }

    public async Task<AppointmentResponse> GetAppointmentById(int id)
    {
        var appointment = await _appointmentRepository.GetById(id) ?? throw new NotFoundException("Appointment not found");
        var patient = await _patientRepository.GetById(appointment.PatientId) ?? throw new NotFoundException("Patient not found");
        var doctor = await _doctorRepository.GetById(appointment.DoctorId) ?? throw new NotFoundException("Doctor not found");
        var doctorUser = await _userRepository.GetById(appointment.DoctorId) ?? throw new NotFoundException("Doctor user not found");

        return MapToResponse(appointment, patient, doctor, doctorUser);
    }

    public async Task<List<AppointmentResponse>> GetAppointments(DateTime? date = null, int? patientId = null, int? doctorId = null)
    {
        var list = await _appointmentRepository.GetAppointments(date, patientId, doctorId);
        return list.Select(a => MapToResponse(a, a.Patient!, a.Doctor!, a.Doctor!.User!)).ToList();
    }

    public async Task UpdateStatus(int id, string status)
    {
        var appointment = await _appointmentRepository.GetById(id) ?? throw new NotFoundException("Appointment not found");
        appointment.Status = status;
        await _appointmentRepository.Update(appointment);
    }

    private static AppointmentResponse MapToResponse(Appointment appointment, Patient patient, DoctorProfile doctor, User doctorUser)
    {
        return new AppointmentResponse
        {
            Id = appointment.Id,
            PatientId = appointment.PatientId,
            PatientName = patient.FullName,
            PatientCode = patient.PatientCode,
            DoctorId = appointment.DoctorId,
            DoctorName = doctorUser.UserName,
            Specialization = doctor.Specialization,
            AppointmentDate = appointment.AppointmentDate,
            AppointmentType = appointment.AppointmentType,
            Status = appointment.Status,
            Notes = appointment.Notes
        };
    }
}

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
    private readonly IReceptionistProfileRepository _receptionistRepository;
    private readonly INurseProfileRepository _nurseRepository;
    private readonly ICurrentUserService _currentUserService;

    public AppointmentService(
        IAppointmentRepository appointmentRepository,
        IPatientRepository patientRepository,
        IDoctorProfileRepository doctorRepository,
        IUserRepository userRepository,
        IReceptionistProfileRepository receptionistRepository,
        INurseProfileRepository nurseRepository,
        ICurrentUserService currentUserService)
    {
        _appointmentRepository = appointmentRepository;
        _patientRepository = patientRepository;
        _doctorRepository = doctorRepository;
        _userRepository = userRepository;
        _receptionistRepository = receptionistRepository;
        _nurseRepository = nurseRepository;
        _currentUserService = currentUserService;
    }

    public async Task<AppointmentResponse> CreateAppointment(CreateAppointmentRequest request)
    {
        var patient = await _patientRepository.GetById(request.PatientId) ?? throw new NotFoundException("Patient not found");
        var doctor = await _doctorRepository.GetById(request.DoctorId) ?? throw new NotFoundException("Doctor not found");
        var doctorUser = await _userRepository.GetById(request.DoctorId) ?? throw new NotFoundException("Doctor user not found");

        var utcDate = request.AppointmentDate.ToUniversalTime();
        if (utcDate < DateTime.UtcNow)
        {
            throw new BadRequestException("Appointment date must be in the future.");
        }

        // Conflict check
        var appointments = await _appointmentRepository.GetAppointments(request.AppointmentDate, null, request.DoctorId);
        if (appointments.Any(a => a.AppointmentDate == utcDate && a.Status != "Cancelled"))
        {
            throw new BadRequestException("Doctor is already booked at this exact date and time.");
        }

        var appointment = new Appointment
        {
            PatientId = request.PatientId,
            DoctorId = request.DoctorId,
            AppointmentDate = utcDate,
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

        var utcDate = request.AppointmentDate.ToUniversalTime();
        if (utcDate < DateTime.UtcNow && request.Status != "Completed" && request.Status != "Cancelled")
        {
            throw new BadRequestException("Appointment date must be in the future.");
        }

        // Conflict check
        var appointments = await _appointmentRepository.GetAppointments(request.AppointmentDate, null, appointment.DoctorId);
        if (appointments.Any(a => a.AppointmentDate == utcDate && a.Status != "Cancelled" && a.Id != id))
        {
            throw new BadRequestException("Doctor is already booked at this exact date and time.");
        }

        appointment.AppointmentDate = utcDate;
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
        var currentUserId = _currentUserService.UserId;
        if (currentUserId.HasValue)
        {
            var doctor = await _doctorRepository.GetById(currentUserId.Value);
            if (doctor != null)
            {
                doctorId = doctor.Id;
            }
            else
            {
                var receptionist = await _receptionistRepository.GetById(currentUserId.Value);
                if (receptionist?.DoctorId != null)
                {
                    doctorId = receptionist.DoctorId;
                }
                else
                {
                    var nurse = await _nurseRepository.GetById(currentUserId.Value);
                    if (nurse?.DoctorId != null)
                    {
                        doctorId = nurse.DoctorId;
                    }
                }
            }
        }

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

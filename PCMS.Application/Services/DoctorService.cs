using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using PCMS.Application.DTOs.Doctor;
using PCMS.Application.Exceptions;
using PCMS.Application.Interfaces;
using PCMS.Domain.Entities;

namespace PCMS.Application.Services;

public class DoctorService : IDoctorService
{
    private readonly IUserRepository _userRepository;
    private readonly IDoctorProfileRepository _doctorRepository;
    private readonly IUserTenantRepository _userTenantRepository;
    private readonly IPasswordService _passwordService;
    private readonly ICurrentUserService _currentUserService;

    public DoctorService(
        IUserRepository userRepository,
        IDoctorProfileRepository doctorRepository,
        IUserTenantRepository userTenantRepository,
        IPasswordService passwordService,
        ICurrentUserService currentUserService)
    {
        _userRepository = userRepository;
        _doctorRepository = doctorRepository;
        _userTenantRepository = userTenantRepository;
        _passwordService = passwordService;
        _currentUserService = currentUserService;
    }

    public async Task<DoctorResponse> CreateDoctor(CreateDoctorRequest request)
    {
        var tenantId = _currentUserService.TenantId ?? throw new BadRequestException("Tenant ID context is required");

        if (await _userRepository.EmailExists(request.Email))
        {
            throw new BadRequestException("Email already exists");
        }

        if (await _doctorRepository.DoctorCodeExists(request.DoctorCode))
        {
            throw new BadRequestException("Doctor code already exists");
        }

        // 1. Create User
        var user = new User
        {
            UserName = request.UserName,
            Email = request.Email,
            PasswordHash = _passwordService.Hash(request.Password),
            IsActive = true,
            IsSuperAdmin = false,
            IsFirstLogin = true
        };

        await _userRepository.Add(user);

        // 2. Link User to Tenant as Doctor role
        var userTenant = new UserTenant
        {
            UserId = user.Id,
            TenantId = tenantId,
            Role = "Doctor",
            IsActive = true
        };

        await _userTenantRepository.Add(userTenant);

        // 3. Create Doctor Profile
        var doctorProfile = new DoctorProfile
        {
            Id = user.Id, // Shared PK
            TenantId = tenantId,
            DoctorCode = request.DoctorCode,
            Specialization = request.Specialization,
            Qualification = request.Qualification,
            ExperienceYears = request.ExperienceYears,
            ConsultationFee = request.ConsultationFee,
            PhoneNumber = request.PhoneNumber,
            Status = "Active"
        };

        await _doctorRepository.Add(doctorProfile);

        return MapToResponse(user, doctorProfile);
    }

    public async Task<DoctorResponse> UpdateDoctor(int id, UpdateDoctorRequest request)
    {
        var doctor = await _doctorRepository.GetById(id) ?? throw new NotFoundException("Doctor not found");
        var user = await _userRepository.GetById(id) ?? throw new NotFoundException("User not found");

        doctor.Specialization = request.Specialization;
        doctor.Qualification = request.Qualification;
        doctor.ExperienceYears = request.ExperienceYears;
        doctor.ConsultationFee = request.ConsultationFee;
        doctor.PhoneNumber = request.PhoneNumber;
        doctor.Status = request.Status;

        user.IsActive = request.IsActive;

        await _doctorRepository.Update(doctor);
        await _userRepository.Update(user);

        return MapToResponse(user, doctor);
    }

    public async Task<DoctorResponse> GetDoctorById(int id)
    {
        var doctor = await _doctorRepository.GetById(id) ?? throw new NotFoundException("Doctor not found");
        var user = await _userRepository.GetById(id) ?? throw new NotFoundException("User not found");

        return MapToResponse(user, doctor);
    }

    public async Task<List<DoctorResponse>> GetAllDoctors(string? search = null, string? specialization = null)
    {
        var doctors = await _doctorRepository.GetAll(search, specialization);
        return doctors.Select(d => MapToResponse(d.User!, d)).ToList();
    }

    public async Task<List<string>> GetSpecializations()
    {
        var doctors = await _doctorRepository.GetAll();
        return doctors.Select(d => d.Specialization).Distinct().ToList();
    }

    public async Task ToggleStatus(int id)
    {
        var doctor = await _doctorRepository.GetById(id) ?? throw new NotFoundException("Doctor not found");
        var user = await _userRepository.GetById(id) ?? throw new NotFoundException("User not found");

        doctor.Status = doctor.Status == "Active" ? "Inactive" : "Active";
        user.IsActive = doctor.Status == "Active";

        await _doctorRepository.Update(doctor);
        await _userRepository.Update(user);
    }

    private static DoctorResponse MapToResponse(User user, DoctorProfile doctor)
    {
        return new DoctorResponse
        {
            Id = doctor.Id,
            UserName = user.UserName,
            Email = user.Email,
            DoctorCode = doctor.DoctorCode,
            Specialization = doctor.Specialization,
            Qualification = doctor.Qualification,
            ExperienceYears = doctor.ExperienceYears,
            ConsultationFee = doctor.ConsultationFee,
            PhoneNumber = doctor.PhoneNumber,
            Status = doctor.Status,
            IsActive = user.IsActive
        };
    }
}

using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using PCMS.Application.DTOs.Nurse;
using PCMS.Application.Exceptions;
using PCMS.Application.Interfaces;
using PCMS.Domain.Entities;

namespace PCMS.Application.Services;

public class NurseService : INurseService
{
    private readonly IUserRepository _userRepository;
    private readonly INurseProfileRepository _nurseRepository;
    private readonly IUserTenantRepository _userTenantRepository;
    private readonly IPasswordService _passwordService;
    private readonly ICurrentUserService _currentUserService;
    private readonly IDoctorProfileRepository _doctorRepository;

    public NurseService(
        IUserRepository userRepository,
        INurseProfileRepository nurseRepository,
        IUserTenantRepository userTenantRepository,
        IPasswordService passwordService,
        ICurrentUserService currentUserService,
        IDoctorProfileRepository doctorRepository)
    {
        _userRepository = userRepository;
        _nurseRepository = nurseRepository;
        _userTenantRepository = userTenantRepository;
        _passwordService = passwordService;
        _currentUserService = currentUserService;
        _doctorRepository = doctorRepository;
    }

    public async Task<NurseResponse> CreateNurse(CreateNurseRequest request)
    {
        var tenantId = _currentUserService.TenantId ?? throw new BadRequestException("Tenant ID context is required");

        var email = string.IsNullOrWhiteSpace(request.Email)
            ? $"{request.UserName.Replace(" ", "").ToLower()}@pcms.local"
            : request.Email;

        if (await _userRepository.EmailExists(email))
        {
            throw new BadRequestException("Email already exists");
        }

        if (await _nurseRepository.EmployeeCodeExists(request.EmployeeCode))
        {
            throw new BadRequestException("Employee code already exists");
        }

        if (!_passwordService.IsStrongPassword(request.Password))
        {
            throw new BadRequestException("Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one digit, and one special character/symbol.");
        }

        // 1. Create User
        var user = new User
        {
            UserName = request.UserName,
            Email = email,
            PasswordHash = _passwordService.Hash(request.Password),
            IsActive = true,
            IsSuperAdmin = false,
            IsFirstLogin = true
        };

        await _userRepository.Add(user);

        // 2. Link to Tenant
        var userTenant = new UserTenant
        {
            UserId = user.Id,
            TenantId = tenantId,
            Role = "Nurse",
            IsActive = true
        };

        await _userTenantRepository.Add(userTenant);

        if (request.DoctorId.HasValue && await _doctorRepository.GetById(request.DoctorId.Value) == null)
        {
            throw new BadRequestException("Assigned Doctor not found");
        }

        // 3. Create Profile
        var nurseProfile = new NurseProfile
        {
            Id = user.Id, // Shared PK
            TenantId = tenantId,
            EmployeeCode = request.EmployeeCode,
            PhoneNumber = request.PhoneNumber,
            Department = request.Department,
            Status = "Active",
            DoctorId = request.DoctorId
        };

        await _nurseRepository.Add(nurseProfile);

        // Fetch nurse with includes to return mapped doctor name
        var savedProfile = await _nurseRepository.GetById(nurseProfile.Id);
        return MapToResponse(user, savedProfile ?? nurseProfile);
    }

    public async Task<NurseResponse> UpdateNurse(int id, UpdateNurseRequest request)
    {
        var nurse = await _nurseRepository.GetById(id) ?? throw new NotFoundException("Nurse not found");
        var user = await _userRepository.GetById(id) ?? throw new NotFoundException("User not found");

        if (request.DoctorId.HasValue && await _doctorRepository.GetById(request.DoctorId.Value) == null)
        {
            throw new BadRequestException("Assigned Doctor not found");
        }

        nurse.EmployeeCode = request.EmployeeCode;
        nurse.PhoneNumber = request.PhoneNumber;
        nurse.Department = request.Department;
        nurse.Status = request.Status;
        nurse.DoctorId = request.DoctorId;

        user.IsActive = request.IsActive;

        await _nurseRepository.Update(nurse);
        await _userRepository.Update(user);

        var updatedProfile = await _nurseRepository.GetById(nurse.Id);
        return MapToResponse(user, updatedProfile ?? nurse);
    }

    public async Task<NurseResponse> GetNurseById(int id)
    {
        var nurse = await _nurseRepository.GetById(id) ?? throw new NotFoundException("Nurse not found");
        var user = await _userRepository.GetById(id) ?? throw new NotFoundException("User not found");

        return MapToResponse(user, nurse);
    }

    public async Task<List<NurseResponse>> GetAllNurses()
    {
        var nurses = await _nurseRepository.GetAll();
        return nurses.Select(n => MapToResponse(n.User!, n)).ToList();
    }

    public async Task ToggleStatus(int id)
    {
        var nurse = await _nurseRepository.GetById(id) ?? throw new NotFoundException("Nurse not found");
        var user = await _userRepository.GetById(id) ?? throw new NotFoundException("User not found");

        nurse.Status = nurse.Status == "Active" ? "Inactive" : "Active";
        user.IsActive = nurse.Status == "Active";

        await _nurseRepository.Update(nurse);
        await _userRepository.Update(user);
    }

    private static NurseResponse MapToResponse(User user, NurseProfile nurse)
    {
        return new NurseResponse
        {
            Id = nurse.Id,
            UserName = user.UserName,
            Email = user.Email,
            EmployeeCode = nurse.EmployeeCode,
            PhoneNumber = nurse.PhoneNumber,
            Department = nurse.Department,
            Status = nurse.Status,
            IsActive = user.IsActive,
            DoctorId = nurse.DoctorId,
            DoctorName = nurse.Doctor?.User?.UserName
        };
    }
}

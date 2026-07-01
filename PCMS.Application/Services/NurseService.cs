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

    public NurseService(
        IUserRepository userRepository,
        INurseProfileRepository nurseRepository,
        IUserTenantRepository userTenantRepository,
        IPasswordService passwordService,
        ICurrentUserService currentUserService)
    {
        _userRepository = userRepository;
        _nurseRepository = nurseRepository;
        _userTenantRepository = userTenantRepository;
        _passwordService = passwordService;
        _currentUserService = currentUserService;
    }

    public async Task<NurseResponse> CreateNurse(CreateNurseRequest request)
    {
        var tenantId = _currentUserService.TenantId ?? throw new BadRequestException("Tenant ID context is required");

        if (await _userRepository.EmailExists(request.Email))
        {
            throw new BadRequestException("Email already exists");
        }

        if (await _nurseRepository.EmployeeCodeExists(request.EmployeeCode))
        {
            throw new BadRequestException("Employee code already exists");
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

        // 2. Link to Tenant
        var userTenant = new UserTenant
        {
            UserId = user.Id,
            TenantId = tenantId,
            Role = "Nurse",
            IsActive = true
        };

        await _userTenantRepository.Add(userTenant);

        // 3. Create Profile
        var nurseProfile = new NurseProfile
        {
            Id = user.Id, // Shared PK
            TenantId = tenantId,
            EmployeeCode = request.EmployeeCode,
            PhoneNumber = request.PhoneNumber,
            Department = request.Department,
            Status = "Active"
        };

        await _nurseRepository.Add(nurseProfile);

        return MapToResponse(user, nurseProfile);
    }

    public async Task<NurseResponse> UpdateNurse(int id, UpdateNurseRequest request)
    {
        var nurse = await _nurseRepository.GetById(id) ?? throw new NotFoundException("Nurse not found");
        var user = await _userRepository.GetById(id) ?? throw new NotFoundException("User not found");

        nurse.EmployeeCode = request.EmployeeCode;
        nurse.PhoneNumber = request.PhoneNumber;
        nurse.Department = request.Department;
        nurse.Status = request.Status;

        user.IsActive = request.IsActive;

        await _nurseRepository.Update(nurse);
        await _userRepository.Update(user);

        return MapToResponse(user, nurse);
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
            IsActive = user.IsActive
        };
    }
}

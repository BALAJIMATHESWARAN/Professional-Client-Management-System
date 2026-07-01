using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using PCMS.Application.DTOs.Receptionist;
using PCMS.Application.Exceptions;
using PCMS.Application.Interfaces;
using PCMS.Domain.Entities;

namespace PCMS.Application.Services;

public class ReceptionistService : IReceptionistService
{
    private readonly IUserRepository _userRepository;
    private readonly IReceptionistProfileRepository _receptionistRepository;
    private readonly IUserTenantRepository _userTenantRepository;
    private readonly IPasswordService _passwordService;
    private readonly ICurrentUserService _currentUserService;

    public ReceptionistService(
        IUserRepository userRepository,
        IReceptionistProfileRepository receptionistRepository,
        IUserTenantRepository userTenantRepository,
        IPasswordService passwordService,
        ICurrentUserService currentUserService)
    {
        _userRepository = userRepository;
        _receptionistRepository = receptionistRepository;
        _userTenantRepository = userTenantRepository;
        _passwordService = passwordService;
        _currentUserService = currentUserService;
    }

    public async Task<ReceptionistResponse> CreateReceptionist(CreateReceptionistRequest request)
    {
        var tenantId = _currentUserService.TenantId ?? throw new BadRequestException("Tenant ID context is required");

        if (await _userRepository.EmailExists(request.Email))
        {
            throw new BadRequestException("Email already exists");
        }

        if (await _receptionistRepository.EmployeeCodeExists(request.EmployeeCode))
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
            Role = "Receptionist",
            IsActive = true
        };

        await _userTenantRepository.Add(userTenant);

        // 3. Create Profile
        var receptionistProfile = new ReceptionistProfile
        {
            Id = user.Id, // Shared PK
            TenantId = tenantId,
            EmployeeCode = request.EmployeeCode,
            PhoneNumber = request.PhoneNumber,
            Department = request.Department,
            Status = "Active"
        };

        await _receptionistRepository.Add(receptionistProfile);

        return MapToResponse(user, receptionistProfile);
    }

    public async Task<ReceptionistResponse> UpdateReceptionist(int id, UpdateReceptionistRequest request)
    {
        var receptionist = await _receptionistRepository.GetById(id) ?? throw new NotFoundException("Receptionist not found");
        var user = await _userRepository.GetById(id) ?? throw new NotFoundException("User not found");

        receptionist.EmployeeCode = request.EmployeeCode;
        receptionist.PhoneNumber = request.PhoneNumber;
        receptionist.Department = request.Department;
        receptionist.Status = request.Status;

        user.IsActive = request.IsActive;

        await _receptionistRepository.Update(receptionist);
        await _userRepository.Update(user);

        return MapToResponse(user, receptionist);
    }

    public async Task<ReceptionistResponse> GetReceptionistById(int id)
    {
        var receptionist = await _receptionistRepository.GetById(id) ?? throw new NotFoundException("Receptionist not found");
        var user = await _userRepository.GetById(id) ?? throw new NotFoundException("User not found");

        return MapToResponse(user, receptionist);
    }

    public async Task<List<ReceptionistResponse>> GetAllReceptionists()
    {
        var receptionists = await _receptionistRepository.GetAll();
        return receptionists.Select(r => MapToResponse(r.User!, r)).ToList();
    }

    public async Task ToggleStatus(int id)
    {
        var receptionist = await _receptionistRepository.GetById(id) ?? throw new NotFoundException("Receptionist not found");
        var user = await _userRepository.GetById(id) ?? throw new NotFoundException("User not found");

        receptionist.Status = receptionist.Status == "Active" ? "Inactive" : "Active";
        user.IsActive = receptionist.Status == "Active";

        await _receptionistRepository.Update(receptionist);
        await _userRepository.Update(user);
    }

    private static ReceptionistResponse MapToResponse(User user, ReceptionistProfile receptionist)
    {
        return new ReceptionistResponse
        {
            Id = receptionist.Id,
            UserName = user.UserName,
            Email = user.Email,
            EmployeeCode = receptionist.EmployeeCode,
            PhoneNumber = receptionist.PhoneNumber,
            Department = receptionist.Department,
            Status = receptionist.Status,
            IsActive = user.IsActive
        };
    }
}

using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using PCMS.Application.DTOs.Role;
using PCMS.Application.Exceptions;
using PCMS.Application.Interfaces;
using PCMS.Domain.Entities;

namespace PCMS.Application.Services;

public class RolePermissionService : IRolePermissionService
{
    private readonly IRoleRepository _roleRepository;
    private readonly IPermissionRepository _permissionRepository;
    private readonly IRolePermissionRepository _rolePermissionRepository;
    private readonly IDashboardWidgetConfigurationRepository _widgetRepository;
    private readonly ICurrentUserService _currentUserService;

    public RolePermissionService(
        IRoleRepository roleRepository,
        IPermissionRepository permissionRepository,
        IRolePermissionRepository rolePermissionRepository,
        IDashboardWidgetConfigurationRepository widgetRepository,
        ICurrentUserService currentUserService)
    {
        _roleRepository = roleRepository;
        _permissionRepository = permissionRepository;
        _rolePermissionRepository = rolePermissionRepository;
        _widgetRepository = widgetRepository;
        _currentUserService = currentUserService;
    }

    public async Task<RoleResponse> CreateRole(CreateRoleRequest request)
    {
        var tenantId = _currentUserService.TenantId ?? throw new BadRequestException("Tenant ID context is required");

        var existing = await _roleRepository.GetByName(request.Name);
        if (existing != null)
        {
            throw new BadRequestException($"Role with name '{request.Name}' already exists.");
        }

        var role = new Role
        {
            TenantId = tenantId,
            Name = request.Name,
            IsActive = true
        };

        await _roleRepository.Add(role);

        // Pre-configure default dashboard widgets for new roles
        var defaultWidgets = new List<string>
        {
            "total_doctors", "active_doctors", "total_patients", 
            "today_appointments", "pending_appointments", "completed_appointments"
        };
        await UpdateDashboardWidgetsForRole(role.Id, defaultWidgets);

        return new RoleResponse { Id = role.Id, Name = role.Name, IsActive = role.IsActive };
    }

    public async Task<RoleResponse> UpdateRole(int id, UpdateRoleRequest request)
    {
        var role = await _roleRepository.GetById(id) ?? throw new NotFoundException("Role not found");
        
        role.Name = request.Name;
        role.IsActive = request.IsActive;

        await _roleRepository.Update(role);
        await _rolePermissionRepository.UpdateRolePermissions(id, request.PermissionIds);

        var rps = await _rolePermissionRepository.GetByRoleId(id);

        return new RoleResponse
        {
            Id = role.Id,
            Name = role.Name,
            IsActive = role.IsActive,
            Permissions = rps.Select(rp => new PermissionResponse
            {
                Id = rp.PermissionId,
                ModuleName = rp.Permission!.ModuleName,
                PermissionCode = rp.Permission!.PermissionCode
            }).ToList()
        };
    }

    public async Task<RoleResponse> GetRoleById(int id)
    {
        var role = await _roleRepository.GetById(id) ?? throw new NotFoundException("Role not found");
        var rps = await _rolePermissionRepository.GetByRoleId(id);

        return new RoleResponse
        {
            Id = role.Id,
            Name = role.Name,
            IsActive = role.IsActive,
            Permissions = rps.Select(rp => new PermissionResponse
            {
                Id = rp.PermissionId,
                ModuleName = rp.Permission!.ModuleName,
                PermissionCode = rp.Permission!.PermissionCode
            }).ToList()
        };
    }

    public async Task<List<RoleResponse>> GetAllRoles()
    {
        var roles = await _roleRepository.GetAll();
        var responses = new List<RoleResponse>();

        foreach (var role in roles)
        {
            var rps = await _rolePermissionRepository.GetByRoleId(role.Id);
            responses.Add(new RoleResponse
            {
                Id = role.Id,
                Name = role.Name,
                IsActive = role.IsActive,
                Permissions = rps.Select(rp => new PermissionResponse
                {
                    Id = rp.PermissionId,
                    ModuleName = rp.Permission!.ModuleName,
                    PermissionCode = rp.Permission!.PermissionCode
                }).ToList()
            });
        }

        return responses;
    }

    public async Task<List<PermissionResponse>> GetPermissions()
    {
        var list = await _permissionRepository.GetAll();
        return list.Select(p => new PermissionResponse
        {
            Id = p.Id,
            ModuleName = p.ModuleName,
            PermissionCode = p.PermissionCode
        }).ToList();
    }

    public async Task SeedSystemPermissions()
    {
        var defaultPermissions = new List<Permission>
        {
            // Patient Module
            new() { ModuleName = "Patient Management", PermissionCode = "Patient.View" },
            new() { ModuleName = "Patient Management", PermissionCode = "Patient.Create" },
            new() { ModuleName = "Patient Management", PermissionCode = "Patient.Edit" },
            new() { ModuleName = "Patient Management", PermissionCode = "Patient.Delete" },

            // Appointment Module
            new() { ModuleName = "Appointment Management", PermissionCode = "Appointment.View" },
            new() { ModuleName = "Appointment Management", PermissionCode = "Appointment.Create" },
            new() { ModuleName = "Appointment Management", PermissionCode = "Appointment.Edit" },
            new() { ModuleName = "Appointment Management", PermissionCode = "Appointment.Delete" },

            // Doctor Module
            new() { ModuleName = "Doctor Management", PermissionCode = "Doctor.View" },
            new() { ModuleName = "Doctor Management", PermissionCode = "Doctor.Create" },
            new() { ModuleName = "Doctor Management", PermissionCode = "Doctor.Edit" },
            new() { ModuleName = "Doctor Management", PermissionCode = "Doctor.Delete" },

            // Reports
            new() { ModuleName = "Reports", PermissionCode = "Reports.View" }
        };

        await _permissionRepository.AddRange(defaultPermissions);
    }

    public async Task<List<string>> GetPermissionCodesForUser(int userId)
    {
        return await _rolePermissionRepository.GetPermissionCodesForUser(userId);
    }

    public async Task<List<string>> GetDashboardWidgetsForRole(int roleId)
    {
        var configs = await _widgetRepository.GetByRoleId(roleId);
        return configs.Where(w => w.IsVisible).Select(w => w.WidgetKey).ToList();
    }

    public async Task UpdateDashboardWidgetsForRole(int roleId, List<string> widgetKeys)
    {
        var tenantId = _currentUserService.TenantId ?? throw new BadRequestException("Tenant ID context is required");

        var configurations = widgetKeys.Select((key, idx) => new DashboardWidgetConfiguration
        {
            TenantId = tenantId,
            RoleId = roleId,
            WidgetKey = key,
            IsVisible = true,
            DisplayOrder = idx
        }).ToList();

        await _widgetRepository.UpdateConfigurations(roleId, configurations);
    }
}

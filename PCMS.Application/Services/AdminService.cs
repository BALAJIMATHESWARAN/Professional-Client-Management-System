using PCMS.Application.DTOs.Admin;
using PCMS.Application.Exceptions;
using PCMS.Application.Interfaces;
using PCMS.Domain.Constants;
using PCMS.Domain.Entities;

namespace PCMS.Application.Services;

public class AdminService : IAdminService
{
    private readonly IUserRepository _userRepository;
    private readonly IUserTenantRepository _userTenantRepository;
    private readonly IPasswordService _passwordService;
    private readonly ITenantRepository _tenantRepository;
    private readonly IUserTenantModuleRepository _userTenantModuleRepository;
    private readonly IModuleRepository _moduleRepository;
    private readonly IAuditLogService _auditLogService;
    private readonly IEmailService _emailService;

    public AdminService(
        IUserRepository userRepository,
        IUserTenantRepository userTenantRepository,
        IPasswordService passwordService,
        ITenantRepository tenantRepository,
        IUserTenantModuleRepository userTenantModuleRepository,
        IModuleRepository moduleRepository,
        IAuditLogService auditLogService,
        IEmailService emailService)
    {
        _userRepository = userRepository;
        _userTenantRepository = userTenantRepository;
        _passwordService = passwordService;
        _tenantRepository = tenantRepository;
        _userTenantModuleRepository = userTenantModuleRepository;
        _moduleRepository = moduleRepository;
        _auditLogService = auditLogService;
        _emailService = emailService;
    }

    public async Task<RegisterAdminResponseDto> RegisterAdmin(
        RegisterAdminRequestDto request,
        int currentUserId)
    {
        var tenant = await _tenantRepository.GetById(request.TenantId);

        if (tenant == null)
        {
            throw new NotFoundException("Tenant not found");
        }

        // Validate Email format & DNS/Disposable checks
        if (!await EmailValidator.IsValidEmail(request.Email))
        {
            throw new BadRequestException("The email address provided is invalid, does not exist, or uses a temporary/disposable domain.");
        }

        // Validate Password Strength (Complexity)
        if (!_passwordService.IsStrongPassword(request.Password))
        {
            throw new BadRequestException("Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one digit, and one special character/symbol.");
        }

        var normalizedEmail = request.Email.Trim().ToLowerInvariant();

        if (await _userRepository.EmailExists(normalizedEmail))
        {
            throw new BadRequestException("Email already exists");
        }

        var user = new User
        {
            UserName = request.UserName,
            Email = normalizedEmail,
            PasswordHash = _passwordService.Hash(request.Password),
            IsSuperAdmin = false,
            IsActive = true,
            IsFirstLogin = false,
            CreatedBy = currentUserId,
            CreatedAt = DateTime.UtcNow
        };

        await _userRepository.Add(user);

        var userTenant = new UserTenant
        {
            UserId = user.Id,
            TenantId = request.TenantId,
            Role = Roles.Admin,
            IsActive = true,
            CreatedBy = currentUserId,
            CreatedAt = DateTime.UtcNow
        };

        await _userTenantRepository.Add(userTenant);
        await _auditLogService.LogAsync("REGISTER_ADMIN", "User", user.Id.ToString(), $"Registered admin {user.UserName} ({user.Email}) for Tenant ID {request.TenantId}", currentUserId, null, request.TenantId);

        // Send welcome email to the newly registered admin
        try
        {
            var loginLink = "http://localhost:5173/login";
            var emailSubject = "Welcome to PCMS - Admin Registration Successful";
            var emailBody = $@"
                <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #ffffff;'>
                    <h2 style='color: #226db4; text-align: center; margin-bottom: 20px;'>Welcome to PCMS!</h2>
                    <p>Dear {user.UserName},</p>
                    <p>We are excited to welcome you to the PCMS platform. Your administrative account for tenant <strong>{tenant.Name}</strong> has been successfully registered.</p>
                    <div style='background-color: #f5f8fa; border: 1px solid #dbe3eb; padding: 15px; border-radius: 6px; margin: 20px 0;'>
                        <p style='margin: 0 0 10px 0; font-weight: bold; color: #1c273c;'>Your Login Credentials:</p>
                        <p style='margin: 5px 0;'><strong>Username / Email:</strong> {user.Email}</p>
                        <p style='margin: 5px 0;'><strong>Temporary Password:</strong> <code style='background: #cbd6e2; padding: 2px 6px; border-radius: 4px;'>{request.Password}</code></p>
                    </div>
                    <p>Please use the button below to sign in. Upon your first login, you may be prompted to review or update your security credentials.</p>
                    <div style='text-align: center; margin: 30px 0;'>
                        <a href='{loginLink}' style='background-color: #226db4; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;'>Login to PCMS Console</a>
                    </div>
                    <hr style='border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;' />
                    <p style='font-size: 0.85rem; color: #8da2bb; text-align: center; margin: 0;'>This is an automated security email from PCMS. If you did not request this account, please contact your systems administrator.</p>
                </div>";

            await _emailService.SendEmailAsync(user.Email, emailSubject, emailBody);
        }
        catch (Exception ex)
        {
            Console.ForegroundColor = ConsoleColor.Yellow;
            Console.WriteLine($"[Welcome Email Error] Failed to send credentials email to {user.Email}: {ex.Message}");
            Console.ResetColor();
        }

        return new RegisterAdminResponseDto
        {
            UserId = user.Id,
            Message = "Admin registered successfully"
        };
    }

    public async Task AssignModule(
        AssignModuleRequestDto request,
        int currentUserId)
    {
        var tenant = await _tenantRepository.GetById(request.TenantId);

        if (tenant == null)
        {
            throw new NotFoundException("Tenant not found");
        }

        var userTenant = await _userTenantRepository.GetUserTenant(
            request.UserId,
            request.TenantId);

        if (userTenant == null)
        {
            throw new BadRequestException(
                "User is not assigned to this tenant");
        }

        var module = await _moduleRepository.GetById(
            request.ModuleId);

        if (module == null)
        {
            throw new NotFoundException(
                "Module not found");
        }

        var exists = await _userTenantModuleRepository.Exists(
            request.UserId,
            request.TenantId,
            request.ModuleId);

        if (exists)
        {
            throw new BadRequestException(
                "Module already assigned");
        }

        await _userTenantModuleRepository.Add(
            new UserTenantModule
            {
                UserId = request.UserId,
                TenantId = request.TenantId,
                ModuleId = request.ModuleId,
                IsActive = true,
                CreatedBy = currentUserId,
                CreatedAt = DateTime.UtcNow
            });
        await _auditLogService.LogAsync("ASSIGN_MODULE", "UserTenantModule", request.ModuleId.ToString(), $"Assigned module '{module.Name}' to user {request.UserId} for Tenant ID {request.TenantId}", currentUserId, null, request.TenantId);
    }

    public async Task<List<AssignedModuleResponseDto>>
        GetAssignedModules(
            int userId,
            int tenantId)
    {
        var modules =
            await _userTenantModuleRepository
                .GetByUserAndTenant(
                    userId,
                    tenantId);

        return modules
            .Select(x =>
                new AssignedModuleResponseDto
                {
                    ModuleId = x.ModuleId,
                    ModuleName = x.Module?.Name ?? ""
                })
            .ToList();
    }

    public async Task<List<AdminUserDto>> GetAllAdmins()
    {
        var admins = await _userTenantRepository.GetAllAdmins();
        var dtos = new List<AdminUserDto>();

        foreach (var x in admins)
        {
            var modules = await _userTenantModuleRepository.GetByUserAndTenant(x.UserId, x.TenantId);
            dtos.Add(new AdminUserDto
            {
                UserId = x.UserId,
                UserName = x.User?.UserName ?? "",
                Email = x.User?.Email ?? "",
                TenantId = x.TenantId,
                TenantName = x.Tenant?.Name ?? "",
                IsActive = x.IsActive && (x.User?.IsActive ?? false) && (x.Tenant?.IsActive ?? false),
                AssignedModules = modules.Select(m => m.Module?.Name ?? "").ToList()
            });
        }

        return dtos;
    }

    public async Task<List<ModuleDto>> GetAllModules()
    {
        var modules = await _moduleRepository.GetAll();
        return modules
            .Select(x => new ModuleDto
            {
                Id = x.Id,
                Name = x.Name
            })
            .ToList();
    }

    public async Task ToggleAdminStatus(int userId, bool active, int currentUserId)
    {
        var user = await _userRepository.GetById(userId);
        if (user == null)
        {
            throw new NotFoundException("Admin user not found");
        }

        user.IsActive = active;
        user.ModifiedBy = currentUserId;
        user.ModifiedAt = DateTime.UtcNow;

        await _userRepository.Update(user);
        await _auditLogService.LogAsync("TOGGLE_ADMIN_STATUS", "User", user.Id.ToString(), $"Changed admin {user.UserName} status to {(active ? "Active" : "Inactive")}", currentUserId, null, null);
    }

    public async Task AssignAdminToTenant(int userId, int tenantId, int currentUserId)
    {
        var user = await _userRepository.GetById(userId);
        if (user == null)
        {
            throw new NotFoundException("Admin user not found");
        }

        var tenant = await _tenantRepository.GetById(tenantId);
        if (tenant == null)
        {
            throw new NotFoundException("Tenant not found");
        }

        var exists = await _userTenantRepository.Exists(userId, tenantId);
        if (exists)
        {
            throw new BadRequestException("Admin is already assigned to this tenant");
        }

        var userTenant = new UserTenant
        {
            UserId = userId,
            TenantId = tenantId,
            Role = PCMS.Domain.Constants.Roles.Admin,
            IsActive = true,
            CreatedBy = currentUserId,
            CreatedAt = DateTime.UtcNow
        };

        await _userTenantRepository.Add(userTenant);
        await _auditLogService.LogAsync("ASSIGN_TENANT", "UserTenant", tenantId.ToString(), $"Assigned admin {user.UserName} to tenant {tenant.Name}", currentUserId, null, tenantId);
    }

    public async Task UpdateAdmin(int userId, UpdateAdminRequestDto request, int currentUserId)
    {
        var user = await _userRepository.GetById(userId);
        if (user == null)
        {
            throw new NotFoundException("Admin user not found");
        }

        var normalizedEmail = (request.Email ?? string.Empty).Trim().ToLowerInvariant();

        if (user.Email.ToLower() != normalizedEmail)
        {
            // Validate Email format & DNS/Disposable checks
            if (!await EmailValidator.IsValidEmail(request.Email))
            {
                throw new BadRequestException("The email address provided is invalid, does not exist, or uses a temporary/disposable domain.");
            }

            if (await _userRepository.EmailExists(normalizedEmail))
            {
                throw new BadRequestException("Email already exists");
            }
        }

        user.UserName = request.UserName;
        user.Email = normalizedEmail;

        if (!string.IsNullOrWhiteSpace(request.Password))
        {
            // Validate Password Strength (Complexity)
            if (!_passwordService.IsStrongPassword(request.Password))
            {
                throw new BadRequestException("Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one digit, and one special character/symbol.");
            }
            user.PasswordHash = _passwordService.Hash(request.Password);
        }
        user.ModifiedBy = currentUserId;
        user.ModifiedAt = DateTime.UtcNow;

        await _userRepository.Update(user);

        // Fetch all tenant mappings for user
        var userTenants = await _userTenantRepository.GetAllAdmins();
        var adminTenant = userTenants.FirstOrDefault(x => x.UserId == userId);
        
        var oldTenantId = adminTenant?.TenantId ?? 0;
        
        if (adminTenant != null)
        {
            if (adminTenant.TenantId != request.TenantId)
            {
                // Delete old modules
                var existingModules = await _userTenantModuleRepository.GetByUserAndTenant(userId, oldTenantId);
                foreach (var mod in existingModules)
                {
                    await _userTenantModuleRepository.Delete(mod);
                }

                adminTenant.TenantId = request.TenantId;
                await _userTenantRepository.Update(adminTenant);
            }
            else
            {
                // Tenant same: clear existing modules for this workspace
                var existingModules = await _userTenantModuleRepository.GetByUserAndTenant(userId, request.TenantId);
                foreach (var mod in existingModules)
                {
                    await _userTenantModuleRepository.Delete(mod);
                }
            }
        }
        else
        {
            adminTenant = new UserTenant
            {
                UserId = userId,
                TenantId = request.TenantId,
                Role = PCMS.Domain.Constants.Roles.Admin,
                IsActive = true,
                CreatedBy = currentUserId,
                CreatedAt = DateTime.UtcNow
            };
            await _userTenantRepository.Add(adminTenant);
        }

        // Add new modules
        foreach (var moduleId in request.ModuleIds)
        {
            await _userTenantModuleRepository.Add(new UserTenantModule
            {
                UserId = userId,
                TenantId = request.TenantId,
                ModuleId = moduleId,
                IsActive = true,
                CreatedBy = currentUserId,
                CreatedAt = DateTime.UtcNow
            });
        }

        await _auditLogService.LogAsync("UPDATE_ADMIN", "User", userId.ToString(), $"Updated admin details for {user.UserName} ({user.Email})", currentUserId, null, request.TenantId);
    }
}
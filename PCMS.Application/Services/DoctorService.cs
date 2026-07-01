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
    private readonly IDynamicFieldRepository _fieldRepository;
    private readonly IDynamicRecordRepository _recordRepository;
    private readonly IModuleRepository _moduleRepository;

    public DoctorService(
        IUserRepository userRepository,
        IDoctorProfileRepository doctorRepository,
        IUserTenantRepository userTenantRepository,
        IPasswordService passwordService,
        ICurrentUserService currentUserService,
        IDynamicFieldRepository fieldRepository,
        IDynamicRecordRepository recordRepository,
        IModuleRepository moduleRepository)
    {
        _userRepository = userRepository;
        _doctorRepository = doctorRepository;
        _userTenantRepository = userTenantRepository;
        _passwordService = passwordService;
        _currentUserService = currentUserService;
        _fieldRepository = fieldRepository;
        _recordRepository = recordRepository;
        _moduleRepository = moduleRepository;
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

        // Get Module ID for Doctor module
        var modules = await _moduleRepository.GetAll();
        var doctorModule = modules.FirstOrDefault(m => m.Name.Contains("Doctor", StringComparison.OrdinalIgnoreCase));
        var moduleId = doctorModule?.Id ?? 0;

        // EAV validation and saving
        int? dynamicRecordId = null;
        var customFieldsDict = new Dictionary<string, string>();

        if (moduleId > 0)
        {
            var fields = await _fieldRepository.GetFieldsByTenantAndModule(tenantId, moduleId);
            var doctorFields = fields.Where(f => f.EntityName == "Doctor").ToList();
            
            // Validate required dynamic fields
            foreach (var field in doctorFields.Where(f => f.IsRequired))
            {
                if (!request.CustomFields.TryGetValue(field.FieldName, out var val) || string.IsNullOrWhiteSpace(val))
                {
                    throw new BadRequestException($"The custom field '{field.FieldName}' is required.");
                }
            }

            if (doctorFields.Count > 0)
            {
                var record = new DynamicRecord
                {
                    ModuleId = moduleId,
                    TenantId = tenantId
                };
                await _recordRepository.Add(record);
                dynamicRecordId = record.Id;

                foreach (var field in doctorFields)
                {
                    request.CustomFields.TryGetValue(field.FieldName, out var val);
                    var valStr = val ?? "";
                    
                    var recordValue = new DynamicRecordValue
                    {
                        DynamicRecordId = record.Id,
                        DynamicFieldId = field.Id,
                        Value = valStr
                    };
                    await _recordRepository.AddValue(recordValue);
                    customFieldsDict[field.FieldName] = valStr;
                }
            }
        }

        if (!_passwordService.IsStrongPassword(request.Password))
        {
            throw new BadRequestException("Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one digit, and one special character/symbol.");
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
            ConsultationFee = request.ConsultationFee ?? 0,
            PhoneNumber = request.PhoneNumber,
            Status = "Active",
            DynamicRecordId = dynamicRecordId,
            FullLegalName = request.FullLegalName,
            MobileNumber = request.MobileNumber,
            Email = request.Email,
            RegistrationNumber = request.RegistrationNumber,
            MedicalCouncil = request.MedicalCouncil,
            RegistrationCertificate = request.RegistrationCertificate,
            VerificationStatus = "Pending"
        };

        await _doctorRepository.Add(doctorProfile);

        var response = MapToResponse(user, doctorProfile);
        response.CustomFields = customFieldsDict;
        return response;
    }

    public async Task<DoctorResponse> UpdateDoctor(int id, UpdateDoctorRequest request)
    {
        var doctor = await _doctorRepository.GetById(id) ?? throw new NotFoundException("Doctor not found");
        var user = await _userRepository.GetById(id) ?? throw new NotFoundException("User not found");
        var tenantId = _currentUserService.TenantId ?? throw new BadRequestException("Tenant ID context is required");

        doctor.Specialization = request.Specialization;
        doctor.Qualification = request.Qualification;
        doctor.ExperienceYears = request.ExperienceYears;
        doctor.ConsultationFee = request.ConsultationFee ?? 0;
        doctor.PhoneNumber = request.PhoneNumber;
        doctor.Status = request.Status;

        doctor.FullLegalName = request.FullLegalName;
        doctor.MobileNumber = request.MobileNumber;
        doctor.RegistrationNumber = request.RegistrationNumber;
        doctor.MedicalCouncil = request.MedicalCouncil;
        doctor.RegistrationCertificate = request.RegistrationCertificate;
        doctor.VerificationStatus = request.VerificationStatus;

        user.IsActive = request.IsActive;

        // Resolve custom fields
        var modules = await _moduleRepository.GetAll();
        var doctorModule = modules.FirstOrDefault(m => m.Name.Contains("Doctor", StringComparison.OrdinalIgnoreCase));
        var moduleId = doctorModule?.Id ?? 0;

        var customFieldsDict = new Dictionary<string, string>();

        if (moduleId > 0)
        {
            var fields = await _fieldRepository.GetFieldsByTenantAndModule(tenantId, moduleId);
            var doctorFields = fields.Where(f => f.EntityName == "Doctor").ToList();
            
            // Validate required fields
            foreach (var field in doctorFields.Where(f => f.IsRequired))
            {
                if (!request.CustomFields.TryGetValue(field.FieldName, out var val) || string.IsNullOrWhiteSpace(val))
                {
                    throw new BadRequestException($"The custom field '{field.FieldName}' is required.");
                }
            }

            if (doctorFields.Count > 0)
            {
                DynamicRecord? record;
                if (doctor.DynamicRecordId.HasValue)
                {
                    record = await _recordRepository.GetById(doctor.DynamicRecordId.Value);
                }
                else
                {
                    record = new DynamicRecord { ModuleId = moduleId, TenantId = tenantId };
                    await _recordRepository.Add(record);
                    doctor.DynamicRecordId = record.Id;
                }

                if (record != null)
                {
                    // Clear old values
                    if (record.Values != null && record.Values.Count > 0)
                    {
                        await _recordRepository.DeleteValues(record.Values);
                    }

                    // Save new values
                    foreach (var field in doctorFields)
                    {
                        request.CustomFields.TryGetValue(field.FieldName, out var val);
                        var valStr = val ?? "";

                        var recordValue = new DynamicRecordValue
                        {
                            DynamicRecordId = record.Id,
                            DynamicFieldId = field.Id,
                            Value = valStr
                        };
                        await _recordRepository.AddValue(recordValue);
                        customFieldsDict[field.FieldName] = valStr;
                    }
                }
            }
        }

        await _doctorRepository.Update(doctor);
        await _userRepository.Update(user);

        var response = MapToResponse(user, doctor);
        response.CustomFields = customFieldsDict;
        return response;
    }

    public async Task<DoctorResponse> GetDoctorById(int id)
    {
        var doctor = await _doctorRepository.GetById(id) ?? throw new NotFoundException("Doctor not found");
        var user = await _userRepository.GetById(id) ?? throw new NotFoundException("User not found");

        var response = MapToResponse(user, doctor);

        if (doctor.DynamicRecordId.HasValue)
        {
            var record = await _recordRepository.GetById(doctor.DynamicRecordId.Value);
            if (record != null && record.Values != null)
            {
                var fields = await _fieldRepository.GetFieldsByTenantAndModule(doctor.TenantId, record.ModuleId);
                var fieldMap = fields.Where(f => f.EntityName == "Doctor").ToDictionary(f => f.Id, f => f.FieldName);

                foreach (var val in record.Values)
                {
                    if (fieldMap.TryGetValue(val.DynamicFieldId, out var fieldName))
                    {
                        response.CustomFields[fieldName] = val.Value ?? "";
                    }
                }
            }
        }

        return response;
    }

    public async Task<List<DoctorResponse>> GetAllDoctors(string? search = null, string? specialization = null)
    {
        var doctors = await _doctorRepository.GetAll(search, specialization);
        var responseList = new List<DoctorResponse>();

        var modules = await _moduleRepository.GetAll();
        var doctorModule = modules.FirstOrDefault(m => m.Name.Contains("Doctor", StringComparison.OrdinalIgnoreCase));
        var moduleId = doctorModule?.Id ?? 0;

        var tenantId = _currentUserService.TenantId ?? 0;
        var fields = moduleId > 0 ? await _fieldRepository.GetFieldsByTenantAndModule(tenantId, moduleId) : new List<DynamicField>();
        var fieldMap = fields.Where(f => f.EntityName == "Doctor").ToDictionary(f => f.Id, f => f.FieldName);

        foreach (var doctor in doctors)
        {
            var res = MapToResponse(doctor.User!, doctor);
            if (doctor.DynamicRecordId.HasValue)
            {
                var record = await _recordRepository.GetById(doctor.DynamicRecordId.Value);
                if (record != null && record.Values != null)
                {
                    foreach (var val in record.Values)
                    {
                        if (fieldMap.TryGetValue(val.DynamicFieldId, out var fieldName))
                        {
                            res.CustomFields[fieldName] = val.Value ?? "";
                        }
                    }
                }
            }
            responseList.Add(res);
        }

        return responseList;
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
            Email = doctor.Email,
            DoctorCode = doctor.DoctorCode,
            Specialization = doctor.Specialization,
            Qualification = doctor.Qualification,
            ExperienceYears = doctor.ExperienceYears,
            ConsultationFee = doctor.ConsultationFee,
            PhoneNumber = doctor.PhoneNumber,
            Status = doctor.Status,
            IsActive = user.IsActive,
            FullLegalName = doctor.FullLegalName,
            MobileNumber = doctor.MobileNumber,
            RegistrationNumber = doctor.RegistrationNumber,
            MedicalCouncil = doctor.MedicalCouncil,
            RegistrationCertificate = doctor.RegistrationCertificate,
            VerificationStatus = doctor.VerificationStatus,
            CustomFields = new Dictionary<string, string>()
        };
    }
}

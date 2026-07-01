using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using PCMS.Application.DTOs.Patient;
using PCMS.Application.Exceptions;
using PCMS.Application.Interfaces;
using PCMS.Domain.Entities;

namespace PCMS.Application.Services;

public class PatientService : IPatientService
{
    private readonly IPatientRepository _patientRepository;
    private readonly IDynamicFieldRepository _fieldRepository;
    private readonly IDynamicRecordRepository _recordRepository;
    private readonly IModuleRepository _moduleRepository;
    private readonly ICurrentUserService _currentUserService;

    public PatientService(
        IPatientRepository patientRepository,
        IDynamicFieldRepository fieldRepository,
        IDynamicRecordRepository recordRepository,
        IModuleRepository moduleRepository,
        ICurrentUserService currentUserService)
    {
        _patientRepository = patientRepository;
        _fieldRepository = fieldRepository;
        _recordRepository = recordRepository;
        _moduleRepository = moduleRepository;
        _currentUserService = currentUserService;
    }

    public async Task<PatientResponse> CreatePatient(CreatePatientRequest request)
    {
        var tenantId = _currentUserService.TenantId ?? throw new BadRequestException("Tenant ID context is required");

        if (await _patientRepository.PatientCodeExists(request.PatientCode))
        {
            throw new BadRequestException("Patient code already exists");
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
            
            // Validate required dynamic fields
            foreach (var field in fields.Where(f => f.IsRequired))
            {
                if (!request.CustomFields.TryGetValue(field.FieldName, out var val) || string.IsNullOrWhiteSpace(val))
                {
                    throw new BadRequestException($"The custom field '{field.FieldName}' is required.");
                }
            }

            if (fields.Count > 0)
            {
                var record = new DynamicRecord
                {
                    ModuleId = moduleId,
                    TenantId = tenantId
                };
                await _recordRepository.Add(record);
                dynamicRecordId = record.Id;

                foreach (var field in fields)
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

        var patient = new Patient
        {
            TenantId = tenantId,
            PatientCode = request.PatientCode,
            FullName = request.FullName,
            DateOfBirth = request.DateOfBirth.ToUniversalTime(),
            Gender = request.Gender,
            PhoneNumber = request.PhoneNumber,
            Email = request.Email,
            Address = request.Address,
            EmergencyContact = request.EmergencyContact,
            BloodGroup = request.BloodGroup,
            WhatsAppNumber = request.WhatsAppNumber,
            WhatsAppConsent = request.WhatsAppConsent,
            DynamicRecordId = dynamicRecordId
        };

        await _patientRepository.Add(patient);

        var response = MapToResponse(patient);
        response.CustomFields = customFieldsDict;
        return response;
    }

    public async Task<PatientResponse> UpdatePatient(int id, UpdatePatientRequest request)
    {
        var patient = await _patientRepository.GetById(id) ?? throw new NotFoundException("Patient not found");
        var tenantId = _currentUserService.TenantId ?? throw new BadRequestException("Tenant ID context is required");

        patient.FullName = request.FullName;
        patient.DateOfBirth = request.DateOfBirth.ToUniversalTime();
        patient.Gender = request.Gender;
        patient.PhoneNumber = request.PhoneNumber;
        patient.Email = request.Email;
        patient.Address = request.Address;
        patient.EmergencyContact = request.EmergencyContact;
        patient.BloodGroup = request.BloodGroup;
        patient.WhatsAppNumber = request.WhatsAppNumber;
        patient.WhatsAppConsent = request.WhatsAppConsent;

        // Resolve custom fields
        var modules = await _moduleRepository.GetAll();
        var doctorModule = modules.FirstOrDefault(m => m.Name.Contains("Doctor", StringComparison.OrdinalIgnoreCase));
        var moduleId = doctorModule?.Id ?? 0;

        var customFieldsDict = new Dictionary<string, string>();

        if (moduleId > 0)
        {
            var fields = await _fieldRepository.GetFieldsByTenantAndModule(tenantId, moduleId);
            
            // Validate required fields
            foreach (var field in fields.Where(f => f.IsRequired))
            {
                if (!request.CustomFields.TryGetValue(field.FieldName, out var val) || string.IsNullOrWhiteSpace(val))
                {
                    throw new BadRequestException($"The custom field '{field.FieldName}' is required.");
                }
            }

            if (fields.Count > 0)
            {
                DynamicRecord? record;
                if (patient.DynamicRecordId.HasValue)
                {
                    record = await _recordRepository.GetById(patient.DynamicRecordId.Value);
                }
                else
                {
                    record = new DynamicRecord { ModuleId = moduleId, TenantId = tenantId };
                    await _recordRepository.Add(record);
                    patient.DynamicRecordId = record.Id;
                }

                if (record != null)
                {
                    // Clear old values
                    if (record.Values != null && record.Values.Count > 0)
                    {
                        await _recordRepository.DeleteValues(record.Values);
                    }

                    // Save new values
                    foreach (var field in fields)
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

        await _patientRepository.Update(patient);

        var response = MapToResponse(patient);
        response.CustomFields = customFieldsDict;
        return response;
    }

    public async Task<PatientResponse> GetPatientById(int id)
    {
        var patient = await _patientRepository.GetById(id) ?? throw new NotFoundException("Patient not found");
        var response = MapToResponse(patient);

        if (patient.DynamicRecordId.HasValue)
        {
            var record = await _recordRepository.GetById(patient.DynamicRecordId.Value);
            if (record != null && record.Values != null)
            {
                // Fetch dynamic fields list to match IDs with FieldNames
                var fields = await _fieldRepository.GetFieldsByTenantAndModule(patient.TenantId, record.ModuleId);
                var fieldMap = fields.ToDictionary(f => f.Id, f => f.FieldName);

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

    public async Task<(List<PatientResponse> Patients, int TotalCount)> GetAllPatients(string? search = null, int pageNumber = 1, int pageSize = 10)
    {
        var (patients, totalCount) = await _patientRepository.GetAll(search, pageNumber, pageSize);
        var responseList = new List<PatientResponse>();

        // Load modules for field mapping
        var modules = await _moduleRepository.GetAll();
        var doctorModule = modules.FirstOrDefault(m => m.Name.Contains("Doctor", StringComparison.OrdinalIgnoreCase));
        var moduleId = doctorModule?.Id ?? 0;

        var tenantId = _currentUserService.TenantId ?? 0;
        var fields = moduleId > 0 ? await _fieldRepository.GetFieldsByTenantAndModule(tenantId, moduleId) : new List<DynamicField>();
        var fieldMap = fields.ToDictionary(f => f.Id, f => f.FieldName);

        foreach (var patient in patients)
        {
            var res = MapToResponse(patient);
            if (patient.DynamicRecordId.HasValue)
            {
                var record = await _recordRepository.GetById(patient.DynamicRecordId.Value);
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

        return (responseList, totalCount);
    }

    public async Task DeletePatient(int id)
    {
        var patient = await _patientRepository.GetById(id) ?? throw new NotFoundException("Patient not found");
        
        // Soft delete patient (handled automatically by interceptor)
        await _patientRepository.Update(patient);
    }

    private static PatientResponse MapToResponse(Patient patient)
    {
        return new PatientResponse
        {
            Id = patient.Id,
            PatientCode = patient.PatientCode,
            FullName = patient.FullName,
            DateOfBirth = patient.DateOfBirth,
            Gender = patient.Gender,
            PhoneNumber = patient.PhoneNumber,
            Email = patient.Email,
            Address = patient.Address,
            EmergencyContact = patient.EmergencyContact,
            BloodGroup = patient.BloodGroup,
            WhatsAppNumber = patient.WhatsAppNumber,
            WhatsAppConsent = patient.WhatsAppConsent,
            CustomFields = new Dictionary<string, string>()
        };
    }
}

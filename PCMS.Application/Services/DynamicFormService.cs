using PCMS.Application.Exceptions;
using PCMS.Application.Interfaces;
using PCMS.Domain.Entities;

namespace PCMS.Application.Services;

public class DynamicFormService : IDynamicFormService
{
    private readonly IDynamicFieldRepository _fieldRepo;
    private readonly IDynamicRecordRepository _recordRepo;
    private readonly IAuditLogService _auditLogService;

    public DynamicFormService(
        IDynamicFieldRepository fieldRepo,
        IDynamicRecordRepository recordRepo,
        IAuditLogService auditLogService)
    {
        _fieldRepo = fieldRepo;
        _recordRepo = recordRepo;
        _auditLogService = auditLogService;
    }

    // --- Fields Configuration ---
    public async Task<List<DynamicFieldDto>> GetFields(int tenantId, int moduleId, string? entityName = null)
    {
        var fields = await _fieldRepo.GetFieldsByTenantAndModule(tenantId, moduleId);
        if (entityName == "ALL")
        {
            return fields.Select(MapToFieldDto).ToList();
        }

        if (!string.IsNullOrEmpty(entityName))
        {
            fields = fields.Where(f => f.EntityName == entityName).ToList();
        }
        else
        {
            fields = fields.Where(f => string.IsNullOrEmpty(f.EntityName) || f.EntityName == "Patient").ToList();
        }
        return fields.Select(MapToFieldDto).ToList();
    }

    public async Task<DynamicFieldDto?> GetFieldById(int id)
    {
        var field = await _fieldRepo.GetById(id);
        return field == null ? null : MapToFieldDto(field);
    }

    public async Task<DynamicFieldDto> CreateField(CreateFieldDto dto, int currentUserId)
    {
        var field = new DynamicField
        {
            TenantId = dto.TenantId,
            ModuleId = dto.ModuleId,
            FieldName = dto.FieldName,
            FieldType = dto.FieldType,
            EntityName = dto.EntityName,
            IsRequired = dto.IsRequired,
            DisplayOrder = dto.DisplayOrder,
            IsActive = true,
            CreatedBy = currentUserId,
            CreatedAt = DateTime.UtcNow
        };

        await _fieldRepo.Add(field);
        await _auditLogService.LogAsync("CREATE_FIELD", "DynamicField", field.Id.ToString(), $"Created dynamic field '{field.FieldName}' (Type: {field.FieldType}, Entity: {field.EntityName}) for Module ID {field.ModuleId}", currentUserId, null, field.TenantId);
        return MapToFieldDto(field);
    }

    public async Task UpdateField(int id, UpdateFieldDto dto, int currentUserId)
    {
        var field = await _fieldRepo.GetById(id);
        if (field == null)
        {
            throw new NotFoundException("Dynamic Field not found");
        }

        field.FieldName = dto.FieldName;
        field.FieldType = dto.FieldType;
        field.EntityName = dto.EntityName;
        field.IsRequired = dto.IsRequired;
        field.DisplayOrder = dto.DisplayOrder;
        field.IsActive = dto.IsActive;
        field.ModifiedBy = currentUserId;
        field.ModifiedAt = DateTime.UtcNow;

        await _fieldRepo.Update(field);
        await _auditLogService.LogAsync("UPDATE_FIELD", "DynamicField", field.Id.ToString(), $"Updated dynamic field '{field.FieldName}' (Type: {field.FieldType}, Entity: {field.EntityName}) for Module ID {field.ModuleId}", currentUserId, null, field.TenantId);
    }

    public async Task DeleteField(int id, int currentUserId)
    {
        var field = await _fieldRepo.GetById(id);
        if (field == null)
        {
            throw new NotFoundException("Dynamic Field not found");
        }

        // Soft delete/Deactivate field
        field.IsActive = false;
        field.ModifiedBy = currentUserId;
        field.ModifiedAt = DateTime.UtcNow;
        await _fieldRepo.Update(field);
        await _auditLogService.LogAsync("DELETE_FIELD", "DynamicField", field.Id.ToString(), $"Deactivated/deleted dynamic field '{field.FieldName}' for Module ID {field.ModuleId}", currentUserId, null, field.TenantId);
    }

    // --- Records Management ---
    public async Task<List<DynamicRecordDto>> GetRecords(int tenantId, int moduleId)
    {
        var records = await _recordRepo.GetRecordsByTenantAndModule(tenantId, moduleId);
        return records.Select(MapToRecordDto).ToList();
    }

    public async Task<DynamicRecordDto?> GetRecordById(int id)
    {
        var record = await _recordRepo.GetById(id);
        return record == null ? null : MapToRecordDto(record);
    }

    public async Task<DynamicRecordDto> CreateRecord(CreateRecordDto dto, int currentUserId)
    {
        // 1. Fetch active configured fields for validation
        var fields = await _fieldRepo.GetFieldsByTenantAndModule(dto.TenantId, dto.ModuleId);

        // 2. Validate input values
        foreach (var field in fields.Where(f => f.IsRequired))
        {
            if (!dto.FieldValues.TryGetValue(field.Id, out var val) || string.IsNullOrWhiteSpace(val))
            {
                throw new BadRequestException($"The field '{field.FieldName}' is required.");
            }
        }

        // 3. Create the parent Record entry
        var record = new DynamicRecord
        {
            ModuleId = dto.ModuleId,
            TenantId = dto.TenantId,
            CreatedBy = currentUserId,
            CreatedAt = DateTime.UtcNow
        };
        await _recordRepo.Add(record);

        // 4. Save EAV field values
        foreach (var entry in dto.FieldValues)
        {
            var value = new DynamicRecordValue
            {
                DynamicRecordId = record.Id,
                DynamicFieldId = entry.Key,
                Value = entry.Value ?? "",
                CreatedBy = currentUserId,
                CreatedAt = DateTime.UtcNow
            };
            await _recordRepo.AddValue(value);
        }

        // Fetch complete record with loaded relations
        var savedRecord = await _recordRepo.GetById(record.Id);
        await _auditLogService.LogAsync("CREATE_RECORD", "DynamicRecord", record.Id.ToString(), $"Created dynamic record for Module ID {record.ModuleId}", currentUserId, null, record.TenantId);
        return MapToRecordDto(savedRecord!);
    }

    public async Task UpdateRecord(int id, UpdateRecordDto dto, int currentUserId)
    {
        var record = await _recordRepo.GetById(id);
        if (record == null)
        {
            throw new NotFoundException("Dynamic Record not found");
        }

        // Validate inputs against active fields
        var fields = await _fieldRepo.GetFieldsByTenantAndModule(record.TenantId, record.ModuleId);
        foreach (var field in fields.Where(f => f.IsRequired))
        {
            if (!dto.FieldValues.TryGetValue(field.Id, out var val) || string.IsNullOrWhiteSpace(val))
            {
                throw new BadRequestException($"The field '{field.FieldName}' is required.");
            }
        }

        // Delete old values first
        await _recordRepo.DeleteValues(record.Values);

        // Save new values
        foreach (var entry in dto.FieldValues)
        {
            var value = new DynamicRecordValue
            {
                DynamicRecordId = record.Id,
                DynamicFieldId = entry.Key,
                Value = entry.Value ?? "",
                CreatedBy = currentUserId,
                CreatedAt = DateTime.UtcNow
            };
            await _recordRepo.AddValue(value);
        }

        record.ModifiedBy = currentUserId;
        record.ModifiedAt = DateTime.UtcNow;
        await _recordRepo.Update(record);
        await _auditLogService.LogAsync("UPDATE_RECORD", "DynamicRecord", record.Id.ToString(), $"Updated dynamic record for Module ID {record.ModuleId}", currentUserId, null, record.TenantId);
    }

    public async Task DeleteRecord(int id, int currentUserId)
    {
        var record = await _recordRepo.GetById(id);
        if (record == null)
        {
            throw new NotFoundException("Dynamic Record not found");
        }

        await _recordRepo.Delete(record);
        await _auditLogService.LogAsync("DELETE_RECORD", "DynamicRecord", record.Id.ToString(), $"Deleted dynamic record for Module ID {record.ModuleId}", currentUserId, null, record.TenantId);
    }

    // --- Helpers ---
    private DynamicFieldDto MapToFieldDto(DynamicField field) => new()
    {
        Id = field.Id,
        ModuleId = field.ModuleId,
        TenantId = field.TenantId,
        FieldName = field.FieldName,
        FieldType = field.FieldType,
        EntityName = field.EntityName,
        IsRequired = field.IsRequired,
        DisplayOrder = field.DisplayOrder,
        IsActive = field.IsActive
    };

    private DynamicRecordDto MapToRecordDto(DynamicRecord record)
    {
        string prefix = "REC";
        if (record.Module != null && !string.IsNullOrEmpty(record.Module.Name))
        {
            prefix = record.Module.Name.Substring(0, Math.Min(3, record.Module.Name.Length)).ToUpper();
        }
        string displayId = $"{prefix}-{record.Id:D4}";

        var dict = new Dictionary<int, string>();
        if (record.Values != null)
        {
            foreach (var v in record.Values)
            {
                if (v.DynamicFieldId != 0)
                {
                    dict[v.DynamicFieldId] = v.Value ?? "";
                }
            }
        }

        return new DynamicRecordDto
        {
            Id = record.Id,
            DisplayId = displayId,
            ModuleId = record.ModuleId,
            TenantId = record.TenantId,
            CreatedBy = record.CreatedBy ?? 0,
            CreatedAt = record.CreatedAt,
            FieldValues = dict
        };
    }
}

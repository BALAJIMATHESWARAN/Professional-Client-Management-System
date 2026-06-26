using PCMS.Domain.Entities;

namespace PCMS.Application.Interfaces;

public class CreateFieldDto
{
    public int ModuleId { get; set; }
    public int TenantId { get; set; }
    public required string FieldName { get; set; }
    public required string FieldType { get; set; }
    public bool IsRequired { get; set; }
    public int DisplayOrder { get; set; }
}

public class UpdateFieldDto
{
    public required string FieldName { get; set; }
    public required string FieldType { get; set; }
    public bool IsRequired { get; set; }
    public int DisplayOrder { get; set; }
    public bool IsActive { get; set; }
}

public class DynamicFieldDto
{
    public int Id { get; set; }
    public int ModuleId { get; set; }
    public int TenantId { get; set; }
    public required string FieldName { get; set; }
    public required string FieldType { get; set; }
    public bool IsRequired { get; set; }
    public int DisplayOrder { get; set; }
    public bool IsActive { get; set; }
}

public class CreateRecordDto
{
    public int ModuleId { get; set; }
    public int TenantId { get; set; }
    public required Dictionary<int, string> FieldValues { get; set; } // Map FieldId -> Value
}

public class UpdateRecordDto
{
    public required Dictionary<int, string> FieldValues { get; set; } // Map FieldId -> Value
}

public class DynamicRecordDto
{
    public int Id { get; set; }
    public required string DisplayId { get; set; }
    public int ModuleId { get; set; }
    public int TenantId { get; set; }
    public int CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
    public Dictionary<int, string> FieldValues { get; set; } = new(); // Map FieldId -> Value
}

public interface IDynamicFormService
{
    // Fields configuration
    Task<List<DynamicFieldDto>> GetFields(int tenantId, int moduleId);
    Task<DynamicFieldDto?> GetFieldById(int id);
    Task<DynamicFieldDto> CreateField(CreateFieldDto dto, int currentUserId);
    Task UpdateField(int id, UpdateFieldDto dto, int currentUserId);
    Task DeleteField(int id, int currentUserId);

    // Records CRUD
    Task<List<DynamicRecordDto>> GetRecords(int tenantId, int moduleId);
    Task<DynamicRecordDto?> GetRecordById(int id);
    Task<DynamicRecordDto> CreateRecord(CreateRecordDto dto, int currentUserId);
    Task UpdateRecord(int id, UpdateRecordDto dto, int currentUserId);
    Task DeleteRecord(int id, int currentUserId);
}

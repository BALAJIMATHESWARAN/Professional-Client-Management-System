namespace PCMS.Domain.Entities;

public class DynamicField : BaseEntity
{
    public int TenantId { get; set; }

    public int ModuleId { get; set; }

    public required string FieldName { get; set; }

    public required string FieldType { get; set; }

    public string? EntityName { get; set; }

    public bool IsRequired { get; set; }

    public int DisplayOrder { get; set; }

    public bool IsActive { get; set; }

    public Tenant? Tenant { get; set; }

    public Module? Module { get; set; }

    public ICollection<DynamicRecordValue> Values { get; set; } = new List<DynamicRecordValue>();
}
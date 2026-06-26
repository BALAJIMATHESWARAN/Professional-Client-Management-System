namespace PCMS.Domain.Entities;

public class DynamicRecordValue : BaseEntity
{
    public int DynamicRecordId { get; set; }

    public int DynamicFieldId { get; set; }

    public required string Value { get; set; }

    public DynamicRecord? DynamicRecord { get; set; }

    public DynamicField? DynamicField { get; set; }
}

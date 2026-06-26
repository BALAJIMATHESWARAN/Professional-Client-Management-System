namespace PCMS.Domain.Entities;

public class DynamicRecord : BaseEntity
{
    public int ModuleId { get; set; }

    public int TenantId { get; set; }

    public Module? Module { get; set; }

    public Tenant? Tenant { get; set; }

    public ICollection<DynamicRecordValue> Values { get; set; } = new List<DynamicRecordValue>();
}

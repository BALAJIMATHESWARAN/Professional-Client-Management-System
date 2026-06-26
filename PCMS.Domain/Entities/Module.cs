namespace PCMS.Domain.Entities;

public class Module : BaseEntity
{
    public required string Name { get; set; }

    public ICollection<DynamicField> DynamicFields { get; set; } = new List<DynamicField>();
}
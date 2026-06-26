using PCMS.Domain.Entities;

namespace PCMS.Application.Interfaces;

public interface IDynamicRecordRepository
{
    Task<DynamicRecord?> GetById(int id);
    Task<List<DynamicRecord>> GetRecordsByTenantAndModule(int tenantId, int moduleId);
    Task Add(DynamicRecord record);
    Task Update(DynamicRecord record);
    Task Delete(DynamicRecord record);

    Task AddValue(DynamicRecordValue value);
    Task UpdateValue(DynamicRecordValue value);
    Task DeleteValues(IEnumerable<DynamicRecordValue> values);
}

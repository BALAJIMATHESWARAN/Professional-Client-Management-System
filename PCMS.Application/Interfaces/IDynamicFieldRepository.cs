using PCMS.Domain.Entities;

namespace PCMS.Application.Interfaces;

public interface IDynamicFieldRepository
{
    Task<List<DynamicField>> GetFieldsByModule(int moduleId);
    Task<List<DynamicField>> GetFieldsByTenantAndModule(int tenantId, int moduleId);
    Task<DynamicField?> GetById(int id);
    Task Add(DynamicField field);
    Task Update(DynamicField field);
    Task Delete(DynamicField field);
}

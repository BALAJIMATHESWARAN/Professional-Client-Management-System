using PCMS.Domain.Entities;

namespace PCMS.Application.Interfaces;

public interface INurseProfileRepository
{
    Task<NurseProfile?> GetById(int id);
    Task Add(NurseProfile profile);
    Task Update(NurseProfile profile);
    Task<List<NurseProfile>> GetAll();
    Task<bool> EmployeeCodeExists(string employeeCode);
}

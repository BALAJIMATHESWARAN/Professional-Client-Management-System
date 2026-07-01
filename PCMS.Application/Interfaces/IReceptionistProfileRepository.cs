using PCMS.Domain.Entities;

namespace PCMS.Application.Interfaces;

public interface IReceptionistProfileRepository
{
    Task<ReceptionistProfile?> GetById(int id);
    Task Add(ReceptionistProfile profile);
    Task Update(ReceptionistProfile profile);
    Task<List<ReceptionistProfile>> GetAll();
    Task<bool> EmployeeCodeExists(string employeeCode);
}

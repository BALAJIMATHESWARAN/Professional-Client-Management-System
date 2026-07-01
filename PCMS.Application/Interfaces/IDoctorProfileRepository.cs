using PCMS.Domain.Entities;

namespace PCMS.Application.Interfaces;

public interface IDoctorProfileRepository
{
    Task<DoctorProfile?> GetById(int id);
    Task<DoctorProfile?> GetByCode(string doctorCode);
    Task Add(DoctorProfile profile);
    Task Update(DoctorProfile profile);
    Task<List<DoctorProfile>> GetAll(string? search = null, string? specialization = null);
    Task<bool> DoctorCodeExists(string doctorCode);
}

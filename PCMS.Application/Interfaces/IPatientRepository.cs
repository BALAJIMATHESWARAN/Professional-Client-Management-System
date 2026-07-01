using PCMS.Domain.Entities;

namespace PCMS.Application.Interfaces;

public interface IPatientRepository
{
    Task<Patient?> GetById(int id);
    Task<Patient?> GetByCode(string patientCode);
    Task Add(Patient patient);
    Task Update(Patient patient);
    Task<(List<Patient> Patients, int TotalCount)> GetAll(string? search = null, int pageNumber = 1, int pageSize = 10);
    Task<bool> PatientCodeExists(string patientCode);
}

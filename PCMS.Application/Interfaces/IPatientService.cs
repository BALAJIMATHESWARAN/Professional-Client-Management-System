using System.Collections.Generic;
using System.Threading.Tasks;
using PCMS.Application.DTOs.Patient;

namespace PCMS.Application.Interfaces;

public interface IPatientService
{
    Task<PatientResponse> CreatePatient(CreatePatientRequest request);
    Task<PatientResponse> UpdatePatient(int id, UpdatePatientRequest request);
    Task<PatientResponse> GetPatientById(int id);
    Task<(List<PatientResponse> Patients, int TotalCount)> GetAllPatients(string? search = null, int pageNumber = 1, int pageSize = 10);
    Task DeletePatient(int id);
}

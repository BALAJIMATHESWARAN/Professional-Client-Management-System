using System.Collections.Generic;
using System.Threading.Tasks;
using PCMS.Application.DTOs.Doctor;

namespace PCMS.Application.Interfaces;

public interface IDoctorService
{
    Task<DoctorResponse> CreateDoctor(CreateDoctorRequest request);
    Task<DoctorResponse> UpdateDoctor(int id, UpdateDoctorRequest request);
    Task<DoctorResponse> GetDoctorById(int id);
    Task<List<DoctorResponse>> GetAllDoctors(string? search = null, string? specialization = null);
    Task<List<string>> GetSpecializations();
    Task ToggleStatus(int id);
}

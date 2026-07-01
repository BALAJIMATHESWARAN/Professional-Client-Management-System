using System.Collections.Generic;
using System.Threading.Tasks;
using PCMS.Application.DTOs.Nurse;

namespace PCMS.Application.Interfaces;

public interface INurseService
{
    Task<NurseResponse> CreateNurse(CreateNurseRequest request);
    Task<NurseResponse> UpdateNurse(int id, UpdateNurseRequest request);
    Task<NurseResponse> GetNurseById(int id);
    Task<List<NurseResponse>> GetAllNurses();
    Task ToggleStatus(int id);
}

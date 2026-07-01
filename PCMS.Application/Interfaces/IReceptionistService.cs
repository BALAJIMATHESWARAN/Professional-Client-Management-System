using System.Collections.Generic;
using System.Threading.Tasks;
using PCMS.Application.DTOs.Receptionist;

namespace PCMS.Application.Interfaces;

public interface IReceptionistService
{
    Task<ReceptionistResponse> CreateReceptionist(CreateReceptionistRequest request);
    Task<ReceptionistResponse> UpdateReceptionist(int id, UpdateReceptionistRequest request);
    Task<ReceptionistResponse> GetReceptionistById(int id);
    Task<List<ReceptionistResponse>> GetAllReceptionists();
    Task ToggleStatus(int id);
}

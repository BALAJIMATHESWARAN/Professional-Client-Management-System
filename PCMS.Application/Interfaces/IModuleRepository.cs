using PCMS.Domain.Entities;

namespace PCMS.Application.Interfaces;

public interface IModuleRepository
{
    Task<Module?> GetById(int id);

    Task<List<Module>> GetAll();

    Task Add(Module module);
}
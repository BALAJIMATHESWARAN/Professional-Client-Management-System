using Microsoft.EntityFrameworkCore;
using PCMS.Application.Interfaces;
using PCMS.Domain.Entities;
using PCMS.Infrastructure.Data;

namespace PCMS.Infrastructure.Repositories;

public class ModuleRepository : IModuleRepository
{
    private readonly AppDbContext _context;

    public ModuleRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<Module?> GetById(int id)
    {
        return await _context.Modules
            .FirstOrDefaultAsync(x => x.Id == id);
    }

    public async Task<List<Module>> GetAll()
    {
        return await _context.Modules
            .ToListAsync();
    }

    public async Task Add(Module module)
    {
        await _context.Modules.AddAsync(module);
        await _context.SaveChangesAsync();
    }
}

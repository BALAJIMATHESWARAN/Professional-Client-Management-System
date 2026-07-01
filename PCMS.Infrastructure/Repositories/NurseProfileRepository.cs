using Microsoft.EntityFrameworkCore;
using PCMS.Application.Interfaces;
using PCMS.Domain.Entities;
using PCMS.Infrastructure.Data;

namespace PCMS.Infrastructure.Repositories;

public class NurseProfileRepository : INurseProfileRepository
{
    private readonly AppDbContext _context;

    public NurseProfileRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<NurseProfile?> GetById(int id)
    {
        return await _context.NurseProfiles
            .Include(n => n.User)
            .Include(n => n.Doctor)
            .ThenInclude(d => d!.User)
            .FirstOrDefaultAsync(n => n.Id == id);
    }

    public async Task Add(NurseProfile profile)
    {
        await _context.NurseProfiles.AddAsync(profile);
        await _context.SaveChangesAsync();
    }

    public async Task Update(NurseProfile profile)
    {
        _context.NurseProfiles.Update(profile);
        await _context.SaveChangesAsync();
    }

    public async Task<List<NurseProfile>> GetAll()
    {
        return await _context.NurseProfiles
            .Include(n => n.User)
            .Include(n => n.Doctor)
            .ThenInclude(d => d!.User)
            .ToListAsync();
    }

    public async Task<bool> EmployeeCodeExists(string employeeCode)
    {
        return await _context.NurseProfiles.AnyAsync(n => n.EmployeeCode == employeeCode);
    }
}

using Microsoft.EntityFrameworkCore;
using PCMS.Application.Interfaces;
using PCMS.Domain.Entities;
using PCMS.Infrastructure.Data;

namespace PCMS.Infrastructure.Repositories;

public class ReceptionistProfileRepository : IReceptionistProfileRepository
{
    private readonly AppDbContext _context;

    public ReceptionistProfileRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<ReceptionistProfile?> GetById(int id)
    {
        return await _context.ReceptionistProfiles
            .Include(r => r.User)
            .Include(r => r.Doctor)
            .ThenInclude(d => d!.User)
            .FirstOrDefaultAsync(r => r.Id == id);
    }

    public async Task Add(ReceptionistProfile profile)
    {
        await _context.ReceptionistProfiles.AddAsync(profile);
        await _context.SaveChangesAsync();
    }

    public async Task Update(ReceptionistProfile profile)
    {
        _context.ReceptionistProfiles.Update(profile);
        await _context.SaveChangesAsync();
    }

    public async Task<List<ReceptionistProfile>> GetAll()
    {
        return await _context.ReceptionistProfiles
            .Include(r => r.User)
            .Include(r => r.Doctor)
            .ThenInclude(d => d!.User)
            .ToListAsync();
    }

    public async Task<bool> EmployeeCodeExists(string employeeCode)
    {
        return await _context.ReceptionistProfiles.AnyAsync(r => r.EmployeeCode == employeeCode);
    }
}

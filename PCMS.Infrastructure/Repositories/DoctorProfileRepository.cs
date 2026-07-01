using Microsoft.EntityFrameworkCore;
using PCMS.Application.Interfaces;
using PCMS.Domain.Entities;
using PCMS.Infrastructure.Data;

namespace PCMS.Infrastructure.Repositories;

public class DoctorProfileRepository : IDoctorProfileRepository
{
    private readonly AppDbContext _context;

    public DoctorProfileRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<DoctorProfile?> GetById(int id)
    {
        return await _context.DoctorProfiles
            .Include(d => d.User)
            .Include(d => d.DynamicRecord)
            .ThenInclude(r => r!.Values)
            .FirstOrDefaultAsync(d => d.Id == id);
    }

    public async Task<DoctorProfile?> GetByCode(string doctorCode)
    {
        return await _context.DoctorProfiles
            .Include(d => d.User)
            .Include(d => d.DynamicRecord)
            .ThenInclude(r => r!.Values)
            .FirstOrDefaultAsync(d => d.DoctorCode == doctorCode);
    }

    public async Task Add(DoctorProfile profile)
    {
        await _context.DoctorProfiles.AddAsync(profile);
        await _context.SaveChangesAsync();
    }

    public async Task Update(DoctorProfile profile)
    {
        _context.DoctorProfiles.Update(profile);
        await _context.SaveChangesAsync();
    }

    public async Task<List<DoctorProfile>> GetAll(string? search = null, string? specialization = null)
    {
        IQueryable<DoctorProfile> query = _context.DoctorProfiles
            .Include(d => d.User)
            .Include(d => d.DynamicRecord)
            .ThenInclude(r => r!.Values);

        if (!string.IsNullOrEmpty(search))
        {
            query = query.Where(d => d.User!.UserName.Contains(search) || d.DoctorCode.Contains(search));
        }

        if (!string.IsNullOrEmpty(specialization))
        {
            query = query.Where(d => d.Specialization == specialization);
        }

        return await query.ToListAsync();
    }

    public async Task<bool> DoctorCodeExists(string doctorCode)
    {
        return await _context.DoctorProfiles.AnyAsync(d => d.DoctorCode == doctorCode);
    }
}

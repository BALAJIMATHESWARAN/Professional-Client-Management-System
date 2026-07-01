using Microsoft.EntityFrameworkCore;
using PCMS.Application.Interfaces;
using PCMS.Domain.Entities;
using PCMS.Infrastructure.Data;

namespace PCMS.Infrastructure.Repositories;

public class PatientRepository : IPatientRepository
{
    private readonly AppDbContext _context;

    public PatientRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<Patient?> GetById(int id)
    {
        return await _context.Patients.FindAsync(id);
    }

    public async Task<Patient?> GetByCode(string patientCode)
    {
        return await _context.Patients.FirstOrDefaultAsync(p => p.PatientCode == patientCode);
    }

    public async Task Add(Patient patient)
    {
        await _context.Patients.AddAsync(patient);
        await _context.SaveChangesAsync();
    }

    public async Task Update(Patient patient)
    {
        _context.Patients.Update(patient);
        await _context.SaveChangesAsync();
    }

    public async Task<(List<Patient> Patients, int TotalCount)> GetAll(string? search = null, int pageNumber = 1, int pageSize = 10)
    {
        IQueryable<Patient> query = _context.Patients;

        if (!string.IsNullOrEmpty(search))
        {
            var searchNorm = search.Trim().ToLowerInvariant();
            query = query.Where(p => 
                p.FullName.ToLower().Contains(searchNorm) || 
                p.PatientCode.ToLower().Contains(searchNorm) || 
                p.PhoneNumber.Contains(searchNorm));
        }

        var totalCount = await query.CountAsync();
        
        var list = await query
            .OrderByDescending(p => p.CreatedAt)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return (list, totalCount);
    }

    public async Task<bool> PatientCodeExists(string patientCode)
    {
        return await _context.Patients.AnyAsync(p => p.PatientCode == patientCode);
    }
}

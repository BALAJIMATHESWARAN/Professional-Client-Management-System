using Microsoft.EntityFrameworkCore;
using PCMS.Application.Interfaces;
using PCMS.Domain.Entities;
using PCMS.Infrastructure.Data;

namespace PCMS.Infrastructure.Repositories;

public class DashboardWidgetConfigurationRepository : IDashboardWidgetConfigurationRepository
{
    private readonly AppDbContext _context;

    public DashboardWidgetConfigurationRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<DashboardWidgetConfiguration>> GetByRoleId(int roleId)
    {
        return await _context.DashboardWidgetConfigurations
            .Where(w => w.RoleId == roleId)
            .OrderBy(w => w.DisplayOrder)
            .ToListAsync();
    }

    public async Task UpdateConfigurations(int roleId, List<DashboardWidgetConfiguration> configurations)
    {
        var existing = await _context.DashboardWidgetConfigurations
            .Where(w => w.RoleId == roleId)
            .ToListAsync();

        _context.DashboardWidgetConfigurations.RemoveRange(existing);

        foreach (var cfg in configurations)
        {
            cfg.RoleId = roleId;
        }

        await _context.DashboardWidgetConfigurations.AddRangeAsync(configurations);
        await _context.SaveChangesAsync();
    }
}

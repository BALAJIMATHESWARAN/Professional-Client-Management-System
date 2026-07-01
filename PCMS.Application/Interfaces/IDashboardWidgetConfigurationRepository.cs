using PCMS.Domain.Entities;

namespace PCMS.Application.Interfaces;

public interface IDashboardWidgetConfigurationRepository
{
    Task<List<DashboardWidgetConfiguration>> GetByRoleId(int roleId);
    Task UpdateConfigurations(int roleId, List<DashboardWidgetConfiguration> configurations);
}

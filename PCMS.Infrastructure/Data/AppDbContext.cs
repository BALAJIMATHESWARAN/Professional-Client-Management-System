using Microsoft.EntityFrameworkCore;
using PCMS.Domain.Entities;

namespace PCMS.Infrastructure.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();

    public DbSet<Tenant> Tenants => Set<Tenant>();

    public DbSet<UserTenant> UserTenants => Set<UserTenant>();

    public DbSet<Module> Modules => Set<Module>();
    
    public DbSet<UserTenantModule> UserTenantModules => Set<UserTenantModule>();

    public DbSet<DynamicField> DynamicFields => Set<DynamicField>();

    public DbSet<DynamicRecord> DynamicRecords => Set<DynamicRecord>();

    public DbSet<DynamicRecordValue> DynamicRecordValues => Set<DynamicRecordValue>();

    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
}
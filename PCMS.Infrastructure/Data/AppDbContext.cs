using Microsoft.EntityFrameworkCore;
using PCMS.Application.Interfaces;
using PCMS.Domain.Entities;
using PCMS.Domain.Interfaces;

namespace PCMS.Infrastructure.Data;

public class AppDbContext : DbContext
{
    private readonly ICurrentUserService _currentUserService;

    public AppDbContext(DbContextOptions<AppDbContext> options, ICurrentUserService currentUserService) : base(options)
    {
        _currentUserService = currentUserService;
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

    // Healthcare & Permission Profiles
    public DbSet<DoctorProfile> DoctorProfiles => Set<DoctorProfile>();
    public DbSet<ReceptionistProfile> ReceptionistProfiles => Set<ReceptionistProfile>();
    public DbSet<NurseProfile> NurseProfiles => Set<NurseProfile>();
    public DbSet<Patient> Patients => Set<Patient>();
    public DbSet<Appointment> Appointments => Set<Appointment>();
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<Permission> Permissions => Set<Permission>();
    public DbSet<RolePermission> RolePermissions => Set<RolePermission>();
    public DbSet<UserRole> UserRoles => Set<UserRole>();
    public DbSet<DashboardWidgetConfiguration> DashboardWidgetConfigurations => Set<DashboardWidgetConfiguration>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // DoctorProfile 1-to-1 with User
        modelBuilder.Entity<DoctorProfile>()
            .HasKey(d => d.Id);
        modelBuilder.Entity<DoctorProfile>()
            .HasOne(d => d.User)
            .WithOne(u => u.DoctorProfile)
            .HasForeignKey<DoctorProfile>(d => d.Id)
            .OnDelete(DeleteBehavior.Cascade);

        // ReceptionistProfile 1-to-1 with User
        modelBuilder.Entity<ReceptionistProfile>()
            .HasKey(r => r.Id);
        modelBuilder.Entity<ReceptionistProfile>()
            .HasOne(r => r.User)
            .WithOne(u => u.ReceptionistProfile)
            .HasForeignKey<ReceptionistProfile>(r => r.Id)
            .OnDelete(DeleteBehavior.Cascade);

        // NurseProfile 1-to-1 with User
        modelBuilder.Entity<NurseProfile>()
            .HasKey(n => n.Id);
        modelBuilder.Entity<NurseProfile>()
            .HasOne(n => n.User)
            .WithOne(u => u.NurseProfile)
            .HasForeignKey<NurseProfile>(n => n.Id)
            .OnDelete(DeleteBehavior.Cascade);

        // Index configurations for scalability (1M+ records)
        modelBuilder.Entity<Patient>()
            .HasIndex(p => new { p.TenantId, p.PatientCode })
            .IsUnique();

        modelBuilder.Entity<Appointment>()
            .HasIndex(a => new { a.TenantId, a.AppointmentDate });

        modelBuilder.Entity<DoctorProfile>()
            .HasIndex(d => new { d.TenantId, d.DoctorCode })
            .IsUnique();

        // Global query filters for soft delete and multi-tenant isolation
        modelBuilder.Entity<User>().HasQueryFilter(u => !u.IsDeleted);
        modelBuilder.Entity<Tenant>().HasQueryFilter(t => !t.IsDeleted);
        modelBuilder.Entity<UserTenant>().HasQueryFilter(ut => !ut.IsDeleted);
        modelBuilder.Entity<Module>().HasQueryFilter(m => !m.IsDeleted);
        modelBuilder.Entity<UserTenantModule>().HasQueryFilter(utm => !utm.IsDeleted);
        modelBuilder.Entity<DynamicField>().HasQueryFilter(df => !df.IsDeleted);
        modelBuilder.Entity<DynamicRecord>().HasQueryFilter(dr => !dr.IsDeleted);
        modelBuilder.Entity<DynamicRecordValue>().HasQueryFilter(drv => !drv.IsDeleted);

        // New healthcare entities filters
        modelBuilder.Entity<DoctorProfile>().HasQueryFilter(d => !d.IsDeleted && d.TenantId == _currentUserService.TenantId);
        modelBuilder.Entity<ReceptionistProfile>().HasQueryFilter(r => !r.IsDeleted && r.TenantId == _currentUserService.TenantId);
        modelBuilder.Entity<NurseProfile>().HasQueryFilter(n => !n.IsDeleted && n.TenantId == _currentUserService.TenantId);
        modelBuilder.Entity<Patient>().HasQueryFilter(p => !p.IsDeleted && p.TenantId == _currentUserService.TenantId);
        modelBuilder.Entity<Appointment>().HasQueryFilter(a => !a.IsDeleted && a.TenantId == _currentUserService.TenantId);
        modelBuilder.Entity<Role>().HasQueryFilter(r => !r.IsDeleted && r.TenantId == _currentUserService.TenantId);
        modelBuilder.Entity<RolePermission>().HasQueryFilter(rp => !rp.IsDeleted && rp.TenantId == _currentUserService.TenantId);
        modelBuilder.Entity<UserRole>().HasQueryFilter(ur => !ur.IsDeleted && ur.TenantId == _currentUserService.TenantId);
        modelBuilder.Entity<DashboardWidgetConfiguration>().HasQueryFilter(w => !w.IsDeleted && w.TenantId == _currentUserService.TenantId);
    }

    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        var currentUserId = _currentUserService.UserId;
        var currentTenantId = _currentUserService.TenantId;

        foreach (var entry in ChangeTracker.Entries<BaseEntity>())
        {
            switch (entry.State)
            {
                case EntityState.Added:
                    entry.Entity.CreatedAt = DateTime.UtcNow;
                    entry.Entity.CreatedBy ??= currentUserId;

                    if (entry.Entity is IMultiTenant multiTenant)
                    {
                        if (multiTenant.TenantId == 0 && currentTenantId.HasValue)
                        {
                            multiTenant.TenantId = currentTenantId.Value;
                        }
                    }
                    break;

                case EntityState.Modified:
                    entry.Entity.ModifiedAt = DateTime.UtcNow;
                    entry.Entity.ModifiedBy = currentUserId;
                    break;

                case EntityState.Deleted:
                    // Soft delete intercept
                    entry.State = EntityState.Modified;
                    entry.Entity.IsDeleted = true;
                    entry.Entity.DeletedAt = DateTime.UtcNow;
                    entry.Entity.DeletedBy = currentUserId;
                    break;
            }
        }

        return await base.SaveChangesAsync(cancellationToken);
    }
}
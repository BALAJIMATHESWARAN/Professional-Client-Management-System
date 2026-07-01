using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using PCMS.Application.Exceptions;
using PCMS.Application.Interfaces;
using PCMS.Application.Services;
using PCMS.Infrastructure.Data;
using PCMS.Infrastructure.Repositories;
using PCMS.Infrastructure.Security;
using System.Net;
using System.Text;
using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddMemoryCache();

// Controllers
builder.Services.AddControllers();
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");

// Console.WriteLine($"Connection String: {connectionString}");
// Database
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(
        builder.Configuration.GetConnectionString("DefaultConnection")));

// Repositories
builder.Services.AddScoped<ITenantRepository, TenantRepository>();
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IUserTenantRepository, UserTenantRepository>();
builder.Services.AddScoped<IUserTenantModuleRepository, UserTenantModuleRepository>();
builder.Services.AddScoped<IModuleRepository,   ModuleRepository>();
builder.Services.AddScoped<IDynamicFieldRepository, DynamicFieldRepository>();
builder.Services.AddScoped<IDynamicRecordRepository, DynamicRecordRepository>();
builder.Services.AddScoped<IAuditLogRepository, PCMS.Infrastructure.Repositories.AuditLogRepository>();

// Healthcare & Permission Repositories
builder.Services.AddScoped<IDoctorProfileRepository, PCMS.Infrastructure.Repositories.DoctorProfileRepository>();
builder.Services.AddScoped<IReceptionistProfileRepository, PCMS.Infrastructure.Repositories.ReceptionistProfileRepository>();
builder.Services.AddScoped<INurseProfileRepository, PCMS.Infrastructure.Repositories.NurseProfileRepository>();
builder.Services.AddScoped<IPatientRepository, PCMS.Infrastructure.Repositories.PatientRepository>();
builder.Services.AddScoped<IAppointmentRepository, PCMS.Infrastructure.Repositories.AppointmentRepository>();
builder.Services.AddScoped<IRoleRepository, PCMS.Infrastructure.Repositories.RoleRepository>();
builder.Services.AddScoped<IPermissionRepository, PCMS.Infrastructure.Repositories.PermissionRepository>();
builder.Services.AddScoped<IRolePermissionRepository, PCMS.Infrastructure.Repositories.RolePermissionRepository>();
builder.Services.AddScoped<IUserRoleRepository, PCMS.Infrastructure.Repositories.UserRoleRepository>();
builder.Services.AddScoped<IDashboardWidgetConfigurationRepository, PCMS.Infrastructure.Repositories.DashboardWidgetConfigurationRepository>();

// Services
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUserService, PCMS.Infrastructure.Services.CurrentUserService>();
builder.Services.AddScoped<IAuditLogService, PCMS.Application.Services.AuditLogService>();
builder.Services.AddScoped<ITenantService, TenantService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IAdminService, AdminService>();
builder.Services.AddScoped<IPasswordService, PasswordService>();
builder.Services.AddScoped<IJwtService, JwtService>();
builder.Services.AddScoped<IDynamicFormService, DynamicFormService>();

// Healthcare & RolePermission Services
builder.Services.AddScoped<IDoctorService, PCMS.Application.Services.DoctorService>();
builder.Services.AddScoped<IReceptionistService, PCMS.Application.Services.ReceptionistService>();
builder.Services.AddScoped<INurseService, PCMS.Application.Services.NurseService>();
builder.Services.AddScoped<IPatientService, PCMS.Application.Services.PatientService>();
builder.Services.AddScoped<IAppointmentService, PCMS.Application.Services.AppointmentService>();
builder.Services.AddScoped<IRolePermissionService, PCMS.Application.Services.RolePermissionService>();
builder.Services.AddScoped<IEmailService, PCMS.Infrastructure.Services.EmailService>();

// JWT Authentication
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters =
            new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                ValidIssuer = builder.Configuration["Jwt:Issuer"],
                ValidAudience = builder.Configuration["Jwt:Audience"],
                IssuerSigningKey = new SymmetricSecurityKey(
                    Encoding.UTF8.GetBytes(
                        builder.Configuration["Jwt:Key"]!))
            };
    });

builder.Services.AddAuthorization();

// CORS - allow React frontend
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins("http://localhost:5173", "http://localhost:5174", "http://localhost:3000")
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

// Swagger (Basic)
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Seed Data
using (var scope = app.Services.CreateScope())
{
    var context =
        scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await DataSeeder.SeedSuperAdminAsync(context);
}

using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await DataSeeder.SeedSuperAdminAsync(context);
    await DataSeeder.SeedModulesAsync(context);
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Global Exception Middleware - converts custom exceptions to proper HTTP status codes
app.Use(async (context, next) =>
{
    try
    {
        await next();
    }
    catch (BadRequestException ex)
    {
        context.Response.StatusCode = (int)HttpStatusCode.BadRequest;
        context.Response.ContentType = "application/json";
        await context.Response.WriteAsync(JsonSerializer.Serialize(new { message = ex.Message }));
    }
    catch (NotFoundException ex)
    {
        context.Response.StatusCode = (int)HttpStatusCode.NotFound;
        context.Response.ContentType = "application/json";
        await context.Response.WriteAsync(JsonSerializer.Serialize(new { message = ex.Message }));
    }
    catch (UnauthorizedException ex)
    {
        context.Response.StatusCode = (int)HttpStatusCode.Unauthorized;
        context.Response.ContentType = "application/json";
        await context.Response.WriteAsync(JsonSerializer.Serialize(new { message = ex.Message }));
    }
    catch (Exception ex)
    {
        context.Response.StatusCode = (int)HttpStatusCode.InternalServerError;
        context.Response.ContentType = "application/json";
        await context.Response.WriteAsync(JsonSerializer.Serialize(new { message = "An unexpected error occurred.", detail = ex.Message }));
    }
});

app.UseCors();
app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.Run();
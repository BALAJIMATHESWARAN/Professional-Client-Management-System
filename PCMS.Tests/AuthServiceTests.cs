using Xunit;
using PCMS.Application.Services;
using PCMS.Application.Interfaces;
using PCMS.Domain.Entities;
using PCMS.Application.DTOs.Auth;
using PCMS.Application.DTOs.AuditLog;
using PCMS.Application.Exceptions;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace PCMS.Tests;

public class AuthServiceTests
{
    private class FakeUserRepository : IUserRepository
    {
        public User? MockUser { get; set; }
        public bool UpdateCalled { get; private set; }
        public User? UpdatedUser { get; private set; }

        public Task<User?> GetByEmail(string email)
        {
            if (MockUser != null && MockUser.Email.Equals(email, StringComparison.OrdinalIgnoreCase))
            {
                return Task.FromResult<User?>(MockUser);
            }
            return Task.FromResult<User?>(null);
        }

        public Task<User?> GetById(int id) => Task.FromResult<User?>(MockUser);
        public Task Add(User user) => Task.CompletedTask;
        
        public Task Update(User user)
        {
            UpdateCalled = true;
            UpdatedUser = user;
            return Task.CompletedTask;
        }

        public Task<User?> GetByResetToken(string token) => Task.FromResult<User?>(null);
        public Task<bool> EmailExists(string email) => Task.FromResult(false);
        public Task<bool> SuperAdminExists() => Task.FromResult(false);
    }

    private class FakeUserTenantRepository : IUserTenantRepository
    {
        public List<UserTenant> UserTenants { get; set; } = new();

        public Task Add(UserTenant userTenant) => Task.CompletedTask;
        public Task<bool> Exists(int userId, int tenantId) => Task.FromResult(false);
        public Task<List<UserTenant>> GetByUserId(int userId) => Task.FromResult(UserTenants);
        public Task<UserTenant?> GetUserTenant(int userId, int tenantId) => Task.FromResult<UserTenant?>(null);
        public Task<List<UserTenant>> GetAllAdmins() => Task.FromResult(new List<UserTenant>());
        public Task Update(UserTenant userTenant) => Task.CompletedTask;
        public Task Delete(UserTenant userTenant) => Task.CompletedTask;
    }

    private class FakePasswordService : IPasswordService
    {
        public bool MockVerifyResult { get; set; } = true;
        public bool MockIsStrongResult { get; set; } = true;

        public string Hash(string password) => "hashed_password";
        public bool Verify(string password, string hash) => MockVerifyResult;
        public bool IsStrongPassword(string password) => MockIsStrongResult;
    }

    private class FakeJwtService : IJwtService
    {
        public string GenerateSuperAdminToken(User user) => "super_admin_token";
        public string GenerateUserToken(int userId, int tenantId, string role) => "user_token";
    }

    private class FakeEmailService : IEmailService
    {
        public Task SendEmailAsync(string to, string subject, string body) => Task.CompletedTask;
    }

    private class FakeAuditLogService : IAuditLogService
    {
        public Task LogAsync(string action, string? entityName = null, string? entityId = null, string? details = null, int? userId = null, string? userEmail = null, int? tenantId = null) => Task.CompletedTask;
        public Task<List<AuditLogDto>> GetLogsAsync(int? tenantId = null) => Task.FromResult(new List<AuditLogDto>());
    }

    [Fact]
    public async Task Login_WithCorrectStrongPassword_ShouldSucceedWithoutReset()
    {
        // Arrange
        var user = new User
        {
            Id = 1,
            UserName = "testuser",
            Email = "test@example.com",
            PasswordHash = "some_hash",
            IsSuperAdmin = true,
            IsActive = true
        };

        var userRepo = new FakeUserRepository { MockUser = user };
        var userTenantRepo = new FakeUserTenantRepository();
        var passwordService = new FakePasswordService { MockVerifyResult = true, MockIsStrongResult = true };
        var jwtService = new FakeJwtService();
        var emailService = new FakeEmailService();
        var auditLogService = new FakeAuditLogService();
        var memoryCache = new MemoryCache(new MemoryCacheOptions());
        var configuration = new ConfigurationBuilder().Build();

        var authService = new AuthService(userRepo, userTenantRepo, passwordService, jwtService, emailService, auditLogService, memoryCache, configuration);

        var request = new LoginRequestDto { Email = "test@example.com", Password = "StrongPassword123!" };

        // Act
        var response = await authService.Login(request);

        // Assert
        Assert.NotNull(response);
        Assert.False(response.NeedsPasswordReset);
        Assert.Equal("super_admin_token", response.Token);
        Assert.False(userRepo.UpdateCalled);
    }

    [Fact]
    public async Task Login_WithCorrectWeakPassword_ShouldSucceedAndRequireReset()
    {
        // Arrange
        var user = new User
        {
            Id = 1,
            UserName = "testuser",
            Email = "test@example.com",
            PasswordHash = "some_hash",
            IsSuperAdmin = false,
            IsActive = true
        };

        var userRepo = new FakeUserRepository { MockUser = user };
        var userTenantRepo = new FakeUserTenantRepository();
        var passwordService = new FakePasswordService { MockVerifyResult = true, MockIsStrongResult = false };
        var jwtService = new FakeJwtService();
        var emailService = new FakeEmailService();
        var auditLogService = new FakeAuditLogService();
        var memoryCache = new MemoryCache(new MemoryCacheOptions());
        var configuration = new ConfigurationBuilder().Build();

        var authService = new AuthService(userRepo, userTenantRepo, passwordService, jwtService, emailService, auditLogService, memoryCache, configuration);

        var request = new LoginRequestDto { Email = "test@example.com", Password = "weak" };

        // Act
        var response = await authService.Login(request);

        // Assert
        Assert.NotNull(response);
        Assert.True(response.NeedsPasswordReset);
        Assert.NotNull(response.ResetToken);
        Assert.Equal("test@example.com", response.Email);
        Assert.True(userRepo.UpdateCalled);
        Assert.Equal(response.ResetToken, userRepo.UpdatedUser?.PasswordResetToken);
        Assert.NotNull(userRepo.UpdatedUser?.PasswordResetTokenExpiry);
    }

    [Fact]
    public async Task Login_WithIncorrectPassword_ShouldThrowUnauthorizedException()
    {
        // Arrange
        var user = new User
        {
            Id = 1,
            UserName = "testuser",
            Email = "test@example.com",
            PasswordHash = "some_hash",
            IsSuperAdmin = false,
            IsActive = true
        };

        var userRepo = new FakeUserRepository { MockUser = user };
        var userTenantRepo = new FakeUserTenantRepository();
        var passwordService = new FakePasswordService { MockVerifyResult = false, MockIsStrongResult = true };
        var jwtService = new FakeJwtService();
        var emailService = new FakeEmailService();
        var auditLogService = new FakeAuditLogService();
        var memoryCache = new MemoryCache(new MemoryCacheOptions());
        var configuration = new ConfigurationBuilder().Build();

        var authService = new AuthService(userRepo, userTenantRepo, passwordService, jwtService, emailService, auditLogService, memoryCache, configuration);

        var request = new LoginRequestDto { Email = "test@example.com", Password = "IncorrectPassword" };

        // Act & Assert
        await Assert.ThrowsAsync<UnauthorizedException>(() => authService.Login(request));
        Assert.False(userRepo.UpdateCalled);
    }
}

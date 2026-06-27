namespace PCMS.Application.Interfaces;

public interface ICurrentUserService
{
    int? UserId { get; }
    string? UserEmail { get; }
    int? TenantId { get; }
    string? IpAddress { get; }
}

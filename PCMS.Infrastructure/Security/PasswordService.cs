using System.Text.RegularExpressions;
using PCMS.Application.Interfaces;

namespace PCMS.Infrastructure.Security;

public class PasswordService : IPasswordService
{
    private static readonly Regex PasswordRegex = new Regex(
        @"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d]).{8,}$",
        RegexOptions.Compiled);

    public string Hash(string password)
    {
        return BCrypt.Net.BCrypt.HashPassword(password);
    }

    public bool Verify(string password, string hash)
    {
        return BCrypt.Net.BCrypt.Verify(password, hash);
    }

    public bool IsStrongPassword(string password)
    {
        if (string.IsNullOrWhiteSpace(password))
            return false;
        return PasswordRegex.IsMatch(password);
    }
}
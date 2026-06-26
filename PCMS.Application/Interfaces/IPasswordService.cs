namespace PCMS.Application.Interfaces;

public interface IPasswordService
{
    string Hash(string password);

    bool Verify(string password, string hash);

    bool IsStrongPassword(string password);
}
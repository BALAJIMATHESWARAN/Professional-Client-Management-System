using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Configuration;
using PCMS.Application.Interfaces;

namespace PCMS.Infrastructure.Services;

public class EmailService : IEmailService
{
    private readonly IConfiguration _configuration;

    public EmailService(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public async Task SendEmailAsync(string to, string subject, string body)
    {
        var smtpSection = _configuration.GetSection("SmtpSettings");
        var host = smtpSection["Host"] ?? string.Empty;
        
        var portStr = smtpSection["Port"];
        var port = int.TryParse(portStr, out var p) ? p : 587;
        
        var username = smtpSection["Username"] ?? string.Empty;
        var password = smtpSection["Password"] ?? string.Empty;
        
        var sslStr = smtpSection["EnableSsl"];
        var enableSsl = !bool.TryParse(sslStr, out var ssl) || ssl;
        
        var senderEmail = smtpSection["SenderEmail"] ?? "no-reply@pcms-platform.com";
        var senderName = smtpSection["SenderName"] ?? "PCMS Support";

        // Check if Host or Username is missing, meaning we fall back to a local folder and console logging.
        if (string.IsNullOrWhiteSpace(host) || string.IsNullOrWhiteSpace(username))
        {
            await LogEmailLocally(to, subject, body);
            return;
        }

        try
        {
            using var mailMessage = new MailMessage
            {
                From = new MailAddress(senderEmail, senderName),
                Subject = subject,
                Body = body,
                IsBodyHtml = true
            };
            mailMessage.To.Add(to);

            using var smtpClient = new SmtpClient(host, port)
            {
                Credentials = new NetworkCredential(username, password),
                EnableSsl = enableSsl
            };

            await smtpClient.SendMailAsync(mailMessage);
        }
        catch (Exception ex)
        {
            Console.ForegroundColor = ConsoleColor.Red;
            Console.WriteLine($"[Email Service Error] Failed to send email to {to}: {ex.Message}. Logging locally instead.");
            Console.ResetColor();
            await LogEmailLocally(to, subject, body);
        }
    }

    private async Task LogEmailLocally(string to, string subject, string body)
    {
        var emailsDir = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "SentEmailsLog");
        if (!Directory.Exists(emailsDir))
        {
            Directory.CreateDirectory(emailsDir);
        }

        var safeFileName = $"{DateTime.UtcNow:yyyyMMdd_HHmmss}_{to.Replace("@", "_").Replace(".", "_")}.html";
        var filePath = Path.Combine(emailsDir, safeFileName);

        var fileContent = $@"<h3>Email Log Output</h3>
<hr/>
<p><strong>To:</strong> {to}</p>
<p><strong>Subject:</strong> {subject}</p>
<p><strong>Sent Date (UTC):</strong> {DateTime.UtcNow}</p>
<hr/>
<div>
    {body}
</div>";

        await File.WriteAllTextAsync(filePath, fileContent);

        // Highlight reset instructions in the API server console
        Console.WriteLine("\n==================================================");
        Console.ForegroundColor = ConsoleColor.Green;
        Console.WriteLine($"[EMAIL SIMULATOR] Email sent to: {to}");
        Console.WriteLine($"Subject: {subject}");
        Console.WriteLine("--------------------------------------------------");
        Console.WriteLine("Please copy the URL below to proceed:");
        
        // Find reset link in the body
        var linkStart = body.IndexOf("http://localhost:5173/reset-password");
        if (linkStart >= 0)
        {
            var linkEnd = body.IndexOfAny(new[] { '\'', '"', '<' }, linkStart);
            if (linkEnd > linkStart)
            {
                var link = body.Substring(linkStart, linkEnd - linkStart);
                Console.ForegroundColor = ConsoleColor.Cyan;
                Console.WriteLine(link);
            }
        }
        else
        {
            Console.WriteLine(body);
        }
        Console.ResetColor();
        Console.WriteLine("==================================================\n");
    }
}

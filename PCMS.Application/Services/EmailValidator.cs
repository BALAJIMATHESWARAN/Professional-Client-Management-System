using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

namespace PCMS.Application.Services
{
    public static class EmailValidator
    {
        private static readonly Regex EmailRegex = new Regex(
            @"^[^@\s]+@[^@\s]+\.[^@\s]+$",
            RegexOptions.Compiled | RegexOptions.IgnoreCase);

        // Predefined list of common disposable/temporary email domains
        private static readonly HashSet<string> DisposableDomains = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "mailinator.com", "yopmail.com", "tempmail.com", "temp-mail.org", "10minutemail.com",
            "guerrillamail.com", "sharklasers.com", "dispostable.com", "getairmail.com", "burnermail.io",
            "fakeinbox.com", "trashmail.com", "maildrop.cc", "maildrop.org", "tempmailaddress.com",
            "throwawaymail.com", "mailnesia.com", "mailcatch.com", "mytemp.email"
        };

        public static async Task<bool> IsValidEmail(string email)
        {
            if (string.IsNullOrWhiteSpace(email))
                return false;

            // 1. Basic Regex Format Check
            if (!EmailRegex.IsMatch(email))
                return false;

            // Extract Domain
            var parts = email.Split('@');
            if (parts.Length != 2)
                return false;

            var domain = parts[1].Trim();

            // 2. Check against Disposable Domain List
            if (DisposableDomains.Contains(domain))
                return false;

            // 3. DNS Lookup Check: Verify if domain has A record or MX record
            try
            {
                // We perform host addresses resolution. If it fails, the domain doesn't exist or is invalid!
                var addresses = await Dns.GetHostAddressesAsync(domain);
                if (addresses == null || addresses.Length == 0)
                {
                    return false; // Domain has no IP records, definitely fake/dead!
                }
            }
            catch
            {
                return false; // Domain failed to resolve
            }

            return true;
        }
    }
}

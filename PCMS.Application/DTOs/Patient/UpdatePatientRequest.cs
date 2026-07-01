using System;
using System.Collections.Generic;

namespace PCMS.Application.DTOs.Patient;

public class UpdatePatientRequest
{
    public required string FullName { get; set; }
    public DateTime DateOfBirth { get; set; }
    public required string Gender { get; set; }
    public required string PhoneNumber { get; set; }
    public string? Email { get; set; }
    public string? Address { get; set; }
    public string? EmergencyContact { get; set; }
    public string? BloodGroup { get; set; }
    public string? WhatsAppNumber { get; set; }
    public bool WhatsAppConsent { get; set; }
    
    // PCMS Dynamic fields integration
    public Dictionary<string, string> CustomFields { get; set; } = new();
}

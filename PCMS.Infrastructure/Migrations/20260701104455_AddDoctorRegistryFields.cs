using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PCMS.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddDoctorRegistryFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Email",
                table: "DoctorProfiles",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "FullLegalName",
                table: "DoctorProfiles",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "MedicalCouncil",
                table: "DoctorProfiles",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "MobileNumber",
                table: "DoctorProfiles",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "RegistrationCertificate",
                table: "DoctorProfiles",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RegistrationNumber",
                table: "DoctorProfiles",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "VerificationStatus",
                table: "DoctorProfiles",
                type: "text",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Email",
                table: "DoctorProfiles");

            migrationBuilder.DropColumn(
                name: "FullLegalName",
                table: "DoctorProfiles");

            migrationBuilder.DropColumn(
                name: "MedicalCouncil",
                table: "DoctorProfiles");

            migrationBuilder.DropColumn(
                name: "MobileNumber",
                table: "DoctorProfiles");

            migrationBuilder.DropColumn(
                name: "RegistrationCertificate",
                table: "DoctorProfiles");

            migrationBuilder.DropColumn(
                name: "RegistrationNumber",
                table: "DoctorProfiles");

            migrationBuilder.DropColumn(
                name: "VerificationStatus",
                table: "DoctorProfiles");
        }
    }
}
